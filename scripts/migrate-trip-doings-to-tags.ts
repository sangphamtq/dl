import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { effectiveStayMin } from "@/lib/trip-time";

// Một lần: mục con của một nơi thôi mang giờ riêng (thời gian ở nơi đó là TỔNG, nằm ở nơi cha).
// · Hoạt động con → thẻ "làm gì ở đây": giờ của nó CỘNG vào nơi cha để giờ trong ngày không đổi.
// · Việc tự gõ con → đứng ra thành mục gốc ngay sau nơi cha, giữ nguyên giờ.
// Chạy lại được: thẻ đã chuyển mang stayMin = 0 nên lần sau cộng 0, không đổi gì.
async function main() {
  const dry = process.argv.includes("--dry");
  const trips = await prisma.trip.findMany({
    select: {
      id: true,
      title: true,
      items: {
        orderBy: { order: "asc" },
        select: {
          id: true, dayId: true, order: true, parentId: true, stayMin: true, customTitle: true,
          spotId: true, eateryId: true, accommodationId: true, activityId: true,
          customLat: true, customLng: true, customPlace: true,
          activity: { select: { name: true, durationText: true } },
        },
      },
    },
  });

  let tagged = 0;
  let lifted = 0;
  for (const trip of trips) {
    const kidsOf = new Map<string, typeof trip.items>();
    for (const i of trip.items)
      if (i.parentId) kidsOf.set(i.parentId, [...(kidsOf.get(i.parentId) ?? []), i]);
    if (kidsOf.size === 0) continue;

    const parentStay = new Map<string, number>();
    const tagReset: string[] = [];
    const liftAfter = new Map<string, string[]>();

    for (const [parentId, kids] of kidsOf) {
      const parent = trip.items.find((i) => i.id === parentId);
      if (!parent) continue;
      let add = 0;
      for (const k of kids.sort((a, b) => a.order - b.order)) {
        if (k.activityId) {
          // 0 = đã là thẻ (hoặc vốn không tính giờ) — cộng 0 thì khỏi ghi.
          if (k.stayMin === 0) continue;
          const min = effectiveStayMin({ kind: "activity", stayMin: k.stayMin, durationText: k.activity?.durationText });
          add += min;
          tagReset.push(k.id);
          console.log(`  thẻ   ${k.activity?.name} (+${min} phút vào nơi cha)`);
        } else {
          liftAfter.set(parentId, [...(liftAfter.get(parentId) ?? []), k.id]);
          console.log(`  tách  ${k.customTitle ?? k.id}`);
        }
      }
      if (add > 0) {
        const kind = parent.spotId ? "spot" : parent.eateryId ? "eatery" : parent.accommodationId ? "accommodation" : parent.activityId ? "activity" : "custom";
        const base = effectiveStayMin({
          kind, stayMin: parent.stayMin, lat: parent.customLat, lng: parent.customLng, customPlace: parent.customPlace,
          durationText: null,
        });
        parentStay.set(parentId, Math.min(24 * 60, base + add));
      }
    }

    const ops = [];
    for (const [id, stayMin] of parentStay) ops.push(prisma.tripItem.update({ where: { id }, data: { stayMin } }));
    // stayMin = 0 là dấu "đã chuyển thành thẻ" — thẻ không mang giờ nên giá trị này không hiện ở đâu.
    for (const id of tagReset) ops.push(prisma.tripItem.update({ where: { id }, data: { stayMin: 0 } }));

    // Tách việc tự gõ: đánh số lại mục gốc của từng ngày có dính.
    const days = new Set([...liftAfter.keys()].map((pid) => trip.items.find((i) => i.id === pid)!.dayId));
    for (const dayId of days) {
      const tops = trip.items.filter((i) => i.dayId === dayId && !i.parentId).sort((a, b) => a.order - b.order);
      const ids = tops.flatMap((t) => [t.id, ...(liftAfter.get(t.id) ?? [])]);
      ids.forEach((id, order) =>
        ops.push(prisma.tripItem.update({ where: { id }, data: { order, parentId: null, dayId } })),
      );
      lifted += ids.length - tops.length;
    }
    tagged += tagReset.length;
    if (ops.length) console.log(`→ ${trip.title}: ${parentStay.size} nơi cộng giờ`);
    if (!dry && ops.length) await prisma.$transaction(ops);
  }
  console.log(`${dry ? "[thử] " : ""}${tagged} hoạt động thành thẻ, ${lifted} việc tự gõ tách ra mục gốc.`);
  process.exit(0);
}
main();
