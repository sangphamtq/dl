// Hằng số & nhãn cho diễn đàn cộng đồng (/cong-dong).

export const THREAD_TYPES = [
  { value: "share", label: "Chia sẻ", desc: "Trải nghiệm sau chuyến đi" },
  { value: "question", label: "Hỏi đáp", desc: "Hỏi trước khi đi" },
  { value: "trip", label: "Tìm bạn đồng hành", desc: "Rủ nhau, hẹn nhau cùng đi" },
  { value: "discussion", label: "Thảo luận", desc: "Bàn luận chung" },
] as const;

export type ThreadTypeValue = (typeof THREAD_TYPES)[number]["value"];

export const THREAD_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  THREAD_TYPES.map((t) => [t.value, t.label]),
);

export function isThreadType(v: string): v is ThreadTypeValue {
  return THREAD_TYPES.some((t) => t.value === v);
}

export const THREAD_SORTS = [
  { value: "active", label: "Hoạt động" }, // theo cập nhật (lastActivityAt)
  { value: "new", label: "Mới nhất" }, // theo ngày tạo (createdAt)
] as const;

export type ThreadSort = (typeof THREAD_SORTS)[number]["value"];

export function isThreadSort(v: string): v is ThreadSort {
  return THREAD_SORTS.some((s) => s.value === v);
}
