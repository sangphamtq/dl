import { Eye, MapPin, Utensils, BedDouble, type LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";

const pub = { status: "published" as const };

export type PlaceCounts = {
  activity: number;
  spot: number;
  specialty: number;
  eatery: number;
  accommodation: number;
};


// Dữ liệu header dùng chung cho trang Place & trang danh sách listing.
export async function getPlaceHeader(placeSlug: string) {
  return prisma.place.findUnique({
    where: { slug: placeSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
      status: true,
      tagline: true,
      provinceName: true,
      isFeatured: true,
      viewCount: true,
      parent: { select: { slug: true, name: true } },
      images: {
        orderBy: [{ isCover: "desc" }, { order: "asc" }],
        select: { url: true, alt: true, caption: true, isCover: true },
      },
    },
  });
}

export async function getPlaceCounts(placeId: string): Promise<PlaceCounts> {
  const [activity, spot, specialty, eatery, accommodation] = await Promise.all([
    prisma.activity.count({ where: { placeId, ...pub } }),
    prisma.spot.count({ where: { placeId, ...pub } }),
    prisma.specialty.count({ where: { placeId, ...pub } }),
    prisma.eatery.count({ where: { placeId, ...pub } }),
    prisma.accommodation.count({ where: { placeId, ...pub } }),
  ]);
  return { activity, spot, specialty, eatery, accommodation };
}

export type PlaceTab = { href: string; label: string };

// Tabs sticky: "Tổng quan" về trang Place + mỗi loại listing có dữ liệu → trang "xem tất cả".
// Đặc sản + Quán ăn gộp chung thành một tab "Ẩm thực" (trang /am-thuc hiển thị cả hai).
export function buildPlaceTabs(placeSlug: string, counts: PlaceCounts): PlaceTab[] {
  const base = `/diem-den/${placeSlug}`;
  const tabs: PlaceTab[] = [{ href: base, label: "Tổng quan" }];
  const add = (loai: string, label: string) =>
    tabs.push({ href: `${base}/${loai}`, label });

  if (counts.activity > 0) add("hoat-dong", "Trải nghiệm");
  if (counts.spot > 0) add("dia-diem", "Tham quan");
  if (counts.specialty + counts.eatery > 0) add("am-thuc", "Ẩm thực");
  if (counts.accommodation > 0) add("luu-tru", "Nơi lưu trú");

  return tabs;
}

export type PlaceStat = { icon: LucideIcon; value: number; label: string };

export function buildPlaceStats(
  viewCount: number,
  counts: PlaceCounts,
): PlaceStat[] {
  return [
    { icon: Eye, value: viewCount, label: "lượt xem" },
    counts.spot > 0 && { icon: MapPin, value: counts.spot, label: "điểm tham quan" },
    counts.eatery > 0 && { icon: Utensils, value: counts.eatery, label: "quán ăn" },
    counts.accommodation > 0 && {
      icon: BedDouble,
      value: counts.accommodation,
      label: "chỗ ở",
    },
  ].filter(Boolean) as PlaceStat[];
}
