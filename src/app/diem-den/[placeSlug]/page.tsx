import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Bus,
  PlaneLanding,
  Navigation,
  Clock,
  Banknote,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { coverUrl } from "@/lib/place-image";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { RelatedPosts } from "@/components/site/related-posts";
import { isStaffViewer } from "@/lib/preview";
import { PlaceCard } from "@/components/site/place-card";
import { EatSection } from "@/components/site/eat-section";
import { PlaceViewTracker } from "@/components/site/place-view-tracker";

const PRICE: Record<string, string> = {
  budget: "$",
  moderate: "$$",
  premium: "$$$",
  luxury: "$$$$",
};

// where dùng lại cho mọi listing: chỉ lấy bản đã xuất bản.
const pub = { status: "published" as const };
const listingImages = {
  where: { isCover: true },
  take: 1,
  select: { url: true, isCover: true },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ placeSlug: string }>;
}) {
  const { placeSlug } = await params;
  const place = await prisma.place.findUnique({
    where: { slug: placeSlug },
    select: { name: true, description: true, status: true },
  });
  if (!place || place.status !== "published") return {};
  return {
    title: `${place.name} · Hành Trình Việt`,
    description: place.description ?? undefined,
  };
}

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ placeSlug: string }>;
}) {
  const { placeSlug } = await params;

  const place = await prisma.place.findUnique({
    where: { slug: placeSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
      status: true,
      tagline: true,
      description: true,
      tags: true,
      parent: { select: { slug: true, name: true } },
      images: {
        orderBy: [{ isCover: "desc" }, { order: "asc" }],
        select: { id: true, url: true, alt: true, isCover: true },
      },
      children: {
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
        select: {
          slug: true,
          name: true,
          kind: true,
          description: true,
          images: listingImages,
        },
      },
      activities: {
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
        take: 8,
        select: {
          slug: true,
          name: true,
          description: true,
          priceRange: true,
          images: listingImages,
        },
      },
      spots: {
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
        take: 8,
        select: {
          slug: true,
          name: true,
          description: true,
          priceRange: true,
          images: listingImages,
        },
      },
      specialties: {
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
        take: 8,
        select: {
          slug: true,
          name: true,
          description: true,
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
          meals: true,
          images: listingImages,
        },
      },
      accommodations: {
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
        take: 8,
        select: {
          slug: true,
          name: true,
          description: true,
          priceRange: true,
          images: listingImages,
        },
      },
      transports: {
        where: pub,
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          direction: true,
          mode: true,
          fromName: true,
          duration: true,
          description: true,
        },
      },
    },
  });

  const staff = await isStaffViewer();
  if (!place || (place.status !== "published" && !staff)) notFound();

  const isProvince = place.kind === "province";
  const heroUrl = coverUrl(place.images, place.slug, 1800, 1000);
  const gallery = place.images.filter((i) => i.url !== heroUrl);

  const getTo = place.transports.filter((t) => t.direction === "getTo");
  const getAround = place.transports.filter((t) => t.direction === "getAround");

  // Chơi/xem ở trên, Ăn ở giữa (EatSection), Lưu trú ở dưới.
  const playSections = [
    { title: "Hoạt động & trải nghiệm", prefix: "hoat-dong", items: place.activities },
    { title: "Địa điểm tham quan", prefix: "dia-diem", items: place.spots },
  ];
  const staySections = [
    { title: "Nơi lưu trú", prefix: "luu-tru", items: place.accommodations },
  ];
  const hasEat = place.eateries.length > 0 || place.specialties.length > 0;

  return (
    <div className="flex flex-1 flex-col">
      <PlaceViewTracker placeId={place.id} />
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative h-[380px] w-full sm:h-[460px]">
          <Image
            src={heroUrl}
            alt={place.images[0]?.alt ?? place.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />
          <div className="absolute inset-0">
            <div className="mx-auto flex h-full max-w-6xl flex-col justify-end px-4 pb-10 text-white sm:px-6 sm:pb-14">
              {/* Breadcrumb */}
              <nav className="flex flex-wrap items-center gap-1 text-sm text-white/80">
                <Link href="/" className="hover:text-white">
                  Trang chủ
                </Link>
                <ChevronRight className="size-3.5" aria-hidden />
                <Link href="/diem-den" className="hover:text-white">
                  Điểm đến
                </Link>
                {place.parent && (
                  <>
                    <ChevronRight className="size-3.5" aria-hidden />
                    <Link
                      href={`/diem-den/${place.parent.slug}`}
                      className="hover:text-white"
                    >
                      {place.parent.name}
                    </Link>
                  </>
                )}
                <ChevronRight className="size-3.5" aria-hidden />
                <span className="text-white">{place.name}</span>
              </nav>

              <p className="mt-4 text-sm font-medium text-white/80">
                {isProvince ? "Tỉnh / Thành phố" : "Điểm đến"}
              </p>
              <h1 className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">
                {place.name}
              </h1>
              {place.tagline && (
                <p className="mt-2 max-w-2xl text-lg font-medium text-white/90">
                  {place.tagline}
                </p>
              )}
              {place.description && (
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/85">
                  {place.description}
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl space-y-14 px-4 py-12 sm:px-6 sm:py-16">
          {/* Gallery */}
          {gallery.length > 0 && (
            <section>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {gallery.slice(0, 8).map((img) => (
                  <div
                    key={img.id}
                    className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted"
                  >
                    <Image
                      src={img.url}
                      alt={img.alt ?? place.name}
                      fill
                      sizes="(min-width: 640px) 25vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Điểm đến con (chỉ tỉnh) */}
          {isProvince && place.children.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold tracking-tight">
                Điểm đến tại {place.name}
              </h2>
              <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {place.children.map((c) => (
                  <PlaceCard key={c.slug} place={c} />
                ))}
              </div>
            </section>
          )}

          {/* Chơi / xem */}
          {playSections.map(
            (s) =>
              s.items.length > 0 && (
                <ListingSection
                  key={s.prefix}
                  title={s.title}
                  prefix={s.prefix}
                  items={s.items}
                  placeName={place.name}
                  placeSlug={place.slug}
                />
              ),
          )}

          {/* Ăn gì (gộp đặc sản + quán, lọc theo bữa) */}
          {hasEat && (
            <EatSection
              placeName={place.name}
              placeSlug={place.slug}
              eateries={place.eateries}
              specialties={place.specialties}
            />
          )}

          {/* Lưu trú */}
          {staySections.map(
            (s) =>
              s.items.length > 0 && (
                <ListingSection
                  key={s.prefix}
                  title={s.title}
                  prefix={s.prefix}
                  items={s.items}
                  placeName={place.name}
                  placeSlug={place.slug}
                />
              ),
          )}

          {/* Di chuyển (inline) */}
          {place.transports.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold tracking-tight">
                Di chuyển
              </h2>
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {getTo.length > 0 && (
                  <TransportGroup
                    title="Đến nơi"
                    icon={PlaneLanding}
                    items={getTo}
                  />
                )}
                {getAround.length > 0 && (
                  <TransportGroup
                    title="Đi lại tại chỗ"
                    icon={Navigation}
                    items={getAround}
                  />
                )}
              </div>
            </section>
          )}
        </div>
        <RelatedPosts type="place" id={place.id} />
      </main>

      <SiteFooter />
    </div>
  );
}

type ListingItem = {
  slug: string;
  name: string;
  description: string | null;
  priceRange?: string | null;
  images: { url: string; isCover: boolean }[];
};

function ListingSection({
  title,
  prefix,
  items,
  placeName,
  placeSlug,
}: {
  title: string;
  prefix: string;
  items: ListingItem[];
  placeName: string;
  placeSlug: string;
}) {
  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <Link
          href={`/diem-den/${placeSlug}/${prefix}`}
          className="shrink-0 text-sm font-medium text-primary hover:underline"
        >
          Xem tất cả
        </Link>
      </div>
      <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <Link
            key={it.slug}
            href={`/${prefix}/${it.slug}`}
            className="group block overflow-hidden rounded-xl"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
              <Image
                src={coverUrl(it.images, it.slug)}
                alt={it.name}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              />
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold tracking-tight">{it.name}</h3>
                {it.priceRange && (
                  <span className="shrink-0 text-sm font-medium text-muted-foreground">
                    {PRICE[it.priceRange] ?? ""}
                  </span>
                )}
              </div>
              {it.description && (
                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {it.description}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
      <p className="sr-only">{placeName}</p>
    </section>
  );
}

type TransportItem = {
  id: string;
  name: string;
  mode: string;
  fromName: string | null;
  duration: string | null;
  description: string | null;
};

function TransportGroup({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: typeof Bus;
  items: TransportItem[];
}) {
  return (
    <div className="rounded-xl border p-5">
      <div className="flex items-center gap-2">
        <Icon className="size-5 text-primary" aria-hidden />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <ul className="mt-4 space-y-4">
        {items.map((t) => (
          <li key={t.id} className="border-t pt-4 first:border-t-0 first:pt-0">
            <div className="flex items-start gap-2">
              <Bus className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0">
                <p className="font-medium">{t.name}</p>
                <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {t.fromName && (
                    <span className="inline-flex items-center gap-1">
                      <Navigation className="size-3" aria-hidden />
                      Từ {t.fromName}
                    </span>
                  )}
                  {t.duration && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" aria-hidden />
                      {t.duration}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Banknote className="size-3" aria-hidden />
                    {t.mode}
                  </span>
                </div>
                {t.description && (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {t.description}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
