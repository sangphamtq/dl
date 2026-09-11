export const SORTS = [
  { key: "noi-bat", label: "Nổi bật" },
  { key: "pho-bien", label: "Phổ biến" },
  { key: "a-z", label: "A → Z" },
] as const;

export type SortKey = (typeof SORTS)[number]["key"];
