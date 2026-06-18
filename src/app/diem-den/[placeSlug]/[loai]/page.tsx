import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { coverUrl } from "@/lib/place-image";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ListingView } from "@/components/site/listing-view";
import { PlaceHero } from "@/components/site/place-hero";
import { PlaceTabs } from "@/components/site/place-tabs";
import { type HeroImage } from "@/components/site/place-hero-stack";
import {
  getPlaceHeader,
  getPlaceCounts,
  buildPlaceTabs,
  buildPlaceStats,
} from "@/lib/place-meta";
import {
  SPOT_CATEGORY_LABELS,
  ACTIVITY_CATEGORY_LABELS,
  EATERY_CATEGORY_LABELS,
  ACCOMMODATION_CATEGORY_LABELS,
  label,
} from "@/lib/listing-labels";
import { parseTicketTiers, formatVnd } from "@/lib/tickets";

// Map token [loai] đơn loại → model + tiêu đề + tiền tố URL chi tiết.
const LOAI = {
  "hoat-dong": { title: "Hoạt động & trải nghiệm", model: "activity" },
  "dia-diem": { title: "Địa điểm tham quan", model: "spot" },
  "dac-san": { title: "Đặc sản", model: "specialty" },
  "quan-an": { title: "Quán ăn", model: "eatery" },
  "luu-tru": { title: "Nơi lưu trú", model: "accommodation" },
} as const;

type Loai = keyof typeof LOAI;

// am-thuc = tab gộp: hiển thị Đặc sản + Quán ăn trên cùng một trang.
const AM_THUC = "am-thuc";

type LinkRef = { slug: string; name: string };
type Fact = { kind: "location" | "price" | "time"; text: string };

type ListingItem = {
  slug: string;
  name: string;
  description: string | null;
  tag: string | null; // loại (category) — hiển thị làm badge trên ảnh
  tags: string[];
  meta: string[]; // fact ngắn theo loại (thời lượng, giá, giờ…)
  facts: Fact[]; // fact có icon (vị trí, giá vé, mùa) — chủ yếu cho Địa điểm
  activities: LinkRef[]; // hoạt động ở địa điểm này (chỉ spot)
  images: { url: string; isCover: boolean }[];
};

type ListingModel = (typeof LOAI)[Loai]["model"];

// Dòng thô từ DB — các field thêm theo loại (optional).
type RawListing = {
  slug: string;
  name: string;
  description: string | null;
  tags: string[];
  images: { url: string; isCover: boolean }[];
  category?: string | null;
  bestTime?: string | null;
  ticketInfo?: string | null;
  address?: string | null;
  durationText?: string | null;
  ticketFree?: boolean;
  ticketTiers?: unknown;
  openingHours?: string | null;
  activities?: LinkRef[];
};

// Field select thêm theo từng model (để build meta / quan hệ).
const EXTRA_SELECT: Record<ListingModel, Record<string, unknown>> = {
  activity: {
    category: true,
    durationText: true,
    ticketFree: true,
    ticketTiers: true,
  },
  spot: {
    category: true,
    bestTime: true,
    ticketInfo: true,
    ticketFree: true,
    ticketTiers: true,
    address: true,
    // Hoạt động diễn ra tại địa điểm này (M:N, read-only từ phía Spot).
    activities: {
      where: { status: "published" },
      orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
      take: 4,
      select: { slug: true, name: true },
    },
  },
  specialty: {},
  eatery: { category: true, openingHours: true },
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
    case "eatery":
      return label(EATERY_CATEGORY_LABELS, r.category);
    case "accommodation":
      return label(ACCOMMODATION_CATEGORY_LABELS, r.category);
    default:
      return null;
  }
}

// Fact dạng pill (ngoài category): thời lượng, giá, giờ… (cho các loại không phải spot).
function buildMeta(model: ListingModel, r: RawListing): string[] {
  switch (model) {
    case "activity":
      return [r.durationText, activityPrice(r.ticketFree, r.ticketTiers)].filter(
        Boolean,
      ) as string[];
    case "eatery":
      return [r.openingHours].filter(Boolean) as string[];
    default:
      return [];
  }
}

// Fact có icon (vị trí / giá vé / mùa) — dành riêng cho Địa điểm (spot).
function buildFacts(model: ListingModel, r: RawListing): Fact[] {
  if (model !== "spot") return [];
  // Giá vé: ưu tiên giá thật (miễn phí / bảng giá); ghi chú chỉ dùng khi không có giá.
  const price =
    activityPrice(r.ticketFree, r.ticketTiers) || r.ticketInfo?.trim() || null;
  return [
    r.address ? { kind: "location" as const, text: r.address } : null,
    price ? { kind: "price" as const, text: price } : null,
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
      slug: true,
      name: true,
      description: true,
      tags: true,
      images: {
        where: { isCover: true },
        take: 1,
        select: { url: true, isCover: true },
      },
      ...EXTRA_SELECT[model],
    },
  });
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    description: r.description,
    tag: buildTag(model, r),
    tags: r.tags,
    images: r.images,
    meta: buildMeta(model, r),
    facts: buildFacts(model, r),
    activities: r.activities ?? [],
  }));
}

function pageTitle(loai: string): string | null {
  if (loai === AM_THUC) return "Ẩm thực";
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
}: {
  params: Promise<{ placeSlug: string; loai: string }>;
}) {
  const { placeSlug, loai } = await params;
  const isFood = loai === AM_THUC;
  const cfg = LOAI[loai as Loai];
  if (!isFood && !cfg) notFound();

  const place = await getPlaceHeader(placeSlug);
  if (!place || place.status !== "published") notFound();

  const counts = await getPlaceCounts(place.id);
  const stats = buildPlaceStats(place.viewCount, counts);
  const tabs = buildPlaceTabs(place.slug, counts);

  const heroImages: HeroImage[] = place.images.map((i) => ({
    url: i.url,
    alt: i.alt,
    caption: i.caption,
  }));
  if (heroImages.length === 0) {
    heroImages.push({ url: coverUrl([], place.slug, 1600, 1000), alt: place.name });
  }

  // Mỗi nhóm hiển thị: tiêu đề + danh sách (link chi tiết theo tiền tố riêng).
  const groups = isFood
    ? [
        { title: "Đặc sản", prefix: "dac-san", items: await fetchListing("specialty", place.id) },
        { title: "Quán ăn", prefix: "quan-an", items: await fetchListing("eatery", place.id) },
      ]
    : [
        {
          title: cfg.title,
          prefix: loai,
          items: await fetchListing(cfg.model, place.id),
        },
      ];

  const listingView =
    (await cookies()).get("listingView")?.value === "list" ? "list" : "grid";

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <PlaceHero
          place={place}
          heroImages={heroImages}
          stats={stats}
          back={{ href: `/diem-den/${place.slug}`, label: "Tổng quan" }}
        />

        {/* Thanh tab: Tổng quan + xem tất cả từng listing */}
        <PlaceTabs items={tabs} />

        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <ListingView groups={groups} initialView={listingView} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
