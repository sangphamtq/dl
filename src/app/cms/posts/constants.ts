// Phân loại bài viết (editorial). value lưu DB, label hiển thị.
export const POST_CATEGORIES: { value: string; label: string }[] = [
  { value: "cam-nang", label: "Cẩm nang" },
  { value: "am-thuc", label: "Ẩm thực" },
  { value: "luu-tru", label: "Lưu trú" },
  { value: "trai-nghiem", label: "Trải nghiệm" },
  { value: "di-chuyen", label: "Di chuyển" },
  { value: "tin-tuc", label: "Tin tức" },
];

export function labelOf(
  list: { value: string; label: string }[],
  value: string | null,
): string | null {
  if (!value) return null;
  return list.find((x) => x.value === value)?.label ?? value;
}
