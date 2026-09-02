// Danh sách 34 tỉnh/thành — đơn vị hành chính có hiệu lực từ 1/7/2025 (sáp nhập
// 63 → 34, đồng thời BỎ HẲN cấp huyện: nay chỉ còn tỉnh → xã/phường/đặc khu).
// Nguồn chân lý dùng chung cho seed (prisma/seed-places.ts), lưới "Đã đến"
// (/tai-khoan/da-den) và bản đồ VN (components/account/vietnam-map-paths.ts).
//
// LƯU Ý — đây là danh sách HÀNH CHÍNH, không phải danh sách điểm đến. Nhiều tên
// tỉnh cũ đã mất (Hà Giang, Bình Thuận, Quảng Nam…) nhưng vẫn là thương hiệu du
// lịch mạnh; chúng sống tiếp dưới dạng `Place` kind=destination thuộc tỉnh mới,
// giữ nguyên slug/URL. Đừng đồng nhất hai lớp này.

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
  "An Giang", "Bắc Ninh", "Cà Mau", "Cao Bằng", "Cần Thơ",
  "Đà Nẵng", "Đắk Lắk", "Điện Biên", "Đồng Nai", "Đồng Tháp",
  "Gia Lai", "Hà Nội", "Hà Tĩnh", "Hải Phòng", "Hồ Chí Minh",
  "Huế", "Hưng Yên", "Khánh Hòa", "Lai Châu", "Lạng Sơn",
  "Lào Cai", "Lâm Đồng", "Nghệ An", "Ninh Bình", "Phú Thọ",
  "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sơn La", "Tây Ninh",
  "Thái Nguyên", "Thanh Hóa", "Tuyên Quang", "Vĩnh Long",
] as const;

export type ProvinceItem = { slug: string; name: string };

// 34 tỉnh dạng { slug, name } — đã sắp theo tên.
const PROVINCES: ProvinceItem[] = PROVINCE_NAMES.map((name) => ({
  slug: slugifyVi(name),
  name,
}));

export const PROVINCE_COUNT = PROVINCES.length; // 34

// Tra tên hiển thị theo slug (cho lưới/bản đồ).
export const PROVINCE_NAME_BY_SLUG: Record<string, string> = Object.fromEntries(
  PROVINCES.map((p) => [p.slug, p.name]),
);
