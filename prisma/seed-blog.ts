import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { PublishStatus } from "@/generated/prisma/enums";

// Seed vài bài blog mẫu (kèm PostRef tới dữ liệu Phan Thiết). Chạy SAU seed:phan-thiet.
// Dùng: pnpm seed:blog
const now = new Date();
const img = (seed: string) => `https://picsum.photos/seed/${seed}/1200/630`;

async function setCover(postId: string, seed: string, alt: string) {
  await prisma.image.deleteMany({ where: { postId } });
  await prisma.image.create({
    data: { postId, url: img(seed), alt, isCover: true, order: 0 },
  });
}

async function main() {
  const author =
    (await prisma.user.findFirst({
      where: { role: { in: ["admin", "editor"] } },
      select: { id: true },
    })) ?? (await prisma.user.findFirst({ select: { id: true } }));

  if (!author) {
    console.error(
      "Cần ít nhất 1 user (đăng nhập Google 1 lần) để làm tác giả. Bỏ qua seed blog.",
    );
    return;
  }

  // Lấy id các đối tượng Phan Thiết để gắn PostRef.
  const [phanThiet, eateries, specialties] = await Promise.all([
    prisma.place.findUnique({ where: { slug: "phan-thiet" }, select: { id: true } }),
    prisma.eatery.findMany({
      where: { slug: { in: ["hai-san-bo-ke-24", "lau-tha-hong-ngoc", "banh-can-cay-phuong"] } },
      select: { id: true },
    }),
    prisma.specialty.findMany({
      where: { slug: { in: ["nuoc-mam-phan-thiet", "banh-can-phan-thiet", "lau-tha-phan-thiet"] } },
      select: { id: true },
    }),
  ]);

  if (!phanThiet) {
    console.error("Chưa có Phan Thiết — chạy `pnpm seed:phan-thiet` trước.");
    return;
  }

  const posts = [
    {
      slug: "cam-nang-phan-thiet-3-ngay-2-dem",
      title: "Cẩm nang Phan Thiết 3 ngày 2 đêm",
      excerpt:
        "Lịch trình gợi ý khám phá Mũi Né, đồi cát và hải sản Phan Thiết trong 3 ngày.",
      category: "cam-nang",
      content:
        "<h2>Ngày 1</h2><p>Đến Phan Thiết, nhận phòng, chiều ra <strong>Bãi đá Ông Địa</strong> ngắm hoàng hôn.</p><h2>Ngày 2</h2><p>Dậy sớm săn bình minh trên <strong>Đồi cát bay</strong>, trượt cát, ghé <strong>Suối Tiên</strong>. Tối ăn hải sản bờ kè.</p><h2>Ngày 3</h2><p>Tham quan <strong>Bàu Trắng</strong>, mua đặc sản về làm quà rồi khởi hành về.</p>",
      cover: "phan-thiet-blog-camnang",
      refs: [
        { placeId: phanThiet.id },
        ...specialties.map((s) => ({ specialtyId: s.id })),
      ],
    },
    {
      slug: "top-quan-ngon-phan-thiet",
      title: "Ăn gì ở Phan Thiết? Top quán ngon nên thử",
      excerpt:
        "Lẩu thả, bánh căn, gỏi cá mai và những quán hải sản đáng đồng tiền ở Phan Thiết.",
      category: "am-thuc",
      content:
        "<p>Phan Thiết là thiên đường hải sản giá mềm. Dưới đây là vài địa chỉ được người địa phương yêu thích.</p><ul><li>Hải sản tươi, chế biến nhanh ở khu bờ kè.</li><li>Lẩu thả — món trứ danh nhất định phải thử.</li><li>Bánh căn ăn sáng đậm vị miền biển.</li></ul>",
      cover: "phan-thiet-blog-amthuc",
      refs: [
        { placeId: phanThiet.id },
        ...eateries.map((e) => ({ eateryId: e.id })),
      ],
    },
  ];

  for (const p of posts) {
    const { slug, refs, cover, ...data } = p;
    const row = await prisma.post.upsert({
      where: { slug },
      update: {
        ...data,
        status: PublishStatus.published,
        publishedAt: now,
        refs: { deleteMany: {}, create: refs.map((r, i) => ({ order: i, ...r })) },
      },
      create: {
        slug,
        ...data,
        authorId: author.id,
        status: PublishStatus.published,
        publishedAt: now,
        refs: { create: refs.map((r, i) => ({ order: i, ...r })) },
      },
    });
    await setCover(row.id, cover, p.title);
  }

  console.log(`✓ Seed blog xong: ${posts.length} bài (gắn PostRef tới Phan Thiết).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
