// Nhãn hiển thị cho enum của Activity.
export const ACTIVITY_CATEGORIES: { value: string; label: string }[] = [
  { value: "adventure", label: "Mạo hiểm" },
  { value: "nature", label: "Thiên nhiên" },
  { value: "culture", label: "Văn hóa" },
  { value: "relax", label: "Thư giãn" },
  { value: "water", label: "Dưới nước" },
  { value: "food", label: "Ẩm thực" },
  { value: "other", label: "Khác" },
];

export const ACTIVITY_DIFFICULTIES: { value: string; label: string }[] = [
  { value: "easy", label: "Dễ" },
  { value: "moderate", label: "Vừa" },
  { value: "hard", label: "Khó" },
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
