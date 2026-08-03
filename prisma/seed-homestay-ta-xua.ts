import "dotenv/config";
import { prisma } from "@/lib/prisma";
import {
  PublishStatus,
  AccommodationCategory,
} from "@/generated/prisma/enums";

// Seed vài homestay tại Tà Xùa, gắn vào điểm đến `ta-xua` đã có.
// Idempotent: upsert theo slug. Dùng: pnpm seed:homestay-ta-xua
// Lưu ý: cần chạy `pnpm seed:ta-xua` trước (để có Place `ta-xua`).
//
// ─── CHỦ Ý KHÔNG BỊA `phone` / `zalo` / `facebookUrl` ────────────────────────
// Lưu trú là DANH BẠ ĐÃ XÁC MINH CHÍNH CHỦ (xem CLAUDE.md), lõi giá trị là kênh
// liên hệ đúng người. Seed ra một dãy số bịa = tiếp tay đúng cái mà sản phẩm
// muốn chống, tệ hơn nữa là số bịa có thể trùng số của một người thật.
// ⇒ Tất cả để `isVerified: false` + `notice` nói rõ đang chờ xác minh; biên tập
// điền kênh liên hệ trong CMS sau khi gọi kiểm chứng rồi bật huy hiệu.
//
// Toạ độ là VỊ TRÍ TƯƠNG ĐỐI quanh trục đường chính qua xã, đủ để bản đồ không
// vỡ — cần chỉnh lại khi khảo sát thực địa.

const now = new Date();
const PUB = { status: PublishStatus.published, publishedAt: now } as const;

type ImageInput = { url: string; alt?: string; caption?: string };

// ẢNH — ĐỂ TRỐNG để tự điền (key = slug), giống seed-ta-xua.ts. Mảng rỗng →
// seed KHÔNG đụng tới ảnh của mục đó (giữ ảnh đã upload trong CMS); trang công
// khai dùng ảnh fallback nếu chưa có ảnh nào.
const IMAGES: Record<string, ImageInput[]> = {
  "may-lang-thang-homestay-ta-xua": [],
  "song-lung-khung-long-homestay": [],
  "nha-san-ban-be-ta-xua": [],
  "doi-che-co-thu-homestay-ta-xua": [],
  "bungalow-thung-lung-ta-xua": [],
  "homestay-ban-hong-ngai": [],
};

async function setImages(
  accommodationId: string,
  images: readonly ImageInput[],
  fallbackAlt: string,
) {
  if (images.length === 0) return;
  await prisma.image.deleteMany({ where: { accommodationId } });
  await Promise.all(
    images.map((im, i) =>
      prisma.image.create({
        data: {
          accommodationId,
          url: im.url,
          alt: im.alt ?? fallbackAlt,
          caption: im.caption,
          isCover: i === 0,
          order: i,
        },
      }),
    ),
  );
}

type HomestaySeed = {
  slug: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  description: string;
  tags: string[];
  depositPolicy?: string;
  notice?: string;
  isFeatured?: boolean;
};

// Cảnh báo dùng chung: chưa xác minh chính chủ → nói thẳng thay vì im lặng.
const UNVERIFIED =
  "Chưa xác minh chính chủ. Kênh liên hệ đang được kiểm chứng — tuyệt đối không chuyển cọc cho bất kỳ số/tài khoản nào tự nhận là chủ nhà khi trang này chưa hiện huy hiệu xác minh.";

const homestays: HomestaySeed[] = [
  {
    slug: "may-lang-thang-homestay-ta-xua",
    name: "Homestay Mây Lang Thang",
    address: "Bản Tà Xùa, dọc trục đường chính qua xã",
    lat: 21.2519,
    lng: 104.451,
    isFeatured: true,
    description:
      "Nhà gỗ hai tầng ngay trục đường chính, đi bộ vài phút là tới khu mỏm ngắm mây nên rất tiện cho hôm săn mây phải rời phòng lúc 4h30. Có cả phòng riêng và phòng dorm sàn gỗ, chăn dày — cần thiết vì mùa đông trên bản xuống dưới 10 độ. Bếp nhận đặt cơm theo suất từ chiều hôm trước và gói xôi mang đi cho khách đi sớm.",
    tags: [
      "homestay",
      "gần điểm săn mây",
      "phòng dorm",
      "đặt cơm tại bếp",
      "chăn ấm",
      "cho thuê xe máy",
    ],
    depositPolicy:
      "Giữ phòng bằng cọc trước vào cuối tuần và mùa săn mây (tháng 10 – tháng 4); ngày thường thường chỉ cần hẹn qua điện thoại.",
    notice: UNVERIFIED,
  },
  {
    slug: "song-lung-khung-long-homestay",
    name: "Homestay Sống Lưng Khủng Long",
    address: "Rìa bản Tà Xùa, phía đường ra sống lưng khủng long",
    lat: 21.2533,
    lng: 104.4478,
    isFeatured: true,
    description:
      "Vị trí gần lối ra sống lưng khủng long nhất trong bản: sáng có mây thì bước khỏi cửa là đi bộ ra mỏm, không cần chạy xe trong sương. Sân ngoài kê bàn hướng thẳng ra thung lũng, chiều ngồi ngắm hoàng hôn còn sáng sớm nhìn sương dâng kín bên dưới. Phòng đơn giản, sạch, có nước nóng — tiêu chuẩn khá nhất mà bản có.",
    tags: [
      "homestay",
      "view thung lũng",
      "gần sống lưng khủng long",
      "săn mây",
      "nước nóng",
      "hợp nhóm",
    ],
    depositPolicy:
      "Mùa cao điểm nhận giữ phòng khi đã cọc trước; huỷ sát ngày thường không hoàn cọc.",
    notice: UNVERIFIED,
  },
  {
    slug: "nha-san-ban-be-ta-xua",
    name: "Nhà sàn bản Bẹ",
    address: "Bản Bẹ, cạnh vùng chè Shan tuyết cổ thụ",
    lat: 21.2648,
    lng: 104.4423,
    description:
      "Nhà sàn của một hộ người Mông làm chè trong bản Bẹ, ngủ chung sàn theo kiểu bản địa, đệm và chăn bông trải sát nhau. Ở đây được nhất là buổi tối quanh bếp lửa: chủ nhà tráng ấm pha chè Shan tuyết và kể chuyện trèo cây hái búp. Vệ sinh dùng chung, tiện nghi tối giản — chọn vì trải nghiệm chứ không vì tiện nghi.",
    tags: [
      "nhà sàn",
      "ngủ sàn chung",
      "ở cùng người Mông",
      "bếp lửa",
      "đồi chè",
      "giá rẻ",
    ],
    depositPolicy:
      "Thường không cần cọc, chỉ hẹn trước để chủ nhà chuẩn bị chỗ ngủ và cơm.",
    notice: UNVERIFIED,
  },
  {
    slug: "doi-che-co-thu-homestay-ta-xua",
    name: "Homestay Đồi Chè Cổ Thụ",
    address: "Đoạn đường vòng qua đồi chè cổ thụ, bản Bẹ",
    lat: 21.2661,
    lng: 104.4441,
    description:
      "Nằm giữa vùng chè cổ thụ, cách trung tâm bản Tà Xùa chừng 3km nên vắng và tối trời rất nhiều sao. Ban công các phòng nhìn ra những gốc chè phủ địa y trắng; sáng sớm đi bộ trong đồi chè lúc sương chưa tan là thứ mà ở trung tâm bản không có. Có xe máy cho thuê để chạy ra các mỏm ngắm mây.",
    tags: [
      "homestay",
      "đồi chè",
      "yên tĩnh",
      "ngắm sao",
      "ban công",
      "cho thuê xe máy",
    ],
    depositPolicy:
      "Cọc trước vào cuối tuần cao điểm; ngày thường giữ phòng qua điện thoại.",
    notice:
      "Cách trung tâm bản khoảng 3km đường đèo, buổi tối gần như không có quán ăn quanh đây — nên đặt cơm tại homestay. " +
      UNVERIFIED,
  },
  {
    slug: "bungalow-thung-lung-ta-xua",
    name: "Bungalow Thung Lũng Tà Xùa",
    address: "Sườn núi rìa bản Tà Xùa, hướng ra thung lũng",
    lat: 21.2541,
    lng: 104.4494,
    description:
      "Vài căn bungalow gỗ tách nhau trên sườn núi, mỗi căn một cửa kính lớn hướng thung lũng — nằm trong phòng vẫn ngắm được mây mà khỏi ra ngoài chịu rét. Riêng tư nhất trong bản nên hợp cặp đôi; giá cao hơn mặt bằng chung. Có nước nóng, sưởi và bữa sáng nhẹ.",
    tags: [
      "bungalow",
      "hợp cặp đôi",
      "view thung lũng",
      "riêng tư",
      "sưởi ấm",
      "bữa sáng",
    ],
    depositPolicy:
      "Số căn ít nên hầu như luôn phải cọc trước để giữ, nhất là dịp lễ và cuối tuần mùa mây.",
    notice: UNVERIFIED,
  },
  {
    slug: "homestay-ban-hong-ngai",
    name: "Homestay bản Hồng Ngài",
    address: "Bản Hồng Ngài, xã Hồng Ngài (đường từ Bắc Yên lên Tà Xùa)",
    lat: 21.2216,
    lng: 104.4327,
    description:
      "Chỗ nghỉ trong bản Hồng Ngài — bản gắn với 'Vợ chồng A Phủ' và hang A Phủ — nằm trên đường từ thị trấn Bắc Yên lên Tà Xùa. Phù hợp khách muốn tách khỏi cụm homestay đông ở trung tâm và dành một buổi đi bản, thăm hang. Nhà cấp bốn của hộ dân, phòng cơ bản, ăn cơm cùng gia đình.",
    tags: [
      "homestay",
      "ở cùng người dân",
      "bản Hồng Ngài",
      "hang A Phủ",
      "vắng khách",
      "giá rẻ",
    ],
    depositPolicy: "Hẹn trước là được, thường không yêu cầu cọc.",
    notice:
      "Cách bản Tà Xùa khoảng 10km đường đèo — muốn săn mây sáng phải xuất phát từ 4h. " +
      UNVERIFIED,
  },
];

async function main() {
  const taXua = await prisma.place.findUnique({
    where: { slug: "ta-xua" },
    select: { id: true },
  });
  if (!taXua) {
    throw new Error('Chưa có Place "ta-xua". Chạy `pnpm seed:ta-xua` trước.');
  }

  for (const [i, h] of homestays.entries()) {
    const { slug, name, ...rest } = h;
    const row = await prisma.accommodation.upsert({
      where: { slug },
      // KHÔNG áp `...PUB` khi update: biên tập đã ẩn/hiện mục nào trong CMS thì
      // lần seed sau phải tôn trọng lựa chọn đó (xem chú thích trong seed-ta-xua.ts).
      // Cũng KHÔNG ghi đè `isVerified`/`verifiedAt`: xác minh là việc của biên tập,
      // seed lại không được âm thầm tháo huy hiệu đã bật.
      update: {
        ...rest,
        order: i,
        category: AccommodationCategory.homestay,
        placeId: taXua.id,
      },
      create: {
        slug,
        name,
        ...rest,
        order: i,
        category: AccommodationCategory.homestay,
        placeId: taXua.id,
        isVerified: false,
        ...PUB,
      },
    });
    await setImages(row.id, IMAGES[slug] ?? [], name);
  }

  console.log(
    `✓ Seed homestay Tà Xùa xong: ${homestays.length} homestay gắn vào điểm đến ta-xua.`,
  );
  console.log(
    "  Ghi chú: tất cả để isVerified=false, chưa có phone/zalo — biên tập điền kênh liên hệ trong CMS sau khi kiểm chứng rồi bật huy hiệu.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
