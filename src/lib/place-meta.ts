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

// Thứ tự & nhãn ngắn các loại listing có trang danh sách ("xem tất cả").
const LOAI_TABS: { key: keyof PlaceCounts; loai: string; label: string }[] = [
  { key: "activity", loai: "hoat-dong", label: "Trải nghiệm" },
  { key: "spot", loai: "dia-diem", label: "Tham quan" },
  { key: "specialty", loai: "dac-san", label: "Đặc sản" },
  { key: "eatery", loai: "quan-an", label: "Quán ăn" },
  { key: "accommodation", loai: "luu-tru", label: "Nơi lưu trú" },
];

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
export function buildPlaceTabs(placeSlug: string, counts: PlaceCounts): PlaceTab[] {
  const tabs: PlaceTab[] = [
    { href: `/diem-den/${placeSlug}`, label: "Tổng quan" },
  ];
  for (const t of LOAI_TABS) {
    if (counts[t.key] > 0) {
      tabs.push({ href: `/diem-den/${placeSlug}/${t.loai}`, label: t.label });
    }
  }
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
