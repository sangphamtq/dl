import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  MapPin,
  Clock,
  Banknote,
  UtensilsCrossed,
  TriangleAlert,
  ExternalLink,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { coverUrl } from "@/lib/place-image";
import {
  EATERY_CATEGORY_LABELS,
  MEAL_LABELS,
  PRICE_LABELS,
  label,
} from "@/lib/listing-labels";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { RelatedPosts } from "@/components/site/related-posts";
import { ListingViewTracker } from "@/components/site/listing-view-tracker";
import { CrossLinkCard } from "@/components/site/cross-link-card";

const pub = { status: "published" as const };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const e = await prisma.eatery.findUnique({
    where: { slug },
    select: { name: true, description: true, status: true },
  });
  if (!e || e.status !== "published") return {};
  return { title: e.name, description: e.description ?? undefined };
}

export default async function EateryPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const eatery = await prisma.eatery.findUnique({
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
      meals: true,
      notice: true,
      tags: true,
      place: { select: { slug: true, name: true } },
      specialties: {
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
        select: {
          slug: true,
          name: true,
          images: { where: { isCover: true }, take: 1, select: { url: true, isCover: true } },
        },
      },
      images: {
        orderBy: [{ isCover: "desc" }, { order: "asc" }],
        select: { id: true, url: true, alt: true, isCover: true },
      },
    },
  });

  if (!eatery || eatery.status !== "published") notFound();

  const heroUrl = coverUrl(eatery.images, eatery.slug, 1800, 1000);
  const gallery = eatery.images.filter((i) => i.url !== heroUrl);
  const mealLabels = eatery.meals
    .map((m) => label(MEAL_LABELS, m))
    .filter(Boolean) as string[];
  const facts = [
    { icon: Banknote, label: "Mức giá", value: label(PRICE_LABELS, eatery.priceRange) },
    { icon: Clock, label: "Giờ mở cửa", value: eatery.openingHours },
    { icon: UtensilsCrossed, label: "Bữa", value: mealLabels.join(", ") || null },
    { icon: MapPin, label: "Địa chỉ", value: eatery.address },
  ].filter((f) => f.value);
  const hasMap = eatery.lat != null && eatery.lng != null;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <ListingViewTracker type="eatery" id={eatery.id} />

      <main className="flex-1">
        <section className="relative h-[340px] w-full sm:h-[420px]">
          <Image
            src={heroUrl}
            alt={eatery.images[0]?.alt ?? eatery.name}
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
                  href={`/diem-den/${eatery.place.slug}`}
                  className="hover:text-white"
                >
                  {eatery.place.name}
                </Link>
                <ChevronRight className="size-3.5" aria-hidden />
                <span className="text-white">{eatery.name}</span>
              </nav>
              {eatery.category && (
                <p className="mt-4 text-sm font-medium text-white/80">
                  {label(EATERY_CATEGORY_LABELS, eatery.category)}
                </p>
              )}
              <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                {eatery.name}
              </h1>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
          {eatery.notice && (
            <div className="mb-8 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm">
              <TriangleAlert
                className="mt-0.5 size-4 shrink-0 text-amber-600"
                aria-hidden
              />
              <span>{eatery.notice}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            <div className="space-y-10 lg:col-span-2">
              {eatery.description && (
                <p className="whitespace-pre-line text-base leading-7 text-foreground/90">
                  {eatery.description}
                </p>
              )}

              {gallery.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {gallery.slice(0, 6).map((im) => (
                    <div
                      key={im.id}
                      className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted"
                    >
                      <Image
                        src={im.url}
                        alt={im.alt ?? eatery.name}
                        fill
                        sizes="(min-width: 640px) 33vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              {eatery.specialties.length > 0 && (
                <section>
                  <h2 className="text-xl font-semibold tracking-tight">
                    Đặc sản nên thử ở đây
                  </h2>
                  <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {eatery.specialties.map((s) => (
                      <CrossLinkCard
                        key={s.slug}
                        href={`/dac-san/${s.slug}`}
                        name={s.name}
                        slug={s.slug}
                        images={s.images}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="space-y-6">
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
                  {eatery.bookingUrl && (
                    <a
                      href={eatery.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      Đặt bàn <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              )}

              {hasMap && (
                <div className="overflow-hidden rounded-2xl border">
                  <iframe
                    title={`Bản đồ ${eatery.name}`}
                    className="aspect-square w-full"
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${eatery.lng! - 0.01}%2C${eatery.lat! - 0.01}%2C${eatery.lng! + 0.01}%2C${eatery.lat! + 0.01}&layer=mapnik&marker=${eatery.lat}%2C${eatery.lng}`}
                  />
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${eatery.lat}%2C${eatery.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-3 text-sm text-primary hover:underline"
                  >
                    <MapPin className="size-3.5" /> Mở trên Google Maps
                  </a>
                </div>
              )}

              {eatery.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {eatery.tags.map((t) => (
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
        <RelatedPosts type="eatery" id={eatery.id} />
      </main>

      <SiteFooter />
    </div>
  );
}
