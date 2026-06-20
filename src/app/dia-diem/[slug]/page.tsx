import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Phone,
  Ticket,
  CalendarDays,
  TriangleAlert,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { coverUrl } from "@/lib/place-image";
import { proseClass } from "@/components/cms/rich-text-editor";
import {
  getDrivingDistances,
  coordKey,
  type LatLng,
  type Ride,
} from "@/lib/routing";
import { parseTicketTiers, tierPriceLabel, formatVnd } from "@/lib/tickets";
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
import { RelatedPosts } from "@/components/site/related-posts";
import { ListingViewTracker } from "@/components/site/listing-view-tracker";
import { isStaffViewer } from "@/lib/preview";
import { ListingCard } from "@/components/site/listing-card";
import { Rail } from "@/components/site/rail";
import { SpotSectionNav, type SectionItem } from "@/components/site/spot-section-nav";

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

// Độ khó nói theo lối tự nhiên (thay nhãn "Dễ/Vừa/Khó").
function difficultyPhrase(d: string | null): string | null {
  if (d === "easy") return "dễ đi";
  if (d === "moderate") return "vừa sức";
  if (d === "hard") return "cần thể lực";
  return null;
}

// Nhãn giá hoạt động từ ticketFree / ticketTiers (không dùng priceRange cũ).
function activityPrice(ticketFree: boolean, ticketTiers: unknown): string | null {
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

// Gắn km đường đi từ drivingMap, sắp gần→xa (ưu tiên đường đi, fallback chim
// bay), rồi cắt còn `take`.
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
      description: true,
      content: true,
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
      ticketFree: true,
      ticketTiers: true,
      ticketInfo: true,
      notice: true,
      tags: true,
      provinceName: true,
      districtName: true,
      wardName: true,
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
      activities: {
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
        select: {
          slug: true,
          name: true,
          description: true,
          category: true,
          durationText: true,
          difficulty: true,
          seasonText: true,
          ticketFree: true,
          ticketTiers: true,
          images: { where: { isCover: true }, take: 1, select: { url: true, isCover: true } },
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

  // Bài viết chi tiết: post (đã xuất bản) nổi bật/mới nhất gắn với địa điểm này.
  const introPost = await prisma.post.findFirst({
    where: { status: "published", refs: { some: { spotId: spot.id } } },
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    select: {
      slug: true,
      title: true,
      excerpt: true,
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
  // Giờ mở cửa luôn hiện: chưa nhập thì báo "Tự do, không giới hạn giờ" (mờ) để
  // khách biết đây là điểm tham quan mở, không phải thiếu thông tin.
  const quickFacts = [
    {
      icon: Clock,
      label: "Giờ mở cửa",
      value: spot.openingHours || "Tự do, không giới hạn giờ",
      muted: !spot.openingHours,
    },
    { icon: CalendarDays, label: "Thời điểm đẹp", value: spot.bestTime, muted: false },
    {
      icon: Ticket,
      label: "Mức giá",
      value: label(PRICE_LABELS, spot.priceRange),
      muted: false,
    },
  ].filter((f) => f.value);

  const hasMap = spot.lat != null && spot.lng != null;
  const categoryLabel = label(SPOT_CATEGORY_LABELS, spot.category);

  // Địa chỉ hành chính đầy đủ (phường → quận → tỉnh) — phụ trợ cho `address`.
  const adminAddress = [spot.wardName, spot.districtName, spot.provinceName]
    .filter(Boolean)
    .join(", ");
  // Link bản đồ ngoài: ưu tiên mapUrl biên tập nhập, sau đó toạ độ.
  const mapsHref =
    spot.mapUrl ||
    (hasMap
      ? `https://www.google.com/maps/search/?api=1&query=${spot.lat}%2C${spot.lng}`
      : null);

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

  // Mục cho thanh điều hướng dính (chỉ liệt kê mục có dữ liệu).
  const navItems: SectionItem[] = [
    spot.description && { id: "gioi-thieu", label: "Giới thiệu" },
    spot.activities.length > 0 && { id: "hoat-dong", label: "Hoạt động" },
    spot.content && { id: "chi-tiet", label: "Chi tiết" },
    hasNearby && { id: "quanh-day", label: "Quanh đây" },
  ].filter((x): x is SectionItem => Boolean(x));

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <ListingViewTracker type="spot" id={spot.id} />

      <main className="flex-1">
        {/* Hero — theo mô-típ trang chi tiết điểm đến */}
        <section className="relative bg-gradient-to-b from-primary/[0.07] via-accent/50 to-background">
          {/* Họa tiết nền */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(var(--border) 1.2px, transparent 1.2px)",
                backgroundSize: "22px 22px",
                maskImage:
                  "radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 100%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 100%)",
              }}
            />
            <div className="absolute -right-32 -top-28 size-[34rem] rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -left-28 top-24 size-[26rem] rounded-full bg-warm/[0.08] blur-3xl" />
          </div>

          <div className="mx-auto max-w-7xl px-4 pb-6 pt-6 sm:px-6 sm:pb-5 sm:pt-5">
            <div className="grid items-center gap-7 lg:grid-cols-[1fr_400px] lg:gap-10">
              {/* Trái: chữ */}
              <div>
                {/* Quay lại danh sách địa điểm của điểm đến */}
                <Link
                  href={`/diem-den/${spot.place.slug}/dia-diem`}
                  className="group mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ChevronLeft
                    className="size-4 transition-transform group-hover:-translate-x-0.5"
                    aria-hidden
                  />
                  Địa điểm tại {spot.place.name}
                </Link>

                <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
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

                <h1 className="mt-3 text-balance text-3xl font-bold leading-[1.08] tracking-tight sm:text-4xl lg:text-5xl">
                  {spot.name}
                </h1>
                {/* Gạch nguệch ngoạc trang trí */}
                <svg
                  aria-hidden
                  viewBox="0 0 200 14"
                  preserveAspectRatio="none"
                  fill="none"
                  className="mt-3 h-2.5 w-36 text-warm/70"
                >
                  <path
                    d="M3 9 C 34 2 56 2 84 8 S 150 13 197 5"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
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
              </div>

              {/* Phải: chồng ảnh */}
              <div className="relative z-[45]">
                <PlaceHeroStack images={heroImages} />
              </div>
            </div>
          </div>
        </section>

        <SpotSectionNav items={navItems} />

        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-12">
            <div className="min-w-0 space-y-14 lg:col-span-2">
              {/* Giới thiệu — mô tả ngắn (không tiêu đề) */}
              {spot.description && (
                <section id="gioi-thieu" className="scroll-mt-32">
                  <p className="whitespace-pre-line text-lg leading-8 text-foreground/90">
                    {spot.description}
                  </p>
                </section>
              )}

              {/* Hoạt động tại đây */}
              {spot.activities.length > 0 && (
                <section id="hoat-dong" className="scroll-mt-32">
                  <div className="mb-6 flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Sparkles className="size-5" aria-hidden />
                    </span>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                        Hoạt động ở đây
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {spot.activities.length} trải nghiệm tại địa điểm này
                      </p>
                    </div>
                  </div>
                  <div className="space-y-7">
                    {spot.activities.map((a) => {
                      const meta = [
                        a.durationText,
                        difficultyPhrase(a.difficulty),
                        a.seasonText,
                        activityPrice(a.ticketFree, a.ticketTiers),
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <article
                          key={a.slug}
                          className="group flex gap-4 sm:gap-5"
                        >
                          <Link
                            href={`/hoat-dong/${a.slug}`}
                            className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl bg-muted sm:w-40"
                          >
                            <Image
                              src={coverUrl(a.images, a.slug, 320, 240)}
                              alt={a.name}
                              fill
                              sizes="160px"
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
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
                            {a.description && (
                              <p className="mt-2 leading-relaxed text-foreground/80">
                                {a.description}
                              </p>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Nội dung chi tiết (rich text, không tiêu đề) */}
              {spot.content && (
                <section id="chi-tiet" className="scroll-mt-32">
                  <div
                    className={proseClass}
                    dangerouslySetInnerHTML={{ __html: spot.content }}
                  />
                </section>
              )}

              {/* Bài viết chi tiết liên kết (link ra blog, không nhúng) */}
              {introPost && (
                <Link
                  href={`/blog/${introPost.slug}`}
                  className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-3 pr-5 shadow-sm shadow-black/5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-black/5"
                >
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                    <Image
                      src={coverUrl(introPost.images, introPost.slug, 128, 128)}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                      Bài viết chi tiết
                    </span>
                    <span className="mt-0.5 block truncate font-semibold tracking-tight">
                      {introPost.title}
                    </span>
                    {introPost.excerpt && (
                      <span className="mt-0.5 line-clamp-1 block text-sm text-muted-foreground">
                        {introPost.excerpt}
                      </span>
                    )}
                  </span>
                  <ChevronRight
                    className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden
                  />
                </Link>
              )}
            </div>

            {/* Sidebar — card nổi, dính khi cuộn */}
            <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              {/* Vé vào cửa + đặt chỗ */}
              {(spot.ticketFree ||
                tiers.length > 0 ||
                spot.ticketInfo ||
                spot.bookingUrl) && (
                <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-lg shadow-black/5">
                  <CardHead icon={Ticket} title="Vé vào cửa" />
                  {spot.ticketFree ? (
                    <p className="mt-4 text-base font-semibold text-primary">
                      Miễn phí
                    </p>
                  ) : tiers.length > 0 ? (
                    <dl className="mt-4 space-y-2.5 text-sm">
                      {tiers.map((t, i) => (
                        <div
                          key={i}
                          className="flex items-baseline justify-between gap-3"
                        >
                          <dt className="text-muted-foreground">
                            {t.label}
                            {t.note && (
                              <span className="ml-1 text-xs">({t.note})</span>
                            )}
                          </dt>
                          <dd className="text-right font-semibold tabular-nums text-primary">
                            {tierPriceLabel(t)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {spot.ticketInfo && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {spot.ticketInfo}
                    </p>
                  )}
                  {spot.bookingUrl && (
                    <a
                      href={spot.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-warm px-4 py-2.5 text-sm font-semibold text-warm-foreground transition-colors hover:bg-warm/90"
                    >
                      Đặt chỗ
                    </a>
                  )}
                </div>
              )}

              {/* Bản đồ + địa chỉ */}
              {(hasMap || spot.address || adminAddress) && (
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg shadow-black/5">
                  <div className="px-5 pt-5">
                    <CardHead icon={MapPin} title="Vị trí" />
                  </div>
                  {(spot.address || adminAddress) && (
                    <div className="px-5 pt-4 text-sm">
                      <p className="text-xs text-muted-foreground">Địa chỉ</p>
                      <p className="mt-0.5">{spot.address || adminAddress}</p>
                      {spot.address && adminAddress && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {adminAddress}
                        </p>
                      )}
                    </div>
                  )}
                  {hasMap && (
                    <iframe
                      title={`Bản đồ ${spot.name}`}
                      className="mt-4 aspect-square w-full"
                      loading="lazy"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${spot.lng! - 0.01}%2C${spot.lat! - 0.01}%2C${spot.lng! + 0.01}%2C${spot.lat! + 0.01}&layer=mapnik&marker=${spot.lat}%2C${spot.lng}`}
                    />
                  )}
                  {mapsHref && (
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-5 py-3 text-sm font-medium text-primary hover:underline"
                    >
                      <MapPin className="size-3.5" /> Mở trên Google Maps
                    </a>
                  )}
                  {!hasMap && !mapsHref && (spot.address || adminAddress) && (
                    <div className="pb-5" />
                  )}
                </div>
              )}

              {/* Liên hệ */}
              {(spot.phone || spot.website) && (
                <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-lg shadow-black/5">
                  <CardHead icon={Phone} title="Liên hệ" />
                  <div className="mt-4 space-y-2.5 text-sm">
                    {spot.phone && (
                      <a
                        href={`tel:${spot.phone.replace(/\s+/g, "")}`}
                        className="flex items-center gap-2.5 font-medium text-primary hover:underline"
                      >
                        <Phone className="size-4 shrink-0" aria-hidden />
                        {spot.phone}
                      </a>
                    )}
                    {spot.website && (
                      <a
                        href={spot.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 font-medium text-primary hover:underline"
                      >
                        <ExternalLink className="size-4 shrink-0" aria-hidden />
                        Website chính thức
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Lưu ý — nhẹ, ít nổi bật, đặt cuối sidebar */}
              {spot.notice && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  <TriangleAlert
                    className="mt-0.5 size-4 shrink-0 text-warm"
                    aria-hidden
                  />
                  <span>
                    <span className="font-medium text-foreground">Lưu ý: </span>
                    {spot.notice}
                  </span>
                </div>
              )}

              {spot.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {spot.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm shadow-black/5"
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
            <div className="mt-16 space-y-14 border-t border-border/60 pt-14">
              {hasNearby && (
                <div id="quanh-day" className="scroll-mt-32 space-y-14">
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
                    href={`/diem-den/${spot.place.slug}/quan-an`}
                  />
                  <Rail itemClassName="basis-1/2 sm:basis-1/3 lg:basis-1/4">
                    {nearbyEateries.map((e) => (
                      <ListingCard
                        key={e.slug}
                        href={`/quan-an/${e.slug}`}
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
          )}
        </div>
        <RelatedPosts type="spot" id={spot.id} />
      </main>

      <SiteFooter />
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

/* ── Tiêu đề card sidebar (icon trong ô bo góc + nhãn) ────────────── */
function CardHead({
  icon: Icon,
  title,
}: {
  icon: typeof Ticket;
  title: string;
}) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-semibold">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" aria-hidden />
      </span>
      {title}
    </h2>
  );
}
