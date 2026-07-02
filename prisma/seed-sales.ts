import "dotenv/config";
import { prisma } from "@/lib/prisma";
import {
  SaleStatus,
  ScamChannel,
  ScamReportStatus,
} from "@/generated/prisma/enums";
import { normalizeValue, type TrustChannel } from "@/lib/trust";

// Seed dữ liệu mẫu cho CTV (SaleProfile) + báo cáo lừa đảo (ScamReport).
// Idempotent: upsert user theo email, SaleProfile theo userId; xoá & tạo lại
// các ScamReport demo theo valueNorm. Dùng: pnpm seed:sales

const AVATAR = (s: string) => `https://picsum.photos/seed/${s}/200/200`;
const EVIDENCE = (s: string) => `https://picsum.photos/seed/${s}/600/400`;

type SaleSeed = {
  email: string;
  name: string;
  slug: string;
  displayName: string;
  bio: string;
  services: string[];
  areaSlugs: string[];
  zalo?: string;
  phone?: string;
  facebookUrl?: string;
  website?: string;
  status: SaleStatus;
};

const SALES: SaleSeed[] = [
  {
    email: "ctv.minh@example.com",
    name: "Minh Nguyễn",
    slug: "minh-ctv-phan-thiet",
    displayName: "Minh — CTV tour Phan Thiết",
    bio: "Chuyên tour đồi cát, city tour Mũi Né và vé các khu vui chơi. 5 năm dẫn đoàn, hỗ trợ nhiệt tình 24/7.",
    services: ["tour", "ve"],
    areaSlugs: ["phan-thiet", "mui-ne"],
    zalo: "0901234567",
    phone: "0901234567",
    facebookUrl: "https://facebook.com/minh.tour.phanthiet",
    website: "minhtour.vn",
    status: SaleStatus.approved,
  },
  {
    email: "ctv.lan@example.com",
    name: "Lan Trần",
    slug: "lan-dat-phong-da-nang",
    displayName: "Lan — Đặt phòng & combo Đà Nẵng",
    bio: "Đặt phòng khách sạn ven biển Đà Nẵng, combo nghỉ dưỡng giá tốt. Giá niêm yết rõ ràng, không phụ thu ẩn.",
    services: ["phong", "combo"],
    areaSlugs: ["da-nang"],
    zalo: "0912345678",
    phone: "0912345678",
    facebookUrl: "https://facebook.com/lan.danang.stay",
    status: SaleStatus.approved,
  },
  {
    email: "ctv.huy@example.com",
    name: "Huy Phạm",
    slug: "huy-thue-xe-phu-quoc",
    displayName: "Huy — Thuê xe & đưa đón Phú Quốc",
    bio: "Cho thuê xe máy, ô tô tự lái và dịch vụ đưa đón sân bay tại Phú Quốc. Xe mới, giao tận nơi.",
    services: ["thue-xe"],
    areaSlugs: ["phu-quoc"],
    phone: "0987654321",
    zalo: "0987654321",
    status: SaleStatus.approved,
  },
  {
    email: "ctv.trang@example.com",
    name: "Trang Lê",
    slug: "trang-ctv-phan-thiet",
    displayName: "Trang — CTV tour (chờ duyệt)",
    bio: "Mới đăng ký, đang chờ xác minh hồ sơ.",
    services: ["tour"],
    areaSlugs: ["phan-thiet"],
    phone: "0900000000",
    status: SaleStatus.pending,
  },
];

type ScamSeed = {
  channel: ScamChannel;
  valueRaw: string;
  reason: string;
  description: string;
  evidenceSeed: string;
};

const SCAMS: ScamSeed[] = [
  {
    channel: ScamChannel.phone,
    valueRaw: "0999888777",
    reason: "Lừa cọc homestay",
    description:
      "Nhận cọc 50% qua số này rồi chặn liên lạc, đến nơi không có phòng như quảng cáo.",
    evidenceSeed: "scam-phone",
  },
  {
    channel: ScamChannel.facebook,
    valueRaw: "https://facebook.com/homestay.gia.re.muine.fake",
    reason: "Page nhái homestay",
    description:
      "Page giả mạo một homestay có thật ở Mũi Né, dùng ảnh lấy từ nơi khác để lừa đặt cọc.",
    evidenceSeed: "scam-fb",
  },
  {
    channel: ScamChannel.bank_account,
    valueRaw: "0123456789",
    reason: "Tài khoản nhận cọc rồi chặn",
    description: "Nhiều người chuyển cọc tour vào tài khoản này rồi bị chặn.",
    evidenceSeed: "scam-bank",
  },
];

async function main() {
  const now = new Date();

  // Bản đồ slug → id của các place dùng làm khu vực.
  const areaSlugs = [...new Set(SALES.flatMap((s) => s.areaSlugs))];
  const places = await prisma.place.findMany({
    where: { slug: { in: areaSlugs } },
    select: { id: true, slug: true },
  });
  const placeId = new Map(places.map((p) => [p.slug, p.id]));

  for (const s of SALES) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { name: s.name },
      create: { email: s.email, name: s.name, image: AVATAR(s.slug) },
      select: { id: true },
    });

    const areas = s.areaSlugs
      .map((slug) => placeId.get(slug))
      .filter((id): id is string => !!id)
      .map((id) => ({ id }));

    const base = {
      slug: s.slug,
      displayName: s.displayName,
      bio: s.bio,
      services: s.services,
      zalo: s.zalo ?? null,
      phone: s.phone ?? null,
      facebookUrl: s.facebookUrl ?? null,
      website: s.website ?? null,
      avatarUrl: AVATAR(s.slug),
      status: s.status,
      verifiedAt: s.status === SaleStatus.approved ? now : null,
      verificationLevel: s.status === SaleStatus.approved ? "standard" : null,
    };

    await prisma.saleProfile.upsert({
      where: { userId: user.id },
      update: { ...base, areas: { set: areas } },
      create: { userId: user.id, ...base, areas: { connect: areas } },
    });
  }

  // ScamReport demo: xoá theo valueNorm rồi tạo lại (idempotent).
  for (const sc of SCAMS) {
    const valueNorm = normalizeValue(sc.channel as TrustChannel, sc.valueRaw);
    await prisma.scamReport.deleteMany({
      where: { channel: sc.channel, valueNorm },
    });
    await prisma.scamReport.create({
      data: {
        channel: sc.channel,
        valueNorm,
        valueRaw: sc.valueRaw,
        reason: sc.reason,
        description: sc.description,
        evidenceUrls: [EVIDENCE(sc.evidenceSeed), EVIDENCE(sc.evidenceSeed + "-2")],
        status: ScamReportStatus.confirmed,
      },
    });
  }

  console.log(
    `✓ Seed sales xong: ${SALES.length} CTV (${SALES.filter((s) => s.status === SaleStatus.approved).length} đã duyệt), ${SCAMS.length} báo cáo lừa đảo (confirmed).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
