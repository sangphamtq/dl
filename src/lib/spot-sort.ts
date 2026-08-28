// Các kiểu sắp xếp của trang /dia-diem.
//
// Để ở module RIÊNG, không phải trong `spot-controls.tsx`: file đó có
// `"use client"`, và Server Component import một hằng từ module client thì vỡ
// lúc dựng ("__TURBOPACK__imported__module__… is not a function"). Trang cần
// `SORTS` để đối chiếu `?sap-xep=` và dựng `orderBy`, nên hằng phải sống ở chỗ
// cả hai phía dùng được.
export const SORTS = [
  { key: "noi-bat", label: "Nổi bật" },
  { key: "pho-bien", label: "Phổ biến" },
  { key: "a-z", label: "A → Z" },
] as const;

export type SortKey = (typeof SORTS)[number]["key"];
