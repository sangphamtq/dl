// Nhóm 34 tỉnh (đơn vị hành chính từ 1/7/2025) theo miền — slug theo seed.
// Dùng chung cho trang danh sách điểm đến và thanh chuyển nhanh.
//
// Sau sáp nhập, MIỀN là trục duyệt bền hơn TỈNH: một tỉnh mới có thể ôm hai kiểu
// chuyến khác hẳn nhau (Lâm Đồng gồm cả Đà Lạt cao nguyên lẫn Mũi Né biển; Gia
// Lai gồm cả Pleiku lẫn Quy Nhơn), còn miền thì không đổi nghĩa.
export const REGIONS = [
  {
    label: "Miền Bắc",
    slugs: [
      "ha-noi", "hai-phong", "bac-ninh", "cao-bang", "dien-bien",
      "hung-yen", "lai-chau", "lang-son", "lao-cai", "ninh-binh",
      "phu-tho", "quang-ninh", "son-la", "thai-nguyen", "tuyen-quang",
    ],
  },
  {
    label: "Miền Trung & Tây Nguyên",
    slugs: [
      "thanh-hoa", "nghe-an", "ha-tinh", "quang-tri", "hue",
      "da-nang", "quang-ngai", "gia-lai", "dak-lak", "khanh-hoa",
      "lam-dong",
    ],
  },
  {
    label: "Miền Nam",
    slugs: [
      "ho-chi-minh", "dong-nai", "tay-ninh", "an-giang", "ca-mau",
      "can-tho", "dong-thap", "vinh-long",
    ],
  },
] as const;

// Thứ tự miền (kèm "Khác" cho tỉnh chưa map).
export const REGION_LABELS = [...REGIONS.map((r) => r.label), "Khác"];

// Suy miền từ slug tỉnh.
export function regionOf(provinceSlug?: string | null): string {
  if (!provinceSlug) return "Khác";
  const r = REGIONS.find((x) =>
    (x.slugs as readonly string[]).includes(provinceSlug),
  );
  return r ? r.label : "Khác";
}
