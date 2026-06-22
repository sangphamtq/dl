import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { PublishStatus } from "@/generated/prisma/enums";

// Seed MỘT bài blog dài về Phan Thiết, nhiều heading H2/H3 để thấy mục lục (TOC).
// Chạy SAU seed:phan-thiet (để gắn PostRef). Dùng: pnpm seed:blog-phan-thiet
const now = new Date();
const img = (seed: string, w = 1200, h = 630) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const SLUG = "kinh-nghiem-du-lich-phan-thiet-tu-a-den-z";

const CONTENT = `
<p>Phan Thiết — thủ phủ của tỉnh Bình Thuận — là điểm đến biển quen thuộc nhưng chưa bao giờ hết hấp dẫn. Ở đây có những đồi cát đổi màu theo nắng, làng chài tấp nập lúc rạng đông, hải sản tươi rói với giá rất mềm, và một nhịp sống chậm rãi đủ để bạn thật sự nghỉ ngơi. Bài viết này tổng hợp mọi thứ bạn cần biết cho một chuyến đi trọn vẹn.</p>

<h2>Phan Thiết có gì hấp dẫn?</h2>
<p>Không quá ồn ào như những thành phố biển lớn, Phan Thiết giữ được vẻ mộc mạc của một vùng duyên hải Nam Trung Bộ. Bờ biển dài, cát mịn, sóng vừa phải; xen giữa là những đồi cát mênh mông tạo nên khung cảnh độc nhất ở Việt Nam.</p>
<p>Đây cũng là <strong>kinh đô nước mắm</strong> với hàng trăm năm nghề truyền thống, là nơi sản sinh ra món lẩu thả trứ danh, và là điểm lướt ván diều (kitesurfing) nổi tiếng được du khách quốc tế yêu thích vào mùa gió.</p>

<h2>Thời điểm lý tưởng để đi</h2>
<p>Phan Thiết nắng quanh năm, nhưng mỗi mùa lại hợp với một kiểu trải nghiệm khác nhau.</p>
<h3>Mùa khô (tháng 11 – tháng 4)</h3>
<p>Trời trong, ít mưa, biển êm — thời gian đẹp nhất để tắm biển, chụp ảnh đồi cát và đi tour. Đây là cao điểm du lịch nên giá phòng có thể nhỉnh hơn, bạn nên đặt trước.</p>
<h3>Mùa gió (tháng 11 – tháng 3)</h3>
<p>Gió mạnh và ổn định khiến Mũi Né trở thành thiên đường cho dân lướt ván diều. Nếu muốn thử bộ môn này, đây chính là thời điểm vàng.</p>
<h3>Mùa mưa (tháng 5 – tháng 10)</h3>
<p>Mưa thường đến nhanh rồi tạnh, không kéo dài cả ngày. Bù lại, giá cả dễ chịu, cảnh vật xanh mát và biển vẫn tắm được vào buổi sáng.</p>

<h2>Di chuyển đến Phan Thiết</h2>
<p>Từ TP.HCM, Phan Thiết cách khoảng 200 km — rất thuận tiện cho một chuyến đi cuối tuần.</p>
<h3>Tàu hỏa</h3>
<p>Tuyến Sài Gòn – Phan Thiết mất khoảng 4 giờ, ngắm cảnh đẹp và êm ái. Phù hợp với gia đình có trẻ nhỏ và người không thích đi xe đường dài.</p>
<h3>Xe khách & limousine</h3>
<p>Nhiều hãng limousine chạy thẳng TP.HCM – Mũi Né trong khoảng 4 – 5 giờ, đón trả tận nơi. Đây là lựa chọn phổ biến và linh hoạt nhất.</p>
<h3>Ô tô tự lái</h3>
<p>Cao tốc Dầu Giây – Phan Thiết rút ngắn thời gian đáng kể, chỉ còn khoảng 2,5 – 3 giờ. Tự lái giúp bạn chủ động ghé các điểm dọc đường.</p>

<h2>Lịch trình gợi ý 3 ngày 2 đêm</h2>
<p>Một lịch trình cân bằng giữa nghỉ ngơi và khám phá, phù hợp với phần lớn du khách.</p>
<h3>Ngày 1 — Về với biển</h3>
<p>Đến nơi, nhận phòng và nghỉ trưa. Chiều ra <strong>Bãi đá Ông Địa</strong> tắm biển, ngắm hoàng hôn. Tối dạo khu bờ kè, thưởng thức hải sản tươi.</p>
<h3>Ngày 2 — Săn bình minh trên cát</h3>
<p>Dậy sớm đón bình minh ở <strong>Đồi cát bay Mũi Né</strong>, thử trượt cát. Ghé <strong>Suối Tiên</strong> và <strong>Làng chài Mũi Né</strong> lúc thuyền về. Chiều thư giãn ở hồ bơi resort.</p>
<h3>Ngày 3 — Bàu Trắng & về</h3>
<p>Khởi hành sớm đến <strong>Bàu Trắng</strong> — "tiểu sa mạc" với hồ sen và đồi cát trắng. Trên đường về mua đặc sản làm quà.</p>

<h2>Những điểm đến không thể bỏ lỡ</h2>
<h3>Đồi cát bay Mũi Né</h3>
<p>Biểu tượng của Phan Thiết, những đồi cát đổi hình theo gió và đổi màu theo nắng. Đẹp nhất vào sáng sớm hoặc chiều muộn khi nắng dịu.</p>
<h3>Bàu Trắng</h3>
<p>Cách trung tâm khoảng 60 km, nơi đây có hồ nước ngọt giữa đồi cát trắng tinh, mùa hè còn nở rộ sen hồng. Trải nghiệm xe địa hình trên cát rất đáng thử.</p>
<h3>Tháp Po Sah Inư</h3>
<p>Cụm tháp Chăm cổ hơn nghìn năm tuổi trên đồi Bà Nài, nơi ngắm toàn cảnh thành phố và cửa biển rất đẹp.</p>
<h3>Làng chài Mũi Né</h3>
<p>Buổi sáng sớm, hàng trăm thuyền thúng cập bờ mang theo mẻ cá tươi — một khung cảnh đậm chất miền biển để chụp ảnh và mua hải sản giá gốc.</p>

<h2>Ăn gì ở Phan Thiết?</h2>
<p>Ẩm thực là một lý do lớn khiến du khách quay lại. Vài món nhất định phải thử:</p>
<ul>
<li><strong>Lẩu thả</strong> — món "đặc sản của đặc sản", trình bày như bông hoa, ăn kèm bánh tráng và nước chấm đặc trưng.</li>
<li><strong>Bánh căn, bánh xèo</strong> — món ăn sáng dân dã, nóng hổi, đậm vị.</li>
<li><strong>Gỏi cá mai, gỏi cá suốt</strong> — tươi, chua ngọt, rất "bắt" trong tiết trời biển.</li>
<li><strong>Hải sản bờ kè</strong> — tươi sống, chế biến nhanh, giá hợp lý.</li>
</ul>
<blockquote>Mẹo nhỏ: hỏi giá trước khi gọi món ở các quán hải sản, và ưu tiên những quán đông khách địa phương.</blockquote>

<h2>Lưu trú: nên ở đâu?</h2>
<p>Khu vực <strong>Mũi Né</strong> tập trung nhiều resort sát biển, hợp nghỉ dưỡng. Khu <strong>trung tâm Phan Thiết</strong> tiện ăn uống, đi lại và giá mềm hơn. Nếu thích yên tĩnh, hãy chọn các homestay gần Bàu Trắng hoặc Hòn Rơm.</p>

<h2>Kinh nghiệm & lưu ý</h2>
<ul>
<li>Mang theo kem chống nắng, kính râm và khăn — nắng đồi cát khá gắt.</li>
<li>Đi đồi cát nên mặc đồ thoáng, đi dép dễ tháo vì cát rất mịn.</li>
<li>Thuê xe máy để chủ động di chuyển giữa các điểm cách xa nhau.</li>
<li>Đặt phòng và vé tàu/limousine sớm vào dịp lễ, cuối tuần cao điểm.</li>
</ul>

<h2>Tổng kết</h2>
<p>Phan Thiết là lựa chọn lý tưởng cho chuyến đi biển ngắn ngày: dễ di chuyển, cảnh đẹp đa dạng từ biển đến đồi cát, ẩm thực ngon và chi phí phải chăng. Chỉ cần chuẩn bị một chút, bạn sẽ có những ngày thật đáng nhớ ở vùng duyên hải đầy nắng gió này.</p>
`.trim();

async function main() {
  const author =
    (await prisma.user.findFirst({
      where: { role: { in: ["admin", "editor"] } },
      select: { id: true },
    })) ?? (await prisma.user.findFirst({ select: { id: true } }));

  if (!author) {
    console.error(
      "Cần ít nhất 1 user (đăng nhập Google 1 lần) để làm tác giả. Bỏ qua seed.",
    );
    return;
  }

  // PostRef tới dữ liệu Phan Thiết nếu đã seed (không bắt buộc).
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

  const refs = [
    ...(phanThiet ? [{ placeId: phanThiet.id }] : []),
    ...specialties.map((s) => ({ specialtyId: s.id })),
    ...eateries.map((e) => ({ eateryId: e.id })),
  ];

  const data = {
    title: "Kinh nghiệm du lịch Phan Thiết từ A đến Z",
    excerpt:
      "Tất tần tật cho chuyến đi Phan Thiết: thời điểm đẹp, cách di chuyển, lịch trình 3 ngày 2 đêm, điểm đến, ăn gì và những lưu ý hữu ích.",
    category: "cam-nang",
    content: CONTENT,
  };

  const row = await prisma.post.upsert({
    where: { slug: SLUG },
    update: {
      ...data,
      status: PublishStatus.published,
      publishedAt: now,
      isFeatured: true,
      refs: { deleteMany: {}, create: refs.map((r, i) => ({ order: i, ...r })) },
    },
    create: {
      slug: SLUG,
      ...data,
      authorId: author.id,
      status: PublishStatus.published,
      publishedAt: now,
      isFeatured: true,
      refs: { create: refs.map((r, i) => ({ order: i, ...r })) },
    },
  });

  // Ảnh bìa + vài ảnh gallery.
  await prisma.image.deleteMany({ where: { postId: row.id } });
  await prisma.image.createMany({
    data: [
      { postId: row.id, url: img("phan-thiet-cover"), alt: data.title, isCover: true, order: 0 },
      { postId: row.id, url: img("phan-thiet-doicat", 1000, 667), alt: "Đồi cát bay Mũi Né", isCover: false, order: 1 },
      { postId: row.id, url: img("phan-thiet-bautrang", 1000, 667), alt: "Bàu Trắng", isCover: false, order: 2 },
    ],
  });

  console.log(`✓ Seed xong bài: ${data.title} (/blog/${SLUG}) — refs: ${refs.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
