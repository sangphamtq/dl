import "dotenv/config";
import { prisma } from "@/lib/prisma";
import {
  PublishStatus,
  AccommodationCategory,
} from "@/generated/prisma/enums";

// Seed thêm vài homestay tại Phan Thiết, gắn vào điểm đến `phan-thiet` đã có.
// Idempotent: upsert theo slug; ảnh tạo lại mỗi lần chạy.
// Dùng: pnpm seed:homestay-phan-thiet
// Lưu ý: cần chạy seed:phan-thiet trước (để có Place `phan-thiet`).

const now = new Date();
const PUB = { status: PublishStatus.published, publishedAt: now } as const;

// Pool ảnh lưu trú (tái dùng từ seed-phan-thiet) — dựng gallery nhiều ảnh.
const F = "https://y3m837otke.ufs.sh/f/";
const STAY = {
  hills: F + "m9VMJOw4aGbVIMyiaWOJ3i9vQ1fIPbaTDodWErlMtRmUSn2j",
  mango: F + "m9VMJOw4aGbVGXK7LJpMeYTmuqJL4cbBoxQnCyX7ArKj0NPv",
  villa: F + "m9VMJOw4aGbVrofNvlYb8jagp6cK5uSRW3FnfXEZDVh1xAqB",
  pandanus: F + "m9VMJOw4aGbV3brXfESxNIzSVdQsYLDi4gpfXl5Bjw0RKWoC",
  cliff: F + "m9VMJOw4aGbVKjSeN0eoDPNw8b4hMBxe3vjfX0JlqIyC7mio",
  center: F + "m9VMJOw4aGbVnOIIS66kyNpVrswG2bXt7P5uIACShYzTBO4c",
};

type ImageInput = { url: string; alt?: string; caption?: string };

async function setImages(
  accommodationId: string,
  images: readonly ImageInput[],
  fallbackAlt: string,
) {
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
  phone?: string;
  website?: string;
  bookingUrl?: string;
  description: string;
  tags: string[];
  isFeatured?: boolean;
  images: ImageInput[];
};

const homestays: HomestaySeed[] = [
  {
    slug: "sunny-house-homestay-mui-ne",
    name: "Sunny House Homestay Mũi Né",
    address: "Đường Nguyễn Đình Chiểu, Hàm Tiến, Mũi Né, TP. Phan Thiết",
    lat: 10.9442,
    lng: 108.2358,
    phone: "0905 112 233",
    bookingUrl: "https://www.booking.com/hotel/vn/sunny-house-mui-ne.html",
    description:
      "Homestay nhỏ xinh nằm trong con hẻm yên tĩnh ngay khu Hàm Tiến, chỉ vài bước ra biển. Sân vườn nhiều cây xanh, võng và ghế nằm thư giãn, phòng tươi sáng giá mềm. Chủ nhà nhiệt tình chỉ chỗ ăn ngon và hỗ trợ thuê xe máy.",
    tags: ["homestay", "giá rẻ", "gần biển", "sân vườn", "thuê xe máy", "thân thiện"],
    isFeatured: true,
    images: [
      { url: STAY.hills, alt: "Sunny House Homestay Mũi Né", caption: "Sân vườn xanh mát" },
      { url: STAY.mango, alt: "Phòng nghỉ tươi sáng" },
      { url: STAY.villa, alt: "Góc thư giãn ngoài trời" },
    ],
  },
  {
    slug: "co-co-garden-homestay-mui-ne",
    name: "Coco Garden Homestay",
    address: "Đường Huỳnh Thúc Kháng, Mũi Né, TP. Phan Thiết",
    lat: 10.9526,
    lng: 108.2981,
    phone: "0908 445 566",
    bookingUrl: "https://www.booking.com/hotel/vn/coco-garden-mui-ne.html",
    description:
      "Khu homestay theo phong cách bungalow giữa vườn dừa xanh, có hồ bơi nhỏ và không gian chung ấm cúng. Mỗi căn riêng tư, hợp cặp đôi và nhóm bạn muốn nghỉ ngơi gần đồi cát. Buổi tối thường có BBQ và giao lưu.",
    tags: ["homestay", "bungalow", "hồ bơi", "vườn dừa", "BBQ", "hợp cặp đôi"],
    images: [
      { url: STAY.pandanus, alt: "Coco Garden Homestay", caption: "Bungalow giữa vườn dừa" },
      { url: STAY.cliff, alt: "Hồ bơi nhỏ" },
      { url: STAY.hills, alt: "Không gian chung" },
    ],
  },
  {
    slug: "bien-xanh-homestay-phan-thiet",
    name: "Biển Xanh Homestay",
    address: "Đường Tôn Đức Thắng, TP. Phan Thiết",
    lat: 10.9258,
    lng: 108.1043,
    phone: "0912 778 990",
    description:
      "Homestay ngay trung tâm Phan Thiết, thuận tiện đi chợ đêm, bến cá và các quán hải sản nổi tiếng. Phòng sạch sẽ, ban công đón gió biển, có khu bếp chung cho khách tự nấu. Lựa chọn kinh tế cho gia đình và khách đi dài ngày.",
    tags: ["homestay", "trung tâm", "giá rẻ", "bếp chung", "gần chợ đêm", "ban công"],
    images: [
      { url: STAY.center, alt: "Biển Xanh Homestay", caption: "Ngay trung tâm Phan Thiết" },
      { url: STAY.mango, alt: "Phòng có ban công" },
    ],
  },
  {
    slug: "sao-bien-homestay-hon-rom",
    name: "Sao Biển Homestay Hòn Rơm",
    address: "Khu Hòn Rơm, phường Mũi Né, TP. Phan Thiết",
    lat: 10.9748,
    lng: 108.3271,
    phone: "0934 221 100",
    bookingUrl: "https://www.booking.com/hotel/vn/sao-bien-hon-rom.html",
    description:
      "Homestay sát bãi Hòn Rơm yên tĩnh, nước trong và vắng, hợp gia đình có trẻ nhỏ. Có khu cắm trại, đốt lửa trại và ngắm sao buổi tối. Chủ nhà nấu hải sản tươi theo yêu cầu với giá phải chăng.",
    tags: ["homestay", "gần biển", "yên tĩnh", "lửa trại", "hợp gia đình", "hải sản"],
    images: [
      { url: STAY.villa, alt: "Sao Biển Homestay Hòn Rơm", caption: "Sát bãi Hòn Rơm" },
      { url: STAY.pandanus, alt: "Khu cắm trại ven biển" },
    ],
  },
];

async function main() {
  const phanThiet = await prisma.place.findUnique({
    where: { slug: "phan-thiet" },
    select: { id: true },
  });
  if (!phanThiet) {
    throw new Error(
      'Chưa có Place "phan-thiet". Chạy `pnpm seed:phan-thiet` trước.',
    );
  }

  for (const h of homestays) {
    const { slug, name, images, ...rest } = h;
    const row = await prisma.accommodation.upsert({
      where: { slug },
      update: {
        ...rest,
        category: AccommodationCategory.homestay,
        placeId: phanThiet.id,
        ...PUB,
      },
      create: {
        slug,
        name,
        ...rest,
        category: AccommodationCategory.homestay,
        placeId: phanThiet.id,
        ...PUB,
      },
    });
    await setImages(row.id, images, name);
  }

  console.log(
    `✓ Seed homestay Phan Thiết xong: ${homestays.length} homestay gắn vào điểm đến phan-thiet.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
