import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  MapPin,
  Clock,
  Ticket,
  CalendarDays,
  TriangleAlert,
  ExternalLink,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { coverUrl } from "@/lib/place-image";
import { parseTicketTiers, tierPriceLabel } from "@/lib/tickets";
import {
  SPOT_CATEGORY_LABELS,
  ACTIVITY_CATEGORY_LABELS,
  PRICE_LABELS,
  label,
} from "@/lib/listing-labels";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { RelatedPosts } from "@/components/site/related-posts";
import { ListingViewTracker } from "@/components/site/listing-view-tracker";
import { isStaffViewer } from "@/lib/preview";
import { CrossLinkCard } from "@/components/site/cross-link-card";

const pub = { status: "published" as const };

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
      category: true,
      status: true,
      address: true,
      lat: true,
      lng: true,
      openingHours: true,
      website: true,
      bookingUrl: true,
      priceRange: true,
      bestTime: true,
      ticketFree: true,
      ticketTiers: true,
      ticketInfo: true,
      notice: true,
      tags: true,
      place: { select: { slug: true, name: true } },
      activities: {
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
        select: {
          slug: true,
          name: true,
          category: true,
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

  const heroUrl = coverUrl(spot.images, spot.slug, 1800, 1000);
  const gallery = spot.images.filter((i) => i.url !== heroUrl);
  const tiers = parseTicketTiers(spot.ticketTiers);

  // Fact nhanh hiển thị trên thanh nổi dưới hero (không gồm địa chỉ — để cạnh bản đồ).
  const quickFacts = [
    { icon: Clock, label: "Giờ mở cửa", value: spot.openingHours },
    { icon: CalendarDays, label: "Thời điểm đẹp", value: spot.bestTime },
    { icon: Ticket, label: "Mức giá", value: label(PRICE_LABELS, spot.priceRange) },
  ].filter((f) => f.value);

  const hasMap = spot.lat != null && spot.lng != null;
  const categoryLabel = label(SPOT_CATEGORY_LABELS, spot.category);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <ListingViewTracker type="spot" id={spot.id} />

      <main className="flex-1">
        {/* Hero — ảnh làm chủ trên dải nền xanh trời nhạt */}
        <section className="relative overflow-hidden bg-gradient-to-b from-accent/60 to-background">
          {/* Họa tiết vòng tròn đồng tâm + chấm cam (trang trí) */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-28 -z-0 size-[26rem] rounded-full border border-primary/10"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-12 -z-0 size-56 rounded-full border border-primary/10"
          />

          <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
            {/* Breadcrumb */}
            <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                Trang chủ
              </Link>
              <ChevronRight className="size-3.5" aria-hidden />
              <Link href="/diem-den" className="hover:text-foreground">
                Điểm đến
              </Link>
              <ChevronRight className="size-3.5" aria-hidden />
              <Link
                href={`/diem-den/${spot.place.slug}`}
                className="hover:text-foreground"
              >
                {spot.place.name}
              </Link>
              <ChevronRight className="size-3.5" aria-hidden />
              <span className="text-foreground">{spot.name}</span>
            </nav>

            {/* Tiêu đề */}
            <div className="mt-6 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                {categoryLabel && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {categoryLabel}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" aria-hidden />
                  {spot.place.name}
                </span>
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                {spot.name}
              </h1>
            </div>

            {/* Ảnh hero bo góc lớn */}
            <div className="relative mt-6 aspect-[16/10] overflow-hidden rounded-3xl bg-muted shadow-lg shadow-black/5 sm:aspect-[21/9]">
              <Image
                src={heroUrl}
                alt={spot.images[0]?.alt ?? spot.name}
                fill
                priority
                sizes="(min-width: 1152px) 1152px, 100vw"
                className="object-cover"
              />
              <span
                aria-hidden
                className="absolute right-5 top-5 size-3 rounded-full bg-warm shadow-sm"
              />
            </div>

            {/* Thanh fact nhanh — card nổi chồng lên mép ảnh */}
            {quickFacts.length > 0 && (
              <div className="relative z-10 mx-auto -mt-8 max-w-[calc(100%-2rem)] rounded-2xl border border-border/60 bg-card p-5 shadow-lg shadow-black/5 sm:-mt-10 sm:max-w-3xl">
                <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:divide-x sm:divide-border/60">
                  {quickFacts.map((f) => (
                    <div
                      key={f.label}
                      className="flex items-start gap-3 sm:px-2 sm:first:pl-0"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <f.icon className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <dt className="text-xs text-muted-foreground">
                          {f.label}
                        </dt>
                        <dd className="font-medium">{f.value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          {spot.notice && (
            <div className="mb-10 flex items-start gap-2 rounded-2xl border border-warm/40 bg-warm/5 px-4 py-3 text-sm">
              <TriangleAlert
                className="mt-0.5 size-4 shrink-0 text-warm"
                aria-hidden
              />
              <span>{spot.notice}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-12">
            <div className="space-y-12 lg:col-span-2">
              {/* Mô tả */}
              {spot.description && (
                <section>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Giới thiệu
                  </h2>
                  <p className="mt-4 whitespace-pre-line text-base leading-7 text-foreground/90">
                    {spot.description}
                  </p>
                </section>
              )}

              {/* Gallery */}
              {gallery.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Hình ảnh
                  </h2>
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {gallery.slice(0, 6).map((img) => (
                      <div
                        key={img.id}
                        className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted"
                      >
                        <Image
                          src={img.url}
                          alt={img.alt ?? spot.name}
                          fill
                          sizes="(min-width: 640px) 33vw, 50vw"
                          className="object-cover transition-transform duration-300 hover:scale-[1.04]"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Hoạt động tại đây */}
              {spot.activities.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Hoạt động ở đây
                  </h2>
                  <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {spot.activities.map((a) => (
                      <CrossLinkCard
                        key={a.slug}
                        href={`/hoat-dong/${a.slug}`}
                        name={a.name}
                        slug={a.slug}
                        images={a.images}
                        subtitle={label(ACTIVITY_CATEGORY_LABELS, a.category)}
                      />
                    ))}
                  </div>
                </section>
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
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <Ticket
                      className="size-4 text-muted-foreground"
                      aria-hidden
                    />
                    Vé vào cửa
                  </h2>
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
                      className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-warm px-4 py-2.5 text-sm font-medium text-warm-foreground transition-colors hover:bg-warm/90"
                    >
                      Đặt vé / đặt chỗ <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              )}

              {/* Bản đồ + địa chỉ */}
              {(hasMap || spot.address) && (
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg shadow-black/5">
                  {spot.address && (
                    <div className="flex items-start gap-2.5 px-5 pt-5 text-sm">
                      <MapPin
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <div>
                        <p className="text-xs text-muted-foreground">Địa chỉ</p>
                        <p>{spot.address}</p>
                      </div>
                    </div>
                  )}
                  {hasMap && (
                    <>
                      <iframe
                        title={`Bản đồ ${spot.name}`}
                        className="mt-4 aspect-square w-full"
                        loading="lazy"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${spot.lng! - 0.01}%2C${spot.lat! - 0.01}%2C${spot.lng! + 0.01}%2C${spot.lat! + 0.01}&layer=mapnik&marker=${spot.lat}%2C${spot.lng}`}
                      />
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${spot.lat}%2C${spot.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-5 py-3 text-sm font-medium text-primary hover:underline"
                      >
                        <MapPin className="size-3.5" /> Mở trên Google Maps
                      </a>
                    </>
                  )}
                  {!hasMap && spot.address && <div className="pb-5" />}
                </div>
              )}

              {spot.website && (
                <a
                  href={spot.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Website chính thức <ExternalLink className="size-3.5" />
                </a>
              )}

              {spot.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {spot.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </div>
        <RelatedPosts type="spot" id={spot.id} />
      </main>

      <SiteFooter />
    </div>
  );
}
