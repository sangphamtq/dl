import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { PlaceKind, PublishStatus } from "@/generated/prisma/enums";
import { PROVINCE_NAMES, slugifyVi as slugify } from "@/lib/provinces";

// Seed 63 tỉnh/thành (cấu trúc hành chính cũ), KHÔNG nội dung chi tiết, để xem
// trang /diem-den. Ảnh fallback picsum theo slug.
// Idempotent (upsert theo slug). Dùng: pnpm seed:places
// Điểm đến lớn KHÔNG seed ở đây — mỗi nơi có seed riêng (seed-phan-thiet,
// seed-ta-xua…) hoặc nhập bằng CMS.

const now = new Date();
const PUB = { status: PublishStatus.published, publishedAt: now } as const;

// Tỉnh nổi bật (slug) — hiện khác trên trang danh sách.
const FEATURED_PROVINCES = new Set(["lao-cai", "quang-ninh", "lam-dong"]);

async function main() {
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
    await prisma.place.upsert({
      where: { slug },
      create: { slug, ...data },
      update: data,
    });
  }

  console.log(`Seeded ${PROVINCE_NAMES.length} tỉnh/thành.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
