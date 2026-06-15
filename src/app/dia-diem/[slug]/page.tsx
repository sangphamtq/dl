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
  const facts = [
    { icon: Clock, label: "Giờ mở cửa", value: spot.openingHours },
    { icon: CalendarDays, label: "Thời điểm đẹp", value: spot.bestTime },
    { icon: Ticket, label: "Mức giá", value: label(PRICE_LABELS, spot.priceRange) },
    { icon: MapPin, label: "Địa chỉ", value: spot.address },
  ].filter((f) => f.value);

  const hasMap = spot.lat != null && spot.lng != null;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <ListingViewTracker type="spot" id={spot.id} />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative h-[340px] w-full sm:h-[420px]">
          <Image
            src={heroUrl}
            alt={spot.images[0]?.alt ?? spot.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
          <div className="absolute inset-0">
            <div className="mx-auto flex h-full max-w-5xl flex-col justify-end px-4 pb-10 text-white sm:px-6 sm:pb-12">
              <nav className="flex flex-wrap items-center gap-1 text-sm text-white/80">
                <Link href="/" className="hover:text-white">
                  Trang chủ
                </Link>
                <ChevronRight className="size-3.5" aria-hidden />
                <Link href="/diem-den" className="hover:text-white">
                  Điểm đến
                </Link>
                <ChevronRight className="size-3.5" aria-hidden />
                <Link
                  href={`/diem-den/${spot.place.slug}`}
                  className="hover:text-white"
                >
                  {spot.place.name}
                </Link>
                <ChevronRight className="size-3.5" aria-hidden />
                <span className="text-white">{spot.name}</span>
              </nav>
              {spot.category && (
                <p className="mt-4 text-sm font-medium text-white/80">
                  {label(SPOT_CATEGORY_LABELS, spot.category)}
                </p>
              )}
              <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                {spot.name}
              </h1>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
          {spot.notice && (
            <div className="mb-8 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm">
              <TriangleAlert
                className="mt-0.5 size-4 shrink-0 text-amber-600"
                aria-hidden
              />
              <span>{spot.notice}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            <div className="space-y-10 lg:col-span-2">
              {/* Mô tả */}
              {spot.description && (
                <section>
                  <p className="whitespace-pre-line text-base leading-7 text-foreground/90">
                    {spot.description}
                  </p>
                </section>
              )}

              {/* Gallery */}
              {gallery.length > 0 && (
                <section>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {gallery.slice(0, 6).map((img) => (
                      <div
                        key={img.id}
                        className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted"
                      >
                        <Image
                          src={img.url}
                          alt={img.alt ?? spot.name}
                          fill
                          sizes="(min-width: 640px) 33vw, 50vw"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Hoạt động tại đây */}
              {spot.activities.length > 0 && (
                <section>
                  <h2 className="text-xl font-semibold tracking-tight">
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

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Vé vào cửa */}
              {(spot.ticketFree || tiers.length > 0 || spot.ticketInfo) && (
                <div className="rounded-2xl border p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <Ticket
                      className="size-4 text-muted-foreground"
                      aria-hidden
                    />
                    Vé vào cửa
                  </h2>
                  {spot.ticketFree ? (
                    <p className="mt-4 text-sm font-medium text-primary">
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
                          <dd className="text-right font-medium tabular-nums">
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
                </div>
              )}

              {facts.length > 0 && (
                <div className="rounded-2xl border p-5">
                  <h2 className="text-sm font-semibold">Thông tin</h2>
                  <dl className="mt-4 space-y-3 text-sm">
                    {facts.map((f) => (
                      <div key={f.label} className="flex gap-2.5">
                        <f.icon
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            {f.label}
                          </dt>
                          <dd>{f.value}</dd>
                        </div>
                      </div>
                    ))}
                  </dl>
                  {spot.bookingUrl && (
                    <a
                      href={spot.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      Đặt vé / đặt chỗ <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              )}

              {/* Bản đồ */}
              {hasMap && (
                <div className="overflow-hidden rounded-2xl border">
                  <iframe
                    title={`Bản đồ ${spot.name}`}
                    className="aspect-square w-full"
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${spot.lng! - 0.01}%2C${spot.lat! - 0.01}%2C${spot.lng! + 0.01}%2C${spot.lat! + 0.01}&layer=mapnik&marker=${spot.lat}%2C${spot.lng}`}
                  />
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${spot.lat}%2C${spot.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-3 text-sm text-primary hover:underline"
                  >
                    <MapPin className="size-3.5" /> Mở trên Google Maps
                  </a>
                </div>
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
