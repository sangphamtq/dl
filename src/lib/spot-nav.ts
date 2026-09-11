import type { SectionItem } from "@/components/site/spot-section-nav";

export type SpotNavFlags = {
  hasIntro: boolean;
  hasHighlights: boolean;
  hasActivities: boolean;
  hasExperience: boolean;
  hasBestTime: boolean;
  hasGettingThere: boolean;
  hasNearby: boolean;
};

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
    {
      id: "ban-do",
      label: "Bản đồ",
      href: `/diem-den/${placeSlug}/di-chuyen`,
      icon: "map",
    },
  ];
  return items.filter((x): x is SectionItem => Boolean(x));
}
