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

export function labelOf(
  list: { value: string; label: string }[],
  value: string | null,
): string | null {
  if (!value) return null;
  return list.find((x) => x.value === value)?.label ?? value;
}
