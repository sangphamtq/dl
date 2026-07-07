import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  PlaceKind,
  PublishStatus,
  SpotCategory,
  ActivityCategory,
  ActivityKind,
  EateryCategory,
  Meal,
  AccommodationCategory,
  PriceRange,
  TransportDirection,
  TransportMode,
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
// Pool ảnh ẩm thực (tất cả là ảnh món ăn/quán) — tái dùng để dựng gallery nhiều ảnh.
const F = "https://y3m837otke.ufs.sh/f/";
const FOOD = {
  banhCan: F + "m9VMJOw4aGbVHOHsVwgtLGTBS2Zs017p36DzeKQXcnfw5yNm",
  lauTha: F + "m9VMJOw4aGbV0uC2gJ42IasfMBuQhmEv5CcVHDr7R9wnW8bg",
  haiSan: F + "m9VMJOw4aGbVF2tJSI5pDvbxdNjE48eVyfrl2qSG5oOt3ksu",
  banhXeo: F + "m9VMJOw4aGbVtO2kvLa9DUqbFmsL3nowTu54dv7fryRz0GYe",
  banhCanh: F + "m9VMJOw4aGbVP2d9olRWz28SuVb46BiWcK9jXJPIfRHrTpa3",
  rangMuc: F + "m9VMJOw4aGbVDOM9EHV7y8JhmixqtcU0eVNuEYsBndZ1CokX",
  haiSan2: F + "m9VMJOw4aGbV32sscNxMeYTmuqJL4cbBoxQnCyX7ArKj0NPv",
  cafe: F + "m9VMJOw4aGbV3brXfESxNIzSVdQsYLDi4gpfXl5Bjw0RKWoC",
  nuocMam: F + "m9VMJOw4aGbVbFFxeLGtBO2eXE0oTNdl4aqLIKZ7y59rPzVQ",
  thanhLong: F + "m9VMJOw4aGbVMMryv70xmWkuS4zvncQBOspdHe0rojq8wiaC",
  mucMotNang: F + "m9VMJOw4aGbVwxgIA6xPfv7TtDnqG58WPEKwhlSVOiFgU1ZI",
};

// Pool ảnh lưu trú (resort/khách sạn/phòng) — tái dùng để dựng gallery nhiều ảnh.
const STAY = {
  anantara: F + "m9VMJOw4aGbV88W20kNtSa4RYZ1IFnoHwL8POAuJXU9lpqre",
  cliff: F + "m9VMJOw4aGbVKjSeN0eoDPNw8b4hMBxe3vjfX0JlqIyC7mio",
  hills: F + "m9VMJOw4aGbVIMyiaWOJ3i9vQ1fIPbaTDodWErlMtRmUSn2j",
  center: F + "m9VMJOw4aGbVnOIIS66kyNpVrswG2bXt7P5uIACShYzTBO4c",
  sailing: F + "m9VMJOw4aGbVlwyNwz7KZuRxYfJ0sUTyC4mB3WAIvHNna9rE",
  pandanus: F + "m9VMJOw4aGbV3brXfESxNIzSVdQsYLDi4gpfXl5Bjw0RKWoC",
  mango: F + "m9VMJOw4aGbVGXK7LJpMeYTmuqJL4cbBoxQnCyX7ArKj0NPv",
  villa: F + "m9VMJOw4aGbVrofNvlYb8jagp6cK5uSRW3FnfXEZDVh1xAqB",
};

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
  "banh-can-cay-phuong": [
    { url: FOOD.banhCan, alt: "Bánh căn Cây Phượng", caption: "Khuôn bánh nóng hổi" },
    { url: FOOD.banhXeo, alt: "Bánh đổ khuôn đất" },
    { url: FOOD.banhCanh, alt: "Nước chấm cá kho" },
  ],
  "lau-tha-hong-ngoc": [
    { url: FOOD.lauTha, alt: "Lẩu thả Hồng Ngọc", caption: "Bày như bông hoa" },
    { url: FOOD.haiSan, alt: "Cá mai tươi" },
    { url: FOOD.haiSan2, alt: "Rau, bún cuốn ăn kèm" },
  ],
  "hai-san-bo-ke-24": [
    { url: FOOD.haiSan, alt: "Hải sản Bờ Kè 24" },
    { url: FOOD.haiSan2, alt: "Đồ nướng tươi" },
    { url: FOOD.lauTha, alt: "Lẩu thả hải sản" },
  ],
  "banh-xeo-ba-hai": [
    { url: FOOD.banhXeo, alt: "Bánh xèo Bà Hai", caption: "Giòn rụm" },
    { url: FOOD.banhCan, alt: "Đổ nóng tại chỗ" },
    { url: FOOD.rangMuc, alt: "Ăn kèm rau sống" },
  ],
  "banh-canh-cha-ca-ba-ly": [
    { url: FOOD.banhCanh, alt: "Bánh canh chả cá Bà Lý" },
    { url: FOOD.banhCan, alt: "Chả cá dai ngọt" },
    { url: FOOD.lauTha, alt: "Nước dùng cá biển" },
  ],
  "rang-muc-cay-bang": [
    { url: FOOD.rangMuc, alt: "Răng mực nướng Cây Bàng" },
    { url: FOOD.banhXeo, alt: "Nướng than thơm" },
    { url: FOOD.mucMotNang, alt: "Chấm muối ớt xanh" },
  ],
  "hai-san-co-ni": [
    { url: FOOD.haiSan2, alt: "Hải sản Cô Nỉ" },
    { url: FOOD.haiSan, alt: "Tươi sống chọn tại chỗ" },
    { url: FOOD.lauTha, alt: "Chế biến theo yêu cầu" },
  ],
  "sandy-beach-cafe": [
    { url: FOOD.cafe, alt: "Sandy Beach Café", caption: "View biển" },
    { url: FOOD.thanhLong, alt: "Nước ép thanh long" },
    { url: FOOD.nuocMam, alt: "Góc quán sát biển" },
  ],
  "com-ga-ta-vi": [
    { url: FOOD.banhCan, alt: "Cơm gà Tà Vi" },
    { url: FOOD.banhCanh, alt: "Gà ta xé phay" },
  ],
  "quan-chay-sen": [
    { url: FOOD.lauTha, alt: "Quán chay Sen" },
    { url: FOOD.haiSan, alt: "Mâm cơm chay" },
  ],
  "banh-mi-thit-nuong-phan-thiet": [
    { url: FOOD.banhXeo, alt: "Bánh mì thịt nướng Phan Thiết" },
    { url: FOOD.rangMuc, alt: "Thịt nướng than" },
  ],
  "oc-nuong-bo-ke": [
    { url: FOOD.haiSan, alt: "Ốc nướng Bờ Kè" },
    { url: FOOD.haiSan2, alt: "Ốc các loại" },
  ],
  "che-thai-mui-ne": [
    { url: FOOD.cafe, alt: "Chè Thái Mũi Né" },
    { url: FOOD.thanhLong, alt: "Chè trái cây" },
  ],

  // Đặc sản (Specialty)
  "banh-can-phan-thiet": [
    { url: FOOD.banhCan, alt: "Bánh căn Phan Thiết" },
    { url: FOOD.banhCanh, alt: "Ăn kèm xíu mại, trứng" },
  ],
  "lau-tha-phan-thiet": [
    { url: FOOD.lauTha, alt: "Lẩu thả" },
    { url: FOOD.haiSan, alt: "Cá mai/cá suốt tươi" },
  ],
  "goi-ca-mai-phan-thiet": [
    { url: FOOD.haiSan, alt: "Gỏi cá mai" },
    { url: FOOD.haiSan2, alt: "Cuốn bánh tráng" },
  ],
  "nuoc-mam-phan-thiet": [
    { url: FOOD.nuocMam, alt: "Nước mắm Phan Thiết" },
    { url: FOOD.mucMotNang, alt: "Ủ chượp truyền thống" },
  ],
  "thanh-long-binh-thuan": [
    { url: FOOD.thanhLong, alt: "Thanh long Bình Thuận" },
  ],
  "rang-muc-phan-thiet": [
    { url: FOOD.rangMuc, alt: "Răng mực" },
    { url: FOOD.mucMotNang, alt: "Chấm muối ớt xanh" },
  ],
  "banh-canh-cha-ca-phan-thiet": [
    { url: FOOD.banhCanh, alt: "Bánh canh chả cá" },
    { url: FOOD.banhCan, alt: "Chả cá biển" },
  ],
  "muc-mot-nang-phan-thiet": [
    { url: FOOD.mucMotNang, alt: "Mực một nắng" },
    { url: FOOD.haiSan2, alt: "Nướng lên ngọt đậm" },
  ],
  "banh-xeo-phan-thiet": [
    { url: FOOD.banhXeo, alt: "Bánh xèo Phan Thiết" },
    { url: FOOD.rangMuc, alt: "Bánh xèo mực" },
  ],
  "com-ga-phan-thiet": [
    { url: FOOD.banhCan, alt: "Cơm gà Phan Thiết" },
    { url: FOOD.banhCanh, alt: "Gà ta thả vườn" },
  ],
  "dong-cat-mui-ne": [
    { url: FOOD.haiSan2, alt: "Dông cát Mũi Né" },
    { url: FOOD.haiSan, alt: "Đặc sản vùng cát" },
  ],

  // Lưu trú (Accommodation)
  "anantara-mui-ne-resort": [
    { url: STAY.anantara, alt: "Anantara Mũi Né Resort", caption: "Hồ bơi hướng biển" },
    { url: STAY.sailing, alt: "Khuôn viên resort" },
    { url: STAY.villa, alt: "Phòng nghỉ hướng biển" },
  ],
  "the-cliff-resort-mui-ne": [
    { url: STAY.cliff, alt: "The Cliff Resort", caption: "Sắc màu Địa Trung Hải" },
    { url: STAY.pandanus, alt: "Hồ bơi" },
    { url: STAY.anantara, alt: "Bãi biển riêng" },
  ],
  "mui-ne-hills-homestay": [
    { url: STAY.hills, alt: "Mũi Né Hills Homestay" },
    { url: STAY.mango, alt: "Sân thượng ngắm hoàng hôn" },
  ],
  "khach-san-phan-thiet-center": [
    { url: STAY.center, alt: "Khách sạn Phan Thiết Center" },
    { url: STAY.cliff, alt: "Phòng tiêu chuẩn" },
  ],
  "sailing-club-resort-mui-ne": [
    { url: STAY.sailing, alt: "Sailing Club Resort", caption: "Hồ bơi hướng biển" },
    { url: STAY.anantara, alt: "Bãi biển" },
    { url: STAY.villa, alt: "Khu nghỉ" },
  ],
  "pandanus-resort-phan-thiet": [
    { url: STAY.pandanus, alt: "Pandanus Resort", caption: "Bãi biển riêng yên tĩnh" },
    { url: STAY.cliff, alt: "Khuôn viên xanh" },
  ],
  "mango-beach-hostel-mui-ne": [
    { url: STAY.mango, alt: "Mango Beach Hostel" },
    { url: STAY.hills, alt: "Sân chung" },
  ],
  "villa-aria-mui-ne": [
    { url: STAY.villa, alt: "Villa Aria Mũi Né", caption: "Hồ bơi riêng" },
    { url: STAY.anantara, alt: "Bãi tắm trước villa" },
  ],
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
    body?: string; // văn xuôi thuần; sẽ bọc <p> thành rich text khi ghi
  };
  type SpotSeed = {
    slug: string;
    name: string;
    tagline?: string;
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
      tagline: "Bờ dừa nghiêng gió, thiên đường lướt ván diều châu Á.",
      category: SpotCategory.beach,
      lat: 10.9333,
      lng: 108.287,
      description:
        "Trải dài hàng cây số với hàng dừa nghiêng nghiêng đón gió, bãi biển Mũi Né là trái tim của cả vùng. Nước ấm quanh năm, sóng vừa phải để tắm, còn gió thì đủ mạnh để biến nơi đây thành một trong những thiên đường lướt ván diều nổi tiếng châu Á.",
      bestTime: "Sáng sớm & chiều mát",
      bestTimeNote:
        "Sáng sớm và chiều muộn là lúc nước dịu, nắng nhẹ và bãi vắng nhất để tắm. Nếu mê lướt ván diều, hãy đến vào mùa gió tháng 11–3 — gió thổi đều, mặt biển kín cánh diều. Mùa hè biển êm hơn, hợp tắm cùng gia đình.",
      highlights: [
        {
          title: "Thiên đường lướt ván diều",
          body: "Gió ổn định gần như suốt mùa khô đưa Mũi Né vào top điểm lướt ván diều hàng đầu châu Á. Chiều đến, hàng trăm cánh diều rực rỡ chao liệng trên sóng là cảnh tượng khó quên.",
        },
        {
          title: "Hàng dừa đón gió",
          body: "Dải bờ dài rợp bóng dừa nghiêng mình theo gió biển, tạo nên khung cảnh đặc trưng và vô số góc chụp đẹp dọc đường Nguyễn Đình Chiểu.",
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
      tagline: "Triền cát đổi màu theo nắng, đổi hình theo gió.",
      category: SpotCategory.viewpoint,
      lat: 10.952,
      lng: 108.303,
      description:
        "Nếu chỉ được chọn một nơi để hiểu vì sao người ta mê Mũi Né, hãy đến Đồi Cát Bay. Những triền cát mênh mông liên tục đổi hình theo gió và đổi màu theo nắng — từ vàng óng buổi sớm tới cam đỏ lúc chiều tà. Đây là điểm săn bình minh, trượt cát và check-in kinh điển bậc nhất của thành phố biển.",
      bestTime: "Bình minh hoặc hoàng hôn",
      bestTimeNote:
        "Đẹp nhất vào lúc bình minh (5h30–6h30) và hoàng hôn (17h–18h), khi nắng xiên làm nổi rõ đường nét và sắc cát, đồng thời cát còn mát chân. Nên đi vào mùa khô (tháng 11–4) trời trong, ít mưa. Tránh khung giữa trưa: nắng gắt, cát nóng và ảnh dễ bị bệt màu.",
      highlights: [
        {
          title: "Cát đổi màu theo nắng",
          body: "Gió biển thổi không ngừng nên đường nét những triền cát thay đổi mỗi ngày, còn nắng thì nhuộm cát từ vàng nhạt buổi sớm sang cam đỏ lúc xế chiều — không lần ghé nào giống lần nào.",
        },
        {
          title: "Trượt cát — trò không thể bỏ lỡ",
          body: "Thuê một tấm ván nhựa ngay dưới chân đồi, leo lên đỉnh rồi buông mình trượt xuống. Trò chơi đơn giản mà gây nghiện, hợp với cả trẻ con lẫn người lớn.",
        },
        {
          title: "Săn bình minh & hoàng hôn",
          body: "Lúc mặt trời mọc hoặc lặn, cả đồi cát chìm trong ánh sáng vàng cam mê hoặc — khung giờ vàng cho những bức ảnh đẹp nhất và cũng là lúc cát mát chân nhất.",
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
      tagline: "Hồ sen thơ mộng giữa 'tiểu sa mạc' cát trắng.",
      category: SpotCategory.lake,
      lat: 11.179,
      lng: 108.413,
      description:
        "Giữa vùng cát trắng mênh mông bất ngờ hiện ra hai hồ nước ngọt phủ kín sen — khung cảnh khiến Bàu Trắng được ví như 'tiểu sa mạc Sahara' của Việt Nam. Sự tương phản giữa cát trắng, nước xanh và sen hồng tạo nên một trong những cảnh quan độc nhất miền Trung.",
      bestTime: "Sáng sớm",
      bestTimeNote:
        "Đến lúc sáng sớm để tránh nắng gắt, cát còn mát và mặt hồ trong trẻo. Sen rộ nhất khoảng tháng 5–7. Mùa khô (tháng 11–4) trời ổn định, dễ di chuyển trên cát hơn.",
      highlights: [
        {
          title: "Hồ sen giữa sa mạc cát",
          body: "Bàu Ông và Bàu Bà — hai hồ nước ngọt phủ sen — nằm lọt giữa đồi cát trắng, tạo khung cảnh tương phản hiếm thấy, đẹp nhất vào mùa sen nở.",
        },
        {
          title: "Đồi cát trắng & xe địa hình",
          body: "Những đồi cát trắng cao thoai thoải là sân chơi của xe Jeep, mô tô địa hình và trò trượt cát — vừa ngắm cảnh vừa thử cảm giác mạnh.",
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
      tagline: "Dòng suối đỏ cam len giữa vách cát vàng kỳ ảo.",
      category: SpotCategory.other,
      lat: 10.9486,
      lng: 108.288,
      description:
        "Một khe suối nhỏ nước trong vắt len lỏi giữa những vách cát đỏ và trắng kỳ ảo như tiểu hẻm núi thu nhỏ. Chỉ cần xắn quần lội bộ dọc dòng nước mát, bạn sẽ đi qua cả một 'bảo tàng' hình thù do gió và nước bào mòn nên.",
      bestTime: "Sáng sớm",
      bestTimeNote:
        "Buổi sáng là lúc nắng dịu, nước mát và vách cát đỏ lên màu đẹp nhất cho ảnh. Tránh đi ngay sau mưa lớn vì nước có thể đục và chảy xiết. Mùa khô (tháng 11–4) dòng suối trong và dễ lội.",
      highlights: [
        {
          title: "Lội bộ giữa vách cát đỏ – trắng",
          body: "Dòng suối nông, đáy cát mịn, hai bên là vách đất đỏ và nhũ cát trắng tầng tầng lớp lớp — vừa đi vừa ngắm như lạc vào một hẻm núi tí hon.",
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
      tagline: "Chợ hải sản sớm mai rộn ràng bên thúng chai.",
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
        },
        {
          title: "Chợ cá sớm tươi rói",
          body: "Cá, mực, tôm, ghẹ vừa đánh bắt được bày bán ngay trên bãi với giá gốc — nơi tuyệt vời để cảm nhận nhịp sống ngư dân và mua hải sản tươi.",
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
      tagline: "Cụm tháp Chăm cổ trầm mặc trên đồi Bà Nài.",
      category: SpotCategory.temple,
      lat: 10.929,
      lng: 108.128,
      description:
        "Trên đồi Bà Nài lộng gió, cụm tháp Chăm Po Sah Inư đã đứng lặng nhìn ra cửa biển Phan Thiết hơn một nghìn năm. Những khối gạch nung đỏ au với đường nét kiến trúc Chăm trầm mặc khiến nơi đây vừa là di tích quý vừa là điểm ngắm hoàng hôn rất riêng.",
      bestTime: "Chiều mát",
      bestTimeNote:
        "Đẹp nhất vào cuối chiều khi nắng dịu, gạch tháp lên màu ấm và bạn có thể ở lại đón hoàng hôn trên đồi nhìn ra biển. Mùa khô (tháng 11–4) trời trong, thuận cho tham quan và chụp ảnh.",
      highlights: [
        {
          title: "Kiến trúc Chăm ngàn năm",
          body: "Cụm tháp xây từ thế kỷ 8–9 theo phong cách Hòa Lai, gạch xếp khít gần như không mạch vữa — minh chứng cho kỹ thuật xây dựng tài hoa của người Chăm xưa.",
        },
        {
          title: "Hoàng hôn trên đồi Bà Nài",
          body: "Vị trí trên đồi cao nhìn ra cửa biển Phan Thiết khiến đây là chỗ đón hoàng hôn yên tĩnh, ít đông hơn các bãi biển.",
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
      tagline: "Biển hoang sơ, nước trong veo, bãi vắng yên bình.",
      category: SpotCategory.beach,
      lat: 10.976,
      lng: 108.329,
      description:
        "Nằm ở cuối cung đường Mũi Né, Hòn Rơm là bãi tắm nước trong xanh, sóng êm và còn khá hoang sơ. Vắng vẻ, sạch sẽ và an toàn, đây là lựa chọn lý tưởng cho những ai muốn tránh đám đông và thư giãn cùng gia đình.",
      bestTime: "Sáng & chiều mát",
      bestTimeNote:
        "Nước trong và êm nhất vào buổi sáng; chiều mát thì dễ chịu để tắm và dạo bãi. Mùa hè (tháng 4–8) biển lặng, hợp tắm; mùa gió cuối năm sóng lớn hơn, cần để ý khi xuống nước.",
      highlights: [
        {
          title: "Bãi tắm trong xanh, ít người",
          body: "Bờ cát sạch, nước trong và sóng nhẹ khiến Hòn Rơm bình yên hơn hẳn các bãi trung tâm — rất hợp để tắm cùng trẻ nhỏ.",
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
      tagline: "Ghềnh đá xếp lớp, điểm ngắm hoàng hôn bên sóng.",
      category: SpotCategory.beach,
      lat: 10.927,
      lng: 108.256,
      description:
        "Bãi biển nhỏ này nổi tiếng nhờ một tảng đá lớn có hình dáng tựa Ông Địa đang ngồi nhìn ra khơi, được người dân lập am thờ. Những ghềnh đá đen xen cát vàng cùng sóng vỗ tạo nên khung cảnh vừa linh thiêng vừa rất 'ăn ảnh', đặc biệt lúc hoàng hôn.",
      bestTime: "Hoàng hôn",
      bestTimeNote:
        "Đẹp nhất lúc hoàng hôn khi nắng vàng đổ lên ghềnh đá và mặt biển — khung giờ check-in được yêu thích nhất. Sáng sớm cũng yên tĩnh, sóng vỗ ghềnh đá đẹp. Khi triều xuống, bãi đá lộ ra nhiều, dễ leo trèo chụp ảnh.",
      highlights: [
        {
          title: "Tảng đá hình Ông Địa",
          body: "Khối đá tự nhiên có hình dáng giống Ông Địa đã thành biểu tượng và nơi cầu may của người dân — gắn liền với tên gọi của bãi.",
        },
        {
          title: "Ghềnh đá check-in hoàng hôn",
          body: "Những ghềnh đá đen nhấp nhô xen bãi cát là phông nền lý tưởng cho ảnh hoàng hôn, thu hút đông bạn trẻ mỗi chiều.",
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
        ? highlights.map((h, i) => ({
            title: h.title,
            body: h.body ? `<p>${h.body}</p>` : null,
            order: i,
          }))
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
      address: "Góc Trần Hưng Đạo, cạnh cây phượng già, TP. Phan Thiết",
      wardName: "Phường Đức Nghĩa",
      districtName: "TP. Phan Thiết",
      provinceName: "Bình Thuận",
      lat: 10.9302,
      lng: 108.1018,
      phone: "0252 3821 456",
      openingHours: "6:00 – 11:00, 15:00 – 20:00",
      tags: ["ăn sáng", "bình dân", "địa phương"],
      description:
        "Quán bánh căn lâu năm, đổ trên khuôn đất nung nên bánh giòn rìa, mềm ruột. Điểm cộng nằm ở chén nước chấm cá kho kẹo đậm đà cùng xíu mại nóng hổi — món điểm tâm quen thuộc của người Phan Thiết.",
    },
    {
      slug: "lau-tha-hong-ngoc",
      name: "Lẩu thả Hồng Ngọc",
      category: EateryCategory.seafood,
      meals: [Meal.lunch, Meal.dinner],
      address: "Đường Trần Hưng Đạo, TP. Phan Thiết",
      wardName: "Phường Hưng Long",
      districtName: "TP. Phan Thiết",
      provinceName: "Bình Thuận",
      lat: 10.9276,
      lng: 108.1064,
      phone: "0252 3838 279",
      bookingUrl: "https://www.facebook.com/lauthahongngoc",
      openingHours: "10:00 – 21:00",
      tags: ["đặc sản", "hải sản", "đặc trưng"],
      description:
        "Địa chỉ chuyên lẩu thả — đặc sản trứ danh của vùng biển Phan Thiết, bày biện đẹp như một bông hoa với cá mai tươi, rau, bún và nước lèo nấu từ cá. Không gian rộng, phù hợp cho nhóm và gia đình.",
    },
    {
      slug: "hai-san-bo-ke-24",
      name: "Hải sản Bờ Kè 24",
      category: EateryCategory.seafood,
      meals: [Meal.dinner],
      address: "Đường Phạm Văn Đồng (khu Bờ Kè), TP. Phan Thiết",
      wardName: "Phường Phú Thủy",
      districtName: "TP. Phan Thiết",
      provinceName: "Bình Thuận",
      lat: 10.9335,
      lng: 108.1093,
      phone: "0908 245 124",
      openingHours: "16:00 – 23:00",
      notice: "Rất đông vào cuối tuần — nên đến sớm để có bàn sát biển.",
      tags: ["hải sản", "buổi tối", "nhộn nhịp"],
      description:
        "Khu hải sản bờ kè nhộn nhịp về đêm: hải sản tươi bày trong khay đá, chọn xong chế biến nhanh ngay tại chỗ. Giá niêm yết theo ký, hợp cho buổi tối lai rai ngắm gió biển.",
    },
    {
      slug: "banh-xeo-ba-hai",
      name: "Bánh xèo Bà Hai",
      category: EateryCategory.streetfood,
      meals: [Meal.snack, Meal.dinner],
      address: "Đường Tuyên Quang, TP. Phan Thiết",
      wardName: "Phường Bình Hưng",
      districtName: "TP. Phan Thiết",
      provinceName: "Bình Thuận",
      lat: 10.9268,
      lng: 108.1001,
      phone: "0252 3812 770",
      openingHours: "15:00 – 21:00",
      tags: ["ăn vặt", "giòn rụm", "giá rẻ"],
      description:
        "Bánh xèo mực và tôm đổ nóng giòn rụm, nhân đầy đặn, ăn kèm rổ rau sống và chén nước mắm chua ngọt pha khéo. Quán bình dân, lúc nào cũng thơm lừng mùi bánh đổ trên bếp than.",
    },
    {
      slug: "banh-canh-cha-ca-ba-ly",
      name: "Bánh canh chả cá Bà Lý",
      category: EateryCategory.local,
      meals: [Meal.breakfast, Meal.lunch],
      address: "Đường Kim Đồng, TP. Phan Thiết",
      wardName: "Phường Lạc Đạo",
      districtName: "TP. Phan Thiết",
      provinceName: "Bình Thuận",
      lat: 10.9259,
      lng: 108.1027,
      phone: "0167 884 552",
      openingHours: "6:00 – 12:00",
      notice: "Thường hết hàng trước trưa.",
      tags: ["ăn sáng", "địa phương", "bình dân"],
      description:
        "Bánh canh chả cá sợi dai, chả cá chiên và hấp ngọt thịt, nước dùng nấu từ cá biển tươi nên đậm vị mà thanh. Đây là món sáng 'ruột' của dân địa phương suốt nhiều năm.",
    },
    {
      slug: "rang-muc-cay-bang",
      name: "Răng mực nướng Cây Bàng",
      category: EateryCategory.streetfood,
      meals: [Meal.snack, Meal.dinner],
      address: "Khu Cây Bàng, đường Thủ Khoa Huân, TP. Phan Thiết",
      wardName: "Phường Thanh Hải",
      districtName: "TP. Phan Thiết",
      provinceName: "Bình Thuận",
      lat: 10.9331,
      lng: 108.1108,
      phone: "0934 771 209",
      openingHours: "16:00 – 22:00",
      notice: "Hết sớm, nên đi trước 20h.",
      tags: ["ăn vặt", "giới trẻ", "nướng"],
      description:
        "Răng mực nướng và chiên giòn chấm muối ớt xanh — món vặt 'gây nghiện' của giới trẻ Phan Thiết. Ngồi ghế nhựa ven đường, gọi thêm bánh tráng nướng và nước rau má là chuẩn bài.",
    },
    {
      slug: "hai-san-co-ni",
      name: "Hải sản Cô Nỉ",
      category: EateryCategory.seafood,
      meals: [Meal.lunch, Meal.dinner],
      address: "Đường Huỳnh Thúc Kháng, Mũi Né",
      wardName: "Phường Mũi Né",
      districtName: "TP. Phan Thiết",
      provinceName: "Bình Thuận",
      lat: 10.9521,
      lng: 108.2473,
      phone: "0918 367 145",
      bookingUrl: "https://www.facebook.com/haisanconi",
      openingHours: "10:00 – 22:00",
      tags: ["hải sản", "tươi sống", "giá hợp lý"],
      description:
        "Quán hải sản được khách địa phương ưa chuộng nhờ đồ tươi, chế biến đúng vị và giá phải chăng. Có thể chọn hải sản sống rồi yêu cầu nướng mọi, hấp sả hay rang me tuỳ thích.",
    },
    {
      slug: "sandy-beach-cafe",
      name: "Sandy Beach Café",
      category: EateryCategory.cafe,
      meals: [Meal.breakfast, Meal.snack, Meal.cafe],
      address: "Đường Nguyễn Đình Chiểu, Hàm Tiến, Mũi Né",
      wardName: "Phường Hàm Tiến",
      districtName: "TP. Phan Thiết",
      provinceName: "Bình Thuận",
      lat: 10.9462,
      lng: 108.2381,
      phone: "0252 3741 988",
      website: "https://sandybeach-muine.vn",
      openingHours: "7:00 – 22:00",
      tags: ["view biển", "cà phê", "chill"],
      description:
        "Quán cà phê sát biển với hàng dừa nghiêng và tiếng sóng vỗ, hợp ngồi nhâm nhi buổi sáng hoặc chiều mát. Menu có cà phê, sinh tố thanh long và vài món ăn nhẹ kiểu Âu.",
    },
    {
      slug: "com-ga-ta-vi",
      name: "Cơm gà Tà Vi",
      category: EateryCategory.local,
      meals: [Meal.lunch, Meal.dinner],
      address: "Đường Nguyễn Tất Thành, TP. Phan Thiết",
      wardName: "Phường Phú Trinh",
      districtName: "TP. Phan Thiết",
      provinceName: "Bình Thuận",
      lat: 10.9288,
      lng: 108.1041,
      phone: "0252 3833 121",
      openingHours: "10:00 – 21:00",
      tags: ["cơm gà", "địa phương", "no bụng"],
      description:
        "Cơm gà ta thả vườn, thịt chắc ngọt, ăn cùng cơm nấu nước luộc gà thơm và gỏi đu đủ chua giòn. Phần ăn đầy đặn, là lựa chọn cơm trưa/tối quen thuộc của dân thành phố.",
    },
    {
      slug: "quan-chay-sen",
      name: "Quán chay Sen",
      category: EateryCategory.vegetarian,
      meals: [Meal.lunch, Meal.dinner],
      address: "Đường Lê Hồng Phong, TP. Phan Thiết",
      wardName: "Phường Phú Trinh",
      districtName: "TP. Phan Thiết",
      provinceName: "Bình Thuận",
      lat: 10.9264,
      lng: 108.1032,
      phone: "0123 456 789",
      openingHours: "6:00 – 20:00",
      tags: ["chay", "thanh đạm", "ngày rằm"],
      description:
        "Quán chay không gian yên tĩnh, phục vụ cơm phần và món chay gọi riêng. Đông nhất vào ngày rằm và mùng một; có cả bún riêu chay và lẩu nấm cho nhóm.",
    },
    {
      slug: "banh-mi-thit-nuong-phan-thiet",
      name: "Bánh mì thịt nướng Phan Thiết",
      category: EateryCategory.streetfood,
      meals: [Meal.breakfast, Meal.snack],
      address: "Đường Trần Phú, TP. Phan Thiết",
      wardName: "Phường Đức Nghĩa",
      districtName: "TP. Phan Thiết",
      provinceName: "Bình Thuận",
      lat: 10.9293,
      lng: 108.1015,
      phone: "0905 552 318",
      openingHours: "5:30 – 10:00, 15:00 – 19:00",
      tags: ["ăn sáng", "mang đi", "giá rẻ"],
      description:
        "Xe bánh mì thịt nướng than thơm lừng, ổ bánh giòn vỏ kẹp pa-tê, đồ chua và rưới nước sốt đậm. Buổi sáng thường xếp hàng, nên mua mang đi cho tiện.",
    },
    {
      slug: "oc-nuong-bo-ke",
      name: "Ốc nướng Bờ Kè",
      category: EateryCategory.bbq,
      meals: [Meal.dinner],
      address: "Đường Phạm Văn Đồng (khu Bờ Kè), TP. Phan Thiết",
      wardName: "Phường Phú Thủy",
      districtName: "TP. Phan Thiết",
      provinceName: "Bình Thuận",
      lat: 10.9342,
      lng: 108.1098,
      phone: "0399 218 770",
      openingHours: "16:30 – 23:30",
      tags: ["ốc", "nướng", "lai rai"],
      description:
        "Quán ốc và đồ nướng ven bờ kè, đủ loại ốc hương, ốc móng tay, sò điệp nướng mỡ hành. Không gian thoáng gió biển, hợp tụ tập bạn bè buổi tối.",
    },
    {
      slug: "che-thai-mui-ne",
      name: "Chè Thái Mũi Né",
      category: EateryCategory.cafe,
      meals: [Meal.snack, Meal.cafe],
      address: "Đường Huỳnh Thúc Kháng, Mũi Né",
      wardName: "Phường Mũi Né",
      districtName: "TP. Phan Thiết",
      provinceName: "Bình Thuận",
      lat: 10.9508,
      lng: 108.2602,
      phone: "0888 904 233",
      openingHours: "13:00 – 22:00",
      tags: ["chè", "tráng miệng", "giải nhiệt"],
      description:
        "Quán chè nhỏ với chè Thái, chè khúc bạch và sữa chua mít — món giải nhiệt sau buổi chiều dạo biển. Thêm topping thanh long đỏ rất 'đúng chất' Bình Thuận.",
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
      description:
        "Bánh đổ trên khuôn đất nung, giòn rìa mềm ruột, ăn kèm xíu mại, trứng cút và chan nước mắm cá kho kẹo đặc trưng. Là món điểm tâm bình dân nhưng làm nên 'thương hiệu' ẩm thực phố biển.",
      tags: ["ăn sáng", "đặc sản", "địa phương"],
      eateries: ["banh-can-cay-phuong", "com-ga-ta-vi"],
    },
    {
      slug: "lau-tha-phan-thiet",
      name: "Lẩu thả",
      description:
        "Đặc sản trứ danh Phan Thiết: cá mai/cá suốt tươi xếp quanh mẹt như cánh hoa, cuốn cùng rau, bún và chan nước lèo nấu từ cá, me, đậu phộng. Vừa đẹp mắt vừa thanh, càng ăn càng cuốn.",
      tags: ["đặc sản", "hải sản", "đặc trưng"],
      eateries: ["lau-tha-hong-ngoc", "hai-san-bo-ke-24", "hai-san-co-ni"],
    },
    {
      slug: "goi-ca-mai-phan-thiet",
      name: "Gỏi cá mai",
      description:
        "Cá mai tươi rút xương trộn gỏi chua ngọt với thính, hành tây và rau thơm, cuốn bánh tráng chấm nước lèo sệt. Vị tươi mát, ít tanh — món khai vị 'gây thương nhớ' của vùng biển.",
      tags: ["gỏi", "hải sản", "khai vị"],
      eateries: ["hai-san-bo-ke-24", "hai-san-co-ni"],
    },
    {
      slug: "nuoc-mam-phan-thiet",
      name: "Nước mắm Phan Thiết",
      description:
        "Nước mắm cá cơm ủ chượp truyền thống trong thùng gỗ, độ đạm cao, màu cánh gián và hương đậm đặc trưng. Là đặc sản quà gắn liền với danh tiếng làng nghề trăm năm của Phan Thiết.",
      tags: ["quà", "truyền thống", "làng nghề"],
    },
    {
      slug: "thanh-long-binh-thuan",
      name: "Thanh long Bình Thuận",
      description:
        "Bình Thuận là thủ phủ thanh long cả nước — trái to, mọng, vị ngọt thanh, có cả ruột trắng và ruột đỏ. Mua về làm quà hoặc thưởng thức tươi, ép nước đều ngon.",
      tags: ["quà", "trái cây", "giải nhiệt"],
    },
    {
      slug: "rang-muc-phan-thiet",
      name: "Răng mực",
      description:
        "Phần sụn quanh miệng con mực, nướng hoặc chiên giòn rồi chấm muối ớt xanh — đặc sản ăn vặt nức tiếng. Dai sần sật, béo nhẹ, ăn hoài không ngán, hợp lai rai buổi tối.",
      tags: ["ăn vặt", "nướng", "giới trẻ"],
      eateries: ["rang-muc-cay-bang"],
    },
    {
      slug: "banh-canh-cha-ca-phan-thiet",
      name: "Bánh canh chả cá",
      description:
        "Sợi bánh canh dai, chả cá chiên và hấp ngọt thịt, chan nước dùng nấu từ cá biển tươi nên đậm mà thanh. Một tô nóng hổi rắc hành, tiêu là bữa sáng đặc trưng của người Phan Thiết.",
      tags: ["ăn sáng", "đặc trưng", "địa phương"],
      eateries: ["banh-canh-cha-ca-ba-ly"],
    },
    {
      slug: "muc-mot-nang-phan-thiet",
      name: "Mực một nắng",
      description:
        "Mực tươi phơi đúng một nắng để giữ độ dẻo ngọt, nướng lên thơm lừng chấm tương ớt. Món quà biển được ưa chuộng, dễ bảo quản, mang về làm quà rất hợp.",
      tags: ["quà", "hải sản khô", "đặc sản"],
      eateries: ["hai-san-co-ni"],
    },
    {
      slug: "banh-xeo-phan-thiet",
      name: "Bánh xèo mực Phan Thiết",
      description:
        "Bánh xèo đổ nhỏ với nhân mực, tôm tươi, vỏ mỏng giòn rụm, ăn cuốn rau sống chấm nước mắm chua ngọt. Khác bánh xèo miền Tây ở kích thước nhỏ và topping hải sản đặc trưng vùng biển.",
      tags: ["ăn vặt", "đặc trưng", "hải sản"],
      eateries: ["banh-xeo-ba-hai"],
    },
    {
      slug: "com-ga-phan-thiet",
      name: "Cơm gà Phan Thiết",
      description:
        "Cơm nấu bằng nước luộc gà thơm vàng, ăn cùng gà ta xé hoặc chặt, kèm gỏi đu đủ và chén nước mắm gừng. Món cơm no bụng, phổ biến cho bữa trưa và tối.",
      tags: ["cơm gà", "no bụng", "địa phương"],
      eateries: ["com-ga-ta-vi"],
    },
    {
      slug: "dong-cat-mui-ne",
      name: "Dông cát Mũi Né",
      description:
        "Dông (kỳ nhông) sống trên đồi cát, thịt trắng ngọt, ít mỡ, được chế biến thành dông nướng, gỏi dông hay cháo dông. Là đặc sản miền cát độc đáo mà du khách hay tò mò thử.",
      tags: ["đặc sản", "vùng cát", "lạ miệng"],
      eateries: ["hai-san-co-ni"],
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
      isVerified: true,
      zalo: "0252374188",
      facebookUrl: "https://facebook.com/AnantaraMuiNe",
      depositPolicy: "Đặt qua kênh chính thức/booking; chính sách cọc & huỷ theo xác nhận đặt phòng.",
      category: AccommodationCategory.resort,
      address: "12A Nguyễn Đình Chiểu, Hàm Tiến, Mũi Né",
      lat: 10.9446,
      lng: 108.2412,
      phone: "0252 3741 888",
      website: "https://www.anantara.com/vi/mui-ne",
      bookingUrl: "https://www.booking.com/hotel/vn/anantara-mui-ne-resort.html",
      description:
        "Resort 5 sao sát bãi Hàm Tiến với kiến trúc Á Đông tinh tế, hồ bơi vô cực hướng biển và spa Anantara nổi tiếng. Phòng rộng có ban công nhìn ra vườn hoặc biển, kèm nhà hàng phục vụ hải sản và ẩm thực quốc tế. Lựa chọn lý tưởng cho kỳ nghỉ dưỡng cao cấp.",
      tags: ["resort 5 sao", "hồ bơi vô cực", "spa", "sát biển", "nhà hàng", "ăn sáng buffet"],
      isFeatured: true,
    },
    {
      slug: "the-cliff-resort-mui-ne",
      name: "The Cliff Resort & Residences",
      isVerified: true,
      zalo: "0252371911",
      facebookUrl: "https://facebook.com/thecliffresort",
      depositPolicy: "Cọc theo xác nhận đặt phòng trên website chính thức.",
      category: AccommodationCategory.resort,
      address: "Khu phố 5, Phú Hài, TP. Phan Thiết",
      lat: 10.9269,
      lng: 108.1659,
      phone: "0252 3719 111",
      website: "https://thecliffresort.com.vn",
      bookingUrl: "https://thecliffresort.com.vn/dat-phong",
      description:
        "Resort phong cách Địa Trung Hải rực rỡ sắc cam – xanh, nổi bật với nhiều hồ bơi tầng và bãi biển riêng. Vị trí ở Phú Hài thuận tiện đi cả Phan Thiết lẫn Mũi Né, nhìn ra mũi Kê Gà phía xa. Rất được yêu thích để chụp ảnh check-in.",
      tags: ["resort", "view biển", "check-in", "hồ bơi", "bãi biển riêng", "gần trung tâm"],
    },
    {
      slug: "mui-ne-hills-homestay",
      name: "Mũi Né Hills Homestay",
      isVerified: true,
      zalo: "0901234567",
      facebookUrl: "https://facebook.com/muinehills.homestay",
      depositPolicy: "Cọc 30% qua chính chủ; số dư trả khi nhận phòng.",
      notice: "Chỉ chuyển khoản tới tài khoản chính chủ cung cấp qua kênh hiển thị tại đây.",
      category: AccommodationCategory.homestay,
      address: "Đồi Hồng, Mũi Né, TP. Phan Thiết",
      lat: 10.9512,
      lng: 108.2934,
      phone: "0901 234 567",
      bookingUrl: "https://www.booking.com/hotel/vn/mui-ne-hills.html",
      description:
        "Homestay nằm trên Đồi Hồng, phòng sạch giá mềm và sân thượng ngắm hoàng hôn tuyệt đẹp. Chủ nhà thân thiện, hỗ trợ thuê xe máy và tour jeep đồi cát. Hợp khách trẻ, phượt thủ và nhóm bạn.",
      tags: ["homestay", "giá rẻ", "view đồi cát", "thuê xe máy", "sân thượng", "thân thiện"],
    },
    {
      slug: "khach-san-phan-thiet-center",
      name: "Khách sạn Phan Thiết Center",
      isVerified: false,
      zalo: "0252382299",
      category: AccommodationCategory.hotel,
      address: "Đường Tôn Đức Thắng, TP. Phan Thiết",
      lat: 10.9281,
      lng: 108.1019,
      phone: "0252 3822 999",
      bookingUrl: "https://www.booking.com/hotel/vn/phan-thiet-center.html",
      description:
        "Khách sạn ngay trung tâm thành phố, vài phút tới chợ Phan Thiết, bến cá và tháp nước biểu tượng. Phòng tiện nghi đầy đủ, có thang máy và bãi đỗ xe. Phù hợp khách công tác và gia đình muốn đi lại thuận tiện.",
      tags: ["khách sạn", "trung tâm", "tiện nghi", "bãi đỗ xe", "gần chợ", "wifi miễn phí"],
    },
    {
      slug: "sailing-club-resort-mui-ne",
      name: "Sailing Club Resort Mũi Né",
      isVerified: true,
      zalo: "0252384744",
      facebookUrl: "https://facebook.com/sailingclubresortmuine",
      category: AccommodationCategory.resort,
      address: "24 Nguyễn Đình Chiểu, Hàm Tiến, Mũi Né",
      lat: 10.9461,
      lng: 108.2389,
      phone: "0252 3847 440",
      website: "https://sailingclubresortmuine.com",
      bookingUrl: "https://sailingclubresortmuine.com/booking",
      description:
        "Resort bên biển phong cách phóng khoáng, nổi tiếng với hồ bơi hướng biển và nhà hàng – bar Sailing Club sôi động. Khuôn viên nhiều cây xanh, lối đi thẳng ra bãi tắm. Cân bằng giữa nghỉ dưỡng và vui chơi.",
      tags: ["resort", "hồ bơi hướng biển", "nhà hàng", "bar bãi biển", "sát biển", "ăn sáng"],
    },
    {
      slug: "pandanus-resort-phan-thiet",
      name: "Pandanus Resort",
      isVerified: true,
      zalo: "0252384984",
      category: AccommodationCategory.resort,
      address: "Đường Tiến Thành, TP. Phan Thiết",
      lat: 10.8895,
      lng: 108.1456,
      phone: "0252 3849 849",
      bookingUrl: "https://www.booking.com/hotel/vn/pandanus.html",
      description:
        "Khu nghỉ rộng rãi ở Tiến Thành phía nam thành phố, nhiều cây xanh và bãi biển riêng yên tĩnh, ít đông đúc. Có hồ bơi, sân tennis, khu vui chơi trẻ em và xe đưa đón vào trung tâm. Hợp gia đình muốn không gian thư thái.",
      tags: ["resort", "yên tĩnh", "bãi biển riêng", "hợp gia đình", "hồ bơi", "xe đưa đón"],
    },
    {
      slug: "mango-beach-hostel-mui-ne",
      name: "Mango Beach Hostel",
      isVerified: false,
      zalo: "0908765432",
      notice: "Phòng dorm thường kín vào cuối tuần — nên nhắn Zalo giữ chỗ trước.",
      category: AccommodationCategory.hostel,
      address: "Đường Huỳnh Thúc Kháng, Mũi Né",
      lat: 10.9505,
      lng: 108.2876,
      phone: "0908 765 432",
      bookingUrl: "https://www.booking.com/hotel/vn/mango-beach-hostel.html",
      description:
        "Hostel trẻ trung ngay sát biển, phòng dorm và phòng đôi giá rẻ, khu bếp chung và sân hiên sôi động mỗi tối. Nhân viên nhiệt tình hỗ trợ tour và thuê xe. Điểm hẹn quen thuộc của khách Tây ba lô.",
      tags: ["hostel", "giá rẻ", "backpacker", "bếp chung", "sát biển", "tour & xe"],
    },
    {
      slug: "villa-aria-mui-ne",
      name: "Villa Aria Mũi Né",
      isVerified: true,
      zalo: "0252374338",
      facebookUrl: "https://facebook.com/villaaria.muine",
      depositPolicy: "Cọc 50% qua chính chủ để giữ villa; hoàn cọc nếu huỷ trước 7 ngày.",
      category: AccommodationCategory.villa,
      address: "Đường Nguyễn Đình Chiểu, Hàm Tiến, Mũi Né",
      lat: 10.9438,
      lng: 108.2301,
      phone: "0252 3743 388",
      website: "https://villaaria-muine.com",
      bookingUrl: "https://www.booking.com/hotel/vn/villa-aria-mui-ne.html",
      description:
        "Biệt thự boutique sát biển ở Hàm Tiến, không gian riêng tư với hồ bơi và lối xuống bãi tắm ngay trước villa. Phòng thiết kế ấm cúng, có bếp nhỏ và khu vực ngoài trời. Lý tưởng cho cặp đôi hoặc gia đình nhỏ muốn yên tĩnh.",
      tags: ["villa", "riêng tư", "hồ bơi riêng", "sát biển", "hợp cặp đôi", "bếp riêng"],
    },
  ];

  for (const ac of accommodations) {
    const { slug, name, ...rest } = ac;
    const verifiedAt = "isVerified" in ac && ac.isVerified ? now : null;
    const row = await prisma.accommodation.upsert({
      where: { slug },
      update: { ...rest, verifiedAt, placeId: phanThiet.id, ...PUB },
      create: { slug, name, ...rest, verifiedAt, placeId: phanThiet.id, ...PUB },
    });
    await setImages({ accommodationId: row.id }, IMAGES[slug] ?? [], name);
  }

  // 7b) Di chuyển (Transport) — getTo: cách đến từ ngoài; getAround: tại chỗ.
  // Không có slug → idempotent bằng deleteMany theo placeId rồi tạo lại.
  const D = TransportDirection;
  const M = TransportMode;
  const transports = [
    {
      direction: D.getTo,
      mode: M.bus,
      name: "Limousine / xe khách TP.HCM → Phan Thiết",
      fromName: "TP. Hồ Chí Minh",
      duration: "4 – 5 giờ",
      distanceKm: 200,
      priceFrom: 150000,
      priceTo: 290000,
      operatorName: "Phương Trang (FUTA), Tâm Hạnh, Hạnh Café",
      bookingUrl: "https://futabus.vn",
      description:
        "Tuyến phổ biến nhất: xe giường nằm và limousine chạy liên tục trong ngày từ bến xe Miền Đông và các văn phòng trung tâm. Limousine đón tận nơi, đi thẳng Mũi Né rất tiện.",
    },
    {
      direction: D.getTo,
      mode: M.train,
      name: "Tàu hỏa Sài Gòn → ga Phan Thiết",
      fromName: "Ga Sài Gòn",
      duration: "khoảng 4 giờ",
      distanceKm: 200,
      priceFrom: 150000,
      priceTo: 300000,
      operatorName: "Đường sắt Việt Nam",
      bookingUrl: "https://dsvn.vn",
      description:
        "Có tàu chạy thẳng tới ga Phan Thiết, ngắm cảnh đẹp dọc đường. Cuối tuần thường kín chỗ nên đặt vé sớm; từ ga vào trung tâm/Mũi Né đi tiếp taxi khoảng 10–25 phút.",
    },
    {
      direction: D.getTo,
      mode: M.bus,
      name: "Xe khách Nha Trang → Phan Thiết",
      fromName: "Nha Trang",
      duration: "4 – 5 giờ",
      distanceKm: 250,
      priceFrom: 130000,
      priceTo: 230000,
      operatorName: "Hạnh Café, Tâm Hạnh, Sinh Tourist",
      description:
        "Phù hợp khách nối tuyến Nha Trang – Mũi Né. Nhiều nhà xe đón/trả tại khu Hàm Tiến, Mũi Né nên không phải vào bến.",
    },
    {
      direction: D.getTo,
      mode: M.bus,
      name: "Xe khách Đà Lạt → Phan Thiết",
      fromName: "Đà Lạt",
      duration: "4 – 5 giờ",
      distanceKm: 170,
      priceFrom: 150000,
      priceTo: 250000,
      operatorName: "Phương Trang, Trung Nga",
      description:
        "Cung đường đèo xuống biển, cảnh đẹp. Lựa chọn quen thuộc cho hành trình kết hợp Đà Lạt – biển Mũi Né.",
    },
    {
      direction: D.getTo,
      mode: M.plane,
      name: "Máy bay tới Cam Ranh rồi đi xe",
      fromName: "Hà Nội / TP.HCM (qua sân bay Cam Ranh)",
      duration: "~2 giờ bay + ~2,5 giờ xe",
      distanceKm: 240,
      operatorName: "Vietnam Airlines, Vietjet, Bamboo Airways",
      description:
        "Phan Thiết chưa có chuyến bay thương mại thường lệ, nên khách ở xa thường bay tới Cam Ranh (Nha Trang) hoặc Tân Sơn Nhất rồi đi xe/limousine về.",
    },
    {
      direction: D.getAround,
      mode: M.motorbike,
      name: "Thuê xe máy",
      duration: "theo ngày",
      priceFrom: 100000,
      priceTo: 150000,
      operatorName: "Khách sạn / điểm cho thuê tại Mũi Né",
      description:
        "Cách linh hoạt nhất để khám phá đồi cát, làng chài và các bãi biển. Nhiều khách sạn cho thuê tận nơi; nhớ kiểm tra phanh, xăng và mang theo giấy phép lái xe.",
    },
    {
      direction: D.getAround,
      mode: M.taxi,
      name: "Taxi",
      priceFrom: 12000,
      operatorName: "Mai Linh, Sông Bình",
      description:
        "Dễ bắt ở khu trung tâm và Hàm Tiến – Mũi Né. Nên đi xe có đồng hồ hoặc chốt giá trước cho các chặng dài như ra đồi cát Bàu Trắng.",
    },
    {
      direction: D.getAround,
      mode: M.grab,
      name: "Grab / xe công nghệ",
      operatorName: "Grab",
      description:
        "Có hoạt động ở Phan Thiết và Mũi Né nhưng số lượng xe ít hơn thành phố lớn, giờ cao điểm có thể chờ lâu. Tiện cho chặng ngắn trong trung tâm.",
    },
    {
      direction: D.getAround,
      mode: M.shuttle,
      name: "Xe đưa đón của resort",
      operatorName: "Các resort tại Hàm Tiến – Mũi Né",
      description:
        "Nhiều resort có xe đưa đón sân bay/bến xe và shuttle ra trung tâm theo khung giờ. Hỏi lễ tân để đặt trước, thường rẻ hơn taxi cho nhóm.",
    },
    {
      direction: D.getAround,
      mode: M.cyclo,
      name: "Xích lô tham quan",
      operatorName: "Khu trung tâm Phan Thiết",
      description:
        "Trải nghiệm chậm rãi quanh tháp nước, chợ và bờ sông Cà Ty. Nên thỏa thuận giá và lộ trình trước khi đi.",
    },
  ];

  await prisma.transport.deleteMany({ where: { placeId: phanThiet.id } });
  for (const [i, t] of transports.entries()) {
    await prisma.transport.create({
      data: { ...t, currency: "VND", order: i, placeId: phanThiet.id, ...PUB },
    });
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
        name: "Halivivu",
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
    `✓ Seed Phan Thiết xong: 1 tỉnh, 1 điểm đến, ${spots.length} địa điểm, ${activities.length} hoạt động, ${eateries.length} quán ăn, ${specialties.length} đặc sản, ${accommodations.length} lưu trú, ${transports.length} di chuyển, 1 bài blog.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
