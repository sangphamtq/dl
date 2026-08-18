import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { PLACE_COORDS } from "@/lib/place-coords";

// Đổ toạ độ từ bảng tra tay lib/place-coords.ts vào Place.lat/lng (trường mới,
// thêm cùng đợt làm Lịch trình — xem docs/lich-trinh.md §9.2).
//
// Nơi KHÔNG có trong bảng tra: suy TRỌNG TÂM các listing có toạ độ gắn trực tiếp
// vào nơi đó — cùng cách mà lib/geo.ts đang chấm pin cho bản đồ toàn quốc.
//
// Chạy lại được nhiều lần (idempotent). Không ghi đè nơi đã có toạ độ.
// Dùng: pnpm backfill:place-coords
async function main() {
  const places = await prisma.place.findMany({
    select: { id: true, slug: true, name: true, lat: true, lng: true },
  });

  let fromTable = 0;
  let fromCentroid = 0;
  const missing: string[] = [];

  for (const place of places) {
    if (place.lat != null && place.lng != null) continue;

    const known = PLACE_COORDS[place.slug];
    if (known) {
      await prisma.place.update({
        where: { id: place.id },
        data: { lat: known[0], lng: known[1] },
      });
      fromTable++;
      continue;
    }

    const [spots, eateries, stays] = await Promise.all([
      prisma.spot.findMany({
        where: { placeId: place.id, lat: { not: null }, lng: { not: null } },
        select: { lat: true, lng: true },
      }),
      prisma.eatery.findMany({
        where: { placeId: place.id, lat: { not: null }, lng: { not: null } },
        select: { lat: true, lng: true },
      }),
      prisma.accommodation.findMany({
        where: { placeId: place.id, lat: { not: null }, lng: { not: null } },
        select: { lat: true, lng: true },
      }),
    ]);

    const pts = [...spots, ...eateries, ...stays] as { lat: number; lng: number }[];
    if (pts.length === 0) {
      missing.push(`${place.name} (${place.slug})`);
      continue;
    }

    await prisma.place.update({
      where: { id: place.id },
      data: {
        lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
        lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length,
      },
    });
    fromCentroid++;
  }

  console.log(`✓ ${fromTable} nơi lấy từ PLACE_COORDS`);
  console.log(`✓ ${fromCentroid} nơi suy từ trọng tâm listing`);
  if (missing.length) {
    console.log(`\n⚠ ${missing.length} nơi CHƯA có toạ độ (không có trong bảng tra,`);
    console.log(`  cũng không có listing nào gắn toạ độ). Thêm tay trong CMS:`);
    for (const m of missing) console.log(`  · ${m}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
