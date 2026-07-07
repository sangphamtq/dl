import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
  Globe,
  ExternalLink,
  BadgeCheck,
  TriangleAlert,
  Wallet,
  MessageCircle,
  Link2,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { googleEmbedSrc } from "@/lib/map-url";
import { getDrivingDistances } from "@/lib/routing";
import {
  withDistance,
  rankNearby,
  rideLabel,
  uniqueCoords,
} from "@/lib/nearby";
import {
  ACCOMMODATION_CATEGORY_LABELS,
  SPOT_CATEGORY_LABELS,
  label,
} from "@/lib/listing-labels";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { HeroFrame } from "@/components/site/hero-frame";
import { PlaceHeroStack, type HeroImage } from "@/components/site/place-hero-stack";
import {
  SpotSectionNav,
  type SectionItem,
} from "@/components/site/spot-section-nav";
import { RelatedPosts } from "@/components/site/related-posts";
import { ListingViewTracker } from "@/components/site/listing-view-tracker";
import { ListingCard } from "@/components/site/listing-card";
import { Rail } from "@/components/site/rail";
import { PeerBar } from "@/components/site/peer-bar";
import { StayShare } from "@/components/site/stay-share";
import { getListingPeers } from "@/lib/peers";
import { isStaffViewer } from "@/lib/preview";

const pub = { status: "published" as const };

const listingImages = {
  where: { isCover: true },
  take: 1,
  select: { url: true, isCover: true },
} as const;

// Zalo có thể là SĐT hoặc link — chuẩn hoá thành URL chat zalo.me.
function zaloHref(v: string): string {
  if (/^https?:\/\//i.test(v)) return v;
  const digits = v.replace(/[^\d]/g, "");
  return digits ? `https://zalo.me/${digits}` : v;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const acc = await prisma.accommodation.findUnique({
    where: { slug },
    select: { name: true, description: true, status: true },
  });
  if (!acc || acc.status !== "published") return {};
  return { title: acc.name, description: acc.description ?? undefined };
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
      openingHours: true,
      phone: true,
      website: true,
      bookingUrl: true,
      zalo: true,
      facebookUrl: true,
      isVerified: true,
      depositPolicy: true,
      notice: true,
      tags: true,
      placeId: true,
      place: {
        select: {
          slug: true,
          name: true,
          accommodations: {
            where: { ...pub, slug: { not: slug } },
            orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
            take: 8,
            select: {
              slug: true,
              name: true,
              description: true,
              category: true,
              images: listingImages,
            },
          },
          // Điểm tham quan cùng điểm đến — để tính "gần đây" theo toạ độ.
          spots: {
            where: pub,
            orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
            take: 12,
            select: {
              slug: true,
              name: true,
              tagline: true,
              description: true,
              category: true,
              lat: true,
              lng: true,
              images: listingImages,
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
  if (!acc || (acc.status !== "published" && !staff)) notFound();

  const peers = await getListingPeers("accommodation", acc.placeId);

  // Ảnh cho stack hero.
  const heroImages: HeroImage[] = acc.images.map((i) => ({
    url: i.url,
    alt: i.alt,
    caption: null,
  }));
  if (heroImages.length === 0) {
    heroImages.push({ url: coverUrl([], acc.slug, 1200, 800), alt: acc.name });
  }

  const categoryLabel = label(ACCOMMODATION_CATEGORY_LABELS, acc.category);
  const hasMap = acc.lat != null && acc.lng != null;
  const mapEmbedSrc = hasMap ? googleEmbedSrc(acc.lat!, acc.lng!, 13) : null;
  const nearby = acc.place.accommodations;

  // Điểm tham quan gần đây: lọc thô bằng chim bay → đo đường lái xe (cache 30
  // ngày theo toạ độ) → xếp gần→xa, bỏ mục xa quá bán kính "gần", lấy 6.
  const origin = { lat: acc.lat, lng: acc.lng };
  const preSpots = withDistance(acc.place.spots, origin, 8);
  const drivingSpots =
    origin.lat != null && origin.lng != null
      ? await getDrivingDistances(
          { lat: origin.lat, lng: origin.lng },
          uniqueCoords(preSpots),
        )
      : {};
  const nearbySpots = rankNearby(preSpots, drivingSpots, 6);

  // Mục cho thanh điều hướng dính (chỉ mục có dữ liệu).
  const navItems: SectionItem[] = [
    acc.description && { id: "gioi-thieu", label: "Giới thiệu" },
    acc.depositPolicy && { id: "dat-phong", label: "Đặt phòng & cọc" },
    acc.images.length > 1 && { id: "thu-vien", label: "Thư viện ảnh" },
    nearbySpots.length > 0 && { id: "quanh-day", label: "Gần đây" },
  ].filter((x): x is SectionItem => Boolean(x));

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <ListingViewTracker type="accommodation" id={acc.id} />

      <main className="flex-1">
        {/* Hero — chung mô-típ nền ambient với các trang chi tiết khác */}
        <HeroFrame images={heroImages.map((i) => i.url)}>
          <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pb-6 sm:pt-5">
            <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
              <div>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <Link
                    href={`/diem-den/${acc.place.slug}/luu-tru`}
                    className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ChevronLeft
                      className="size-4 transition-transform group-hover:-translate-x-0.5"
                      aria-hidden
                    />
                    Nơi lưu trú tại {acc.place.name}
                  </Link>
                  <StayShare title={acc.name} />
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
                  {categoryLabel && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                      {categoryLabel}
                    </span>
                  )}
                  {acc.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      <BadgeCheck className="size-3.5" aria-hidden />
                      Đã xác minh chính chủ
                    </span>
                  )}
                  <Link
                    href={`/diem-den/${acc.place.slug}`}
                    className="inline-flex items-center gap-1.5 text-primary transition-colors hover:text-primary/80"
                  >
                    <MapPin className="size-4" aria-hidden />
                    {acc.place.name}
                  </Link>
                </div>

                <h1 className="mt-3 text-balance text-3xl font-bold leading-[1.08] tracking-tight sm:text-4xl lg:text-5xl">
                  {acc.name}
                </h1>
              </div>

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
              {acc.isVerified && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-primary/30 bg-primary/[0.06] px-4 py-3 text-sm">
                  <BadgeCheck
                    className="mt-0.5 size-5 shrink-0 text-primary"
                    aria-hidden
                  />
                  <span>
                    <span className="font-semibold text-primary">
                      Chỗ ở đã được xác minh chính chủ.
                    </span>{" "}
                    Chỉ liên hệ &amp; chuyển khoản qua kênh hiển thị trên trang
                    này — cảnh giác số lạ trong bình luận hay tin nhắn.
                  </span>
                </div>
              )}

              {acc.notice && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-warm/40 bg-warm/[0.06] px-4 py-3 text-sm">
                  <TriangleAlert
                    className="mt-0.5 size-4 shrink-0 text-warm"
                    aria-hidden
                  />
                  <span>
                    <span className="font-medium text-warm">Lưu ý: </span>
                    {acc.notice}
                  </span>
                </div>
              )}

              {acc.description && (
                <section id="gioi-thieu" className="scroll-mt-32">
                  <p className="whitespace-pre-line text-lg leading-8 text-foreground/90">
                    {acc.description}
                  </p>
                </section>
              )}

              {acc.depositPolicy && (
                <section id="dat-phong" className="scroll-mt-32">
                  <h2 className="mb-6 text-xl font-bold tracking-tight sm:text-2xl">
                    Đặt phòng &amp; cọc
                  </h2>
                  <div className="flex items-start gap-2.5 rounded-2xl border border-border/60 bg-card px-4 py-3.5 text-sm leading-relaxed">
                    <Wallet
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span>{acc.depositPolicy}</span>
                  </div>
                </section>
              )}

              {/* Gallery — mosaic biên tập: ảnh đầu lớn, phần còn lại lấp lưới */}
              {acc.images.length > 1 && (
                <section id="thu-vien" className="scroll-mt-32">
                  <h2 className="mb-6 text-xl font-bold tracking-tight sm:text-2xl">
                    Thư viện ảnh
                  </h2>
                  <div className="grid auto-rows-[150px] grid-cols-2 gap-3 sm:auto-rows-[190px] sm:grid-cols-4">
                    {acc.images.map((img, i) => (
                      <div
                        key={img.id}
                        className={cn(
                          "relative overflow-hidden rounded-2xl bg-muted",
                          i === 0 && "col-span-2 row-span-2",
                        )}
                      >
                        <Image
                          src={img.url}
                          alt={img.alt ?? acc.name}
                          fill
                          sizes="(min-width: 640px) 50vw, 100vw"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </div>

            {/* Sidebar — liên hệ chính chủ + bản đồ (dính khi cuộn) */}
            <aside className="space-y-6 lg:sticky lg:top-32 lg:self-start">
              <div className="rounded-2xl border border-border/60 bg-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">Liên hệ chính chủ</h2>
                  {acc.isVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                      <BadgeCheck className="size-3.5" aria-hidden />
                      Đã xác minh
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2.5">
                  {acc.zalo && (
                    <ContactRow
                      href={zaloHref(acc.zalo)}
                      icon={MessageCircle}
                      label="Nhắn Zalo"
                      primary
                    />
                  )}
                  {acc.phone && (
                    <ContactRow
                      href={`tel:${acc.phone.replace(/\s+/g, "")}`}
                      icon={Phone}
                      label={acc.phone}
                    />
                  )}
                  {acc.facebookUrl && (
                    <ContactRow
                      href={acc.facebookUrl}
                      icon={Link2}
                      label="Facebook chính chủ"
                    />
                  )}
                  {acc.bookingUrl && (
                    <ContactRow
                      href={acc.bookingUrl}
                      icon={ExternalLink}
                      label="Đặt phòng online"
                    />
                  )}
                  {acc.website && (
                    <ContactRow
                      href={acc.website}
                      icon={Globe}
                      label="Website"
                    />
                  )}
                </div>

                <p className="mt-4 border-t pt-3 text-xs leading-relaxed text-muted-foreground">
                  Chỉ chuyển khoản tới tài khoản do chính chủ cung cấp qua các
                  kênh trên. Trang này không thu cọc hộ.
                </p>
              </div>

              {(mapEmbedSrc || acc.address) && (
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                  {mapEmbedSrc && (
                    <iframe
                      title={`Bản đồ ${acc.name}`}
                      className="aspect-[16/10] w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={mapEmbedSrc}
                    />
                  )}
                  {acc.address && (
                    <div className="flex gap-2.5 p-4">
                      <MapPin
                        className="mt-0.5 size-4 shrink-0 text-primary"
                        aria-hidden
                      />
                      <p className="min-w-0 text-sm font-medium leading-snug">
                        {acc.address}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {acc.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {acc.tags.map((t) => (
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

          {/* Điểm tham quan gần đây (theo khoảng cách chim bay) */}
          {nearbySpots.length > 0 && (
            <div
              id="quanh-day"
              className="mt-16 scroll-mt-32 border-t border-border/60 pt-14"
            >
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                    <span className="h-px w-6 bg-primary/40" aria-hidden />
                    Lân cận
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                    Điểm tham quan gần đây
                  </h2>
                </div>
                <Link
                  href={`/diem-den/${acc.place.slug}/dia-diem`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
                >
                  Xem tất cả
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              </div>
              <Rail itemClassName="basis-1/2 sm:basis-1/3 lg:basis-1/4">
                {nearbySpots.map((s) => (
                  <ListingCard
                    key={s.slug}
                    href={`/dia-diem/${s.slug}`}
                    name={s.name}
                    slug={s.slug}
                    images={s.images}
                    subtitle={s.tagline ?? s.description}
                    tag={
                      s.category
                        ? label(SPOT_CATEGORY_LABELS, s.category)
                        : null
                    }
                    meta={[rideLabel(s)].filter(
                      (x): x is string => Boolean(x),
                    )}
                  />
                ))}
              </Rail>
            </div>
          )}

          {/* Chỗ nghỉ khác cùng điểm đến */}
          {nearby.length > 0 && (
            <div className="mt-16 border-t border-border/60 pt-14">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                    <span className="h-px w-6 bg-primary/40" aria-hidden />
                    Lưu trú
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                    Chỗ nghỉ khác ở {acc.place.name}
                  </h2>
                </div>
                <Link
                  href={`/diem-den/${acc.place.slug}/luu-tru`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
                >
                  Xem tất cả
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              </div>
              <Rail itemClassName="basis-1/2 sm:basis-1/3 lg:basis-1/4">
                {nearby.map((n) => (
                  <ListingCard
                    key={n.slug}
                    href={`/luu-tru/${n.slug}`}
                    name={n.name}
                    slug={n.slug}
                    images={n.images}
                    subtitle={n.description}
                    tag={
                      n.category
                        ? label(ACCOMMODATION_CATEGORY_LABELS, n.category)
                        : null
                    }
                  />
                ))}
              </Rail>
            </div>
          )}
        </div>
        <RelatedPosts type="accommodation" id={acc.id} />
      </main>

      <SiteFooter />
      <PeerBar
        groups={[{ items: peers }]}
        currentSlug={acc.slug}
        prefix="luu-tru"
        title="Chỗ nghỉ khác"
      />
    </div>
  );
}

function ContactRow({
  href,
  icon: Icon,
  label,
  primary,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary?: boolean;
}) {
  const external = !href.startsWith("tel:");
  return (
    <a
      href={href}
      {...(external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      className={
        primary
          ? "flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          : "flex items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm font-medium text-foreground/90 transition-colors hover:text-primary"
      }
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {label}
    </a>
  );
}
