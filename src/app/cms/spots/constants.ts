// Nhãn hiển thị cho enum của Spot.
export const SPOT_CATEGORIES: { value: string; label: string }[] = [
  { value: "beach", label: "Biển" },
  { value: "mountain", label: "Núi" },
  { value: "waterfall", label: "Thác" },
  { value: "lake", label: "Hồ" },
  { value: "cave", label: "Hang động" },
  { value: "temple", label: "Đền / Chùa" },
  { value: "viewpoint", label: "Điểm ngắm cảnh" },
  { value: "village", label: "Làng" },
  { value: "island", label: "Đảo" },
  { value: "park", label: "Công viên" },
  { value: "other", label: "Khác" },
];

export const PRICE_RANGES: { value: string; label: string }[] = [
  { value: "budget", label: "$ · Bình dân" },
  { value: "moderate", label: "$$ · Vừa" },
  { value: "premium", label: "$$$ · Cao" },
  { value: "luxury", label: "$$$$ · Sang" },
];

export function labelOf(
  list: { value: string; label: string }[],
  value: string | null,
): string | null {
  if (!value) return null;
  return list.find((x) => x.value === value)?.label ?? value;
}
