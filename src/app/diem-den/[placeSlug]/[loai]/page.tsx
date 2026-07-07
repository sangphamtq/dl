import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PeerBar } from "@/components/site/peer-bar";
import { getDestinationPeerGroups } from "@/lib/peers";
import { ListingView } from "@/components/site/listing-view";
import { type SpecialtyDetailData } from "@/components/site/specialty-detail";
import { type EateryDetailData } from "@/components/site/eatery-detail";
import { FoodSection } from "@/components/site/food-section";
import { AccommodationSection } from "@/components/site/accommodation-section";
import { type AccommodationDetailData } from "@/components/site/accommodation-detail";
import {
  TransportSection,
  type TransportItem,
} from "@/components/site/transport-section";
import { PlaceHero } from "@/components/site/place-hero";
import { PlaceTabs } from "@/components/site/place-tabs";
import {
  getPlaceHero,
  getPlaceCounts,
  buildPlaceTabs,
  buildPlaceStats,
  getVisitors,
  getReviewSummary,
  getSpotReviewSummaries,
} from "@/lib/place-meta";
import {
  SPOT_CATEGORY_LABELS,
  ACTIVITY_CATEGORY_LABELS,
  ACCOMMODATION_CATEGORY_LABELS,
  label,
} from "@/lib/listing-labels";
import { parseTicketTiers, formatVnd } from "@/lib/tickets";

// Map token [loai] đơn loại → model + tiêu đề. Đặc sản & Quán ăn KHÔNG còn ở đây:
// chúng hiển thị chi tiết inline trên tab gộp "am-thuc" (xem dưới).
const LOAI = {
  "hoat-dong": { title: "Hoạt động & trải nghiệm", model: "activity" },
  "dia-diem": { title: "Địa điểm tham quan", model: "spot" },
  "luu-tru": { title: "Nơi lưu trú", model: "accommodation" },
} as const;

type Loai = keyof typeof LOAI;

// am-thuc = tab gộp: hiển thị chi tiết Đặc sản + Quán ăn trên cùng một trang.
const AM_THUC = "am-thuc";
// di-chuyen = màn hình Di chuyển (Transport) inline, không có trang chi tiết per-item.
const DI_CHUYEN = "di-chuyen";

// URL chi tiết cũ giờ gộp vào tab "am-thuc" → redirect để không 404.
const FOOD_LEGACY = new Set(["dac-san", "quan-an"]);

type LinkRef = { slug: string; name: string };
type Fact = { kind: "location" | "price" | "time"; text: string };

type ListingItem = {
  slug: string;
  name: string;
  tagline: string | null; // slogan ngắn (chỉ spot) — ưu tiên làm subline
  description: string | null;
  review: { stars: number; total: number } | null; // đánh giá (chỉ spot)
  price: string | null; // giá vé / giá tham gia (nổi bật)
  highlights: string[]; // điểm nhấn / đặc trưng (chỉ spot)
  tag: string | null; // loại (category) — hiển thị làm kicker
  tags: string[];
  meta: string[]; // fact ngắn theo loại (thời lượng, giá, giờ…)
  facts: Fact[]; // fact có icon (vị trí, giá vé, mùa) — chủ yếu cho Địa điểm
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
  ticketInfo?: string | null;
  address?: string | null;
  durationText?: string | null;
  seasonText?: string | null;
  ticketFree?: boolean;
  ticketTiers?: unknown;
  openingHours?: string | null;
  activityLinks?: { activity: LinkRef }[];
};

// Field select thêm theo từng model (để build meta / quan hệ).
const EXTRA_SELECT: Record<ListingModel, Record<string, unknown>> = {
  activity: {
    category: true,
    durationText: true,
    seasonText: true,
    ticketFree: true,
    ticketTiers: true,
  },
  spot: {
    tagline: true,
    category: true,
    bestTime: true,
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

// Meta phụ (thời lượng, mùa…) — giá tách riêng ra buildPrice.
function buildMeta(model: ListingModel, r: RawListing): string[] {
  switch (model) {
    case "activity":
      return [r.durationText, r.seasonText].filter(Boolean) as string[];
    default:
      return [];
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

// Fact phụ (vị trí / mùa) — dành riêng cho Địa điểm (spot); giá đã tách riêng.
function buildFacts(model: ListingModel, r: RawListing): Fact[] {
  if (model !== "spot") return [];
  return [
    r.address ? { kind: "location" as const, text: r.address } : null,
    r.bestTime ? { kind: "time" as const, text: `Đẹp nhất: ${r.bestTime}` } : null,
  ].filter(Boolean) as Fact[];
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
    highlights: r.highlights?.map((h) => h.title) ?? [],
    tag: buildTag(model, r),
    tags: r.tags,
    images: r.images,
    meta: buildMeta(model, r),
    facts: buildFacts(model, r),
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
// Quan hệ liên kết chéo (eatery↔specialty) — card có ảnh bìa.
const crossLinkSelect = {
  where: { status: "published" as const },
  orderBy: [{ isFeatured: "desc" as const }, { name: "asc" as const }],
  select: {
    slug: true,
    name: true,
    images: { where: { isCover: true }, take: 1, select: { url: true, isCover: true } },
  },
};
const gallerySelect = {
  orderBy: [{ isCover: "desc" as const }, { order: "asc" as const }],
  select: { id: true, url: true, alt: true, isCover: true },
};

// Chi tiết đầy đủ Đặc sản của một place — render khối trên tab Ẩm thực.
async function fetchSpecialtyDetails(
  placeId: string,
): Promise<SpecialtyDetailData[]> {
  return prisma.specialty.findMany({
    where: { placeId, status: "published" },
    orderBy: FOOD_ORDER,
    select: {
      slug: true,
      name: true,
      description: true,
      tags: true,
      images: gallerySelect,
      eateries: crossLinkSelect,
    },
  });
}

// Chi tiết đầy đủ Quán ăn của một place — render khối trên tab Ẩm thực.
async function fetchEateryDetails(placeId: string): Promise<EateryDetailData[]> {
  return prisma.eatery.findMany({
    where: { placeId, status: "published" },
    orderBy: FOOD_ORDER,
    select: {
      slug: true,
      name: true,
      description: true,
      category: true,
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
      districtName: true,
      provinceName: true,
      images: gallerySelect,
      specialties: crossLinkSelect,
    },
  });
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
  if (!title) return {};
  const place = await prisma.place.findUnique({
    where: { slug: placeSlug },
    select: { name: true },
  });
  if (!place) return {};
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

  const peerGroups = await getDestinationPeerGroups();
  const counts = await getPlaceCounts(place.id);
  const stats = buildPlaceStats(place.viewCount);
  const tabs = buildPlaceTabs(place.slug, counts);

  // Trạng thái check-in "đã đến" của user hiện tại (nút ở hero).
  const session = await auth();
  const userId = session?.user?.id;
  const checkIn = {
    checked: userId
      ? !!(await prisma.checkIn.findUnique({
          where: { userId_placeId: { userId, placeId: place.id } },
          select: { id: true },
        }))
      : false,
    isAuthed: !!userId,
  };
  const visitors = await getVisitors("place", place.id);
  const reviewSummary =
    place.kind === "destination"
      ? await getReviewSummary("place", place.id)
      : null;

  // Ẩm thực: bản sắc + món phải thử + ăn ở đâu + trải nghiệm + mẹo.
  const foodMeta = isFood
    ? await prisma.place.findUnique({
        where: { id: place.id },
        select: { foodIntro: true, foodTips: true },
      })
    : null;
  const food = isFood
    ? {
        intro: foodMeta?.foodIntro ?? null,
        tips: foodMeta?.foodTips ?? [],
        specialties: await fetchSpecialtyDetails(place.id),
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
            title: cfg.title,
            prefix: loai,
            items: await fetchListing(cfg.model, place.id),
          },
        ]
      : [];

  const listingView =
    (await cookies()).get("listingView")?.value === "list" ? "list" : "grid";

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <PlaceHero
          place={place}
          heroImages={heroData.heroImages}
          stats={stats}
          videos={heroData.videos}
          back={{ href: `/diem-den/${place.slug}`, label: "Tổng quan" }}
          checkIn={checkIn}
          visitors={visitors}
          reviews={
            reviewSummary && reviewSummary.total > 0
              ? { stars: reviewSummary.stars, total: reviewSummary.total }
              : undefined
          }
        />

        {/* Thanh tab: Tổng quan + xem tất cả từng listing + nút Video */}
        <PlaceTabs items={tabs} videos={heroData.videos} placeName={place.name} />

        <div
          className={`mx-auto px-4 py-14 sm:px-6 sm:py-20 max-w-7xl`}
        >
          {food ? (
            food.specialties.length === 0 && food.eateries.length === 0 ? (
              <p className="text-muted-foreground">Chưa có nội dung ẩm thực.</p>
            ) : (
              <FoodSection
                placeName={place.name}
                intro={food.intro}
                tips={food.tips}
                specialties={food.specialties}
                eateries={food.eateries}
                experiences={food.experiences}
              />
            )
          ) : stays ? (
            stays.length === 0 ? (
              <p className="text-muted-foreground">Chưa có nơi lưu trú.</p>
            ) : (
              <AccommodationSection accommodations={stays} openSlug={openSlug} />
            )
          ) : transports ? (
            transports.length === 0 ? (
              <p className="text-muted-foreground">Chưa có thông tin di chuyển.</p>
            ) : (
              <section>
                <h2 className="text-2xl font-bold tracking-tight">
                  Đi lại thế nào?
                </h2>
                <p className="mt-2 max-w-prose leading-relaxed text-muted-foreground">
                  Cách đến {place.name} từ bên ngoài và phương tiện đi lại tại chỗ.
                </p>
                <div className="mt-10">
                  <TransportSection
                    transports={transports}
                    placeName={place.name}
                  />
                </div>
              </section>
            )
          ) : (
            <ListingView groups={groups} initialView={listingView} />
          )}
        </div>
      </main>

      <SiteFooter />
      <PeerBar
        groups={peerGroups}
        currentSlug={place.slug}
        prefix="diem-den"
        title="Điểm đến"
      />
    </div>
  );
}
