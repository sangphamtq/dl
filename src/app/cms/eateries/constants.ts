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
  { value: "latenight", label: "Ăn đêm" },
  { value: "cafe", label: "Cà phê" },
  { value: "snack", label: "Ăn vặt" },
];

// Đến để ăn hay để ngồi — quyết định quán nằm ở section nào ngoài trang công khai.
export const VENUE_KINDS: { value: string; label: string; hint: string }[] = [
  { value: "eat", label: "Quán ăn", hint: "Đến để ăn — vào mục “Ăn ở đâu”." },
  {
    value: "drink",
    label: "Quán nước",
    hint: "Cà phê, trà, chè, sinh tố — vào mục “Quán nước & cà phê”.",
  },
  {
    value: "both",
    label: "Cả hai",
    hint: "Vừa ăn được vừa ngồi lâu — hiện ở cả hai mục.",
  },
];

export const VIEW_TYPES: { value: string; label: string }[] = [
  { value: "sea", label: "Biển" },
  { value: "valley", label: "Thung lũng" },
  { value: "cloud", label: "Biển mây" },
  { value: "mountain", label: "Núi" },
  { value: "lake", label: "Hồ" },
  { value: "river", label: "Sông" },
  { value: "city", label: "Thành phố" },
  { value: "oldtown", label: "Phố cổ" },
  { value: "rice", label: "Ruộng bậc thang" },
  { value: "garden", label: "Vườn" },
];

export function labelOf(
  list: { value: string; label: string }[],
  value: string | null,
): string | null {
  if (!value) return null;
  return list.find((x) => x.value === value)?.label ?? value;
}
