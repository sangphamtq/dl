// Nhóm 63 tỉnh theo miền (slug theo seed). Dùng chung cho trang danh sách
// điểm đến và thanh chuyển nhanh.
export const REGIONS = [
  {
    label: "Miền Bắc",
    slugs: [
      "ha-noi", "hai-phong", "bac-giang", "bac-kan", "bac-ninh", "cao-bang",
      "dien-bien", "ha-giang", "ha-nam", "hai-duong", "hoa-binh", "hung-yen",
      "lai-chau", "lang-son", "lao-cai", "nam-dinh", "ninh-binh", "phu-tho",
      "quang-ninh", "son-la", "thai-binh", "thai-nguyen", "tuyen-quang",
      "vinh-phuc", "yen-bai",
    ],
  },
  {
    label: "Miền Trung & Tây Nguyên",
    slugs: [
      "thanh-hoa", "nghe-an", "ha-tinh", "quang-binh", "quang-tri",
      "thua-thien-hue", "da-nang", "quang-nam", "quang-ngai", "binh-dinh",
      "phu-yen", "khanh-hoa", "ninh-thuan", "binh-thuan", "kon-tum", "gia-lai",
      "dak-lak", "dak-nong", "lam-dong",
    ],
  },
  {
    label: "Miền Nam",
    slugs: [
      "ho-chi-minh", "ba-ria-vung-tau", "binh-duong", "binh-phuoc", "dong-nai",
      "tay-ninh", "an-giang", "bac-lieu", "ben-tre", "ca-mau", "can-tho",
      "dong-thap", "hau-giang", "kien-giang", "long-an", "soc-trang",
      "tien-giang", "tra-vinh", "vinh-long",
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
