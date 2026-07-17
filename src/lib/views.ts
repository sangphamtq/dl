import { prisma } from "@/lib/prisma";

// Các loại thực thể đếm lượt xem. 'place' dùng viewCount all-time; các listing
// dùng popularity như counter all-time (giữ nguyên hành vi sort hiện tại).
export const VIEW_ENTITIES = [
  "place",
  "activity",
  "spot",
  "specialty",
  "eatery",
  "accommodation",
] as const;
export type ViewEntity = (typeof VIEW_ENTITIES)[number];

export function isViewEntity(v: unknown): v is ViewEntity {
  return typeof v === "string" && (VIEW_ENTITIES as readonly string[]).includes(v);
}

// Mốc "hôm nay" theo UTC (00:00) — khớp cột @db.Date của ViewStat.
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

// Ghi 1 lượt xem cho một thực thể bất kỳ (place hoặc listing):
// cộng dồn vào ViewStat của ngày hôm nay + tăng counter all-time tương ứng.
export async function recordView(
  entityType: ViewEntity,
  entityId: string,
): Promise<void> {
  const date = todayUTC();
  const ops: Promise<unknown>[] = [
    prisma.viewStat.upsert({
      where: { entityType_entityId_date: { entityType, entityId, date } },
      create: { entityType, entityId, date, count: 1 },
      update: { count: { increment: 1 } },
    }),
  ];

  if (entityType === "place") {
    ops.push(
      prisma.place.update({
        where: { id: entityId },
        data: { viewCount: { increment: 1 } },
      }),
    );
  } else {
    // Listing: giữ popularity làm counter all-time (đang dùng để sort).
    const model = prisma[entityType] as unknown as {
      update: (args: unknown) => Promise<unknown>;
    };
    ops.push(
      model.update({
        where: { id: entityId },
        data: { popularity: { increment: 1 } },
      }),
    );
  }

  await prisma.$transaction(ops as never);
}

// Tổng lượt xem trong N ngày gần nhất (gồm hôm nay) của một thực thể.
export async function getViewsLastDays(
  entityType: ViewEntity,
  entityId: string,
  days: number,
): Promise<number> {
  const agg = await prisma.viewStat.aggregate({
    where: { entityType, entityId, date: { gte: daysAgoUTC(days - 1) } },
    _sum: { count: true },
  });
  return agg._sum.count ?? 0;
}

// ── Thống kê tổng hợp cho dashboard traffic (CMS) ───────────────────────────

function ymdUTC(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (theo UTC, khớp @db.Date)
}

// CMS route + nhãn hiển thị theo loại thực thể.
const ENTITY_META: Record<ViewEntity, { label: string; cmsBase: string }> = {
  place: { label: "Điểm đến", cmsBase: "/cms/places" },
  activity: { label: "Hoạt động", cmsBase: "/cms/activities" },
  spot: { label: "Địa điểm nhỏ", cmsBase: "/cms/spots" },
  specialty: { label: "Đặc sản", cmsBase: "/cms/specialties" },
  eatery: { label: "Quán ăn", cmsBase: "/cms/eateries" },
  accommodation: { label: "Lưu trú", cmsBase: "/cms/accommodations" },
};

export function entityLabel(entityType: string): string {
  return ENTITY_META[entityType as ViewEntity]?.label ?? entityType;
}

export type DailyPoint = {
  date: string; // YYYY-MM-DD
  place: number;
  listing: number;
  total: number;
};

// Chuỗi lượt xem theo ngày (điền đủ mọi ngày, kể cả ngày 0 view), tách
// place vs listing để vẽ cột chồng.
export async function getDailySeries(days: number): Promise<DailyPoint[]> {
  const rows = await prisma.viewStat.groupBy({
    by: ["date", "entityType"],
    where: { date: { gte: daysAgoUTC(days - 1) } },
    _sum: { count: true },
  });

  const byDate = new Map<string, { place: number; listing: number }>();
  for (const r of rows) {
    const key = ymdUTC(r.date);
    const bucket = byDate.get(key) ?? { place: 0, listing: 0 };
    const n = r._sum.count ?? 0;
    if (r.entityType === "place") bucket.place += n;
    else bucket.listing += n;
    byDate.set(key, bucket);
  }

  const out: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = ymdUTC(daysAgoUTC(i));
    const b = byDate.get(key) ?? { place: 0, listing: 0 };
    out.push({ date: key, place: b.place, listing: b.listing, total: b.place + b.listing });
  }
  return out;
}

export type PeriodTotals = { total: number; place: number; listing: number };

export async function getPeriodTotals(days: number): Promise<PeriodTotals> {
  const rows = await prisma.viewStat.groupBy({
    by: ["entityType"],
    where: { date: { gte: daysAgoUTC(days - 1) } },
    _sum: { count: true },
  });
  let place = 0;
  let listing = 0;
  for (const r of rows) {
    const n = r._sum.count ?? 0;
    if (r.entityType === "place") place += n;
    else listing += n;
  }
  return { total: place + listing, place, listing };
}

export type TopEntity = {
  entityType: string;
  entityId: string;
  count: number;
  name: string;
  label: string; // nhãn loại
  href: string; // link tới trang chi tiết CMS
};

// Lấy tên hiển thị của các thực thể (theo từng loại, gộp truy vấn).
async function resolveNames(
  items: { entityType: string; entityId: string }[],
): Promise<Map<string, string>> {
  const byType = new Map<string, string[]>();
  for (const it of items) {
    const arr = byType.get(it.entityType) ?? [];
    arr.push(it.entityId);
    byType.set(it.entityType, arr);
  }
  const out = new Map<string, string>(); // `${type}:${id}` -> name
  await Promise.all(
    [...byType.entries()].map(async ([type, ids]) => {
      const model = prisma[type as ViewEntity] as unknown as {
        findMany: (args: unknown) => Promise<{ id: string; name: string }[]>;
      };
      const rows = await model.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      });
      for (const r of rows) out.set(`${type}:${r.id}`, r.name);
    }),
  );
  return out;
}

// Top thực thể theo lượt xem trong N ngày. entityType='place' cho điểm đến;
// 'listing' cho mọi loại listing; hoặc một loại cụ thể.
export async function getTopEntities(
  days: number,
  scope: "place" | "listing",
  limit = 10,
): Promise<TopEntity[]> {
  const where =
    scope === "place"
      ? { entityType: "place", date: { gte: daysAgoUTC(days - 1) } }
      : { entityType: { not: "place" }, date: { gte: daysAgoUTC(days - 1) } };

  const rows = await prisma.viewStat.groupBy({
    by: ["entityType", "entityId"],
    where,
    _sum: { count: true },
    orderBy: { _sum: { count: "desc" } },
    take: limit,
  });

  const names = await resolveNames(rows);
  return rows.map((r) => {
    const meta = ENTITY_META[r.entityType as ViewEntity];
    return {
      entityType: r.entityType,
      entityId: r.entityId,
      count: r._sum.count ?? 0,
      name: names.get(`${r.entityType}:${r.entityId}`) ?? "(đã xoá)",
      label: meta?.label ?? r.entityType,
      href: meta ? `${meta.cmsBase}/${r.entityId}` : "#",
    };
  });
}
