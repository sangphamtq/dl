import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { ReviewStance } from "@/generated/prisma/enums";

// Seed vài đánh giá mẫu cho điểm đến Phan Thiết.
// Mỗi review kèm 1 CheckIn (app chỉ hiện review khi tác giả còn đánh dấu đã đến).
// Idempotent: upsert user theo email, checkIn theo (user,place), review theo (place,author).
// Dùng: pnpm exec tsx prisma/seed-reviews-phan-thiet.ts

type Seed = {
  name: string;
  email: string;
  stance: ReviewStance;
  highlights: string[];
  caveats: string[];
  content: string | null;
  daysAgo: number;
};

const REVIEWS: Seed[] = [
  {
    name: "Minh Anh",
    email: "seed.minhanh@halivivu.demo",
    stance: ReviewStance.love,
    highlights: ["scenery", "fresh-air", "photogenic"],
    caveats: ["crowded"],
    content:
      "Bình minh trên Đồi cát bay đẹp không tả nổi. Đi sớm tầm 5h để tránh nắng và đông. Nhất định sẽ quay lại.",
    daysAgo: 2,
  },
  {
    name: "Quốc Huy",
    email: "seed.quochuy@halivivu.demo",
    stance: ReviewStance.love,
    highlights: ["scenery", "adventure", "worth-it"],
    caveats: [],
    content:
      "Trượt cát ở đồi cát bay vui hết nấc, Bàu Trắng thì như tiểu sa mạc. Rất đáng công đi từ Sài Gòn xuống.",
    daysAgo: 6,
  },
  {
    name: "Thu Trang",
    email: "seed.thutrang@halivivu.demo",
    stance: ReviewStance.worthOnce,
    highlights: ["food", "photogenic"],
    caveats: ["overpriced"],
    content:
      "Hải sản tươi ngon, làng chài buổi sáng rất đời. Một số quán gần bãi biển hơi chặt chém, nên hỏi giá trước.",
    daysAgo: 9,
  },
  {
    name: "Bảo Nam",
    email: "seed.baonam@halivivu.demo",
    stance: ReviewStance.worthOnce,
    highlights: ["scenery", "affordable"],
    caveats: ["far", "weather"],
    content:
      "Cảnh biển đẹp, chi phí dễ chịu. Đi hơi xa và thời tiết thất thường, nên xem dự báo trước khi đặt phòng.",
    daysAgo: 14,
  },
  {
    name: "Hà My",
    email: "seed.hamy@halivivu.demo",
    stance: ReviewStance.love,
    highlights: ["friendly", "peaceful"],
    caveats: [],
    content: null,
    daysAgo: 18,
  },
  {
    name: "Lan Phương",
    email: "seed.lanphuong@halivivu.demo",
    stance: ReviewStance.meh,
    highlights: [],
    caveats: ["crowded", "few-services"],
    content:
      "Cuối tuần đông và bụi cát nhiều. Ổn để đi cho biết chứ mình thấy không có gì quá đặc sắc.",
    daysAgo: 23,
  },
  {
    name: "Đức Long",
    email: "seed.duclong@halivivu.demo",
    stance: ReviewStance.bad,
    highlights: [],
    caveats: ["overpriced", "weak-signal"],
    content:
      "Kỳ nghỉ của mình gặp trời mưa, dịch vụ quanh khu ít và giá bị đội lên. Chắc không quay lại.",
    daysAgo: 30,
  },
];

async function main() {
  const place = await prisma.place.findUnique({
    where: { slug: "phan-thiet" },
    select: { id: true, name: true },
  });
  if (!place) {
    throw new Error(
      'Chưa có điểm đến "phan-thiet". Chạy `pnpm seed:phan-thiet` trước.',
    );
  }

  for (const r of REVIEWS) {
    const user = await prisma.user.upsert({
      where: { email: r.email },
      update: { name: r.name },
      create: { email: r.email, name: r.name },
      select: { id: true },
    });

    // CheckIn để review đủ điều kiện hiển thị.
    await prisma.checkIn.upsert({
      where: { userId_placeId: { userId: user.id, placeId: place.id } },
      update: {},
      create: { userId: user.id, placeId: place.id, auto: false },
    });

    const createdAt = new Date(Date.now() - r.daysAgo * 24 * 60 * 60 * 1000);
    await prisma.review.upsert({
      where: {
        placeId_authorId: { placeId: place.id, authorId: user.id },
      },
      update: {
        stance: r.stance,
        highlights: r.highlights,
        caveats: r.caveats,
        content: r.content,
      },
      create: {
        placeId: place.id,
        authorId: user.id,
        stance: r.stance,
        highlights: r.highlights,
        caveats: r.caveats,
        content: r.content,
        createdAt,
      },
    });
  }

  console.log(`✔ Seed ${REVIEWS.length} đánh giá mẫu cho ${place.name}.`);

  // Cũng seed cho một ĐỊA ĐIỂM (spot) để demo review spot — dùng lại 4 user đầu.
  const spot = await prisma.spot.findUnique({
    where: { slug: "doi-cat-bay-mui-ne" },
    select: { id: true, name: true },
  });
  if (spot) {
    for (const r of REVIEWS.slice(0, 4)) {
      const user = await prisma.user.findUnique({
        where: { email: r.email },
        select: { id: true },
      });
      if (!user) continue;
      await prisma.checkIn.upsert({
        where: { userId_spotId: { userId: user.id, spotId: spot.id } },
        update: {},
        create: { userId: user.id, spotId: spot.id },
      });
      const createdAt = new Date(Date.now() - r.daysAgo * 24 * 60 * 60 * 1000);
      await prisma.review.upsert({
        where: { spotId_authorId: { spotId: spot.id, authorId: user.id } },
        update: {
          stance: r.stance,
          highlights: r.highlights,
          caveats: r.caveats,
          content: r.content,
        },
        create: {
          spotId: spot.id,
          authorId: user.id,
          stance: r.stance,
          highlights: r.highlights,
          caveats: r.caveats,
          content: r.content,
          createdAt,
        },
      });
    }
    console.log(`✔ Seed 4 đánh giá mẫu cho địa điểm ${spot.name}.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
