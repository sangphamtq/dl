import { prisma } from "@/lib/prisma";

// Mốc "hôm nay" theo UTC (00:00) — khớp cột @db.Date của PlaceViewStat.
function todayUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

// Lùi `days` ngày so với hôm nay (UTC). days=7 → 7 ngày trước.
function daysAgoUTC(days: number): Date {
  const d = todayUTC();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

// Ghi 1 lượt xem cho Place: tăng tổng all-time + cộng dồn vào ngày hôm nay.
// Gọi từ trang công khai /diem-den/[slug] khi trang đó được dựng.
export async function recordPlaceView(placeId: string): Promise<void> {
  const date = todayUTC();
  await prisma.$transaction([
    prisma.place.update({
      where: { id: placeId },
      data: { viewCount: { increment: 1 } },
    }),
    prisma.placeViewStat.upsert({
      where: { placeId_date: { placeId, date } },
      create: { placeId, date, count: 1 },
      update: { count: { increment: 1 } },
    }),
  ]);
}

// Tổng lượt xem trong N ngày gần nhất (gồm hôm nay) của một Place.
export async function getPlaceViewsLastDays(
  placeId: string,
  days: number,
): Promise<number> {
  const agg = await prisma.placeViewStat.aggregate({
    where: { placeId, date: { gte: daysAgoUTC(days - 1) } },
    _sum: { count: true },
  });
  return agg._sum.count ?? 0;
}
