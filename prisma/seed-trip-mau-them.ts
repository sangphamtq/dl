import "dotenv/config";
import { prisma } from "@/lib/prisma";

type Kind = "spot" | "eatery" | "accommodation" | "activity";
type Ref = { kind: Kind; slug: string };
type Day = { title: string; startMin?: number; items: Ref[] };
type Template = {
  slug: string;
  place: string;
  title: string;
  summary: string;
  order: number;
  days: Day[];
};

const s = (slug: string): Ref => ({ kind: "spot", slug });
const e = (slug: string): Ref => ({ kind: "eatery", slug });
const a = (slug: string): Ref => ({ kind: "activity", slug });
const h = (slug: string): Ref => ({ kind: "accommodation", slug });

const TEMPLATES: Template[] = [
  {
    slug: "phan-thiet-2n1d",
    place: "phan-thiet",
    title: "Phan Thiết 2 ngày 1 đêm",
    summary:
      "Cuối tuần gọn: chiều xuống biển Mũi Né, sáng hôm sau dậy sớm đi jeep ngắm bình minh trên đồi cát bay.",
    order: 2,
    days: [
      {
        title: "Chiều xuống biển",
        startMin: 14 * 60,
        items: [s("bai-bien-mui-ne"), e("banh-can-cay-phuong"), h("mui-ne-hills-homestay")],
      },
      {
        title: "Bình minh đồi cát",
        startMin: 5 * 60,
        items: [a("jeep-binh-minh-doi-cat"), s("doi-cat-bay-mui-ne"), e("lau-tha-hong-ngoc")],
      },
    ],
  },
  {
    slug: "phan-thiet-an-doc-bien-1n",
    place: "phan-thiet",
    title: "Phan Thiết 1 ngày ăn dọc biển",
    summary:
      "Một ngày chỉ để ăn: bánh canh chả cá lúc sáng, hải sản bờ kè lúc tối, giữa hai bữa là cà phê nhìn ra biển.",
    order: 3,
    days: [
      {
        title: "Ăn từ sáng tới khuya",
        startMin: 7 * 60,
        items: [
          e("banh-canh-cha-ca-ba-ly"),
          e("sandy-beach-cafe"),
          e("rang-muc-cay-bang"),
          e("hai-san-bo-ke-24"),
        ],
      },
    ],
  },
  {
    slug: "ta-xua-3n2d",
    place: "ta-xua",
    title: "Tà Xùa 3 ngày 2 đêm",
    summary:
      "Bản dài hơi cho người muốn leo: hai buổi săn mây trên sống lưng khủng long, rồi dành trọn ngày cuối cho đỉnh Tà Xùa và rừng rêu.",
    order: 4,
    days: [
      {
        title: "Lên tới bản, uống trà",
        startMin: 13 * 60,
        items: [a("thuong-tra-shan-tuyet-ta-xua"), s("doi-che-shan-tuyet-ta-xua"), s("cay-co-don-ta-xua")],
      },
      {
        title: "Dậy sớm săn mây",
        startMin: 5 * 60,
        items: [a("san-may-ta-xua"), s("mom-ca-heo-ta-xua"), s("song-lung-khung-long-ta-xua")],
      },
      {
        title: "Đỉnh Tà Xùa & rừng rêu",
        startMin: 6 * 60,
        items: [a("trekking-dinh-ta-xua"), s("rung-reu-ta-xua")],
      },
    ],
  },
];

async function findId(kind: Kind, slug: string): Promise<string | null> {
  const sel = { where: { slug }, select: { id: true } } as const;
  switch (kind) {
    case "spot":
      return (await prisma.spot.findUnique(sel))?.id ?? null;
    case "eatery":
      return (await prisma.eatery.findUnique(sel))?.id ?? null;
    case "accommodation":
      return (await prisma.accommodation.findUnique(sel))?.id ?? null;
    case "activity":
      return (await prisma.activity.findUnique(sel))?.id ?? null;
  }
}

async function main() {
  const owner =
    (await prisma.user.findFirst({
      where: { role: { in: ["admin", "editor"] } },
      select: { id: true },
    })) ?? (await prisma.user.findFirst({ select: { id: true } }));
  if (!owner)
    throw new Error(
      "Chưa có user nào. Đăng nhập một lần rồi chạy `pnpm set-role <email> admin`.",
    );

  const missing: string[] = [];

  for (const t of TEMPLATES) {
    const place = await prisma.place.findUnique({
      where: { slug: t.place },
      select: { id: true },
    });
    if (!place) {
      missing.push(`place/${t.place} → bỏ qua mẫu ${t.slug}`);
      continue;
    }

    await prisma.trip.deleteMany({ where: { slug: t.slug } });

    const trip = await prisma.trip.create({
      data: {
        ownerId: owner.id,
        placeId: place.id,
        isTemplate: true,
        slug: t.slug,
        title: t.title,
        summary: t.summary,
        status: "published",
        publishedAt: new Date(),
        // KHÔNG `isFeatured`: mẫu nổi bật duy nhất là `phan-thiet-3n2d`.
        order: t.order,
        days: {
          create: t.days.map((d, i) => ({
            index: i,
            startMin: d.startMin ?? 480,
            title: d.title,
          })),
        },
      },
      select: {
        id: true,
        days: { orderBy: { index: "asc" }, select: { id: true, index: true } },
      },
    });

    let added = 0;
    for (const [di, day] of t.days.entries()) {
      const dayId = trip.days.find((d) => d.index === di)!.id;
      let order = 0;
      for (const ref of day.items) {
        const id = await findId(ref.kind, ref.slug);
        if (!id) {
          missing.push(`${ref.kind}/${ref.slug} (${t.slug}, ngày ${di + 1})`);
          continue;
        }
        await prisma.tripItem.create({
          data: {
            tripId: trip.id,
            dayId,
            order: order++,
            [`${ref.kind}Id`]: id,
          },
        });
        added++;
      }
    }
    console.log(`✓ ${t.title} — ${t.days.length} ngày, ${added} mục`);
  }

  if (missing.length) {
    console.log("\n⚠️  Không tìm thấy (mục bị bỏ qua):");
    for (const m of missing) console.log("   " + m);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
