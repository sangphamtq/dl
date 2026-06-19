import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { PlaceKind, PublishStatus } from "@/generated/prisma/enums";

// Seed 63 tỉnh/thành (cấu trúc hành chính cũ) + vài điểm đến lớn mẫu, KHÔNG nội
// dung chi tiết, để xem trang /diem-den. Ảnh fallback picsum theo slug.
// Idempotent (upsert theo slug). Dùng: pnpm seed:places

const now = new Date();
const PUB = { status: PublishStatus.published, publishedAt: now } as const;

// Slug tiếng Việt không dấu.
function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const PROVINCE_NAMES = [
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
];

// Tỉnh nổi bật (slug) — hiện khác trên trang danh sách.
const FEATURED_PROVINCES = new Set(["lao-cai", "quang-ninh", "lam-dong"]);

// parent = slug tỉnh
const DESTINATIONS = [
  { slug: "sa-pa", name: "Sa Pa", parent: "lao-cai", featured: true, tagline: "Săn mây, ruộng bậc thang, đỉnh Fansipan." },
  { slug: "ha-long", name: "Hạ Long", parent: "quang-ninh", featured: true, tagline: "Du thuyền giữa vịnh di sản." },
  { slug: "hoi-an", name: "Hội An", parent: "quang-nam", featured: true, tagline: "Phố cổ đèn lồng bên sông Hoài." },
  { slug: "da-lat", name: "Đà Lạt", parent: "lam-dong", tagline: "Thành phố ngàn hoa, sương và thông." },
  { slug: "nha-trang", name: "Nha Trang", parent: "khanh-hoa", tagline: "Biển đảo, lặn ngắm san hô." },
  { slug: "co-to", name: "Cô Tô", parent: "quang-ninh", tagline: "Đảo hoang sơ, biển trong vắt." },

  // 23 điểm đến toàn quốc (không nội dung chi tiết)
  { slug: "moc-chau", name: "Mộc Châu", parent: "son-la", tagline: "Đồi chè, mùa hoa mận trắng." },
  { slug: "mai-chau", name: "Mai Châu", parent: "hoa-binh", tagline: "Thung lũng bản Thái, ruộng xanh." },
  { slug: "tam-dao", name: "Tam Đảo", parent: "vinh-phuc", tagline: "Thị trấn mây mù trên núi." },
  { slug: "trang-an", name: "Tràng An", parent: "ninh-binh", tagline: "Hang động, sông nước, núi đá vôi." },
  { slug: "cat-ba", name: "Cát Bà", parent: "hai-phong", tagline: "Đảo ngọc vịnh Lan Hạ." },
  { slug: "mu-cang-chai", name: "Mù Cang Chải", parent: "yen-bai", tagline: "Ruộng bậc thang mùa lúa chín." },
  { slug: "dong-van", name: "Đồng Văn", parent: "ha-giang", featured: true, tagline: "Cao nguyên đá, đèo Mã Pí Lèng." },
  { slug: "ba-vi", name: "Ba Vì", parent: "ha-noi", tagline: "Rừng thông, núi mát gần Hà Nội." },
  { slug: "pu-luong", name: "Pù Luông", parent: "thanh-hoa", tagline: "Khu bảo tồn, ruộng bậc thang." },
  { slug: "phong-nha", name: "Phong Nha", parent: "quang-binh", featured: true, tagline: "Vương quốc hang động kỳ vĩ." },
  { slug: "ba-na-hills", name: "Bà Nà Hills", parent: "da-nang", tagline: "Cầu Vàng, làng Pháp trên mây." },
  { slug: "ly-son", name: "Lý Sơn", parent: "quang-ngai", tagline: "Đảo tỏi, biển xanh núi lửa." },
  { slug: "quy-nhon", name: "Quy Nhơn", parent: "binh-dinh", tagline: "Biển Kỳ Co, Eo Gió." },
  { slug: "ganh-da-dia", name: "Gành Đá Đĩa", parent: "phu-yen", tagline: "Đá bazan xếp tổ ong ven biển." },
  { slug: "mang-den", name: "Măng Đen", parent: "kon-tum", tagline: "Đà Lạt thu nhỏ giữa rừng thông." },
  { slug: "bien-ho", name: "Biển Hồ", parent: "gia-lai", tagline: "Hồ nước trong xanh trên cao nguyên." },
  { slug: "buon-ma-thuot", name: "Buôn Ma Thuột", parent: "dak-lak", tagline: "Thủ phủ cà phê, thác và buôn làng." },
  { slug: "mui-ne", name: "Mũi Né", parent: "binh-thuan", tagline: "Đồi cát bay, biển nắng." },
  { slug: "vung-tau", name: "Vũng Tàu", parent: "ba-ria-vung-tau", tagline: "Biển gần Sài Gòn, tượng Chúa." },
  { slug: "con-dao", name: "Côn Đảo", parent: "ba-ria-vung-tau", tagline: "Đảo hoang sơ, biển và di tích." },
  { slug: "phu-quoc", name: "Phú Quốc", parent: "kien-giang", featured: true, tagline: "Đảo ngọc, biển cát trắng." },
  { slug: "chau-doc", name: "Châu Đốc", parent: "an-giang", tagline: "Núi Sam, rừng tràm Trà Sư." },
  { slug: "can-gio", name: "Cần Giờ", parent: "ho-chi-minh", tagline: "Rừng ngập mặn, biển gần thành phố." },
];

async function main() {
  const idBySlug = new Map<string, string>();

  for (let i = 0; i < PROVINCE_NAMES.length; i++) {
    const name = PROVINCE_NAMES[i];
    const slug = slugify(name);
    const data = {
      name,
      kind: PlaceKind.province,
      parentId: null,
      provinceName: name,
      isFeatured: FEATURED_PROVINCES.has(slug),
      order: i,
      ...PUB,
    };
    const place = await prisma.place.upsert({
      where: { slug },
      create: { slug, ...data },
      update: data,
      select: { id: true },
    });
    idBySlug.set(slug, place.id);
  }

  for (let i = 0; i < DESTINATIONS.length; i++) {
    const d = DESTINATIONS[i];
    const parentId = idBySlug.get(d.parent);
    if (!parentId) {
      console.warn(`Bỏ qua ${d.slug}: không thấy tỉnh cha ${d.parent}`);
      continue;
    }
    const data = {
      name: d.name,
      kind: PlaceKind.destination,
      parentId,
      tagline: d.tagline,
      provinceName: PROVINCE_NAMES.find((n) => slugify(n) === d.parent) ?? null,
      isFeatured: d.featured ?? false,
      order: i,
      ...PUB,
    };
    await prisma.place.upsert({
      where: { slug: d.slug },
      create: { slug: d.slug, ...data },
      update: data,
    });
  }

  console.log(
    `Seeded ${PROVINCE_NAMES.length} tỉnh/thành + ${DESTINATIONS.length} điểm đến.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
