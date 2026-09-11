import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { ThreadType, ContentReportReason } from "@/generated/prisma/enums";
import { slugify } from "@/lib/slug";

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { role: "desc" }, // ưu tiên admin/editor lên đầu
    take: 3,
    select: { id: true },
  });
  const author = users[0];
  if (!author) {
    console.error("Cần ít nhất 1 user để làm tác giả. Bỏ qua seed cộng đồng.");
    return;
  }
  const other = users[1]?.id ?? author.id;
  const third = users[2]?.id ?? other;

  const phanThiet = await prisma.place.findUnique({
    where: { slug: "phan-thiet" },
    select: { id: true },
  });

  const depart = new Date();
  depart.setDate(depart.getDate() + 14);

  await prisma.thread.deleteMany({});

  const mkSlug = (body: string) =>
    slugify(body).split("-").slice(0, 8).join("-").slice(0, 80) || "bai-viet";

  const share = await prisma.thread.create({
    data: {
      slug: mkSlug("chia se phan thiet do cat bay"),
      body: "Vừa đi Phan Thiết về, chia sẻ chút cho mọi người nè! Đồi cát bay buổi sáng siêu đẹp, hải sản bờ kè vừa rẻ vừa tươi. Mình ở Mũi Né, thuê xe máy 120k/ngày đi lại rất tiện.",
      type: ThreadType.share,
      authorId: author.id,
      placeId: phanThiet?.id ?? null,
      lastActivityAt: new Date(),
      replies: {
        create: [
          { authorId: other, content: "Cảm ơn bạn, thông tin hữu ích quá!" },
          {
            authorId: third,
            content: "ĐẶT TOUR GIÁ RẺ INBOX ZALO 09xx nhé cả nhà, phòng đẹp giá sốc!!!",
          },
        ],
      },
    },
    select: { id: true, replies: { select: { id: true, content: true } } },
  });
  await prisma.thread.update({
    where: { id: share.id },
    data: { replyCount: share.replies.length },
  });
  const spamReply = share.replies.find((r) => r.content.includes("ZALO"));

  await prisma.thread.create({
    data: {
      slug: mkSlug("thang 7 phan thiet co mua khong"),
      body: "Tháng 7 đi Phan Thiết có mưa nhiều không mọi người? Biển có tắm được không ạ? Ai đi rồi cho mình xin ít kinh nghiệm với 🙏",
      type: ThreadType.question,
      authorId: other,
      placeId: phanThiet?.id ?? null,
      lastActivityAt: new Date(),
    },
  });

  await prisma.thread.create({
    data: {
      slug: mkSlug("ghep doan phan thiet cuoi thang"),
      body: "Nhóm mình 4 người đi Phan Thiết cuối tháng, đi ô tô tự lái từ Sài Gòn, còn 2 chỗ. Ai muốn ghép đoàn cho vui thì comment nhé, chia tiền xăng + phòng 🚗",
      type: ThreadType.trip,
      authorId: author.id,
      placeId: phanThiet?.id ?? null,
      departDate: depart,
      slots: 2,
      lastActivityAt: new Date(),
    },
  });

  const discussion = await prisma.thread.create({
    data: {
      slug: mkSlug("mua ve may bay gia re o dau"),
      body: "SĂN VÉ MÁY BAY GIÁ RẺ 0Đ — liên hệ ngay page mình để được giá tốt nhất thị trường, cam kết rẻ nhất!!! Inbox ngay kẻo lỡ.",
      type: ThreadType.discussion,
      authorId: third,
      placeId: null,
      lastActivityAt: new Date(),
    },
    select: { id: true },
  });

  await prisma.contentReport.create({
    data: {
      reason: ContentReportReason.spam,
      note: "Quảng cáo bán vé, không phải thảo luận.",
      reporterId: author.id,
      threadId: discussion.id,
    },
  });
  if (spamReply) {
    await prisma.contentReport.create({
      data: {
        reason: ContentReportReason.scam,
        note: "Nghi lừa cọc, spam Zalo trong bình luận.",
        reporterId: author.id,
        replyId: spamReply.id,
      },
    });
  }

  console.log(
    "✓ Seed cộng đồng xong: 4 bài, 2 trả lời, 2 báo cáo (1 bài + 1 trả lời).",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
