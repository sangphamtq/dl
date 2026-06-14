import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronRight, MapPin, Banknote, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { coverUrl } from "@/lib/place-image";
import { ACCOMMODATION_CATEGORY_LABELS, PRICE_LABELS, label } from "@/lib/listing-labels";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { RelatedPosts } from "@/components/site/related-posts";
import { ListingViewTracker } from "@/components/site/listing-view-tracker";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = await prisma.accommodation.findUnique({
    where: { slug },
    select: { name: true, description: true, status: true },
  });
  if (!a || a.status !== "published") return {};
  return { title: a.name, description: a.description ?? undefined };
}

export default async function AccommodationPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const acc = await prisma.accommodation.findUnique({
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
      website: true,
      bookingUrl: true,
      priceRange: true,
      tags: true,
      place: { select: { slug: true, name: true } },
      images: {
        orderBy: [{ isCover: "desc" }, { order: "asc" }],
        select: { id: true, url: true, alt: true, isCover: true },
      },
    },
  });

  if (!acc || acc.status !== "published") notFound();

  const heroUrl = coverUrl(acc.images, acc.slug, 1800, 1000);
  const gallery = acc.images.filter((i) => i.url !== heroUrl);
  const facts = [
    { icon: Banknote, label: "Mức giá", value: label(PRICE_LABELS, acc.priceRange) },
    { icon: MapPin, label: "Địa chỉ", value: acc.address },
  ].filter((f) => f.value);
  const hasMap = acc.lat != null && acc.lng != null;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <ListingViewTracker type="accommodation" id={acc.id} />

      <main className="flex-1">
        <section className="relative h-[340px] w-full sm:h-[420px]">
          <Image
            src={heroUrl}
            alt={acc.images[0]?.alt ?? acc.name}
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
                  href={`/diem-den/${acc.place.slug}`}
                  className="hover:text-white"
                >
                  {acc.place.name}
                </Link>
                <ChevronRight className="size-3.5" aria-hidden />
                <span className="text-white">{acc.name}</span>
              </nav>
              {acc.category && (
                <p className="mt-4 text-sm font-medium text-white/80">
                  {label(ACCOMMODATION_CATEGORY_LABELS, acc.category)}
                </p>
              )}
              <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                {acc.name}
              </h1>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            <div className="space-y-10 lg:col-span-2">
              {acc.description && (
                <p className="whitespace-pre-line text-base leading-7 text-foreground/90">
                  {acc.description}
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
                        alt={im.alt ?? acc.name}
                        fill
                        sizes="(min-width: 640px) 33vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
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
                  {acc.bookingUrl && (
                    <a
                      href={acc.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      Đặt phòng <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              )}

              {hasMap && (
                <div className="overflow-hidden rounded-2xl border">
                  <iframe
                    title={`Bản đồ ${acc.name}`}
                    className="aspect-square w-full"
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${acc.lng! - 0.01}%2C${acc.lat! - 0.01}%2C${acc.lng! + 0.01}%2C${acc.lat! + 0.01}&layer=mapnik&marker=${acc.lat}%2C${acc.lng}`}
                  />
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${acc.lat}%2C${acc.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-3 text-sm text-primary hover:underline"
                  >
                    <MapPin className="size-3.5" /> Mở trên Google Maps
                  </a>
                </div>
              )}

              {acc.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {acc.tags.map((t) => (
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
        <RelatedPosts type="accommodation" id={acc.id} />
      </main>

      <SiteFooter />
    </div>
  );
}
