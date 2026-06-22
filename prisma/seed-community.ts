import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { ThreadType } from "@/generated/prisma/enums";
import { slugify } from "@/lib/slug";

// Seed vài bài cộng đồng mẫu (kiểu Facebook, văn bản thường). Dùng: pnpm seed:community
// Lưu ý: xóa sạch thread cũ trước khi seed (dữ liệu dev).
async function main() {
  const author =
    (await prisma.user.findFirst({
      where: { role: { in: ["admin", "editor"] } },
      select: { id: true },
    })) ?? (await prisma.user.findFirst({ select: { id: true } }));

  if (!author) {
    console.error("Cần ít nhất 1 user để làm tác giả. Bỏ qua seed cộng đồng.");
    return;
  }

  const phanThiet = await prisma.place.findUnique({
    where: { slug: "phan-thiet" },
    select: { id: true },
  });

  const posts = [
    {
      type: ThreadType.share,
      placeId: phanThiet?.id ?? null,
      body: "Vừa đi Phan Thiết về, chia sẻ chút cho mọi người nè! Đồi cát bay buổi sáng siêu đẹp, hải sản bờ kè vừa rẻ vừa tươi. Mình ở Mũi Né, thuê xe máy 120k/ngày đi lại rất tiện.",
    },
    {
      type: ThreadType.question,
      placeId: phanThiet?.id ?? null,
      body: "Tháng 7 đi Phan Thiết có mưa nhiều không mọi người? Biển có tắm được không ạ? Ai đi rồi cho mình xin ít kinh nghiệm với 🙏",
    },
    {
      type: ThreadType.trip,
      placeId: phanThiet?.id ?? null,
      body: "Nhóm mình 4 người đi Phan Thiết cuối tháng, đi ô tô tự lái từ Sài Gòn, còn 2 chỗ. Ai muốn ghép đoàn cho vui thì comment nhé, chia tiền xăng + phòng 🚗",
    },
    {
      type: ThreadType.discussion,
      placeId: null,
      body: "Mọi người hay đặt phòng qua app/kênh nào để được giá tốt nhất nhỉ? Mình hay so giá vài chỗ mà vẫn thấy rối.",
    },
  ];

  // Dọn dữ liệu cũ (dev) rồi seed lại.
  await prisma.thread.deleteMany({});

  for (const p of posts) {
    const slug =
      slugify(p.body).split("-").slice(0, 8).join("-").slice(0, 80) || "bai-viet";
    await prisma.thread.create({
      data: {
        slug,
        body: p.body,
        type: p.type,
        authorId: author.id,
        placeId: p.placeId,
        lastActivityAt: new Date(),
      },
    });
  }

  console.log(`✓ Seed cộng đồng xong: ${posts.length} bài.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
