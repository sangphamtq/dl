import type { SectionItem } from "@/components/site/spot-section-nav";

// Cờ nội dung quyết định mục nào xuất hiện trên thanh nav của trang địa điểm.
export type SpotNavFlags = {
  hasIntro: boolean;
  hasHighlights: boolean;
  hasActivities: boolean;
  hasExperience: boolean; // tips hoặc notice
  hasBestTime: boolean;
  hasGettingThere: boolean;
  hasNearby: boolean;
};

// Xây mục nav cho trang địa điểm — DÙNG CHUNG giữa trang chi tiết và trang con.
// Mục nội dung (bên trái): trên trang chi tiết là anchor cuộn trong trang (id);
// trên trang con (community=true) là link về "/dia-diem/[slug]#id".
// Nhóm bên phải (có icon, giống điểm đến): "Cộng đồng" → trang cộng đồng riêng;
// "Bản đồ" → trang "Di chuyển" của điểm đến cha.
export function buildSpotNavItems(
  slug: string,
  placeSlug: string,
  flags: SpotNavFlags,
  opts: { community?: boolean } = {},
): SectionItem[] {
  const base = `/dia-diem/${slug}`;
  const anchor = (id: string, label: string): SectionItem =>
    opts.community ? { id, label, href: `${base}#${id}` } : { id, label };

  const items: (SectionItem | false)[] = [
    flags.hasIntro && anchor("gioi-thieu", "Giới thiệu"),
    flags.hasHighlights && anchor("diem-nhan", "Điểm nhấn"),
    flags.hasActivities && anchor("hoat-dong", "Làm gì ở đây"),
    flags.hasExperience && anchor("kinh-nghiem", "Kinh nghiệm"),
    flags.hasBestTime && anchor("khi-nao", "Khi nào đẹp"),
    flags.hasGettingThere && anchor("cach-den", "Cách đến"),
    flags.hasNearby && anchor("quanh-day", "Quanh đây"),
    anchor("danh-gia", "Đánh giá"),
    // Nhóm bên phải (có icon):
    {
      id: "cong-dong",
      label: "Cộng đồng",
      href: `${base}/cong-dong`,
      icon: "community",
    },
    {
      id: "ban-do",
      label: "Bản đồ",
      href: `/diem-den/${placeSlug}/di-chuyen`,
      icon: "map",
    },
  ];
  return items.filter((x): x is SectionItem => Boolean(x));
}
