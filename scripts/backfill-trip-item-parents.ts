import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { anchorsOf, isTask } from "@/lib/trip-time";

// Một lần: biến cách gom "Ở đâu | Làm gì" vốn SUY từ thứ tự thành TripItem.parentId thật.
// Cùng luật với groupStops() trước đó: mục là việc (hoạt động đứng sau nơi của nó, hoặc việc
// tự thêm) thì thuộc mục gốc gần nhất phía trên. Chạy lại được (mục đã có cha thì bỏ qua cả ngày).
async function main() {
  const dry = process.argv.includes("--dry");
  // ⚠️ Đọc ĐÚNG như trang đang đọc (lib/trip.ts: items của CẢ chuyến, `orderBy: order`, rồi lọc
  // theo ngày bằng JS). Hỏi riêng từng ngày thì Postgres phân xử các `order` TRÙNG NHAU theo
  // kiểu khác ⇒ thứ tự ghi xuống khác thứ người dùng đang thấy (đã xảy ra trên dữ liệu dev).
  const trips = await prisma.trip.findMany({
    select: {
      id: true,
      days: { select: { id: true } },
      items: {
        orderBy: { order: "asc" },
        select: {
          id: true, dayId: true, order: true, parentId: true, spotId: true, activityId: true, eateryId: true,
          accommodationId: true, customLat: true, customLng: true, customPlace: true,
          activity: { select: { spotLinks: { select: { spotId: true } } } },
        },
      },
    },
  });
  const days = trips.flatMap((t) => t.days.map((d) => ({ id: d.id, tripId: t.id, rows: t.items.filter((i) => i.dayId === d.id) })));
  let moved = 0;
  for (const day of days) {
    const rows = day.rows;
    if (rows.some((r) => r.parentId)) continue;
    const orders = rows.map((r) => r.order);
    if (new Set(orders).size !== orders.length)
      console.warn(`⚠️ ngày ${day.id} (chuyến ${day.tripId}) có order TRÙNG — kiểm lại bằng mắt sau khi chạy`);
    const items = rows.map((r) => ({
      id: r.id,
      kind: (r.spotId ? "spot" : r.activityId ? "activity" : r.eateryId ? "eatery" : r.accommodationId ? "accommodation" : "custom") as
        "spot" | "activity" | "eatery" | "accommodation" | "custom",
      spotId: r.spotId,
      atSpots: (r.activity?.spotLinks ?? []).map((l) => ({ id: l.spotId })),
      lat: r.customLat ?? (r.spotId || r.eateryId || r.accommodationId || r.activityId ? 1 : null),
      lng: r.customLng ?? (r.spotId || r.eateryId || r.accommodationId || r.activityId ? 1 : null),
      customPlace: r.customPlace,
    }));
    const anchors = anchorsOf(items);
    const updates: { id: string; parentId: string | null; order: number }[] = [];
    let head: string | null = null;
    let top = 0;
    const childCount = new Map<string, number>();
    items.forEach((it, i) => {
      const doing = anchors[i] != null || isTask(it);
      if (doing && head) {
        const n = childCount.get(head) ?? 0;
        childCount.set(head, n + 1);
        updates.push({ id: it.id, parentId: head, order: n });
      } else {
        head = it.id;
        updates.push({ id: it.id, parentId: null, order: top++ });
      }
    });
    moved += updates.filter((u) => u.parentId).length;
    if (!dry)
      await prisma.$transaction(
        updates.map((u) => prisma.tripItem.update({ where: { id: u.id }, data: { parentId: u.parentId, order: u.order } })),
      );
  }
  console.log(`${dry ? "[thử] " : ""}${moved} mục được gắn vào nơi của nó, trên ${days.length} ngày.`);
  process.exit(0);
}
main();
