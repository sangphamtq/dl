export const EATERY_CATEGORIES: { value: string; label: string }[] = [
  { value: "local", label: "Quán địa phương" },
  { value: "seafood", label: "Hải sản" },
  { value: "streetfood", label: "Đường phố" },
  { value: "vegetarian", label: "Chay" },
  { value: "cafe", label: "Cà phê" },
  { value: "bbq", label: "Nướng / lẩu" },
  { value: "other", label: "Khác" },
];

export const MEALS: { value: string; label: string }[] = [
  { value: "breakfast", label: "Sáng" },
  { value: "lunch", label: "Trưa" },
  { value: "dinner", label: "Tối" },
  { value: "cafe", label: "Cà phê" },
  { value: "snack", label: "Ăn vặt" },
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
