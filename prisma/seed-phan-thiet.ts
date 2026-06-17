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
  SpecialtyKind,
  AccommodationCategory,
  TransportDirection,
  TransportMode,
  PriceRange,
} from "@/generated/prisma/enums";

// Seed điểm đến Phan Thiết (Bình Thuận): Place + Spot + Activity + Eatery + Specialty.
// Idempotent: upsert theo slug; ảnh demo (picsum) tạo lại mỗi lần chạy.
// Dùng: pnpm seed:phan-thiet

const now = new Date();
const PUB = { status: PublishStatus.published, publishedAt: now } as const;
const img = (seed: string) => `https://picsum.photos/seed/${seed}/1200/800`;

// Đặt 1 ảnh bìa demo cho một owner (xóa ảnh cũ của owner để khỏi nhân bản).
async function setCover(
  where:
    | { placeId: string }
    | { spotId: string }
    | { activityId: string }
    | { eateryId: string }
    | { specialtyId: string }
    | { accommodationId: string },
  seed: string,
  alt: string,
) {
  await prisma.image.deleteMany({ where });
  await prisma.image.create({
    data: { ...where, url: img(seed), alt, isCover: true, order: 0 },
  });
}

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
  await setCover({ placeId: binhThuan.id }, "binh-thuan", "Bình Thuận");

  // 2) Điểm đến Phan Thiết
  const phanThiet = await prisma.place.upsert({
    where: { slug: "phan-thiet" },
    update: { parentId: binhThuan.id },
    create: {
      slug: "phan-thiet",
      name: "Phan Thiết",
      kind: PlaceKind.destination,
      parentId: binhThuan.id,
      tagline: "Tạm rời xa nhịp sống vội vã để tận hưởng những ngày bình yên bên biển xanh, nắng vàng và làn gió mát lành.",
      description:
        "Thành phố biển nổi tiếng với Mũi Né, những đồi cát đổi màu, làng chài rực rỡ và hải sản tươi ngon. Điểm đến lý tưởng cho nghỉ dưỡng và thể thao biển.",
      provinceName: "Bình Thuận",
      tags: ["biển", "đồi cát", "resort", "hải sản"],
      isFeatured: true,
      ...PUB,
    },
  });
  await setCover({ placeId: phanThiet.id }, "phan-thiet-mui-ne", "Phan Thiết");

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
    await setCover({ spotId: row.id }, slug, name);
  }

  // 4) Activities (M:N tới Spot)
  const activities = [
    {
      slug: "truot-cat-mui-ne",
      name: "Trượt cát",
      category: ActivityCategory.adventure,
      difficulty: ActivityDifficulty.easy,
      durationText: "1–2 giờ",
      description: "Mượn ván, leo đồi rồi trượt xuống — trò vui đặc sản của Mũi Né.",
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
        "Mũi Né là một trong những điểm lướt ván diều tốt nhất châu Á nhờ gió ổn định.",
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
        "Xe Jeep đón từ mờ sáng, ngắm bình minh trên đồi cát bay rồi vòng qua Bàu Trắng, suối Tiên, làng chài.",
      spots: ["doi-cat-bay-mui-ne", "bau-trang", "suoi-tien-mui-ne"],
    },
    {
      slug: "tam-bien-mui-ne",
      name: "Tắm biển",
      category: ActivityCategory.water,
      difficulty: ActivityDifficulty.easy,
      description: "Thả mình trong làn nước ấm dọc các bãi biển Phan Thiết.",
      spots: ["bai-bien-mui-ne", "hon-rom", "bai-da-ong-dia"],
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
    await setCover({ activityId: row.id }, slug, name);
  }

  // 5) Eateries
  const eateries = [
    {
      slug: "banh-can-cay-phuong",
      name: "Bánh căn Cây Phượng",
      category: EateryCategory.local,
      meals: [Meal.breakfast, Meal.snack],
      priceRange: PriceRange.budget,
      address: "Phan Thiết, Bình Thuận",
      openingHours: "6:00 – 11:00, 15:00 – 20:00",
      description: "Quán bánh căn lâu năm, nước chấm cá kho đậm đà đặc trưng.",
    },
    {
      slug: "lau-tha-hong-ngoc",
      name: "Lẩu thả Hồng Ngọc",
      category: EateryCategory.seafood,
      meals: [Meal.lunch, Meal.dinner],
      priceRange: PriceRange.moderate,
      address: "Phan Thiết, Bình Thuận",
      openingHours: "10:00 – 21:00",
      description: "Chuyên lẩu thả — đặc sản trứ danh của vùng biển Phan Thiết.",
    },
    {
      slug: "hai-san-bo-ke-24",
      name: "Hải sản Bờ Kè 24",
      category: EateryCategory.seafood,
      meals: [Meal.dinner],
      priceRange: PriceRange.moderate,
      address: "Đường Phạm Văn Đồng, Phan Thiết",
      openingHours: "16:00 – 23:00",
      notice: "Rất đông vào cuối tuần — nên đến sớm.",
      description: "Khu hải sản bờ kè nhộn nhịp, đồ tươi, chế biến nhanh.",
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
    await setCover({ eateryId: row.id }, slug, name);
  }

  // 6) Specialties (dish → M:N quán; product → whereToBuy)
  const specialties = [
    {
      slug: "banh-can-phan-thiet",
      name: "Bánh căn Phan Thiết",
      kind: SpecialtyKind.dish,
      priceRange: PriceRange.budget,
      description: "Bánh nướng khuôn đất, ăn kèm xíu mại, trứng và nước mắm cá kho.",
      eateries: ["banh-can-cay-phuong"],
    },
    {
      slug: "lau-tha-phan-thiet",
      name: "Lẩu thả",
      kind: SpecialtyKind.dish,
      priceRange: PriceRange.moderate,
      description:
        "Cá mai/cá suốt tươi cuốn cùng rau, bún, nước lèo — bày như bông hoa.",
      eateries: ["lau-tha-hong-ngoc", "hai-san-bo-ke-24"],
    },
    {
      slug: "goi-ca-mai-phan-thiet",
      name: "Gỏi cá mai",
      kind: SpecialtyKind.dish,
      priceRange: PriceRange.budget,
      description: "Cá mai trộn gỏi chua ngọt, cuốn bánh tráng, chấm nước lèo sệt.",
      eateries: ["hai-san-bo-ke-24"],
    },
    {
      slug: "nuoc-mam-phan-thiet",
      name: "Nước mắm Phan Thiết",
      kind: SpecialtyKind.product,
      description:
        "Nước mắm cá cơm ủ truyền thống, đậm đạm, là đặc sản quà nổi tiếng.",
      whereToBuy:
        "Các lò nước mắm Phú Hài, cửa hàng đặc sản và chợ Phan Thiết.",
    },
    {
      slug: "thanh-long-binh-thuan",
      name: "Thanh long Bình Thuận",
      kind: SpecialtyKind.product,
      description: "Thủ phủ thanh long cả nước — trái to, ngọt, mua về làm quà.",
      whereToBuy: "Vựa thanh long ven QL1, chợ và siêu thị địa phương.",
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
    await setCover({ specialtyId: row.id }, slug, name);
  }

  // 7) Accommodations
  const accommodations = [
    {
      slug: "anantara-mui-ne-resort",
      name: "Anantara Mũi Né Resort",
      category: AccommodationCategory.resort,
      priceRange: PriceRange.luxury,
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
      priceRange: PriceRange.premium,
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
      priceRange: PriceRange.budget,
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
      priceRange: PriceRange.moderate,
      address: "Đường Tôn Đức Thắng, TP. Phan Thiết",
      lat: 10.9281,
      lng: 108.1019,
      phone: "0252 3822 999",
      description:
        "Khách sạn trung tâm thành phố, tiện di chuyển tới chợ, bến cá và các điểm tham quan.",
      tags: ["khách sạn", "trung tâm", "tiện nghi"],
    },
  ];

  for (const ac of accommodations) {
    const { slug, name, ...rest } = ac;
    const row = await prisma.accommodation.upsert({
      where: { slug },
      update: { ...rest, placeId: phanThiet.id, ...PUB },
      create: { slug, name, ...rest, placeId: phanThiet.id, ...PUB },
    });
    await setCover({ accommodationId: row.id }, slug, name);
  }

  // 8) Transport (inline trên trang Place; không có slug → reset theo placeId)
  const transports = [
    {
      direction: TransportDirection.getTo,
      mode: TransportMode.bus,
      name: "Xe khách TP.HCM → Phan Thiết",
      fromName: "TP. Hồ Chí Minh",
      duration: "4 – 5 giờ",
      distanceKm: 200,
      priceFrom: 120000,
      priceTo: 230000,
      operatorName: "Phương Trang, Kumho, Tâm Hạnh…",
      description:
        "Xe giường nằm chạy liên tục trong ngày từ bến xe Miền Đông; nhiều nhà xe trả khách tận Mũi Né.",
    },
    {
      direction: TransportDirection.getTo,
      mode: TransportMode.train,
      name: "Tàu hỏa Sài Gòn → Phan Thiết",
      fromName: "Ga Sài Gòn",
      duration: "~4 giờ",
      distanceKm: 200,
      priceFrom: 160000,
      priceTo: 260000,
      operatorName: "Đường sắt Việt Nam",
      description:
        "Tàu SPT đến ga Phan Thiết, từ đó đi taxi/xe ôm ~20 phút ra Mũi Né. Thư thái, ngắm cảnh dọc đường.",
    },
    {
      direction: TransportDirection.getTo,
      mode: TransportMode.car,
      name: "Limousine TP.HCM → Mũi Né",
      fromName: "TP. Hồ Chí Minh",
      duration: "4 giờ",
      distanceKm: 220,
      priceFrom: 250000,
      priceTo: 380000,
      operatorName: "Các hãng limousine (Quê Hương, Phúc An…)",
      description:
        "Xe limousine 9–11 chỗ đón/trả tận nơi, nhanh và tiện cho nhóm nhỏ đi nghỉ dưỡng.",
    },
    {
      direction: TransportDirection.getAround,
      mode: TransportMode.motorbike,
      name: "Thuê xe máy",
      duration: "Theo ngày",
      priceFrom: 120000,
      priceTo: 180000,
      description:
        "Cách chủ động nhất để chạy dọc Mũi Né, ra Bàu Trắng, đồi cát; nhiều khách sạn/đại lý cho thuê theo ngày.",
    },
    {
      direction: TransportDirection.getAround,
      mode: TransportMode.taxi,
      name: "Taxi & xe công nghệ",
      description:
        "Taxi Mai Linh, Phan Thiết và Grab phủ tốt trong nội thành; ra Mũi Né/Hòn Rơm nên đặt xe trọn cuốc hoặc thỏa giá trước.",
    },
  ];

  await prisma.transport.deleteMany({ where: { placeId: phanThiet.id } });
  let transportOrder = 0;
  for (const t of transports) {
    await prisma.transport.create({
      data: {
        ...t,
        placeId: phanThiet.id,
        order: transportOrder++,
        ...PUB,
      },
    });
  }

  console.log(
    `✓ Seed Phan Thiết xong: 1 tỉnh, 1 điểm đến, ${spots.length} địa điểm, ${activities.length} hoạt động, ${eateries.length} quán ăn, ${specialties.length} đặc sản, ${accommodations.length} lưu trú, ${transports.length} di chuyển.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
