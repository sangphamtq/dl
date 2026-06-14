import { prisma } from "@/lib/prisma";

export type RefOption = { value: string; label: string };

// Gộp các đối tượng có thể gắn vào bài viết (PostRef) thành một danh sách
// "type:id" → nhãn có tiền tố loại, cho multi-select tìm kiếm.
export async function getRefOptions(): Promise<RefOption[]> {
  const [places, activities, spots, specialties, eateries, accommodations] =
    await Promise.all([
      prisma.place.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.activity.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.spot.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.specialty.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.eatery.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.accommodation.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);

  return [
    ...places.map((x) => ({ value: `place:${x.id}`, label: `Điểm đến: ${x.name}` })),
    ...activities.map((x) => ({ value: `activity:${x.id}`, label: `Hoạt động: ${x.name}` })),
    ...spots.map((x) => ({ value: `spot:${x.id}`, label: `Địa điểm: ${x.name}` })),
    ...specialties.map((x) => ({ value: `specialty:${x.id}`, label: `Đặc sản: ${x.name}` })),
    ...eateries.map((x) => ({ value: `eatery:${x.id}`, label: `Quán ăn: ${x.name}` })),
    ...accommodations.map((x) => ({ value: `accommodation:${x.id}`, label: `Lưu trú: ${x.name}` })),
  ];
}
