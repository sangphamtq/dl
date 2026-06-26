// Danh sách 63 tỉnh/thành (cấu trúc hành chính cũ) — nguồn chân lý dùng chung cho
// seed (prisma/seed-places.ts), lưới "Đã đến" (/tai-khoan/da-den) và bản đồ VN.
// slug = slugify(name); khớp với các slug nhóm theo miền trong lib/regions.ts.

// Slug tiếng Việt không dấu, nối bằng "-".
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
  "An Giang", "Bà Rịa - Vũng Tàu", "Bạc Liêu", "Bắc Giang", "Bắc Kạn",
  "Bắc Ninh", "Bến Tre", "Bình Dương", "Bình Định", "Bình Phước",
  "Bình Thuận", "Cà Mau", "Cao Bằng", "Cần Thơ", "Đà Nẵng",
  "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp",
  "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh",
  "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên",
  "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lạng Sơn",
  "Lào Cai", "Lâm Đồng", "Long An", "Nam Định", "Nghệ An",
  "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình",
  "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng",
  "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa",
  "Thừa Thiên Huế", "Tiền Giang", "Hồ Chí Minh", "Trà Vinh", "Tuyên Quang",
  "Vĩnh Long", "Vĩnh Phúc", "Yên Bái",
] as const;

export type ProvinceItem = { slug: string; name: string };

// 63 tỉnh dạng { slug, name } — đã sắp theo tên.
export const PROVINCES: ProvinceItem[] = PROVINCE_NAMES.map((name) => ({
  slug: slugifyVi(name),
  name,
}));

export const PROVINCE_COUNT = PROVINCES.length; // 63

// Tra tên hiển thị theo slug (cho lưới/bản đồ).
export const PROVINCE_NAME_BY_SLUG: Record<string, string> = Object.fromEntries(
  PROVINCES.map((p) => [p.slug, p.name]),
);
