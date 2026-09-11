export function slugifyVi(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const PROVINCE_NAMES = [
  "An Giang", "Bắc Ninh", "Cà Mau", "Cao Bằng", "Cần Thơ",
  "Đà Nẵng", "Đắk Lắk", "Điện Biên", "Đồng Nai", "Đồng Tháp",
  "Gia Lai", "Hà Nội", "Hà Tĩnh", "Hải Phòng", "Hồ Chí Minh",
  "Huế", "Hưng Yên", "Khánh Hòa", "Lai Châu", "Lạng Sơn",
  "Lào Cai", "Lâm Đồng", "Nghệ An", "Ninh Bình", "Phú Thọ",
  "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sơn La", "Tây Ninh",
  "Thái Nguyên", "Thanh Hóa", "Tuyên Quang", "Vĩnh Long",
] as const;

export type ProvinceItem = { slug: string; name: string };

const PROVINCES: ProvinceItem[] = PROVINCE_NAMES.map((name) => ({
  slug: slugifyVi(name),
  name,
}));

export const PROVINCE_COUNT = PROVINCES.length;
export const PROVINCE_NAME_BY_SLUG: Record<string, string> = Object.fromEntries(
  PROVINCES.map((p) => [p.slug, p.name]),
);
