import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SpotSection } from "@/components/site/spot-section";
import { ActivitySection } from "@/components/site/activity-section";
import { Glyph, type GlyphName } from "@/components/site/glyphs";
import { type EateryDetailData } from "@/components/site/eatery-detail";
import { FoodSection } from "@/components/site/food-section";
import { AccommodationSection } from "@/components/site/accommodation-section";
import { type AccommodationDetailData } from "@/components/site/accommodation-detail";
import {
  TransportSection,
  type TransportItem,
} from "@/components/site/transport-section";
import { getPlaceHero, getSpotReviewSummaries } from "@/lib/place-meta";
import {
  SPOT_CATEGORY_LABELS,
  ACTIVITY_CATEGORY_LABELS,
  ACCOMMODATION_CATEGORY_LABELS,
  label,
} from "@/lib/listing-labels";
import { parseTicketTiers, formatVnd } from "@/lib/tickets";
import { notFoundMetadata } from "@/lib/metadata";

// Map token [loai] đơn loại → model + tiêu đề. Quán ăn KHÔNG có ở đây: nó hiển
// thị chi tiết inline trên tab gộp "am-thuc" (xem dưới).
const LOAI = {
  "hoat-dong": {
    title: "Hoạt động & trải nghiệm",
    model: "activity",
    unit: "hoạt động",
  },
  "dia-diem": { title: "Địa điểm tham quan", model: "spot", unit: "địa điểm" },
  "luu-tru": {
    title: "Nơi lưu trú",
    model: "accommodation",
    unit: "nơi lưu trú",
  },
} as const;

type Loai = keyof typeof LOAI;

// am-thuc = tab gộp: Quán ăn + Quán nước, chi tiết mở bằng drawer tại chỗ.
const AM_THUC = "am-thuc";
// di-chuyen = màn hình Di chuyển (Transport) inline, không có trang chi tiết per-item.
const DI_CHUYEN = "di-chuyen";

// URL chi tiết cũ giờ gộp vào tab "am-thuc" → redirect để không 404.
const FOOD_LEGACY = new Set(["dac-san", "quan-an"]);

type LinkRef = { slug: string; name: string };

type ListingItem = {
  slug: string;
  name: string;
  tagline: string | null; // slogan ngắn (chỉ spot) — ưu tiên làm subline
  description: string | null;
  review: { stars: number; total: number; worthGoing: number } | null; // đánh giá (chỉ spot)
  price: string | null; // giá vé / giá tham gia (nổi bật)
  ticketPrice: string | null; // CHỈ khi có bán vé (dựng từ ticketTiers) — null = vào tự do
  bestTime: string | null; // giờ/mùa đẹp nhất (chỉ spot)
  duration: string | null; // thời lượng (chỉ activity)
  season: string | null; // mùa/thời điểm (chỉ activity)
  operator: string | null; // đơn vị khai thác (chỉ activity)
  spots: LinkRef[]; // địa điểm mà hoạt động diễn ra (chỉ activity)
  notice: string | null; // cảnh báo truy cập (chỉ spot)
  highlights: string[]; // điểm nhấn / đặc trưng (chỉ spot)
  category: string | null; // giá trị enum của loại — khóa lọc & tham số ?cat=
  tag: string | null; // loại (category) — hiển thị làm kicker
  tags: string[];
  activities: LinkRef[]; // hoạt động ở địa điểm này (chỉ spot)
  images: { url: string; isCover: boolean }[];
  isFeatured: boolean; // mục nổi bật → dùng làm card "lead" đầu danh sách
};

type ListingModel = (typeof LOAI)[Loai]["model"];

// Dòng thô từ DB — các field thêm theo loại (optional).
type RawListing = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tagline?: string | null;
  highlights?: { title: string }[];
  tags: string[];
  images: { url: string; isCover: boolean }[];
  isFeatured?: boolean;
  category?: string | null;
  bestTime?: string | null;
  notice?: string | null;
  ticketInfo?: string | null;
  address?: string | null;
  durationText?: string | null;
  seasonText?: string | null;
  ticketFree?: boolean;
  ticketTiers?: unknown;
  openingHours?: string | null;
  activityLinks?: { activity: LinkRef }[];
  spotLinks?: { spot: LinkRef }[];
  operatorName?: string | null;
};

// Field select thêm theo từng model (để build meta / quan hệ).
const EXTRA_SELECT: Record<ListingModel, Record<string, unknown>> = {
  activity: {
    category: true,
    durationText: true,
    seasonText: true,
    ticketFree: true,
    ticketTiers: true,
    operatorName: true,
    // Địa điểm mà hoạt động này diễn ra (M:N) — quan hệ xương sống của phần
    // Trải nghiệm, trước đây tab không hiện lấy một cái tên.
    spotLinks: {
      where: { spot: { status: "published" } },
      orderBy: { order: "asc" },
      take: 4,
      select: { spot: { select: { slug: true, name: true } } },
    },
  },
  spot: {
    tagline: true,
    category: true,
    bestTime: true,
    notice: true,
    ticketInfo: true,
    ticketFree: true,
    ticketTiers: true,
    address: true,
    // Điểm nhấn (đặc trưng) của địa điểm.
    highlights: {
      orderBy: { order: "asc" },
      take: 4,
      select: { title: true },
    },
    // Hoạt động diễn ra tại địa điểm này (qua bảng nối, read-only từ phía Spot).
    activityLinks: {
      where: { activity: { status: "published" } },
      orderBy: { order: "asc" },
      take: 4,
      select: { activity: { select: { slug: true, name: true } } },
    },
  },
  accommodation: { category: true },
};

function activityPrice(free?: boolean, tiers?: unknown): string | null {
  if (free) return "Miễn phí";
  const prices = parseTicketTiers(tiers)
    .map((t) => t.price)
    .filter((p): p is number => p != null && p > 0);
  if (prices.length === 0) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  // 1 loại vé (hoặc cùng giá) → hiện giá; nhiều mức → khoảng giá.
  return min === max ? formatVnd(min) : `${formatVnd(min)} – ${formatVnd(max)}`;
}

// Loại (category) → badge trên ảnh.
function buildTag(model: ListingModel, r: RawListing): string | null {
  if (!r.category) return null;
  switch (model) {
    case "spot":
      return label(SPOT_CATEGORY_LABELS, r.category);
    case "activity":
      return label(ACTIVITY_CATEGORY_LABELS, r.category);
    case "accommodation":
      return label(ACCOMMODATION_CATEGORY_LABELS, r.category);
    default:
      return null;
  }
}

// Giá vé / giá tham gia — hiển thị nổi bật riêng (primary). "Miễn phí" khi free.
function buildPrice(model: ListingModel, r: RawListing): string | null {
  if (model === "spot")
    return (
      activityPrice(r.ticketFree, r.ticketTiers) || r.ticketInfo?.trim() || null
    );
  if (model === "activity") return activityPrice(r.ticketFree, r.ticketTiers);
  return null;
}

// Truy vấn danh sách đã xuất bản của một model (tên trùng key delegate Prisma).
async function fetchListing(
  model: ListingModel,
  placeId: string,
): Promise<ListingItem[]> {
  const delegate = prisma[model] as unknown as {
    findMany: (args: unknown) => Promise<RawListing[]>;
  };
  const rows = await delegate.findMany({
    where: { placeId, status: "published" },
    orderBy: [
      { isFeatured: "desc" },
      { order: "asc" },
      { popularity: "desc" },
      { name: "asc" },
    ],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      tags: true,
      isFeatured: true,
      images: {
        where: { isCover: true },
        take: 1,
        select: { url: true, isCover: true },
      },
      ...EXTRA_SELECT[model],
    },
  });
  // Đánh giá theo từng spot (chỉ Địa điểm có review) — gộp 1 truy vấn.
  const reviews =
    model === "spot"
      ? await getSpotReviewSummaries(rows.map((r) => r.id))
      : null;
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    tagline: r.tagline ?? null,
    description: r.description,
    review: reviews?.get(r.id) ?? null,
    price: buildPrice(model, r),
    // Giá cho HUY HIỆU trên thẻ Địa điểm: chỉ dựng từ bảng vé, cố ý KHÔNG rơi
    // về `ticketInfo` như `buildPrice` — trường đó là câu văn ("Vào tự do; gửi
    // xe khoảng 10.000–20.000đ") nên nhét vào một huy hiệu góc ảnh thì vỡ.
    ticketPrice:
      model === "spot" && !r.ticketFree
        ? activityPrice(false, r.ticketTiers)
        : null,
    bestTime: r.bestTime ?? null,
    notice: r.notice ?? null,
    duration: r.durationText ?? null,
    season: r.seasonText ?? null,
    operator: r.operatorName ?? null,
    spots: r.spotLinks?.map((l) => l.spot) ?? [],
    highlights: r.highlights?.map((h) => h.title) ?? [],
    category: r.category ?? null,
    tag: buildTag(model, r),
    tags: r.tags,
    images: r.images,
    activities: r.activityLinks?.map((l) => l.activity) ?? [],
    isFeatured: r.isFeatured ?? false,
  }));
}

const FOOD_ORDER = [
  { isFeatured: "desc" as const },
  { order: "asc" as const },
  { popularity: "desc" as const },
  { name: "asc" as const },
];
// Ảnh trưng bày. Phải lọc `kind` ở đây vì select này KHÔNG lọc `isCover` —
// không lọc thì ảnh tấm thực đơn lọt vào dải ảnh của quán.
const gallerySelect = {
  where: { kind: "gallery" as const },
  orderBy: [{ isCover: "desc" as const }, { order: "asc" as const }],
  select: { id: true, url: true, alt: true, isCover: true },
};

// Chi tiết đầy đủ Quán ăn của một place — render khối trên tab Ẩm thực.
//
// Ảnh trưng bày và ảnh tấm thực đơn nằm CHUNG một quan hệ `images`, mà Prisma
// không cho select cùng một quan hệ hai lần dưới hai tên. Nên lấy cả kèm `kind`
// rồi tách ở đây — vẫn một truy vấn, và nơi dùng nhận đúng hai danh sách rời.
async function fetchEateryDetails(placeId: string): Promise<EateryDetailData[]> {
  const rows = await prisma.eatery.findMany({
    where: { placeId, status: "published" },
    orderBy: FOOD_ORDER,
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      category: true,
      venueKind: true,
      viewType: true,
      bestTime: true,
      address: true,
      lat: true,
      lng: true,
      openingHours: true,
      phone: true,
      website: true,
      bookingUrl: true,
      meals: true,
      notice: true,
      tags: true,
      wardName: true,
      provinceName: true,
      images: {
        orderBy: [{ isCover: "desc" as const }, { order: "asc" as const }],
        select: { id: true, url: true, alt: true, isCover: true, kind: true },
      },
    },
  });
  return rows.map(({ images, ...rest }) => ({
    ...rest,
    images: images.filter((i) => i.kind === "gallery"),
    menuImages: images.filter((i) => i.kind === "menu"),
  }));
}

// Trải nghiệm ẩm thực (Activity category=food) — cross-link sang trang chi tiết.
async function fetchFoodExperiences(placeId: string) {
  return prisma.activity.findMany({
    where: { placeId, status: "published", category: "food" },
    orderBy: FOOD_ORDER,
    select: {
      slug: true,
      name: true,
      description: true,
      durationText: true,
      images: {
        where: { isCover: true },
        take: 1,
        select: { url: true, isCover: true },
      },
    },
  });
}

// Chi tiết đầy đủ Nơi lưu trú của một place — render lưới + drawer.
async function fetchAccommodationDetails(
  placeId: string,
): Promise<AccommodationDetailData[]> {
  return prisma.accommodation.findMany({
    where: { placeId, status: "published" },
    // Đã xác minh chính chủ lên trước — đúng định vị "danh bạ tin cậy".
    orderBy: [
      { isVerified: "desc" },
      { isFeatured: "desc" },
      { order: "asc" },
      { name: "asc" },
    ],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      category: true,
      address: true,
      lat: true,
      lng: true,
      phone: true,
      website: true,
      bookingUrl: true,
      zalo: true,
      facebookUrl: true,
      isVerified: true,
      depositPolicy: true,
      notice: true,
      tags: true,
      images: gallerySelect,
    },
  });
}

// Di chuyển: màn hình riêng (inline, không có trang chi tiết per-item).
async function fetchTransports(placeId: string): Promise<TransportItem[]> {
  return prisma.transport.findMany({
    where: { placeId, status: "published" },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      direction: true,
      mode: true,
      fromName: true,
      duration: true,
      distanceKm: true,
      priceFrom: true,
      priceTo: true,
      currency: true,
      operatorName: true,
      bookingUrl: true,
      phone: true,
      notice: true,
      isRecommended: true,
      description: true,
    },
  });
}

function pageTitle(loai: string): string | null {
  if (loai === AM_THUC) return "Ẩm thực";
  if (loai === DI_CHUYEN) return "Di chuyển";
  return LOAI[loai as Loai]?.title ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ placeSlug: string; loai: string }>;
}) {
  const { placeSlug, loai } = await params;
  const title = pageTitle(loai);
  if (!title) return notFoundMetadata;
  const place = await prisma.place.findUnique({
    where: { slug: placeSlug },
    select: { name: true },
  });
  if (!place) return notFoundMetadata;
  return { title: `${title} ở ${place.name}` };
}

export default async function PlaceListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ placeSlug: string; loai: string }>;
  searchParams: Promise<{ open?: string }>;
}) {
  const { placeSlug, loai } = await params;
  // URL chi tiết Đặc sản/Quán ăn cũ đã gộp vào tab Ẩm thực.
  if (FOOD_LEGACY.has(loai)) redirect(`/diem-den/${placeSlug}/${AM_THUC}`);
  const isFood = loai === AM_THUC;
  const isStay = loai === "luu-tru";
  const isTransport = loai === DI_CHUYEN;
  const cfg = LOAI[loai as Loai];
  if (!isFood && !isTransport && !cfg) notFound();

  const heroData = await getPlaceHero(placeSlug);
  if (!heroData || heroData.place.status !== "published") notFound();
  const place = heroData.place;

  // Số liệu điểm đến, tab, check-in, dải lân cận: đã chuyển hết lên
  // `(tabs)/layout.tsx`. Trang này chỉ truy vấn NỘI DUNG của tab, nên đổi tab
  // không còn chạy lại mấy thứ đó nữa.

  // Ẩm thực: ăn ở đâu + quán nước + trải nghiệm.
  const food = isFood
    ? {
        eateries: await fetchEateryDetails(place.id),
        experiences: await fetchFoodExperiences(place.id),
      }
    : null;

  // Lưu trú: lưới card + drawer chi tiết (không còn trang chi tiết riêng).
  const stays = isStay ? await fetchAccommodationDetails(place.id) : null;
  const openSlug = isStay ? (await searchParams).open : undefined;

  // Di chuyển: màn hình riêng, render inline theo direction (đến nơi / tại chỗ).
  const transports = isTransport ? await fetchTransports(place.id) : null;

  // Các loại khác (hoạt động, địa điểm): lưới card link tới trang chi tiết riêng.
  const groups =
    !isFood && !isStay && !isTransport && cfg
      ? [
          {
            // Tiêu đề mục nói theo giọng của các tab anh em ("Ăn uống ở X",
            // "Đi đâu ở X") chứ không phải tên bảng dữ liệu. `cfg.title` vẫn
            // giữ nguyên cho `generateMetadata` — thẻ <title> thì cần dạng
            // trung tính, có thể đọc rời khỏi ngữ cảnh trang.
            title: `Chơi gì ở ${place.name}`,
            prefix: loai,
            unit: cfg.unit,
            items: await fetchListing(cfg.model, place.id),
          },
        ]
      : [];

  // Tab Địa điểm có section riêng (xem `spot-section.tsx`) — cùng lối với Ẩm
  // thực / Lưu trú / Di chuyển, mỗi tab một component vì mỗi loại có bộ trường
  // và bộ câu hỏi khác hẳn nhau.
  const spots =
    loai === "dia-diem"
      ? groups[0]!.items.map((it) => ({
          slug: it.slug,
          name: it.name,
          tagline: it.tagline,
          description: it.description,
          category: it.category,
          categoryLabel: it.tag,
          bestTime: it.bestTime,
          notice: it.notice,
          price: it.ticketPrice,
          review: it.review,
          images: it.images,
          highlights: it.highlights,
          activities: it.activities,
        }))
      : null;

  // Dải dữ kiện của tab Di chuyển — tính từ chính danh sách.
  const transportStats: {
    glyph: GlyphName;
    value: string;
    text: string;
  }[] = [];
  if (transports) {
    const to = transports.filter((t) => t.direction === "getTo").length;
    const around = transports.length - to;
    if (to > 0)
      transportStats.push({ glyph: "route", value: String(to), text: "cách đến nơi" });
    if (around > 0)
      transportStats.push({
        glyph: "gate",
        value: String(around),
        text: "cách đi lại tại chỗ",
      });
    const fares = transports
      .map((t) => t.priceFrom)
      .filter((p): p is number => p != null && p > 0);
    if (fares.length > 0)
      transportStats.push({
        glyph: "ticket",
        value: formatVnd(Math.min(...fares)),
        text: "cho chặng rẻ nhất",
      });
  }

  // Tab Trải nghiệm cũng có section riêng (`ActivitySection`), cùng lối với
  // Địa điểm — khung lọc/kiểu xem dùng chung, chỉ nội dung thẻ là khác.
  const acts =
    loai === "hoat-dong"
      ? groups[0]!.items.map((it) => ({
          slug: it.slug,
          name: it.name,
          description: it.description,
          category: it.category,
          categoryLabel: it.tag,
          duration: it.duration,
          season: it.season,
          price: it.price === "Miễn phí" ? null : it.price,
          operator: it.operator,
          spots: it.spots,
          images: it.images,
        }))
      : null;

  const listingView =
    (await cookies()).get("listingView")?.value === "list" ? "list" : "grid";

  // Thanh ngữ cảnh + thanh tab + dải lân cận nằm ở `(tabs)/layout.tsx` — trang
  // này chỉ còn NỘI DUNG của tab.
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          {food ? (
            food.eateries.length === 0 ? (
              <p className="text-muted-foreground">Chưa có nội dung ẩm thực.</p>
            ) : (
              <FoodSection
                placeName={place.name}
                eateries={food.eateries}
                experiences={food.experiences}
              />
            )
          ) : stays ? (
            stays.length === 0 ? (
              <p className="text-muted-foreground">Chưa có nơi lưu trú.</p>
            ) : (
              <AccommodationSection
                accommodations={stays}
                placeName={place.name}
                openSlug={openSlug}
              />
            )
          ) : transports ? (
            transports.length === 0 ? (
              <p className="text-muted-foreground">Chưa có thông tin di chuyển.</p>
            ) : (
              <section>
                {/* Cùng giọng với các tab anh em ("Đi đâu ở X", "Ăn uống ở X")
                    thay cho câu hỏi "Đi lại thế nào?" — và thêm dải dữ kiện.
                    Thanh nhảy mục của `TransportSection` chỉ có hai nhãn không
                    kèm số, nên ba con số dưới đây đều là tin mới. */}
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Đi lại ở {place.name}
                </h2>
                <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  {transportStats.map((st) => (
                    <span
                      key={st.text}
                      className="inline-flex items-center gap-1.5"
                    >
                      <Glyph
                        name={st.glyph}
                        className="size-[1.05rem] shrink-0 text-muted-foreground/70"
                      />
                      <b className="font-semibold text-foreground">{st.value}</b>{" "}
                      {st.text}
                    </span>
                  ))}
                </div>
                <div className="mt-8">
                  <TransportSection
                    transports={transports}
                    placeName={place.name}
                  />
                </div>
              </section>
            )
          ) : acts ? (
            acts.length === 0 ? (
              <p className="text-muted-foreground">Chưa có hoạt động nào.</p>
            ) : (
              <ActivitySection
                activities={acts}
                placeName={place.name}
                initialView={listingView}
              />
            )
          ) : spots ? (
            spots.length === 0 ? (
              <p className="text-muted-foreground">Chưa có địa điểm nào.</p>
            ) : (
              <SpotSection
                spots={spots}
                placeName={place.name}
                initialView={listingView}
              />
            )
      ) : // Không còn nhánh nào: `LOAI` chỉ có ba token và cả ba đều đã có
      // section riêng (Địa điểm · Trải nghiệm · Nơi lưu trú), cộng hai token
      // đặc biệt Ẩm thực & Di chuyển ở trên. `ListingView` — component "danh
      // sách listing chung chung" — vì thế đã xoá.
      null}
    </div>
  );
}
