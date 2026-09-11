import "dotenv/config";
import { prisma } from "@/lib/prisma";

const SLUG = "ta-xua-2n1d";

type Ref = {
  kind: "spot" | "eatery" | "accommodation" | "activity";
  slug: string;
  stayMin?: number;
  note?: string;
};

const PLAN: {
  title: string;
  note: string;
  startMin: number;
  items: Ref[];
}[] = [
  {
    title: "Lên tới bản",
    note: "Sáng đi từ Hà Nội, đầu giờ chiều mới tới nơi. Ngày này để quen độ cao và giữ sức — ngủ lại ngay trong bản Tà Xùa, đặt phòng trước vì cuối tuần mùa mây thường kín.",
    startMin: 14 * 60 + 30,
    items: [
      {
        kind: "spot",
        slug: "doi-che-shan-tuyet-ta-xua",
        stayMin: 60,
        note: "Chè cổ thụ mọc ngay ven đường qua bản Bẹ — dừng xe là tới.",
      },
      { kind: "activity", slug: "thuong-tra-shan-tuyet-ta-xua", stayMin: 60 },
      {
        kind: "spot",
        slug: "cay-co-don-ta-xua",
        stayMin: 75,
        note: "Canh hoàng hôn. Trời quang thì đây cũng là chỗ ngắm mây chiều.",
      },
    ],
  },
  {
    title: "Dậy sớm săn mây",
    note: "Biển mây đẹp nhất từ lúc trời chưa hửng đến khoảng 8h. Đi trước giờ mặt trời mọc — đợi sáng rõ mới ra là mây đã tan.",
    startMin: 5 * 60,
    items: [
      {
        kind: "spot",
        slug: "mom-ca-heo-ta-xua",
        stayMin: 90,
        note: "Mặc đủ ấm: 5h sáng trên mỏm thường dưới 10°C và gió thốc.",
      },
      { kind: "spot", slug: "song-lung-khung-long-ta-xua", stayMin: 90 },
      {
        kind: "spot",
        slug: "ban-hong-ngai-hang-a-phu",
        stayMin: 75,
        note: "Nằm trên đường xuống núi — ghé lúc về, không phải một chuyến riêng.",
      },
    ],
  },
];

const BACKLOG: Ref[] = [
  {
    kind: "spot",
    slug: "ruong-bac-thang-xim-vang",
    note: "Chỉ đáng đi vào mùa lúa chín (tháng 9 – 10), và ngược hướng về — cần thêm nửa ngày.",
  },
  { kind: "spot", slug: "thac-rong-ta-xua", note: "Nhiều nước nhất sau mùa mưa, tháng 8 – 10." },
  {
    kind: "activity",
    slug: "trekking-dinh-ta-xua",
    note: "Là một cung 2N1Đ RIÊNG, không ghép được vào chuyến này — và bắt buộc có người dẫn đường bản địa.",
  },
];

const MODELS = {
  spot: () => prisma.spot,
  eatery: () => prisma.eatery,
  accommodation: () => prisma.accommodation,
  activity: () => prisma.activity,
} as const;

const FK = {
  spot: "spotId",
  eatery: "eateryId",
  accommodation: "accommodationId",
  activity: "activityId",
} as const;

async function resolve(ref: Ref): Promise<{ id: string; name: string } | null> {
  const model = MODELS[ref.kind]() as {
    findUnique: (a: unknown) => Promise<{ id: string; name: string } | null>;
  };
  return model.findUnique({ where: { slug: ref.slug }, select: { id: true, name: true } });
}

async function main() {
  const place = await prisma.place.findUnique({
    where: { slug: "ta-xua" },
    select: { id: true, name: true },
  });
  if (!place) throw new Error("Chưa có Place 'ta-xua' — chạy `pnpm seed:ta-xua` trước.");

  const owner =
    (await prisma.user.findFirst({
      where: { role: { in: ["admin", "editor"] } },
      select: { id: true, email: true },
    })) ?? (await prisma.user.findFirst({ select: { id: true, email: true } }));
  if (!owner)
    throw new Error("Chưa có user nào. Đăng nhập một lần rồi chạy `pnpm set-role <email> admin`.");

  await prisma.trip.deleteMany({ where: { slug: SLUG } });

  const trip = await prisma.trip.create({
    data: {
      ownerId: owner.id,
      placeId: place.id,
      isTemplate: true,
      slug: SLUG,
      title: "Tà Xùa 2 ngày 1 đêm",
      summary:
        "Chiều lên tới bản uống trà Shan tuyết và đợi hoàng hôn ở cây cô đơn, hôm sau dậy từ 5h săn mây trên mỏm cá heo rồi sống lưng khủng long.",
      status: "published",
      publishedAt: new Date(),
      // KHÔNG `isFeatured`: mẫu nổi bật là thứ đứng đầu trang /lich-trinh, và
      // chỗ đó đang là Phan Thiết (`order: 0`). Hai mẫu cùng nổi bật thì thứ tự
      // rơi về `order` — cứ để đúng một cái nổi bật cho khỏi mơ hồ.
      order: 1,
      days: {
        create: PLAN.map((d, i) => ({
          index: i,
          startMin: d.startMin,
          title: d.title,
          note: d.note,
        })),
      },
    },
    select: { id: true, days: { orderBy: { index: "asc" }, select: { id: true, index: true } } },
  });

  const missing: string[] = [];
  let added = 0;

  for (const [di, day] of PLAN.entries()) {
    const dayId = trip.days.find((d) => d.index === di)!.id;
    let order = 0;
    for (const ref of day.items) {
      const row = await resolve(ref);
      if (!row) {
        missing.push(`${ref.kind}/${ref.slug} (Ngày ${di + 1})`);
        continue;
      }
      await prisma.tripItem.create({
        data: {
          tripId: trip.id,
          dayId,
          order: order++,
          stayMin: ref.stayMin ?? null,
          note: ref.note ?? null,
          [FK[ref.kind]]: row.id,
        },
      });
      added++;
    }
  }

  let bagOrder = 0;
  for (const ref of BACKLOG) {
    const row = await resolve(ref);
    if (!row) {
      missing.push(`${ref.kind}/${ref.slug} (Túi đồ)`);
      continue;
    }
    await prisma.tripItem.create({
      data: {
        tripId: trip.id,
        order: bagOrder++,
        note: ref.note ?? null,
        [FK[ref.kind]]: row.id,
      },
    });
    added++;
  }

  // Ảnh bìa: mượn ảnh bìa của sống lưng khủng long — dùng lại URL đã có, KHÔNG
  // upload mới và KHÔNG lấy ảnh chỗ khác cho đủ. Tà Xùa hiện chưa có ảnh nào
  // trong DB, nên nhánh này thường không chạy; thông báo cuối script nói rõ.
  const cover = await prisma.image.findFirst({
    where: {
      isCover: true,
      OR: [
        { spot: { slug: "song-lung-khung-long-ta-xua" } },
        { spot: { slug: "mom-ca-heo-ta-xua" } },
        { spot: { slug: "cay-co-don-ta-xua" } },
      ],
    },
    select: { url: true, alt: true },
  });
  if (cover) {
    await prisma.image.create({
      data: {
        tripId: trip.id,
        url: cover.url,
        alt: cover.alt ?? "Biển mây Tà Xùa",
        isCover: true,
        order: 0,
      },
    });
  }

  console.log(`✓ Lịch trình mẫu "${SLUG}" — ${PLAN.length} ngày, ${added} mục`);
  console.log(`  chủ sở hữu: ${owner.email ?? owner.id}`);
  console.log(`  xem tại: /lich-trinh/${SLUG}`);
  if (!cover) {
    console.log(
      `\n⚠ Chưa có ảnh bìa: Tà Xùa chưa có ảnh nào trong DB.\n` +
        `  Upload ảnh cho spot (CMS → Địa điểm) rồi chạy lại seed này,\n` +
        `  hoặc đặt thẳng ảnh bìa cho mẫu ở /cms/lich-trinh.`,
    );
  }
  if (missing.length) {
    console.log(`\n⚠ ${missing.length} mục không tìm thấy (slug lệch?):`);
    for (const m of missing) console.log(`  · ${m}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
