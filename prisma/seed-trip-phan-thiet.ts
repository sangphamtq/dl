import "dotenv/config";
import { prisma } from "@/lib/prisma";

// Seed một LỊCH TRÌNH MẪU cho Phan Thiết (Trip.isTemplate = true).
// Chạy: pnpm seed:trip-phan-thiet   — chạy lại nhiều lần được (xoá & tạo lại).
//
// Mẫu được xếp bám vào dữ liệu thật: giờ mở cửa của quán và `bestTime` của
// điểm — ví dụ đồi cát đi lúc tinh mơ, bánh mì thịt nướng chỉ bán 5:30–10:00,
// hải sản Bờ Kè mở từ 16:00. Trang mẫu KHÔNG còn cảnh báo ĐỎ nào.
//
// Các mốc thời lượng dưới đây do CHÍNH máy tính giờ bắt lỗi rồi mới chỉnh (bản
// viết tay đầu tiên tới Rooftop lúc 14:38 và Ốc nướng 16:24 — cả hai chưa mở):
//   · Ngày 2: Bàu Trắng 90′, cà phê 60′, nghỉ trưa 195′
//   · Ngày 3 bắt đầu 7:30, không phải 7:00
//
// ⚠ KIỂM BẰNG TRANG THẬT, ĐỪNG KIỂM BẰNG SCRIPT. Script chạy ngoài Next không
// gọi được ORS (unstable_cache cần runtime của Next) nên rơi về ước lượng chim
// bay — mà chim bay ở đây CHẬM HƠN đường thật, khiến mọi mốc dôi ra ~45 phút và
// tưởng là an toàn. Mở /lich-trinh/phan-thiet-3n2d rồi soi giờ trên đó.
//
// Hai cảnh báo CAM còn lại là ĐÚNG, cố ý giữ: Bàu Trắng cách thành phố ~1,5 giờ
// lái thật, và ngày 2 dậy 4:30 rồi ăn tối thì đúng là một ngày dài.
//
// Chủ sở hữu = một staff (admin/editor) — mẫu do biên tập soạn.

const SLUG = "phan-thiet-3n2d";

// Mỗi ngày: giờ bắt đầu + danh sách mục theo THỨ TỰ.
// `ref` là slug của entity, `kind` cho biết tra ở bảng nào.
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
    title: "Về tới biển",
    note: "Ngày tới nơi — nhận phòng rồi thả lỏng, để sức cho buổi bình minh hôm sau.",
    startMin: 14 * 60,
    items: [
      { kind: "accommodation", slug: "sunny-house-homestay-mui-ne", stayMin: 30, note: "Nhận phòng, cất đồ." },
      { kind: "spot", slug: "bai-bien-mui-ne", stayMin: 90 },
      { kind: "spot", slug: "bai-da-ong-dia", stayMin: 60, note: "Canh hoàng hôn — đá đen trên nền trời cam." },
      { kind: "eatery", slug: "hai-san-bo-ke-24", stayMin: 75 },
      { kind: "eatery", slug: "che-thai-mui-ne", stayMin: 30 },
    ],
  },
  {
    title: "Bình minh đồi cát & Bàu Trắng",
    note: "Dậy sớm là phần thưởng lớn nhất của Phan Thiết: cát còn mát, nắng chưa gắt, và không có ai.",
    startMin: 4 * 60 + 30,
    items: [
      { kind: "spot", slug: "doi-cat-bay-mui-ne", stayMin: 75, note: "Đi sớm để kịp mặt trời lên và tránh nắng." },
      { kind: "activity", slug: "truot-cat-mui-ne", stayMin: 45 },
      { kind: "spot", slug: "bau-trang", stayMin: 90 },
      { kind: "eatery", slug: "ca-phe-bau-trang", stayMin: 60 },
      { kind: "eatery", slug: "banh-canh-cha-ca-ba-ly", stayMin: 45, note: "Ăn muộn cũng được — bán tới trưa." },
      { kind: "accommodation", slug: "sunny-house-homestay-mui-ne", stayMin: 195, note: "Nghỉ trưa, tránh nắng gắt — dậy 4:30 rồi thì nghỉ hẳn hơn 3 tiếng." },
      { kind: "eatery", slug: "rooftop-hoang-hon-mui-ne", stayMin: 90 },
      { kind: "eatery", slug: "oc-nuong-bo-ke", stayMin: 75 },
    ],
  },
  {
    title: "Tháp Chăm & đường về",
    note: "Buổi sáng nhẹ trong thành phố, ăn trưa món đặc trưng rồi lên đường.",
    // 7:30 chứ không phải 7:00: sớm hơn thì tới Lẩu thả Hồng Ngọc trước giờ mở (10:00).
    startMin: 7 * 60 + 30,
    items: [
      { kind: "eatery", slug: "banh-mi-thit-nuong-phan-thiet", stayMin: 30 },
      { kind: "spot", slug: "thap-po-sah-inu", stayMin: 60 },
      { kind: "eatery", slug: "ca-phe-song-ca-ty", stayMin: 60 },
      { kind: "eatery", slug: "lau-tha-hong-ngoc", stayMin: 75, note: "Lẩu thả — món phải thử trước khi về." },
    ],
  },
];

// Túi đồ: gợi ý thêm, chưa xếp ngày. Người dùng nhân bản mẫu sẽ nhận luôn
// những mục này để tự cân nhắc nhét vào đâu.
const BACKLOG: Ref[] = [
  { kind: "spot", slug: "hon-rom" },
  { kind: "spot", slug: "lang-chai-mui-ne", note: "Chỉ đẹp 5–7h sáng — đổi chỗ với đồi cát nếu muốn." },
  { kind: "spot", slug: "suoi-tien-mui-ne" },
  { kind: "activity", slug: "luot-van-dieu-mui-ne" },
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
    where: { slug: "phan-thiet" },
    select: { id: true, name: true },
  });
  if (!place) throw new Error("Chưa có Place 'phan-thiet' — chạy `pnpm seed:phan-thiet` trước.");

  const owner =
    (await prisma.user.findFirst({
      where: { role: { in: ["admin", "editor"] } },
      select: { id: true, email: true },
    })) ?? (await prisma.user.findFirst({ select: { id: true, email: true } }));
  if (!owner)
    throw new Error("Chưa có user nào. Đăng nhập một lần rồi chạy `pnpm set-role <email> admin`.");

  // Xoá bản cũ để chạy lại được (Cascade dọn luôn days/items/images).
  await prisma.trip.deleteMany({ where: { slug: SLUG } });

  const trip = await prisma.trip.create({
    data: {
      ownerId: owner.id,
      placeId: place.id,
      isTemplate: true,
      slug: SLUG,
      title: "Phan Thiết 3 ngày 2 đêm",
      summary:
        "Một chiều thả lỏng ở biển, một buổi bình minh trên đồi cát và Bàu Trắng, khép lại bằng tháp Chăm và món lẩu thả.",
      status: "published",
      publishedAt: new Date(),
      isFeatured: true,
      order: 0,
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

  // Ảnh bìa: mượn ảnh bìa của đồi cát — dùng lại URL đã có, không upload mới.
  const cover = await prisma.image.findFirst({
    where: { spot: { slug: "doi-cat-bay-mui-ne" }, isCover: true },
    select: { url: true, alt: true },
  });
  if (cover) {
    await prisma.image.create({
      data: {
        tripId: trip.id,
        url: cover.url,
        alt: cover.alt ?? "Đồi cát bay Mũi Né",
        isCover: true,
        order: 0,
      },
    });
  }

  console.log(`✓ Lịch trình mẫu "${SLUG}" — ${PLAN.length} ngày, ${added} mục`);
  console.log(`  chủ sở hữu: ${owner.email ?? owner.id}`);
  console.log(`  ảnh bìa: ${cover ? "có" : "KHÔNG (chưa có ảnh đồi cát)"}`);
  console.log(`  xem tại: /lich-trinh/${SLUG}`);
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
