import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  PlaceKind,
  PublishStatus,
  SpotCategory,
  ActivityCategory,
  ActivityDifficulty,
  ActivityKind,
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
  type HighlightSeed = {
    title: string;
    body?: string;
    imageUrl?: string;
    imageAlt?: string;
  };
  type SpotSeed = {
    slug: string;
    name: string;
    category?: SpotCategory;
    lat?: number;
    lng?: number;
    description?: string;
    bestTime?: string;
    bestTimeNote?: string;
    ticketInfo?: string;
    tips?: string[];
    gettingThere?: string;
    highlights?: HighlightSeed[];
  };
  const spots: SpotSeed[] = [
    {
      slug: "bai-bien-mui-ne",
      name: "Bãi biển Mũi Né",
      category: SpotCategory.beach,
      lat: 10.9333,
      lng: 108.287,
      description:
        "Trải dài hàng cây số với hàng dừa nghiêng nghiêng đón gió, bãi biển Mũi Né là trái tim của cả vùng. Nước ấm quanh năm, sóng vừa phải để tắm, còn gió thì đủ mạnh để biến nơi đây thành một trong những thiên đường lướt ván diều nổi tiếng châu Á.",
      bestTime: "Sáng sớm & chiều mát",
      bestTimeNote:
        "Sáng sớm và chiều muộn là lúc nước dịu, nắng nhẹ và bãi vắng nhất để tắm. Nếu mê lướt ván diều, hãy đến vào mùa gió tháng 11–3 — gió thổi đều, mặt biển kín cánh diều. Mùa hè biển êm hơn, hợp tắm cùng gia đình.",
      ticketInfo: "Miễn phí",
      highlights: [
        {
          title: "Thiên đường lướt ván diều",
          body: "Gió ổn định gần như suốt mùa khô đưa Mũi Né vào top điểm lướt ván diều hàng đầu châu Á. Chiều đến, hàng trăm cánh diều rực rỡ chao liệng trên sóng là cảnh tượng khó quên.",
          imageUrl: "https://picsum.photos/seed/mui-ne-kite/800/600",
          imageAlt: "Lướt ván diều trên biển Mũi Né",
        },
        {
          title: "Hàng dừa đón gió",
          body: "Dải bờ dài rợp bóng dừa nghiêng mình theo gió biển, tạo nên khung cảnh đặc trưng và vô số góc chụp đẹp dọc đường Nguyễn Đình Chiểu.",
          imageUrl: "https://picsum.photos/seed/mui-ne-dua/800/600",
          imageAlt: "Hàng dừa ven biển Mũi Né",
        },
      ],
      tips: [
        "Tắm đẹp nhất lúc sáng sớm hoặc chiều mát, tránh nắng trưa gay gắt.",
        "Mùa gió (tháng 11–3) sóng to, hợp lướt ván hơn là tắm.",
        "Có thể thuê ghế, dù và đồ thể thao biển ngay dọc bãi.",
        "Giữ đồ cẩn thận khi xuống tắm ở khu vực đông người.",
      ],
      gettingThere:
        "Bãi biển chạy dọc đường Nguyễn Đình Chiểu — trục chính của khu nghỉ dưỡng Mũi Né. Từ trung tâm Phan Thiết đi khoảng 15–20km (25–30 phút) bằng taxi, xe máy hoặc xe buýt; hầu hết resort đều mở thẳng ra bãi.",
    },
    {
      slug: "doi-cat-bay-mui-ne",
      name: "Đồi cát bay Mũi Né",
      category: SpotCategory.viewpoint,
      lat: 10.952,
      lng: 108.303,
      description:
        "Nếu chỉ được chọn một nơi để hiểu vì sao người ta mê Mũi Né, hãy đến Đồi Cát Bay. Những triền cát mênh mông liên tục đổi hình theo gió và đổi màu theo nắng — từ vàng óng buổi sớm tới cam đỏ lúc chiều tà. Đây là điểm săn bình minh, trượt cát và check-in kinh điển bậc nhất của thành phố biển.",
      bestTime: "Bình minh hoặc hoàng hôn",
      bestTimeNote:
        "Đẹp nhất vào lúc bình minh (5h30–6h30) và hoàng hôn (17h–18h), khi nắng xiên làm nổi rõ đường nét và sắc cát, đồng thời cát còn mát chân. Nên đi vào mùa khô (tháng 11–4) trời trong, ít mưa. Tránh khung giữa trưa: nắng gắt, cát nóng và ảnh dễ bị bệt màu.",
      ticketInfo: "Vé gửi xe ~10k",
      highlights: [
        {
          title: "Cát đổi màu theo nắng",
          body: "Gió biển thổi không ngừng nên đường nét những triền cát thay đổi mỗi ngày, còn nắng thì nhuộm cát từ vàng nhạt buổi sớm sang cam đỏ lúc xế chiều — không lần ghé nào giống lần nào.",
          imageUrl: "https://picsum.photos/seed/doi-cat-mau/800/600",
          imageAlt: "Triền cát đổi màu dưới nắng ở Đồi cát bay",
        },
        {
          title: "Trượt cát — trò không thể bỏ lỡ",
          body: "Thuê một tấm ván nhựa ngay dưới chân đồi, leo lên đỉnh rồi buông mình trượt xuống. Trò chơi đơn giản mà gây nghiện, hợp với cả trẻ con lẫn người lớn.",
          imageUrl: "https://picsum.photos/seed/doi-cat-truot/800/600",
          imageAlt: "Du khách trượt cát trên đồi",
        },
        {
          title: "Săn bình minh & hoàng hôn",
          body: "Lúc mặt trời mọc hoặc lặn, cả đồi cát chìm trong ánh sáng vàng cam mê hoặc — khung giờ vàng cho những bức ảnh đẹp nhất và cũng là lúc cát mát chân nhất.",
          imageUrl: "https://picsum.photos/seed/doi-cat-binhminh/800/600",
          imageAlt: "Bình minh trên Đồi cát bay Mũi Né",
        },
      ],
      tips: [
        "Đi lúc sáng sớm (5–6h) hoặc chiều muộn để tránh cát nóng bỏng chân và nắng gắt.",
        "Mang theo nước, mũ và kính — gió thổi cát khá rát mặt.",
        "Thuê ván trượt ngay tại chân đồi, hỏi giá và mặc cả trước khi chơi.",
        "Hạn chế buổi trưa: cát có thể nóng tới mức không đi chân trần được.",
      ],
      gettingThere:
        "Đồi cát bay nằm trên đường Huỳnh Thúc Kháng, cách trung tâm Phan Thiết khoảng 20km về phía Mũi Né. Đi xe máy hoặc taxi mất chừng 30–40 phút; nhiều tour xe Jeep nhận đón tận khách sạn từ sáng sớm. Có bãi gửi xe ngay lối vào (~10k).",
    },
    {
      slug: "bau-trang",
      name: "Bàu Trắng",
      category: SpotCategory.lake,
      lat: 11.179,
      lng: 108.413,
      description:
        "Giữa vùng cát trắng mênh mông bất ngờ hiện ra hai hồ nước ngọt phủ kín sen — khung cảnh khiến Bàu Trắng được ví như 'tiểu sa mạc Sahara' của Việt Nam. Sự tương phản giữa cát trắng, nước xanh và sen hồng tạo nên một trong những cảnh quan độc nhất miền Trung.",
      bestTime: "Sáng sớm",
      bestTimeNote:
        "Đến lúc sáng sớm để tránh nắng gắt, cát còn mát và mặt hồ trong trẻo. Sen rộ nhất khoảng tháng 5–7. Mùa khô (tháng 11–4) trời ổn định, dễ di chuyển trên cát hơn.",
      ticketInfo: "Vé vào ~15k",
      highlights: [
        {
          title: "Hồ sen giữa sa mạc cát",
          body: "Bàu Ông và Bàu Bà — hai hồ nước ngọt phủ sen — nằm lọt giữa đồi cát trắng, tạo khung cảnh tương phản hiếm thấy, đẹp nhất vào mùa sen nở.",
          imageUrl: "https://picsum.photos/seed/bau-trang-sen/800/600",
          imageAlt: "Hồ sen Bàu Trắng giữa đồi cát",
        },
        {
          title: "Đồi cát trắng & xe địa hình",
          body: "Những đồi cát trắng cao thoai thoải là sân chơi của xe Jeep, mô tô địa hình và trò trượt cát — vừa ngắm cảnh vừa thử cảm giác mạnh.",
          imageUrl: "https://picsum.photos/seed/bau-trang-quad/800/600",
          imageAlt: "Xe địa hình trên đồi cát Bàu Trắng",
        },
      ],
      tips: [
        "Đi sớm để tránh nắng và cát nóng; mang nước, mũ, kính.",
        "Muốn lên đỉnh đồi xa, nên thuê xe Jeep/mô tô địa hình thay vì lội bộ.",
        "Mùa sen (tháng 5–7) là lúc hồ đẹp nhất.",
        "Bàu Trắng khá xa khu resort, nên đi cùng tour hoặc đổ đầy xăng trước.",
      ],
      gettingThere:
        "Bàu Trắng thuộc xã Hòa Thắng, cách trung tâm Mũi Né khoảng 35km về phía bắc (gần 1 giờ chạy xe). Tiện nhất là đi xe máy theo đường ven biển hoặc ghép tour xe Jeep nửa ngày khởi hành từ Mũi Né.",
    },
    {
      slug: "suoi-tien-mui-ne",
      name: "Suối Tiên",
      category: SpotCategory.other,
      lat: 10.9486,
      lng: 108.288,
      description:
        "Một khe suối nhỏ nước trong vắt len lỏi giữa những vách cát đỏ và trắng kỳ ảo như tiểu hẻm núi thu nhỏ. Chỉ cần xắn quần lội bộ dọc dòng nước mát, bạn sẽ đi qua cả một 'bảo tàng' hình thù do gió và nước bào mòn nên.",
      bestTime: "Sáng sớm",
      bestTimeNote:
        "Buổi sáng là lúc nắng dịu, nước mát và vách cát đỏ lên màu đẹp nhất cho ảnh. Tránh đi ngay sau mưa lớn vì nước có thể đục và chảy xiết. Mùa khô (tháng 11–4) dòng suối trong và dễ lội.",
      ticketInfo: "Miễn phí",
      highlights: [
        {
          title: "Lội bộ giữa vách cát đỏ – trắng",
          body: "Dòng suối nông, đáy cát mịn, hai bên là vách đất đỏ và nhũ cát trắng tầng tầng lớp lớp — vừa đi vừa ngắm như lạc vào một hẻm núi tí hon.",
          imageUrl: "https://picsum.photos/seed/suoi-tien-vach/800/600",
          imageAlt: "Vách cát đỏ trắng dọc Suối Tiên",
        },
      ],
      tips: [
        "Đi chân trần hoặc dép lê vì phải lội nước — không cần giày.",
        "Suối nông, an toàn cho cả trẻ em, nhưng giữ điện thoại tránh ướt.",
        "Gửi xe ở đầu suối (~5–10k), cẩn thận với người chèo kéo dịch vụ.",
        "Hợp ghé buổi sáng rồi qua làng chài gần đó.",
      ],
      gettingThere:
        "Lối vào Suối Tiên nằm ngay đường Huỳnh Thúc Kháng, khu Hàm Tiến – Mũi Né, rất gần các resort. Từ trung tâm Mũi Né chỉ vài phút xe; gửi xe đầu đường rồi đi bộ men theo dòng suối ngược lên.",
    },
    {
      slug: "lang-chai-mui-ne",
      name: "Làng chài Mũi Né",
      category: SpotCategory.village,
      lat: 10.956,
      lng: 108.287,
      description:
        "Muốn thấy một Mũi Né rất đời, hãy ra làng chài lúc tinh mơ. Hàng trăm chiếc thúng chai tròn dập dềnh đưa hải sản vào bờ, cả bãi rộn ràng kẻ mua người bán giữa mùi biển mặn mòi — một phiên chợ cá sống động bậc nhất vùng.",
      bestTime: "5–7h sáng",
      bestTimeNote:
        "Nhộn nhịp và đẹp nhất từ khoảng 5h đến 7h sáng, khi thuyền thúng lần lượt cập bờ và chợ cá họp ngay trên cát. Sau 7h30 thuyền về gần hết, chợ vãn dần. Ánh bình minh nghiêng trên hàng thúng cũng là khung cảnh chụp ảnh tuyệt đẹp.",
      highlights: [
        {
          title: "Bình minh trên hàng thúng chai",
          body: "Hàng trăm thúng chai tròn neo san sát, lắc lư theo sóng dưới nắng sớm — một trong những khung hình biểu tượng của làng chài miền biển.",
          imageUrl: "https://picsum.photos/seed/lang-chai-thung/800/600",
          imageAlt: "Thúng chai trên biển làng chài Mũi Né lúc bình minh",
        },
        {
          title: "Chợ cá sớm tươi rói",
          body: "Cá, mực, tôm, ghẹ vừa đánh bắt được bày bán ngay trên bãi với giá gốc — nơi tuyệt vời để cảm nhận nhịp sống ngư dân và mua hải sản tươi.",
          imageUrl: "https://picsum.photos/seed/lang-chai-cho/800/600",
          imageAlt: "Chợ cá sớm tại làng chài Mũi Né",
        },
      ],
      tips: [
        "Đến trước 6h30 để bắt trọn cảnh thuyền về và chợ đông nhất.",
        "Mặc cả nhẹ nhàng khi mua hải sản; có thể nhờ quán gần đó chế biến.",
        "Đi giày dễ tháo vì bãi ướt và nhiều cát.",
        "Tôn trọng công việc của ngư dân khi chụp ảnh, hỏi trước khi quay cận.",
      ],
      gettingThere:
        "Làng chài nằm ngay cuối đường Nguyễn Đình Chiểu, sát khu Mũi Né, chỉ vài phút từ các resort. Sáng sớm đi taxi hoặc xe máy là tiện nhất để kịp giờ chợ.",
    },
    {
      slug: "thap-po-sah-inu",
      name: "Tháp Po Sah Inư",
      category: SpotCategory.temple,
      lat: 10.929,
      lng: 108.128,
      description:
        "Trên đồi Bà Nài lộng gió, cụm tháp Chăm Po Sah Inư đã đứng lặng nhìn ra cửa biển Phan Thiết hơn một nghìn năm. Những khối gạch nung đỏ au với đường nét kiến trúc Chăm trầm mặc khiến nơi đây vừa là di tích quý vừa là điểm ngắm hoàng hôn rất riêng.",
      bestTime: "Chiều mát",
      bestTimeNote:
        "Đẹp nhất vào cuối chiều khi nắng dịu, gạch tháp lên màu ấm và bạn có thể ở lại đón hoàng hôn trên đồi nhìn ra biển. Mùa khô (tháng 11–4) trời trong, thuận cho tham quan và chụp ảnh.",
      ticketInfo: "Vé ~15k",
      highlights: [
        {
          title: "Kiến trúc Chăm ngàn năm",
          body: "Cụm tháp xây từ thế kỷ 8–9 theo phong cách Hòa Lai, gạch xếp khít gần như không mạch vữa — minh chứng cho kỹ thuật xây dựng tài hoa của người Chăm xưa.",
          imageUrl: "https://picsum.photos/seed/thap-cham-kientruc/800/600",
          imageAlt: "Tháp Chăm Po Sah Inư",
        },
        {
          title: "Hoàng hôn trên đồi Bà Nài",
          body: "Vị trí trên đồi cao nhìn ra cửa biển Phan Thiết khiến đây là chỗ đón hoàng hôn yên tĩnh, ít đông hơn các bãi biển.",
          imageUrl: "https://picsum.photos/seed/thap-cham-hoanghon/800/600",
          imageAlt: "Hoàng hôn nhìn từ đồi tháp Po Sah Inư",
        },
      ],
      tips: [
        "Ăn mặc lịch sự vì đây là nơi tín ngưỡng của người Chăm.",
        "Đi cuối chiều vừa mát vừa kịp ngắm hoàng hôn.",
        "Gặp dịp lễ hội Katê (khoảng tháng 9–10 dương lịch) thì rất đáng xem.",
        "Khuôn viên nhỏ, nên kết hợp tham quan cùng các điểm khác trong buổi.",
      ],
      gettingThere:
        "Tháp nằm trên đồi Bà Nài, đường Nguyễn Thông, phường Phú Hài — cách trung tâm Phan Thiết khoảng 7km (15 phút) trên đường ra Mũi Né. Đi taxi hoặc xe máy đều thuận, có bãi đỗ xe tại chân đồi.",
    },
    {
      slug: "hon-rom",
      name: "Hòn Rơm",
      category: SpotCategory.beach,
      lat: 10.976,
      lng: 108.329,
      description:
        "Nằm ở cuối cung đường Mũi Né, Hòn Rơm là bãi tắm nước trong xanh, sóng êm và còn khá hoang sơ. Vắng vẻ, sạch sẽ và an toàn, đây là lựa chọn lý tưởng cho những ai muốn tránh đám đông và thư giãn cùng gia đình.",
      bestTime: "Sáng & chiều mát",
      bestTimeNote:
        "Nước trong và êm nhất vào buổi sáng; chiều mát thì dễ chịu để tắm và dạo bãi. Mùa hè (tháng 4–8) biển lặng, hợp tắm; mùa gió cuối năm sóng lớn hơn, cần để ý khi xuống nước.",
      ticketInfo: "Miễn phí",
      highlights: [
        {
          title: "Bãi tắm trong xanh, ít người",
          body: "Bờ cát sạch, nước trong và sóng nhẹ khiến Hòn Rơm bình yên hơn hẳn các bãi trung tâm — rất hợp để tắm cùng trẻ nhỏ.",
          imageUrl: "https://picsum.photos/seed/hon-rom-bai/800/600",
          imageAlt: "Bãi tắm trong xanh ở Hòn Rơm",
        },
      ],
      tips: [
        "Hợp đi cùng gia đình nhờ nước êm, nhưng vẫn để mắt tới trẻ nhỏ.",
        "Dịch vụ ít hơn khu trung tâm, nên mang theo nước và đồ ăn nhẹ.",
        "Kết hợp ghé cùng Bàu Trắng vì nằm cùng hướng bắc.",
        "Một số khu cho phép cắm trại, ngắm sao buổi tối.",
      ],
      gettingThere:
        "Hòn Rơm thuộc phường Mũi Né, cách trung tâm Mũi Né khoảng 7–10km về phía bắc theo đường ven biển (15–20 phút xe máy). Đường đẹp, dễ đi, có thể ghép cùng cung Bàu Trắng.",
    },
    {
      slug: "bai-da-ong-dia",
      name: "Bãi đá Ông Địa",
      category: SpotCategory.beach,
      lat: 10.927,
      lng: 108.256,
      description:
        "Bãi biển nhỏ này nổi tiếng nhờ một tảng đá lớn có hình dáng tựa Ông Địa đang ngồi nhìn ra khơi, được người dân lập am thờ. Những ghềnh đá đen xen cát vàng cùng sóng vỗ tạo nên khung cảnh vừa linh thiêng vừa rất 'ăn ảnh', đặc biệt lúc hoàng hôn.",
      bestTime: "Hoàng hôn",
      bestTimeNote:
        "Đẹp nhất lúc hoàng hôn khi nắng vàng đổ lên ghềnh đá và mặt biển — khung giờ check-in được yêu thích nhất. Sáng sớm cũng yên tĩnh, sóng vỗ ghềnh đá đẹp. Khi triều xuống, bãi đá lộ ra nhiều, dễ leo trèo chụp ảnh.",
      ticketInfo: "Miễn phí",
      highlights: [
        {
          title: "Tảng đá hình Ông Địa",
          body: "Khối đá tự nhiên có hình dáng giống Ông Địa đã thành biểu tượng và nơi cầu may của người dân — gắn liền với tên gọi của bãi.",
          imageUrl: "https://picsum.photos/seed/ong-dia-da/800/600",
          imageAlt: "Tảng đá hình Ông Địa bên bờ biển",
        },
        {
          title: "Ghềnh đá check-in hoàng hôn",
          body: "Những ghềnh đá đen nhấp nhô xen bãi cát là phông nền lý tưởng cho ảnh hoàng hôn, thu hút đông bạn trẻ mỗi chiều.",
          imageUrl: "https://picsum.photos/seed/ong-dia-ghenh/800/600",
          imageAlt: "Ghềnh đá Bãi đá Ông Địa lúc hoàng hôn",
        },
      ],
      tips: [
        "Đến trước hoàng hôn chừng 30 phút để chọn chỗ đẹp.",
        "Cẩn thận khi leo trèo trên đá trơn, nhất là lúc sóng lớn.",
        "Đi lúc triều xuống sẽ thấy nhiều đá hơn để tạo dáng.",
        "Giữ gìn vệ sinh và tôn trọng am thờ của người dân.",
      ],
      gettingThere:
        "Bãi đá Ông Địa nằm trên đường Nguyễn Đình Chiểu, đoạn đầu khu Hàm Tiến trên đường từ Phan Thiết ra Mũi Né — cách trung tâm thành phố khoảng 10km. Đi taxi hoặc xe máy đều dễ, gửi xe ven đường.",
    },
  ];

  const spotId: Record<string, string> = {};
  for (const s of spots) {
    const { slug, name, highlights, ...rest } = s;
    const hl =
      highlights && highlights.length > 0
        ? highlights.map((h, i) => ({ ...h, order: i }))
        : null;
    const row = await prisma.spot.upsert({
      where: { slug },
      update: {
        ...rest,
        placeId: phanThiet.id,
        ...PUB,
        // sửa: xoá điểm nhấn cũ rồi tạo lại theo thứ tự
        highlights: hl ? { deleteMany: {}, create: hl } : undefined,
      },
      create: {
        slug,
        name,
        ...rest,
        placeId: phanThiet.id,
        ...PUB,
        highlights: hl ? { create: hl } : undefined,
      },
    });
    spotId[slug] = row.id;
    await setImages({ spotId: row.id }, IMAGES[slug] ?? [], name);
  }

  // 4) Activities (M:N tới Spot)
  // spots[].blurb = nội dung RIÊNG của hoạt động này TẠI spot đó (qua SpotActivity).
  type ActivitySeed = {
    slug: string;
    name: string;
    kind: ActivityKind;
    category?: ActivityCategory;
    difficulty?: ActivityDifficulty;
    durationText?: string;
    seasonText?: string;
    operatorName?: string;
    priceRange?: PriceRange;
    ticketFree?: boolean;
    ticketTiers?: { label: string; price: number; note?: string }[];
    description?: string;
    spots: { slug: string; blurb?: string }[];
  };
  const activities: ActivitySeed[] = [
    {
      slug: "truot-cat-mui-ne",
      name: "Trượt cát",
      kind: ActivityKind.common,
      category: ActivityCategory.adventure,
      difficulty: ActivityDifficulty.easy,
      durationText: "1–2 giờ",
      ticketTiers: [{ label: "Thuê ván trượt", price: 20000 }],
      description:
        "Chẳng cần kinh nghiệm hay đồ nghề cầu kỳ — chỉ một tấm ván nhựa thuê ngay dưới chân đồi là bạn đã sẵn sàng. Leo lên triền cát mịn, ngồi lên ván rồi buông mình trượt một mạch xuống dốc trong tiếng cười giòn tan.",
      spots: [
        {
          slug: "doi-cat-bay-mui-ne",
          blurb:
            "Triền cát cao thoai thoải ở Đồi Cát Bay là chỗ trượt 'kinh điển' — ván thuê sẵn ngay chân đồi, trượt một mạch xuống thật đã.",
        },
        {
          slug: "bau-trang",
          blurb:
            "Đồi cát trắng Bàu Trắng rộng và vắng hơn, trượt xong còn tha hồ chụp ảnh giữa biển cát mênh mông.",
        },
      ],
    },
    {
      slug: "luot-van-dieu-mui-ne",
      name: "Lướt ván diều",
      kind: ActivityKind.common,
      category: ActivityCategory.water,
      difficulty: ActivityDifficulty.moderate,
      durationText: "Nửa ngày",
      seasonText: "Tháng 11 – 3 (mùa gió)",
      operatorName: "Các trung tâm lướt ván ven biển",
      ticketTiers: [
        { label: "Thuê thiết bị / giờ", price: 300000 },
        { label: "Khoá học nhập môn", price: 2500000, note: "khoảng 3 buổi" },
      ],
      description:
        "Mũi Né là một trong những điểm lướt ván diều tốt nhất châu Á: gió thổi đều và mạnh suốt mùa khô, mặt biển rộng thoáng cho những cánh diều sải cánh.",
      spots: [
        {
          slug: "bai-bien-mui-ne",
          blurb:
            "Bãi biển Mũi Né gió đều, mặt nước rộng — sân chơi chính của môn lướt ván diều; mùa gió kín trời cánh diều rực rỡ.",
        },
      ],
    },
    {
      slug: "jeep-binh-minh-doi-cat",
      name: "Tour xe Jeep săn bình minh đồi cát",
      kind: ActivityKind.experience,
      category: ActivityCategory.adventure,
      difficulty: ActivityDifficulty.easy,
      durationText: "Nửa buổi (sáng sớm)",
      seasonText: "Quanh năm, đẹp nhất mùa khô",
      operatorName: "Các đơn vị tour địa phương",
      ticketTiers: [
        { label: "Người lớn", price: 150000 },
        { label: "Trẻ em", price: 80000 },
        { label: "Thuê nguyên xe", price: 600000, note: "tối đa 5 khách" },
      ],
      description:
        "Khi trời còn nhập nhoạng, chiếc Jeep mui trần đón bạn lao đi trong gió sớm, kịp đặt chân lên đồi cát bay đúng lúc mặt trời ló rạng. Hành trình nối tiếp qua Bàu Trắng, suối Tiên rồi làng chài, gói trọn tinh hoa Mũi Né chỉ trong một buổi sáng.",
      spots: [
        { slug: "doi-cat-bay-mui-ne", blurb: "Điểm dừng săn bình minh chính của tour." },
        { slug: "bau-trang", blurb: "Tour vòng qua đồi cát trắng và hồ sen Bàu Trắng." },
        { slug: "suoi-tien-mui-ne", blurb: "Ghé lội Suối Tiên trước khi quay về." },
      ],
    },
    {
      slug: "tam-bien-mui-ne",
      name: "Tắm biển",
      kind: ActivityKind.common,
      category: ActivityCategory.water,
      difficulty: ActivityDifficulty.easy,
      ticketFree: true,
      description:
        "Biển Phan Thiết ấm áp gần như quanh năm, sóng vừa phải và bờ cát thoai thoải rất hợp để ngâm mình thư giãn.",
      spots: [
        {
          slug: "bai-bien-mui-ne",
          blurb:
            "Bãi chính dài và nhiều dịch vụ — tắm xong có thể thuê ghế, ăn uống ngay ven biển. Đông vui nhất vùng.",
        },
        {
          slug: "hon-rom",
          blurb:
            "Nước trong xanh, sóng êm, bãi sạch và vắng — lựa chọn lý tưởng để tắm cùng gia đình và trẻ nhỏ.",
        },
        {
          slug: "bai-da-ong-dia",
          blurb:
            "Tắm xen những ghềnh đá đen độc đáo; canh lúc chiều để vừa tắm vừa ngắm hoàng hôn.",
        },
      ],
    },
    {
      slug: "cheo-sup-kayak-mui-ne",
      name: "Chèo SUP & kayak",
      kind: ActivityKind.common,
      category: ActivityCategory.water,
      difficulty: ActivityDifficulty.easy,
      durationText: "1–2 giờ",
      seasonText: "Đẹp nhất sáng sớm, biển lặng",
      ticketTiers: [{ label: "Thuê SUP / giờ", price: 120000 }],
      description:
        "Buổi sớm, lúc gió chưa nổi và nước còn như gương, chèo SUP hay kayak dọc bờ là cách tuyệt vời để ngắm bình minh từ một góc rất riêng.",
      spots: [
        {
          slug: "hon-rom",
          blurb:
            "Mặt vịnh Hòn Rơm sáng sớm lặng như gương, chèo SUP ra ngắm bình minh cực yên bình.",
        },
        {
          slug: "bai-bien-mui-ne",
          blurb:
            "Chèo dọc bờ Mũi Né lúc gió chưa nổi, vừa vận động vừa ngắm bãi biển từ ngoài khơi.",
        },
      ],
    },
    {
      slug: "mo-to-nuoc-mui-ne",
      name: "Mô tô nước & thể thao biển",
      kind: ActivityKind.experience,
      category: ActivityCategory.water,
      difficulty: ActivityDifficulty.moderate,
      durationText: "30–60 phút",
      operatorName: "Dịch vụ thể thao biển tại bãi",
      ticketTiers: [
        { label: "Mô tô nước (15 phút)", price: 300000 },
        { label: "Dù kéo", price: 250000 },
        { label: "Chuối phao", price: 100000 },
      ],
      description:
        "Dành cho những ai mê cảm giác mạnh: phóng mô tô nước rẽ sóng, bay bổng cùng dù kéo hay nhún nhảy trên chuối phao. Dịch vụ có sẵn ngay tại bãi, trang bị áo phao và hướng dẫn đầy đủ.",
      spots: [
        { slug: "bai-bien-mui-ne", blurb: "Khu thể thao biển ngay bãi chính — mô tô nước, dù kéo, chuối phao đủ cả." },
        { slug: "hon-rom", blurb: "Vùng nước rộng, thoáng, hợp phóng mô tô nước thả ga." },
      ],
    },
    {
      slug: "tham-quan-thap-cham",
      name: "Tham quan tháp Chăm",
      kind: ActivityKind.spot,
      category: ActivityCategory.culture,
      difficulty: ActivityDifficulty.easy,
      durationText: "Khoảng 1 giờ",
      ticketTiers: [{ label: "Vé vào cửa", price: 15000 }],
      description:
        "Khám phá cụm tháp Chăm Po Sah Inư cổ kính trên đồi Bà Nài — kiến trúc gạch nung đỏ trầm mặc nhìn ra cửa biển, đẹp nhất lúc chiều xuống.",
      spots: [{ slug: "thap-po-sah-inu" }],
    },
    {
      slug: "san-hoang-hon-phan-thiet",
      name: "Săn hoàng hôn",
      kind: ActivityKind.common,
      category: ActivityCategory.relax,
      difficulty: ActivityDifficulty.easy,
      durationText: "Cuối ngày",
      seasonText: "Quanh năm",
      ticketFree: true,
      description:
        "Khi mặt trời hạ xuống, cả Phan Thiết nhuộm trong sắc cam ấm áp — khoảnh khắc lãng mạn nhất để khép lại một ngày ở thành phố biển.",
      spots: [
        {
          slug: "bai-da-ong-dia",
          blurb:
            "Ghềnh đá Ông Địa là phông nền hoàng hôn 'ăn ảnh' nhất, chiều nào cũng đông bạn trẻ.",
        },
        {
          slug: "doi-cat-bay-mui-ne",
          blurb:
            "Hoàng hôn nhuộm cam những triền cát — khung cảnh khoáng đạt khó nơi nào có.",
        },
        {
          slug: "thap-po-sah-inu",
          blurb:
            "Trên đồi Bà Nài, ngắm mặt trời lặn sau tháp Chăm cổ, vừa tĩnh lặng vừa hoài niệm.",
        },
      ],
    },
  ];

  for (const a of activities) {
    const { slug, name, spots, ticketTiers, ...rest } = a;
    const tt =
      ticketTiers && ticketTiers.length > 0
        ? (ticketTiers as Prisma.InputJsonValue)
        : Prisma.DbNull;
    const links = spots.map((s, i) => ({
      spotId: spotId[s.slug],
      order: i,
      blurb: s.blurb ?? null,
    }));
    const row = await prisma.activity.upsert({
      where: { slug },
      update: {
        ...rest,
        ticketTiers: tt,
        placeId: phanThiet.id,
        ...PUB,
        spotLinks: { deleteMany: {}, create: links },
      },
      create: {
        slug,
        name,
        ...rest,
        ticketTiers: tt,
        placeId: phanThiet.id,
        ...PUB,
        spotLinks: { create: links },
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
