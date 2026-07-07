import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MapPin,
  Phone,
  Globe,
  Ticket,
  TriangleAlert,
  Sparkles,
  Star,
  Check,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { getVisitors } from "@/lib/place-meta";
import { summarizeReviews } from "@/lib/review-meta";
import { googleEmbedSrc, parseZoom, parseLatLng } from "@/lib/map-url";
import {
  getDrivingDistances,
  coordKey,
  type LatLng,
  type Ride,
} from "@/lib/routing";
import {
  parseTicketTiers,
  tierPriceLabel,
  formatVnd,
  type TicketTier,
} from "@/lib/tickets";
import {
  SPOT_CATEGORY_LABELS,
  EATERY_CATEGORY_LABELS,
  ACCOMMODATION_CATEGORY_LABELS,
  PRICE_LABELS,
  label,
} from "@/lib/listing-labels";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PlaceHeroStack, type HeroImage } from "@/components/site/place-hero-stack";
import { HeroFrame } from "@/components/site/hero-frame";
import { proseClass } from "@/components/cms/rich-text-editor";
import { ShareButton } from "@/components/site/share-button";
import { RelatedPosts } from "@/components/site/related-posts";
import { ListingViewTracker } from "@/components/site/listing-view-tracker";
import { isStaffViewer } from "@/lib/preview";
import { ListingCard } from "@/components/site/listing-card";
import { Rail } from "@/components/site/rail";
import { SpotSectionNav, type SectionItem } from "@/components/site/spot-section-nav";
import { PeerBar } from "@/components/site/peer-bar";
import { getListingPeers } from "@/lib/peers";
import { CheckInButton } from "@/components/site/check-in-button";
import { CheckInFaces } from "@/components/site/check-in-faces";
import {
  ReviewsSection,
  type ReviewListItem,
} from "@/components/site/place-reviews";

const pub = { status: "published" as const };

const listingImages = {
  where: { isCover: true },
  take: 1,
  select: { url: true, isCover: true },
} as const;

// Khoảng cách Haversine (km) để sắp "gần đây" theo toạ độ.
function distanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Gắn khoảng cách (km, null nếu thiếu toạ độ) tới spot, sắp gần→xa khi spot có
// toạ độ (mục thiếu toạ độ dồn cuối), rồi cắt còn `take`.
function withDistance<T extends { lat: number | null; lng: number | null }>(
  items: T[],
  origin: { lat: number | null; lng: number | null },
  take: number,
): (T & { distanceKm: number | null })[] {
  const annotated = items.map((it) => ({
    ...it,
    distanceKm:
      origin.lat != null &&
      origin.lng != null &&
      it.lat != null &&
      it.lng != null
        ? distanceKm(origin.lat, origin.lng, it.lat, it.lng)
        : null,
  }));
  if (origin.lat == null || origin.lng == null) return annotated.slice(0, take);
  return annotated
    .map((it, i) => ({ it, i }))
    .sort(
      (a, b) =>
        (a.it.distanceKm ?? Infinity) - (b.it.distanceKm ?? Infinity) ||
        a.i - b.i,
    )
    .slice(0, take)
    .map((x) => x.it);
}

// Nhãn giá vé từ ticketFree / ticketTiers (dùng cho cả spot lẫn activity).
function ticketPriceLabel(ticketFree: boolean, ticketTiers: unknown): string | null {
  if (ticketFree) return "Miễn phí";
  const prices = parseTicketTiers(ticketTiers)
    .map((t) => t.price)
    .filter((p): p is number => p != null && p > 0);
  if (prices.length === 0) return null;
  return `Từ ${formatVnd(Math.min(...prices))}`;
}

// "800 m" / "1,2 km" / "12 km".
function fmtKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

// Mục lân cận sau khi gắn khoảng cách lái xe (drivingKm) + chim bay (distanceKm).
type Nearby<T> = T & {
  distanceKm: number | null; // chim bay (fallback)
  drivingKm: number | null; // đường đi thật (ORS)
  drivingMin: number | null;
};

// Bán kính tối đa cho mục "gần đây" — xa hơn thì đừng gọi là gần (km đường đi).
const NEARBY_MAX_KM = 15;

// Gắn km đường đi từ drivingMap, bỏ mục xa quá NEARBY_MAX_KM, sắp gần→xa
// (ưu tiên đường đi, fallback chim bay), rồi cắt còn `take`. Mục thiếu toạ độ
// (không đo được) vẫn giữ, dồn cuối.
function rankNearby<T extends { lat: number | null; lng: number | null; distanceKm: number | null }>(
  items: T[],
  driving: Record<string, Ride>,
  take: number,
): Nearby<T>[] {
  return items
    .map((it) => {
      const r =
        it.lat != null && it.lng != null
          ? driving[coordKey(it.lat, it.lng)]
          : undefined;
      return {
        ...it,
        drivingKm: r?.km ?? null,
        drivingMin: r?.min ?? null,
      };
    })
    .filter((it) => (it.drivingKm ?? it.distanceKm ?? 0) <= NEARBY_MAX_KM)
    .sort(
      (a, b) =>
        (a.drivingKm ?? a.distanceKm ?? Infinity) -
        (b.drivingKm ?? b.distanceKm ?? Infinity),
    )
    .slice(0, take);
}

// Nhãn hiển thị: ưu tiên đường đi ("cách 2,3 km · 6 phút"), thiếu thì chim bay
// ("cách ~1,2 km").
function rideLabel(n: {
  drivingKm: number | null;
  drivingMin: number | null;
  distanceKm: number | null;
}): string | null {
  if (n.drivingKm != null) {
    const base = `cách ${fmtKm(n.drivingKm)}`;
    return n.drivingMin != null && n.drivingMin >= 1
      ? `${base} · ${Math.round(n.drivingMin)} phút`
      : base;
  }
  if (n.distanceKm != null) return `cách ~${fmtKm(n.distanceKm)}`;
  return null;
}

// Toạ độ duy nhất (có lat/lng) để gọi routing 1 lần.
function uniqueCoords(
  items: { lat: number | null; lng: number | null }[],
): LatLng[] {
  const seen = new Set<string>();
  const out: LatLng[] = [];
  for (const it of items) {
    if (it.lat == null || it.lng == null) continue;
    const k = coordKey(it.lat, it.lng);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ lat: it.lat, lng: it.lng });
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const spot = await prisma.spot.findUnique({
    where: { slug },
    select: { name: true, description: true, status: true },
  });
  if (!spot || spot.status !== "published") return {};
  return { title: spot.name, description: spot.description ?? undefined };
}

export default async function SpotPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const spot = await prisma.spot.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      description: true,
      category: true,
      status: true,
      address: true,
      lat: true,
      lng: true,
      openingHours: true,
      phone: true,
      website: true,
      bookingUrl: true,
      mapUrl: true,
      priceRange: true,
      bestTime: true,
      bestTimeNote: true,
      ticketFree: true,
      ticketTiers: true,
      ticketInfo: true,
      notice: true,
      gettingThere: true,
      tips: true,
      highlights: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, body: true },
      },
      tags: true,
      provinceName: true,
      districtName: true,
      wardName: true,
      placeId: true,
      place: {
        select: {
          slug: true,
          name: true,
          // "Quanh đây" — các listing khác cùng điểm đến (lấy dư để sắp theo
          // khoảng cách rồi cắt còn vài mục).
          spots: {
            where: { ...pub, slug: { not: slug } },
            orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
            take: 12,
            select: {
              slug: true,
              name: true,
              description: true,
              category: true,
              tags: true,
              lat: true,
              lng: true,
              images: listingImages,
            },
          },
          eateries: {
            where: pub,
            orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
            take: 12,
            select: {
              slug: true,
              name: true,
              description: true,
              category: true,
              lat: true,
              lng: true,
              images: listingImages,
            },
          },
          accommodations: {
            where: pub,
            orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
            take: 12,
            select: {
              slug: true,
              name: true,
              description: true,
              category: true,
              lat: true,
              lng: true,
              images: listingImages,
            },
          },
        },
      },
      activityLinks: {
        where: { activity: pub },
        orderBy: { order: "asc" },
        select: {
          blurb: true,
          imageUrl: true,
          imageAlt: true,
          activity: {
            select: {
              slug: true,
              name: true,
              description: true,
              category: true,
              kind: true,
              durationText: true,
              seasonText: true,
              ticketFree: true,
              ticketTiers: true,
              images: { where: { isCover: true }, take: 1, select: { url: true, isCover: true } },
            },
          },
        },
      },
      images: {
        orderBy: [{ isCover: "desc" }, { order: "asc" }],
        select: { id: true, url: true, alt: true, isCover: true },
      },
    },
  });

  const staff = await isStaffViewer();
  if (!spot || (spot.status !== "published" && !staff)) notFound();

  // Check-in "đã đến" + Vivu-er đã đến + đánh giá (giống trang điểm đến).
  const session = await auth();
  const userId = session?.user?.id;
  const [checkInRow, visitors, reviewRows, myReviewRow] = await Promise.all([
    userId
      ? prisma.checkIn.findUnique({
          where: { userId_spotId: { userId, spotId: spot.id } },
          select: { id: true },
        })
      : Promise.resolve(null),
    getVisitors("spot", spot.id),
    prisma.review.findMany({
      where: {
        spotId: spot.id,
        isHidden: false,
        author: { checkIns: { some: { spotId: spot.id } } },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        stance: true,
        highlights: true,
        caveats: true,
        content: true,
        createdAt: true,
        author: { select: { id: true, name: true, image: true } },
      },
    }),
    userId
      ? prisma.review.findUnique({
          where: { spotId_authorId: { spotId: spot.id, authorId: userId } },
          select: {
            stance: true,
            highlights: true,
            caveats: true,
            content: true,
          },
        })
      : Promise.resolve(null),
  ]);
  const checkIn = { checked: !!checkInRow, isAuthed: !!userId };
  const reviewSummary = summarizeReviews(reviewRows);
  const reviewItems: ReviewListItem[] = reviewRows.map((r) => ({
    id: r.id,
    author: r.author,
    stance: r.stance,
    highlights: r.highlights,
    caveats: r.caveats,
    content: r.content,
    createdAt: r.createdAt.toISOString(),
    isMine: r.author.id === userId,
  }));

  const spotPeers = await getListingPeers("spot", spot.placeId);

  // Bài viết chi tiết: post (đã xuất bản) nổi bật/mới nhất gắn với địa điểm này.
  const introPost = await prisma.post.findFirst({
    where: { status: "published", refs: { some: { spotId: spot.id } } },
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    select: {
      slug: true,
      title: true,
      images: { where: { isCover: true }, take: 1, select: { url: true, isCover: true } },
    },
  });

  // Ảnh cho stack hero (như trang chi tiết điểm đến).
  const heroImages: HeroImage[] = spot.images.map((i) => ({
    url: i.url,
    alt: i.alt,
    caption: null,
  }));
  if (heroImages.length === 0) {
    heroImages.push({ url: coverUrl([], spot.slug, 1200, 800), alt: spot.name });
  }
  const tiers = parseTicketTiers(spot.ticketTiers);

  // Fact nhanh hiển thị trên thanh nổi dưới hero (không gồm địa chỉ — để cạnh bản đồ).
  // Giá ưu tiên vé thật (ticketFree/ticketTiers), fallback thang priceRange cũ.
  const quickFacts = [
    {
      icon: Ticket,
      label: "Mức giá",
      value:
        ticketPriceLabel(spot.ticketFree, spot.ticketTiers) ??
        label(PRICE_LABELS, spot.priceRange),
      muted: false,
    },
  ].filter((f) => f.value);

  const hasMap = spot.lat != null && spot.lng != null;
  const categoryLabel = label(SPOT_CATEGORY_LABELS, spot.category);

  // Địa chỉ hành chính đầy đủ (phường → quận → tỉnh) — phụ trợ cho `address`.
  const adminAddress = [spot.wardName, spot.districtName, spot.provinceName]
    .filter(Boolean)
    .join(", ");
  // Một điểm duy nhất cho CẢ iframe lẫn nút "Chỉ đường" để chúng luôn khớp:
  // ưu tiên toạ độ trích thẳng từ mapUrl (điểm Google thật), rồi mới tới lat/lng.
  const mapPoint =
    (spot.mapUrl ? parseLatLng(spot.mapUrl) : null) ??
    (hasMap ? { lat: spot.lat!, lng: spot.lng! } : null);
  // Nhúng Google Maps theo mapPoint (zoom lấy theo link mapUrl nếu có).
  const mapEmbedSrc = mapPoint
    ? googleEmbedSrc(
        mapPoint.lat,
        mapPoint.lng,
        (spot.mapUrl && parseZoom(spot.mapUrl)) || 12,
      )
    : null;

  // "Quanh đây": (1) lọc thô top 8 bằng chim bay, (2) gọi routing 1 lần lấy km
  // đường đi cho mọi ứng viên, (3) sắp lại theo đường đi & cắt còn 6.
  const origin = { lat: spot.lat, lng: spot.lng };
  const preSpots = withDistance(spot.place.spots, origin, 8);
  const preEateries = withDistance(spot.place.eateries, origin, 8);
  const preAcc = withDistance(spot.place.accommodations, origin, 8);

  let driving: Record<string, Ride> = {};
  if (origin.lat != null && origin.lng != null) {
    const pts = uniqueCoords([...preSpots, ...preEateries, ...preAcc]);
    if (pts.length > 0) {
      driving = await getDrivingDistances(
        { lat: origin.lat, lng: origin.lng },
        pts,
      );
    }
  }

  const nearbySpots = rankNearby(preSpots, driving, 6);
  const nearbyEateries = rankNearby(preEateries, driving, 6);
  const accommodations = rankNearby(preAcc, driving, 6);
  const hasNearby =
    nearbySpots.length > 0 ||
    nearbyEateries.length > 0 ||
    accommodations.length > 0;

  // Mục cho thanh điều hướng dính (chỉ liệt kê mục có dữ liệu, theo đúng thứ tự trang).
  const navItems: SectionItem[] = [
    (spot.description || introPost) && { id: "gioi-thieu", label: "Giới thiệu" },
    spot.highlights.length > 0 && { id: "diem-nhan", label: "Điểm nhấn" },
    spot.activityLinks.length > 0 && { id: "hoat-dong", label: "Làm gì ở đây" },
    (spot.tips.length > 0 || spot.notice) && {
      id: "kinh-nghiem",
      label: "Kinh nghiệm",
    },
    spot.bestTimeNote && { id: "khi-nao", label: "Khi nào đẹp" },
    spot.gettingThere && { id: "cach-den", label: "Cách đến" },
    hasNearby && { id: "quanh-day", label: "Quanh đây" },
    { id: "danh-gia", label: "Đánh giá" },
  ].filter((x): x is SectionItem => Boolean(x));

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <ListingViewTracker type="spot" id={spot.id} />

      <main className="flex-1">
        {/* Hero — dùng chung mô-típ nền ambient của trang chi tiết điểm đến */}
        <HeroFrame images={heroImages.map((i) => i.url)}>
          <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pb-6 sm:pt-5">
            <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
              {/* Trái: chữ */}
              <div>
                {/* Quay lại + đánh dấu đã đến */}
                <div className="mb-5 flex items-center justify-between gap-3">
                  <Link
                    href={`/diem-den/${spot.place.slug}/dia-diem`}
                    className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ChevronLeft
                      className="size-4 transition-transform group-hover:-translate-x-0.5"
                      aria-hidden
                    />
                    Địa điểm tại {spot.place.name}
                  </Link>
                  <div className="flex items-center gap-2">
                    <CheckInButton
                      targetKind="spot"
                      targetId={spot.id}
                      targetName={spot.name}
                      targetImage={coverUrl(spot.images, spot.slug, 96, 96)}
                      redirectTo={`/dia-diem/${spot.slug}`}
                      initialChecked={checkIn.checked}
                      isAuthed={checkIn.isAuthed}
                    />
                    <ShareButton title={spot.name} iconOnly />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                  {categoryLabel && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                      {categoryLabel}
                    </span>
                  )}
                  <Link
                    href={`/diem-den/${spot.place.slug}`}
                    className="inline-flex items-center gap-1.5 text-primary transition-colors hover:text-primary/80"
                  >
                    <MapPin className="size-4" aria-hidden />
                    {spot.place.name}
                  </Link>
                </div>

                <h1 className="mt-4 text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
                  {spot.name}
                </h1>
                {spot.tagline && (
                  <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted-foreground">
                    {spot.tagline}
                  </p>
                )}
                {/* Fact nhanh */}
                {quickFacts.length > 0 && (
                  <dl className="mt-6 flex flex-wrap gap-x-7 gap-y-4 text-sm">
                    {quickFacts.map((f) => (
                      <div key={f.label} className="flex items-center gap-2.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                          <f.icon className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <dd
                            className={
                              f.muted
                                ? "font-medium text-muted-foreground"
                                : "font-semibold"
                            }
                          >
                            {f.value}
                          </dd>
                          <dt className="text-xs text-muted-foreground">
                            {f.label}
                          </dt>
                        </div>
                      </div>
                    ))}
                  </dl>
                )}

                {/* Vivu-er đã đến + tổng quan đánh giá */}
                {(visitors.total > 0 || reviewSummary.total > 0) && (
                  <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm">
                    {visitors.total > 0 && (
                      <CheckInFaces
                        people={visitors.people}
                        total={visitors.total}
                      />
                    )}
                    {reviewSummary.total > 0 && (
                      <a
                        href="#danh-gia"
                        className="group inline-flex items-center gap-1.5"
                      >
                        <Star
                          className="size-4 shrink-0 fill-warm text-warm"
                          aria-hidden
                        />
                        <span className="font-semibold tabular-nums">
                          {reviewSummary.stars.toFixed(1).replace(".", ",")}
                        </span>
                        <span className="text-muted-foreground transition-colors group-hover:text-foreground">
                          · {reviewSummary.total} đánh giá
                        </span>
                        <ChevronDown
                          className="size-4 text-muted-foreground transition-transform group-hover:translate-y-0.5"
                          aria-hidden
                        />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Phải: chồng ảnh */}
              <div className="relative z-[45]">
                <PlaceHeroStack images={heroImages} />
              </div>
            </div>
          </div>
        </HeroFrame>

        <SpotSectionNav items={navItems} />

        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_288px] lg:gap-12">
            <div className="min-w-0 space-y-14">
              {/* Giới thiệu — mô tả ngắn + bài giới thiệu (như trang điểm đến) */}
              {(spot.description || introPost) && (
                <section id="gioi-thieu" className="scroll-mt-32">
                  {spot.description && (
                    <p className="max-w-3xl whitespace-pre-line text-lg leading-8 text-foreground/90">
                      {spot.description}
                    </p>
                  )}
                  {introPost && (
                    <Link
                      href={`/blog/${introPost.slug}`}
                      className="group mt-6 inline-flex items-center gap-3 rounded-xl border border-border/60 bg-card p-2 pr-4 text-sm transition-colors hover:border-primary/40 hover:bg-muted/40"
                    >
                      <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={coverUrl(introPost.images, introPost.slug, 96, 96)}
                          alt=""
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs text-muted-foreground">
                          Bài giới thiệu
                        </span>
                        <span className="block truncate font-medium">
                          {introPost.title}
                        </span>
                      </span>
                      <ChevronRight
                        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                        aria-hidden
                      />
                    </Link>
                  )}
                </section>
              )}

              {/* Điểm nhấn — danh sách đánh số kiểu biên tập, ảnh lớn khi có */}
              {spot.highlights.length > 0 && (
                <section id="diem-nhan" className="scroll-mt-32">
                  <h2 className="mb-6 text-xl font-bold tracking-tight sm:text-2xl">
                    Điểm nhấn
                  </h2>
                  <div className="divide-y divide-border/60">
                    {spot.highlights.map((h, i) => (
                      <article
                        key={h.id}
                        className="flex gap-4 py-7 first:pt-0 last:pb-0 sm:gap-6"
                      >
                        <span
                          aria-hidden
                          className="mt-0.5 shrink-0 text-2xl font-bold leading-none tabular-nums text-primary/30 sm:text-3xl"
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-semibold tracking-tight sm:text-xl">
                            {h.title}
                          </h3>
                          {h.body && (
                            <div
                              className={cn(proseClass, "mt-2")}
                              dangerouslySetInnerHTML={{ __html: h.body }}
                            />
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {/* Làm gì ở đây — render nội dung RIÊNG theo spot (blurb/ảnh trên join) */}
              {spot.activityLinks.length > 0 && (
                <section id="hoat-dong" className="scroll-mt-32">
                  <div className="mb-6 flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Sparkles className="size-5" aria-hidden />
                    </span>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                        Làm gì ở đây
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {spot.activityLinks.length} hoạt động tại địa điểm này
                      </p>
                    </div>
                  </div>
                  <div className="space-y-7">
                    {spot.activityLinks.map((link) => {
                      const a = link.activity;
                      const meta = [
                        a.durationText,
                        a.seasonText,
                        ticketPriceLabel(a.ticketFree, a.ticketTiers),
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      // ưu tiên nội dung riêng cho spot (blurb/ảnh), fallback về activity
                      const body = link.blurb || a.description;
                      const img =
                        link.imageUrl || coverUrl(a.images, a.slug, 320, 240);
                      return (
                        <article
                          key={a.slug}
                          className="group flex gap-4 sm:gap-5"
                        >
                          <Link
                            href={`/hoat-dong/${a.slug}`}
                            className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl bg-muted sm:w-40"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img}
                              alt={link.imageAlt ?? a.name}
                              loading="lazy"
                              className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </Link>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-semibold leading-snug tracking-tight">
                              <Link
                                href={`/hoat-dong/${a.slug}`}
                                className="transition-colors hover:text-primary"
                              >
                                {a.name}
                              </Link>
                            </h3>
                            {meta && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {meta}
                              </p>
                            )}
                            {body && (
                              <p className="mt-2 leading-relaxed text-foreground/80">
                                {body}
                              </p>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Kinh nghiệm / mẹo */}
              {(spot.tips.length > 0 || spot.notice) && (
                <section id="kinh-nghiem" className="scroll-mt-32">
                  <h2 className="mb-4 text-xl font-bold tracking-tight sm:text-2xl">
                    Kinh nghiệm &amp; mẹo
                  </h2>
                  {spot.notice && (
                    <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-warm/40 bg-warm/[0.06] px-4 py-3 text-sm">
                      <TriangleAlert
                        className="mt-0.5 size-4 shrink-0 text-warm"
                        aria-hidden
                      />
                      <span>
                        <span className="font-medium text-warm">Lưu ý: </span>
                        {spot.notice}
                      </span>
                    </div>
                  )}
                  {spot.tips.length > 0 && (
                    <ul className="space-y-2.5">
                      {spot.tips.map((t, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                            <Check className="size-3.5" aria-hidden />
                          </span>
                          <span className="leading-relaxed text-foreground/85">
                            {t}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              {/* Khi nào đẹp nhất */}
              {spot.bestTimeNote && (
                <section id="khi-nao" className="scroll-mt-32">
                  <h2 className="mb-4 text-xl font-bold tracking-tight sm:text-2xl">
                    Khi nào đẹp nhất?
                  </h2>
                  {/* bestTime (giá trị ngắn) đã hiện ở card sidebar — ở đây chỉ diễn giải */}
                  <p className="max-w-3xl whitespace-pre-line leading-relaxed text-foreground/85">
                    {spot.bestTimeNote}
                  </p>
                </section>
              )}

              {/* Cách đến */}
              {spot.gettingThere && (
                <section id="cach-den" className="scroll-mt-32">
                  <h2 className="mb-4 text-xl font-bold tracking-tight sm:text-2xl">
                    Cách đến
                  </h2>
                  <p className="max-w-3xl whitespace-pre-line leading-relaxed text-foreground/85">
                    {spot.gettingThere}
                  </p>
                </section>
              )}

            </div>

            {/* Sidebar — card nổi, dính khi cuộn */}
            <aside className="space-y-6 lg:sticky lg:top-32 lg:self-start">
              {/* Thông tin tham quan — giờ / thời điểm + cuống vé + liên hệ */}
              <VisitCardD
                openingHours={spot.openingHours}
                bestTime={spot.bestTime}
                ticketFree={spot.ticketFree}
                tiers={tiers}
                ticketInfo={spot.ticketInfo}
                bookingUrl={spot.bookingUrl}
                phone={spot.phone}
                website={spot.website}
              />

              {/* Vị trí — bản đồ dẫn dắt (click vào map để mở Google Maps) */}
              {(mapEmbedSrc || spot.address || adminAddress) && (
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                  {mapEmbedSrc && (
                    <iframe
                      title={`Bản đồ ${spot.name}`}
                      className="aspect-[16/10] w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={mapEmbedSrc}
                    />
                  )}
                  {(spot.address || adminAddress) && (
                    <div className="flex gap-2.5 p-4">
                      <MapPin
                        className="mt-0.5 size-4 shrink-0 text-primary"
                        aria-hidden
                      />
                      <div className="min-w-0 text-sm">
                        <p className="font-medium leading-snug">
                          {spot.address || adminAddress}
                        </p>
                        {spot.address && adminAddress && (
                          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                            {adminAddress}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {spot.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {spot.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </aside>
          </div>

          {/* Khám phá quanh đây (full-width) */}
          {hasNearby && (
            <div
              id="quanh-day"
              className="mt-16 scroll-mt-32 space-y-14 border-t border-border/60 pt-14"
            >
              {nearbySpots.length > 0 && (
                <section>
                  <SectionHead
                    eyebrow="Lân cận"
                    title="Địa điểm gần đây"
                    href={`/diem-den/${spot.place.slug}/dia-diem`}
                  />
                  <Rail itemClassName="basis-1/2 sm:basis-1/3 lg:basis-1/4">
                    {nearbySpots.map((s) => (
                      <ListingCard
                        key={s.slug}
                        href={`/dia-diem/${s.slug}`}
                        name={s.name}
                        slug={s.slug}
                        images={s.images}
                        subtitle={s.description}
                        tag={s.category ? label(SPOT_CATEGORY_LABELS, s.category) : null}
                        meta={[rideLabel(s), s.tags[0]].filter(
                          (x): x is string => Boolean(x),
                        )}
                      />
                    ))}
                  </Rail>
                </section>
              )}

              {nearbyEateries.length > 0 && (
                <section>
                  <SectionHead
                    eyebrow="Ăn uống"
                    title="Quán ăn gần đây"
                    href={`/diem-den/${spot.place.slug}/am-thuc`}
                  />
                  <Rail itemClassName="basis-1/2 sm:basis-1/3 lg:basis-1/4">
                    {nearbyEateries.map((e) => (
                      <ListingCard
                        key={e.slug}
                        href={`/diem-den/${spot.place.slug}/am-thuc#eatery-${e.slug}`}
                        name={e.name}
                        slug={e.slug}
                        images={e.images}
                        subtitle={e.description}
                        tag={e.category ? label(EATERY_CATEGORY_LABELS, e.category) : null}
                        meta={[rideLabel(e)].filter(
                          (x): x is string => Boolean(x),
                        )}
                      />
                    ))}
                  </Rail>
                </section>
              )}

              {accommodations.length > 0 && (
                <section>
                  <SectionHead
                    eyebrow="Lưu trú"
                    title="Chỗ nghỉ gần đây"
                    href={`/diem-den/${spot.place.slug}/luu-tru`}
                  />
                  <Rail itemClassName="basis-1/2 sm:basis-1/3 lg:basis-1/4">
                    {accommodations.map((ac) => (
                      <ListingCard
                        key={ac.slug}
                        href={`/luu-tru/${ac.slug}`}
                        name={ac.name}
                        slug={ac.slug}
                        images={ac.images}
                        subtitle={ac.description}
                        tag={ac.category ? label(ACCOMMODATION_CATEGORY_LABELS, ac.category) : null}
                        meta={[rideLabel(ac)].filter(
                          (x): x is string => Boolean(x),
                        )}
                      />
                    ))}
                  </Rail>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Đánh giá của Vivu-er cho địa điểm này */}
        <div className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 sm:pb-20">
          <ReviewsSection
            target={{
              kind: "spot",
              id: spot.id,
              slug: spot.slug,
              name: spot.name,
              image: coverUrl(spot.images, spot.slug, 96, 96),
            }}
            summary={reviewSummary}
            reviews={reviewItems}
            myReview={myReviewRow}
            isAuthed={checkIn.isAuthed}
          />
        </div>

        <RelatedPosts type="spot" id={spot.id} />
      </main>

      <SiteFooter />
      <PeerBar
        groups={[{ items: spotPeers }]}
        currentSlug={spot.slug}
        prefix="dia-diem"
        title="Địa điểm khác"
      />
    </div>
  );
}

/* ── Tiêu đề section nội dung (eyebrow + tiêu đề đậm + link tùy chọn) ── */
function SectionHead({
  eyebrow,
  title,
  href,
}: {
  eyebrow: string;
  title: string;
  href?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
          <span className="h-px w-6 bg-primary/40" aria-hidden />
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
        >
          Xem tất cả
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Card "Thông tin tham quan" — kiểu cuống vé (ticket stub): nửa trên là
   giờ mở cửa / thời điểm đẹp, đường xé nét đứt, cuống dưới là vé + đặt chỗ.
   ────────────────────────────────────────────────────────────────── */
type VisitProps = {
  openingHours: string | null;
  bestTime: string | null;
  ticketFree: boolean;
  tiers: TicketTier[];
  ticketInfo: string | null;
  bookingUrl: string | null;
  phone: string | null;
  website: string | null;
};

/* Hàng liên hệ (gọi / website) — dùng trong card thông tin tham quan */
function ContactRows({
  phone,
  website,
}: {
  phone: string | null;
  website: string | null;
}) {
  if (!phone && !website) return null;
  const webLabel = website
    ?.replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
  return (
    <div className="border-t border-border/60 p-2 text-sm">
      {phone && (
        <a
          href={`tel:${phone.replace(/\s+/g, "")}`}
          className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 font-medium transition-colors hover:bg-muted/60 hover:text-primary"
        >
          <Phone
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          {phone}
        </a>
      )}
      {website && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-lg px-2 py-2.5 font-medium transition-colors hover:bg-muted/60 hover:text-primary"
        >
          <Globe
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <span className="truncate">{webLabel}</span>
        </a>
      )}
    </div>
  );
}

function BookButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex w-full items-center justify-center rounded-full bg-warm px-4 py-2.5 text-sm font-semibold text-warm-foreground transition-colors hover:bg-warm/90"
    >
      Đặt chỗ
    </a>
  );
}

function TierList({
  tiers,
  accent = true,
}: {
  tiers: TicketTier[];
  accent?: boolean;
}) {
  return (
    <dl className="space-y-1.5 text-sm">
      {tiers.map((t, i) => (
        <div key={i} className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">
            {t.label}
            {t.note && <span className="ml-1 text-xs">({t.note})</span>}
          </dt>
          <dd
            className={cn(
              "font-semibold tabular-nums",
              accent && "text-primary",
            )}
          >
            {tierPriceLabel(t)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function VisitCardD({
  openingHours,
  bestTime,
  ticketFree,
  tiers,
  ticketInfo,
  bookingUrl,
  phone,
  website,
}: VisitProps) {
  const hasTicket = ticketFree || tiers.length > 0 || !!ticketInfo;
  const hasStub = hasTicket || !!bookingUrl;
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div className="space-y-3 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="shrink-0 text-sm text-muted-foreground">
            Mở cửa
          </span>
          <span
            className={cn(
              "text-right text-sm font-semibold",
              !openingHours && "font-medium text-muted-foreground",
            )}
          >
            {openingHours || "Tự do, cả ngày"}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="shrink-0 text-sm text-muted-foreground">
            Thời điểm đẹp
          </span>
          <span
            className={cn(
              "text-right text-sm font-semibold",
              !bestTime && "font-medium text-muted-foreground",
            )}
          >
            {bestTime || "Quanh năm"}
          </span>
        </div>
      </div>
      {hasStub && (
        <>
          {/* đường xé vé */}
          <div className="relative h-4">
            <span
              aria-hidden
              className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-background"
            />
            <span
              aria-hidden
              className="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-background"
            />
            <div className="absolute inset-x-4 top-1/2 border-t border-dashed border-border" />
          </div>
          <div className="p-5 pt-1">
            {ticketFree ? (
              <p className="text-lg font-bold tracking-tight text-primary">
                Miễn phí
              </p>
            ) : tiers.length > 0 ? (
              <TierList tiers={tiers} />
            ) : null}
            {ticketInfo && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {ticketInfo}
              </p>
            )}
            {bookingUrl && (
              <div className="mt-4">
                <BookButton href={bookingUrl} />
              </div>
            )}
          </div>
        </>
      )}
      <ContactRows phone={phone} website={website} />
    </div>
  );
}

