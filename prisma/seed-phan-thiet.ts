import "dotenv/config";
import { prisma } from "@/lib/prisma";
import {
  PlaceKind,
  PublishStatus,
  SpotCategory,
  ActivityCategory,
  ActivityDifficulty,
  EateryCategory,
  Meal,
  AccommodationCategory,
  PriceRange,
  UserRole,
} from "@/generated/prisma/enums";

// Seed điểm đến Phan Thiết (Bình Thuận): Place + Spot + Activity + Eatery + Specialty.
// Idempotent: upsert theo slug; ảnh demo (picsum) tạo lại mỗi lần chạy.
// Dùng: pnpm seed:phan-thiet

const now = new Date();
const PUB = { status: PublishStatus.published, publishedAt: now } as const;

type ImageOwner =
  | { placeId: string }
  | { spotId: string }
  | { activityId: string }
  | { eateryId: string }
  | { specialtyId: string }
  | { accommodationId: string };

// Ảnh của một mục — ĐỂ TRỐNG để tự điền. Mỗi ảnh: { url, alt?, caption? }.
// Ảnh đầu mảng tự thành ảnh bìa (isCover). Mảng rỗng → trang dùng ảnh fallback.
type ImageInput = { url: string; alt?: string; caption?: string };

// Ghi lại toàn bộ ảnh cho một owner (xóa ảnh cũ trước để khỏi nhân bản khi seed lại).
async function setImages(
  where: ImageOwner,
  images: readonly ImageInput[],
  fallbackAlt: string,
) {
  await prisma.image.deleteMany({ where });
  await Promise.all(
    images.map((im, i) =>
      prisma.image.create({
        data: {
          ...where,
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

// ────────────────────────────────────────────────────────────────────────────
// ẢNH CHO TỪNG MỤC — TỰ ĐIỀN Ở ĐÂY (key = slug). Mỗi mục một mảng ảnh; ảnh đầu
// mảng là ảnh bìa. Bỏ trống / để mảng rỗng → trang dùng ảnh fallback tạm.
// Mỗi ảnh: { url: "https://…", alt?: "mô tả", caption?: "chú thích" }
// Ví dụ:
//   "bai-bien-mui-ne": [
//     { url: "https://…/1.jpg", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },
//     { url: "https://…/2.jpg" },
//   ],
// ────────────────────────────────────────────────────────────────────────────
const IMAGES: Record<string, ImageInput[]> = {
  // Place
  "binh-thuan": [],
  "phan-thiet": [],

  // Địa điểm (Spot)
  "bai-bien-mui-ne": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVVLFiMOGrfcH3IL5QbghBD7ty4wjlxu80KkaJ", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "doi-cat-bay-mui-ne": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVOcQgLKNlS9oC6u4I8lqYVhvJFnANpGZDfxky", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "bau-trang": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVFQeJkN5pDvbxdNjE48eVyfrl2qSG5oOt3ksu", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "suoi-tien-mui-ne": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVLTtEbU9lUriqpvaHYIV59KnXoBuy426ehsmg", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "lang-chai-mui-ne": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbV47vP3DhjsBNSi21ZO0E6Qknf9K5aCAzPGhXv", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "thap-po-sah-inu": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVn6VllskyNpVrswG2bXt7P5uIACShYzTBO4cQ", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "hon-rom": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVIZuBizOJ3i9vQ1fIPbaTDodWErlMtRmUSn2j", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "bai-da-ong-dia": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVnUQ9AOkyNpVrswG2bXt7P5uIACShYzTBO4cQ", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],

  // Hoạt động (Activity)
  "truot-cat-mui-ne": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVrE9lesYb8jagp6cK5uSRW3FnfXEZDVh1xAqB", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "luot-van-dieu-mui-ne": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbV8MLQRGSNtSa4RYZ1IFnoHwL8POAuJXU9lpqr", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "jeep-binh-minh-doi-cat": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVwzBbByPfv7TtDnqG58WPEKwhlSVOiFgU1ZIQ", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "tam-bien-mui-ne": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVtO2kvLa9DUqbFmsL3nowTu54dv7fryRz0GYe", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "cheo-sup-kayak-mui-ne": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVC80sqWAb0IqpSx6Et5DlWkmrFgQJZdBeKYhU", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "mo-to-nuoc-mui-ne": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVIFZSckOJ3i9vQ1fIPbaTDodWErlMtRmUSn2j", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "tham-quan-thap-cham": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVXa7aoKriSgYjdfKV9N46zZEP0aCvqmulRbGy", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "san-hoang-hon-phan-thiet": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbV7oEMwfcsduBOTVW6GbCrSo4ZJg8lncNqKxmR", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],

  // Quán ăn (Eatery)
  "banh-can-cay-phuong": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVHOHsVwgtLGTBS2Zs017p36DzeKQXcnfw5yNm", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "lau-tha-hong-ngoc": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbV0uC2gJ42IasfMBuQhmEv5CcVHDr7R9wnW8bg", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "hai-san-bo-ke-24": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVF2tJSI5pDvbxdNjE48eVyfrl2qSG5oOt3ksu", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "banh-xeo-ba-hai": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVtO2kvLa9DUqbFmsL3nowTu54dv7fryRz0GYe", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "banh-canh-cha-ca-ba-ly": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVP2d9olRWz28SuVb46BiWcK9jXJPIfRHrTpa3", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "rang-muc-cay-bang": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVDOM9EHV7y8JhmixqtcU0eVNuEYsBndZ1CokX", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "hai-san-co-ni": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbV32sscNxMeYTmuqJL4cbBoxQnCyX7ArKj0NPv", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "sandy-beach-cafe": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbV3brXfESxNIzSVdQsYLDi4gpfXl5Bjw0RKWoC", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],

  // Đặc sản (Specialty)
  "banh-can-phan-thiet": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVHOHsVwgtLGTBS2Zs017p36DzeKQXcnfw5yNm", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "lau-tha-phan-thiet": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbV0uC2gJ42IasfMBuQhmEv5CcVHDr7R9wnW8bg", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "goi-ca-mai-phan-thiet": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVF2tJSI5pDvbxdNjE48eVyfrl2qSG5oOt3ksu", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "nuoc-mam-phan-thiet": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVbFFxeLGtBO2eXE0oTNdl4aqLIKZ7y59rPzVQ", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "thanh-long-binh-thuan": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVMMryv70xmWkuS4zvncQBOspdHe0rojq8wiaC", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "rang-muc-phan-thiet": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVDOM9EHV7y8JhmixqtcU0eVNuEYsBndZ1CokX", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "banh-canh-cha-ca-phan-thiet": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVP2d9olRWz28SuVb46BiWcK9jXJPIfRHrTpa3", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "muc-mot-nang-phan-thiet": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVwxgIA6xPfv7TtDnqG58WPEKwhlSVOiFgU1ZI", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],

  // Lưu trú (Accommodation)
  "anantara-mui-ne-resort": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbV88W20kNtSa4RYZ1IFnoHwL8POAuJXU9lpqre", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "the-cliff-resort-mui-ne": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVKjSeN0eoDPNw8b4hMBxe3vjfX0JlqIyC7mio", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "mui-ne-hills-homestay": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVIMyiaWOJ3i9vQ1fIPbaTDodWErlMtRmUSn2j", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "khach-san-phan-thiet-center": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVnOIIS66kyNpVrswG2bXt7P5uIACShYzTBO4c", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "sailing-club-resort-mui-ne": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVlwyNwz7KZuRxYfJ0sUTyC4mB3WAIvHNna9rE", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "pandanus-resort-phan-thiet": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbV3brXfESxNIzSVdQsYLDi4gpfXl5Bjw0RKWoC", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "mango-beach-hostel-mui-ne": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVGXK7LJpMeYTmuqJL4cbBoxQnCyX7ArKj0NPv", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
  "villa-aria-mui-ne": [{ url: "https://y3m837otke.ufs.sh/f/m9VMJOw4aGbVrofNvlYb8jagp6cK5uSRW3FnfXEZDVh1xAqB", alt: "Bãi biển Mũi Né", caption: "Sáng sớm" },],
};

async function main() {
  // 1) Tỉnh Bình Thuận
  const binhThuan = await prisma.place.upsert({
    where: { slug: "binh-thuan" },
    update: {},
    create: {
      slug: "binh-thuan",
      name: "Bình Thuận",
      kind: PlaceKind.province,
      provinceName: "Bình Thuận",
      description:
        "Tỉnh duyên hải Nam Trung Bộ với bờ biển dài, đồi cát và nắng gió quanh năm.",
      ...PUB,
    },
  });
  await setImages({ placeId: binhThuan.id }, IMAGES["binh-thuan"] ?? [], "Bình Thuận");

  // 2) Điểm đến Phan Thiết
  // Câu đầu là lede (đoạn dẫn) — trang sẽ tách & phóng to.
  const phanThietDesc =
    "Nắng vàng, biển xanh và những đồi cát đổi màu — Phan Thiết là thành phố biển quyến rũ bậc nhất duyên hải Nam Trung Bộ. Từ những ngày nghỉ dưỡng thư thái bên biển Mũi Né đến hành trình khám phá làng chài, văn hóa địa phương và các thắng cảnh thiên nhiên, Phan Thiết mang đến nhiều trải nghiệm phù hợp cho mọi du khách. Với khí hậu nắng ấm quanh năm và vị trí thuận tiện từ TP.HCM, đây là một trong những điểm đến biển hấp dẫn hàng đầu Việt Nam.";
  const phanThiet = await prisma.place.upsert({
    where: { slug: "phan-thiet" },
    update: {
      parentId: binhThuan.id,
      provinceName: "Bình Thuận",
      description: phanThietDesc,
    },
    create: {
      slug: "phan-thiet",
      name: "Phan Thiết",
      kind: PlaceKind.destination,
      parentId: binhThuan.id,
      tagline: "Tạm rời xa nhịp sống vội vã để tận hưởng những ngày bình yên bên biển xanh, nắng vàng và làn gió mát lành.",
      description: phanThietDesc,
      provinceName: "Bình Thuận",
      tags: ["biển", "đồi cát", "resort", "hải sản"],
      isFeatured: true,
      ...PUB,
    },
  });
  await setImages({ placeId: phanThiet.id }, IMAGES["phan-thiet"] ?? [], "Phan Thiết");

  // 3) Spots
  const spots = [
    {
      slug: "bai-bien-mui-ne",
      name: "Bãi biển Mũi Né",
      category: SpotCategory.beach,
      lat: 10.9333,
      lng: 108.287,
      description: "Bãi biển dài, sóng đẹp, thiên đường lướt ván diều.",
      bestTime: "Sáng sớm & chiều mát",
      ticketInfo: "Miễn phí",
    },
    {
      slug: "doi-cat-bay-mui-ne",
      name: "Đồi cát bay Mũi Né",
      category: SpotCategory.viewpoint,
      lat: 10.952,
      lng: 108.303,
      description:
        "Đồi cát đổi màu theo nắng, điểm trượt cát và săn bình minh kinh điển.",
      bestTime: "Bình minh hoặc hoàng hôn",
      ticketInfo: "Vé gửi xe ~10k",
    },
    {
      slug: "bau-trang",
      name: "Bàu Trắng",
      category: SpotCategory.lake,
      lat: 11.179,
      lng: 108.413,
      description:
        "Đồi cát trắng mênh mông ôm lấy hồ sen — 'tiểu sa mạc Sahara' của Việt Nam.",
      bestTime: "Sáng sớm",
      ticketInfo: "Vé vào ~15k",
    },
    {
      slug: "suoi-tien-mui-ne",
      name: "Suối Tiên",
      category: SpotCategory.other,
      lat: 10.9486,
      lng: 108.288,
      description: "Khe suối nhỏ len giữa vách cát đỏ - trắng kỳ ảo, lội bộ mát chân.",
      ticketInfo: "Miễn phí",
    },
    {
      slug: "lang-chai-mui-ne",
      name: "Làng chài Mũi Né",
      category: SpotCategory.village,
      lat: 10.956,
      lng: 108.287,
      description: "Bến cá nhộn nhịp sáng sớm với thúng chai và hải sản tươi rói.",
      bestTime: "5–7h sáng",
    },
    {
      slug: "thap-po-sah-inu",
      name: "Tháp Po Sah Inư",
      category: SpotCategory.temple,
      lat: 10.929,
      lng: 108.128,
      description: "Cụm tháp Chăm cổ trên đồi Bà Nài, nhìn ra cửa biển Phan Thiết.",
      ticketInfo: "Vé ~15k",
    },
    {
      slug: "hon-rom",
      name: "Hòn Rơm",
      category: SpotCategory.beach,
      lat: 10.976,
      lng: 108.329,
      description: "Bãi tắm nước trong, yên bình, thích hợp gia đình.",
      ticketInfo: "Miễn phí",
    },
    {
      slug: "bai-da-ong-dia",
      name: "Bãi đá Ông Địa",
      category: SpotCategory.beach,
      lat: 10.927,
      lng: 108.256,
      description: "Bãi đá độc đáo với tảng đá hình Ông Địa, điểm check-in hoàng hôn.",
      ticketInfo: "Miễn phí",
    },
  ];

  const spotId: Record<string, string> = {};
  for (const s of spots) {
    const { slug, name, ...rest } = s;
    const row = await prisma.spot.upsert({
      where: { slug },
      update: { ...rest, placeId: phanThiet.id, ...PUB },
      create: { slug, name, ...rest, placeId: phanThiet.id, ...PUB },
    });
    spotId[slug] = row.id;
    await setImages({ spotId: row.id }, IMAGES[slug] ?? [], name);
  }

  // 4) Activities (M:N tới Spot)
  const activities = [
    {
      slug: "truot-cat-mui-ne",
      name: "Trượt cát",
      category: ActivityCategory.adventure,
      difficulty: ActivityDifficulty.easy,
      durationText: "1–2 giờ",
      description:
        "Chẳng cần kinh nghiệm hay đồ nghề cầu kỳ — chỉ một tấm ván nhựa thuê ngay dưới chân đồi là bạn đã sẵn sàng. Leo lên triền cát mịn, ngồi lên ván rồi buông mình trượt một mạch xuống dốc trong tiếng cười giòn tan. Trò chơi tuổi thơ này hợp với mọi lứa tuổi, và gần như ai ghé Mũi Né cũng muốn thử cho bằng được.",
      spots: ["doi-cat-bay-mui-ne", "bau-trang"],
    },
    {
      slug: "luot-van-dieu-mui-ne",
      name: "Lướt ván diều",
      category: ActivityCategory.water,
      difficulty: ActivityDifficulty.moderate,
      durationText: "Nửa ngày",
      seasonText: "Tháng 11 – 3 (mùa gió)",
      description:
        "Không phải ngẫu nhiên mà dân lướt ván diều khắp thế giới gọi tên Mũi Né: gió ở đây thổi đều và mạnh suốt mùa khô, mặt biển rộng thoáng đủ chỗ cho những cánh diều sải cánh. Từ tháng 11 đến tháng 3, cả bãi biển nhuộm kín sắc màu của hàng trăm cánh diều chao liệng trên sóng. Người mới có thể đăng ký một lớp học ngay tại các trung tâm ven biển, còn dân chơi lâu năm thì tha hồ vẫy vùng.",
      spots: ["bai-bien-mui-ne"],
    },
    {
      slug: "jeep-binh-minh-doi-cat",
      name: "Tour xe Jeep săn bình minh đồi cát",
      category: ActivityCategory.adventure,
      difficulty: ActivityDifficulty.easy,
      durationText: "Nửa buổi (sáng sớm)",
      seasonText: "Quanh năm, đẹp nhất mùa khô",
      operatorName: "Các đơn vị tour địa phương",
      priceRange: PriceRange.moderate,
      description:
        "Khi trời còn nhập nhoạng, chiếc Jeep mui trần đón bạn lao đi trong gió sớm, kịp đặt chân lên đồi cát bay đúng lúc mặt trời ló rạng. Ánh bình minh trải vàng trên những triền cát uốn lượn là khoảnh khắc khó quên nhất của cả chuyến đi. Hành trình thường nối tiếp qua Bàu Trắng, suối Tiên rồi làng chài, gói trọn tinh hoa Mũi Né chỉ trong một buổi sáng.",
      spots: ["doi-cat-bay-mui-ne", "bau-trang", "suoi-tien-mui-ne"],
    },
    {
      slug: "tam-bien-mui-ne",
      name: "Tắm biển",
      category: ActivityCategory.water,
      difficulty: ActivityDifficulty.easy,
      description:
        "Biển Phan Thiết ấm áp gần như quanh năm, sóng vừa phải và bờ cát thoai thoải rất hợp để ngâm mình thư giãn. Bạn có thể chọn bãi Mũi Né đông vui, Hòn Rơm nước trong xanh hay bãi đá Ông Địa nhiều góc check-in. Sáng sớm và chiều muộn là lúc nước dịu, nắng nhẹ, dễ chịu nhất để xuống tắm.",
      spots: ["bai-bien-mui-ne", "hon-rom", "bai-da-ong-dia"],
    },
    {
      slug: "cheo-sup-kayak-mui-ne",
      name: "Chèo SUP & kayak",
      category: ActivityCategory.water,
      difficulty: ActivityDifficulty.easy,
      durationText: "1–2 giờ",
      seasonText: "Đẹp nhất sáng sớm, biển lặng",
      description:
        "Có gì bình yên hơn việc lướt nhẹ trên mặt biển phẳng lặng khi ngày vừa thức giấc? Buổi sớm, lúc gió chưa nổi và nước còn như gương, chèo SUP hay kayak dọc bờ là cách tuyệt vời để ngắm bình minh từ một góc rất riêng. Hoạt động nhẹ nhàng, dễ làm quen, phù hợp cả với người lần đầu cầm mái chèo.",
      spots: ["hon-rom", "bai-bien-mui-ne"],
    },
    {
      slug: "mo-to-nuoc-mui-ne",
      name: "Mô tô nước & thể thao biển",
      category: ActivityCategory.water,
      difficulty: ActivityDifficulty.moderate,
      durationText: "30–60 phút",
      operatorName: "Dịch vụ thể thao biển tại bãi",
      priceRange: PriceRange.moderate,
      description:
        "Dành cho những ai mê cảm giác mạnh, bãi biển Mũi Né có đủ trò để tim đập nhanh: phóng mô tô nước rẽ sóng, bay bổng cùng dù kéo hay nhún nhảy trên chuối phao. Các dịch vụ đều có sẵn ngay tại bãi, trang bị áo phao và hướng dẫn đầy đủ. Chỉ vài chục phút thôi cũng đủ để adrenaline dâng trào giữa nắng và sóng.",
      spots: ["bai-bien-mui-ne", "hon-rom"],
    },
    {
      slug: "tham-quan-thap-cham",
      name: "Tham quan tháp Chăm",
      category: ActivityCategory.culture,
      difficulty: ActivityDifficulty.easy,
      durationText: "Khoảng 1 giờ",
      description:
        "Trên đồi Bà Nài lộng gió, cụm tháp Po Sah Inư cổ kính lặng lẽ nhìn ra cửa biển Phan Thiết suốt hơn ngàn năm. Lối kiến trúc Chăm với những mảng gạch nung đỏ au mang vẻ đẹp trầm mặc, đầy chiều sâu lịch sử. Ghé vào lúc chiều xuống, bạn vừa khám phá di tích vừa kịp đón hoàng hôn buông trên thành phố biển.",
      spots: ["thap-po-sah-inu"],
    },
    {
      slug: "san-hoang-hon-phan-thiet",
      name: "Săn hoàng hôn",
      category: ActivityCategory.relax,
      difficulty: ActivityDifficulty.easy,
      durationText: "Cuối ngày",
      seasonText: "Quanh năm",
      description:
        "Khi mặt trời bắt đầu hạ xuống, cả Phan Thiết như được nhuộm trong sắc cam ấm áp. Bãi đá Ông Địa, những triền cát bay hay tháp Chăm trên đồi đều là chỗ tuyệt đẹp để ngắm khoảnh khắc ngày tàn. Mang theo một ly cà phê, ngồi lặng nhìn trời chuyển màu — đó là cách lãng mạn nhất để khép lại một ngày ở thành phố biển.",
      spots: ["bai-da-ong-dia", "doi-cat-bay-mui-ne", "thap-po-sah-inu"],
    },
  ];

  for (const a of activities) {
    const { slug, name, spots: spotSlugs, ...rest } = a;
    const connect = spotSlugs.map((sl) => ({ id: spotId[sl] }));
    const row = await prisma.activity.upsert({
      where: { slug },
      update: { ...rest, placeId: phanThiet.id, spots: { set: connect }, ...PUB },
      create: {
        slug,
        name,
        ...rest,
        placeId: phanThiet.id,
        spots: { connect },
        ...PUB,
      },
    });
    await setImages({ activityId: row.id }, IMAGES[slug] ?? [], name);
  }

  // 5) Eateries
  const eateries = [
    {
      slug: "banh-can-cay-phuong",
      name: "Bánh căn Cây Phượng",
      category: EateryCategory.local,
      meals: [Meal.breakfast, Meal.snack],
      address: "Phan Thiết, Bình Thuận",
      openingHours: "6:00 – 11:00, 15:00 – 20:00",
      description: "Quán bánh căn lâu năm, nước chấm cá kho đậm đà đặc trưng.",
    },
    {
      slug: "lau-tha-hong-ngoc",
      name: "Lẩu thả Hồng Ngọc",
      category: EateryCategory.seafood,
      meals: [Meal.lunch, Meal.dinner],
      address: "Phan Thiết, Bình Thuận",
      openingHours: "10:00 – 21:00",
      description: "Chuyên lẩu thả — đặc sản trứ danh của vùng biển Phan Thiết.",
    },
    {
      slug: "hai-san-bo-ke-24",
      name: "Hải sản Bờ Kè 24",
      category: EateryCategory.seafood,
      meals: [Meal.dinner],
      address: "Đường Phạm Văn Đồng, Phan Thiết",
      openingHours: "16:00 – 23:00",
      notice: "Rất đông vào cuối tuần — nên đến sớm.",
      description: "Khu hải sản bờ kè nhộn nhịp, đồ tươi, chế biến nhanh.",
    },
    {
      slug: "banh-xeo-ba-hai",
      name: "Bánh xèo Bà Hai",
      category: EateryCategory.streetfood,
      meals: [Meal.snack, Meal.dinner],
      address: "Đường Tuyên Quang, Phan Thiết",
      openingHours: "15:00 – 21:00",
      description: "Bánh xèo mực, tôm đổ nóng giòn rụm, ăn kèm rau sống và nước mắm chua ngọt.",
    },
    {
      slug: "banh-canh-cha-ca-ba-ly",
      name: "Bánh canh chả cá Bà Lý",
      category: EateryCategory.local,
      meals: [Meal.breakfast, Meal.lunch],
      address: "Đường Kim Đồng, Phan Thiết",
      openingHours: "6:00 – 12:00",
      description: "Bánh canh chả cá dai ngọt, nước dùng đậm vị biển — món sáng quen thuộc của dân địa phương.",
    },
    {
      slug: "rang-muc-cay-bang",
      name: "Răng mực nướng Cây Bàng",
      category: EateryCategory.streetfood,
      meals: [Meal.snack, Meal.dinner],
      address: "Khu Cây Bàng, Phan Thiết",
      openingHours: "16:00 – 22:00",
      notice: "Hết sớm, nên đi trước 20h.",
      description: "Răng mực nướng/chiên giòn chấm muối ớt xanh — món vặt 'gây nghiện' của giới trẻ.",
    },
    {
      slug: "hai-san-co-ni",
      name: "Hải sản Cô Nỉ",
      category: EateryCategory.seafood,
      meals: [Meal.lunch, Meal.dinner],
      address: "Đường Huỳnh Thúc Kháng, Mũi Né",
      openingHours: "10:00 – 22:00",
      description: "Hải sản tươi sống chế biến theo yêu cầu, giá hợp lý, được khách địa phương ưa chuộng.",
    },
    {
      slug: "sandy-beach-cafe",
      name: "Sandy Beach Café",
      category: EateryCategory.cafe,
      meals: [Meal.breakfast, Meal.snack],
      address: "Đường Nguyễn Đình Chiểu, Hàm Tiến, Mũi Né",
      openingHours: "7:00 – 22:00",
      description: "Quán cà phê sát biển, view sóng vỗ, hợp ngồi nhâm nhi buổi sáng hoặc chiều mát.",
    },
  ];

  const eateryId: Record<string, string> = {};
  for (const e of eateries) {
    const { slug, name, ...rest } = e;
    const row = await prisma.eatery.upsert({
      where: { slug },
      update: { ...rest, placeId: phanThiet.id, ...PUB },
      create: { slug, name, ...rest, placeId: phanThiet.id, ...PUB },
    });
    eateryId[slug] = row.id;
    await setImages({ eateryId: row.id }, IMAGES[slug] ?? [], name);
  }

  // 6) Specialties — đặc sản nên thử (liên kết quán nếu có)
  const specialties = [
    {
      slug: "banh-can-phan-thiet",
      name: "Bánh căn Phan Thiết",
      description: "Bánh nướng khuôn đất, ăn kèm xíu mại, trứng và nước mắm cá kho.",
      eateries: ["banh-can-cay-phuong"],
    },
    {
      slug: "lau-tha-phan-thiet",
      name: "Lẩu thả",
      description:
        "Cá mai/cá suốt tươi cuốn cùng rau, bún, nước lèo — bày như bông hoa.",
      eateries: ["lau-tha-hong-ngoc", "hai-san-bo-ke-24"],
    },
    {
      slug: "goi-ca-mai-phan-thiet",
      name: "Gỏi cá mai",
      description: "Cá mai trộn gỏi chua ngọt, cuốn bánh tráng, chấm nước lèo sệt.",
      eateries: ["hai-san-bo-ke-24"],
    },
    {
      slug: "nuoc-mam-phan-thiet",
      name: "Nước mắm Phan Thiết",
      description:
        "Nước mắm cá cơm ủ truyền thống, đậm đạm, là đặc sản quà nổi tiếng.",
    },
    {
      slug: "thanh-long-binh-thuan",
      name: "Thanh long Bình Thuận",
      description: "Thủ phủ thanh long cả nước — trái to, ngọt, mua về làm quà.",
    },
    {
      slug: "rang-muc-phan-thiet",
      name: "Răng mực",
      description: "Phần sụn quanh răng mực nướng/chiên giòn, chấm muối ớt xanh — đặc sản ăn vặt nức tiếng.",
      eateries: ["rang-muc-cay-bang"],
    },
    {
      slug: "banh-canh-cha-ca-phan-thiet",
      name: "Bánh canh chả cá",
      description: "Sợi bánh canh dai, chả cá ngọt, nước dùng nấu từ cá biển tươi — món sáng đặc trưng.",
      eateries: ["banh-canh-cha-ca-ba-ly"],
    },
    {
      slug: "muc-mot-nang-phan-thiet",
      name: "Mực một nắng",
      description: "Mực tươi phơi một nắng, nướng lên ngọt đậm — món quà biển được ưa chuộng.",
    },
  ];

  for (const sp of specialties) {
    const { slug, name, eateries: eaterySlugs, ...rest } = sp;
    const connect = (eaterySlugs ?? []).map((sl) => ({ id: eateryId[sl] }));
    const row = await prisma.specialty.upsert({
      where: { slug },
      update: {
        ...rest,
        placeId: phanThiet.id,
        eateries: { set: connect },
        ...PUB,
      },
      create: {
        slug,
        name,
        ...rest,
        placeId: phanThiet.id,
        eateries: { connect },
        ...PUB,
      },
    });
    await setImages({ specialtyId: row.id }, IMAGES[slug] ?? [], name);
  }

  // 7) Accommodations
  const accommodations = [
    {
      slug: "anantara-mui-ne-resort",
      name: "Anantara Mũi Né Resort",
      category: AccommodationCategory.resort,
      address: "Đường Nguyễn Đình Chiểu, Hàm Tiến, Mũi Né",
      lat: 10.9446,
      lng: 108.2412,
      phone: "0252 3741 888",
      website: "https://www.anantara.com",
      description:
        "Resort nghỉ dưỡng cao cấp sát biển Hàm Tiến, hồ bơi hướng biển và spa thư giãn.",
      tags: ["resort", "biển", "spa", "hồ bơi"],
      isFeatured: true,
    },
    {
      slug: "the-cliff-resort-mui-ne",
      name: "The Cliff Resort & Residences",
      category: AccommodationCategory.resort,
      address: "Khu phố 5, Phú Hài, Phan Thiết",
      lat: 10.9269,
      lng: 108.1659,
      phone: "0252 3719 111",
      website: "https://thecliffresort.com.vn",
      description:
        "Resort sắc màu Địa Trung Hải với nhiều hồ bơi, bãi biển riêng và view mũi Kê Gà phía xa.",
      tags: ["resort", "view biển", "check-in"],
    },
    {
      slug: "mui-ne-hills-homestay",
      name: "Mũi Né Hills Homestay",
      category: AccommodationCategory.homestay,
      address: "Đồi Hồng, Mũi Né, Phan Thiết",
      lat: 10.9512,
      lng: 108.2934,
      phone: "0901 234 567",
      description:
        "Homestay trên đồi, phòng giá mềm, sân thượng ngắm hoàng hôn — hợp khách trẻ và phượt thủ.",
      tags: ["homestay", "giá rẻ", "view đẹp"],
    },
    {
      slug: "khach-san-phan-thiet-center",
      name: "Khách sạn Phan Thiết Center",
      category: AccommodationCategory.hotel,
      address: "Đường Tôn Đức Thắng, TP. Phan Thiết",
      lat: 10.9281,
      lng: 108.1019,
      phone: "0252 3822 999",
      description:
        "Khách sạn trung tâm thành phố, tiện di chuyển tới chợ, bến cá và các điểm tham quan.",
      tags: ["khách sạn", "trung tâm", "tiện nghi"],
    },
    {
      slug: "sailing-club-resort-mui-ne",
      name: "Sailing Club Resort Mũi Né",
      category: AccommodationCategory.resort,
      address: "Đường Nguyễn Đình Chiểu, Hàm Tiến, Mũi Né",
      lat: 10.9461,
      lng: 108.2389,
      phone: "0252 3847 440",
      website: "https://sailingclubresortmuine.com",
      description:
        "Resort bên biển phong cách phóng khoáng, hồ bơi hướng biển và nhà hàng nổi tiếng.",
      tags: ["resort", "biển", "hồ bơi"],
    },
    {
      slug: "pandanus-resort-phan-thiet",
      name: "Pandanus Resort",
      category: AccommodationCategory.resort,
      address: "Đường Tiến Thành, Phan Thiết",
      lat: 10.8895,
      lng: 108.1456,
      phone: "0252 3849 849",
      description:
        "Khu nghỉ rộng rãi nhiều cây xanh, bãi biển riêng yên tĩnh ở phía nam thành phố.",
      tags: ["resort", "yên tĩnh", "bãi riêng"],
    },
    {
      slug: "mango-beach-hostel-mui-ne",
      name: "Mango Beach Hostel",
      category: AccommodationCategory.hostel,
      address: "Đường Huỳnh Thúc Kháng, Mũi Né",
      lat: 10.9505,
      lng: 108.2876,
      phone: "0908 765 432",
      description:
        "Hostel trẻ trung sát biển, phòng dorm giá rẻ, sân chung sôi động — hợp khách Tây ba lô.",
      tags: ["hostel", "giá rẻ", "backpacker"],
    },
    {
      slug: "villa-aria-mui-ne",
      name: "Villa Aria Mũi Né",
      category: AccommodationCategory.villa,
      address: "Đường Nguyễn Đình Chiểu, Hàm Tiến, Mũi Né",
      lat: 10.9438,
      lng: 108.2301,
      phone: "0252 3743 388",
      description:
        "Biệt thự boutique sát biển, không gian riêng tư, hồ bơi và bãi tắm ngay trước villa.",
      tags: ["villa", "biển", "riêng tư"],
    },
  ];

  for (const ac of accommodations) {
    const { slug, name, ...rest } = ac;
    const row = await prisma.accommodation.upsert({
      where: { slug },
      update: { ...rest, placeId: phanThiet.id, ...PUB },
      create: { slug, name, ...rest, placeId: phanThiet.id, ...PUB },
    });
    await setImages({ accommodationId: row.id }, IMAGES[slug] ?? [], name);
  }

  // 8) Blog giới thiệu Phan Thiết (gắn PostRef → Place để hiện thẻ "Bài giới thiệu")
  const author =
    (await prisma.user.findFirst({
      where: { role: { in: [UserRole.admin, UserRole.editor] } },
      orderBy: { createdAt: "asc" },
    })) ??
    (await prisma.user.upsert({
      where: { email: "seed@hanhtrinhviet.local" },
      update: {},
      create: {
        email: "seed@hanhtrinhviet.local",
        name: "Hành Trình Việt",
        role: UserRole.editor,
      },
    }));

  const post = await prisma.post.upsert({
    where: { slug: "kham-pha-phan-thiet" },
    update: { authorId: author.id, ...PUB },
    create: {
      slug: "kham-pha-phan-thiet",
      title: "Khám phá Phan Thiết: thành phố của biển, cát và nắng",
      excerpt:
        "Cẩm nang ngắn gọn về Phan Thiết — nên đi mùa nào, chơi gì, ăn gì và đi lại ra sao.",
      category: "cam-nang",
      tags: ["phan-thiet", "mui-ne", "biển", "cẩm nang"],
      authorId: author.id,
      isFeatured: true,
      content: [
        "<p>Phan Thiết là thành phố biển của tỉnh Bình Thuận, nổi tiếng với bãi biển Mũi Né, những đồi cát đổi màu và nền ẩm thực đậm vị miền biển. Chỉ cách TP.HCM khoảng 200km, đây là điểm đến quen thuộc cho những kỳ nghỉ cuối tuần.</p>",
        "<h2>Nên đi khi nào?</h2>",
        "<p>Đẹp nhất là khoảng tháng 11 đến tháng 4, trời khô ráo, nắng đẹp, thích hợp tắm biển và chơi các môn thể thao trên cát. Mùa gió (tháng 11–3) cũng là lúc Mũi Né hút dân lướt ván diều khắp nơi đổ về.</p>",
        "<h2>Chơi gì ở Phan Thiết?</h2>",
        "<p>Đừng bỏ lỡ bình minh trên Đồi Cát Bay, trượt cát ở Bàu Trắng, dạo Suối Tiên và ghé làng chài Mũi Né lúc sáng sớm. Người thích văn hóa có thể thăm tháp Chăm Po Sah Inư cổ kính nhìn ra cửa biển.</p>",
        "<h2>Ăn gì?</h2>",
        "<p>Hải sản tươi là điều hiển nhiên, nhưng hãy thử thêm lẩu thả, bánh căn, gỏi cá mai và món răng mực nướng trứ danh. Mua nước mắm hoặc thanh long về làm quà cũng rất hợp.</p>",
        "<p>Với khí hậu nắng ấm quanh năm và quãng đường di chuyển ngắn, Phan Thiết luôn là lựa chọn dễ chịu cho một chuyến đi biển 2–3 ngày.</p>",
      ].join(""),
      ...PUB,
    },
  });
  await prisma.postRef.deleteMany({ where: { postId: post.id } });
  await prisma.postRef.create({
    data: { postId: post.id, placeId: phanThiet.id },
  });

  console.log(
    `✓ Seed Phan Thiết xong: 1 tỉnh, 1 điểm đến, ${spots.length} địa điểm, ${activities.length} hoạt động, ${eateries.length} quán ăn, ${specialties.length} đặc sản, ${accommodations.length} lưu trú, 1 bài blog.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
