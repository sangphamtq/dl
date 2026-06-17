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
  Sparkles,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { coverUrl } from "@/lib/place-image";
import {
  SPOT_CATEGORY_LABELS,
  ACCOMMODATION_CATEGORY_LABELS,
  PRICE_LABELS,
  label,
} from "@/lib/listing-labels";
import { parseTicketTiers, formatVnd } from "@/lib/tickets";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { RelatedPosts } from "@/components/site/related-posts";
import { isStaffViewer } from "@/lib/preview";
import { PlaceCard } from "@/components/site/place-card";
import { PlaceViewTracker } from "@/components/site/place-view-tracker";
import { type HeroImage } from "@/components/site/place-hero-stack";
import { PlaceHero } from "@/components/site/place-hero";
import { PlaceTabs } from "@/components/site/place-tabs";
import {
  getPlaceCounts,
  buildPlaceTabs,
  buildPlaceStats,
} from "@/lib/place-meta";

const pub = { status: "published" as const };

// Nhãn giá hoạt động lấy từ ticketFree / ticketTiers (KHÔNG dùng priceRange cũ).
function activityPriceBadge(
  ticketFree: boolean,
  ticketTiers: unknown,
): string | null {
  if (ticketFree) return "Miễn phí";
  const prices = parseTicketTiers(ticketTiers)
    .map((t) => t.price)
    .filter((p): p is number => p != null && p > 0);
  if (prices.length === 0) return null;
  return `Từ ${formatVnd(Math.min(...prices))}`;
}
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
      isFeatured: true,
      viewCount: true,
      provinceName: true,
      parent: { select: { slug: true, name: true } },
      images: {
        orderBy: [{ isCover: "desc" }, { order: "asc" }],
        select: { id: true, url: true, alt: true, caption: true, isCover: true },
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
        take: 6,
        select: {
          slug: true,
          name: true,
          description: true,
          durationText: true,
          ticketFree: true,
          ticketTiers: true,
          images: listingImages,
        },
      },
      spots: {
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
        take: 6,
        select: {
          slug: true,
          name: true,
          description: true,
          category: true,
          tags: true,
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
          kind: true,
          priceRange: true,
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
          category: true,
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

  const counts = await getPlaceCounts(place.id);
  const stats = buildPlaceStats(place.viewCount, counts);
  const tabs = buildPlaceTabs(place.slug, counts);

  const isProvince = place.kind === "province";
  // Hero: ảnh của điểm đến trước, rồi nối ảnh bìa các "địa điểm con"
  // (điểm đến con nếu là tỉnh + spot), chỉ lấy ảnh thật, khử trùng URL.
  const heroImages: HeroImage[] = place.images.map((i) => ({
    url: i.url,
    alt: i.alt,
    caption: i.caption,
  }));
  const childCovers: HeroImage[] = [...place.children, ...place.spots]
    .map((c) => ({ cover: c.images[0], name: c.name }))
    .filter((c) => c.cover?.url)
    .map((c) => ({ url: c.cover!.url, alt: c.name, caption: c.name }));
  const seenUrls = new Set(heroImages.map((i) => i.url));
  for (const c of childCovers) {
    if (!seenUrls.has(c.url)) {
      heroImages.push(c);
      seenUrls.add(c.url);
    }
  }
  if (heroImages.length === 0) {
    heroImages.push({ url: coverUrl([], place.slug, 1600, 1000), alt: place.name });
  }

  const getTo = place.transports.filter((t) => t.direction === "getTo");
  const getAround = place.transports.filter((t) => t.direction === "getAround");

  const showChildren = isProvince && place.children.length > 0;

  return (
    <div className="flex flex-1 flex-col">
      <PlaceViewTracker placeId={place.id} />
      <SiteHeader />

      <main className="flex-1">
        <PlaceHero place={place} heroImages={heroImages} stats={stats} />

        {/* Thanh tab: Tổng quan + xem tất cả từng listing */}
        <PlaceTabs items={tabs} />

        <div className="mx-auto max-w-6xl space-y-20 px-4 py-14 sm:px-6 sm:py-20">
          {/* Tổng quan */}
          {place.description && (
            <section className="max-w-3xl">
              <Eyebrow num="00" text={`Đôi nét về ${place.name}`} />
              <p className="mt-5 whitespace-pre-line text-lg leading-8 text-foreground/90">
                {place.description}
              </p>
            </section>
          )}

          {/* Điểm đến con (chỉ tỉnh) */}
          {showChildren && (
            <section id="diem-den-con" className="scroll-mt-32">
              <SectionHeading
                num="01"
                eyebrow="Điểm đến"
                title={`Điểm đến tại ${place.name}`}
              />
              <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {place.children.map((c) => (
                  <PlaceCard key={c.slug} place={c} />
                ))}
              </div>
            </section>
          )}

          {/* Trải nghiệm */}
          {place.activities.length > 0 && (
            <section id="trai-nghiem" className="scroll-mt-32">
              <SectionHeading
                num={showChildren ? "02" : "01"}
                eyebrow="Trải nghiệm"
                title="Trải nghiệm không thể bỏ lỡ"
                description="Từ mạo hiểm gây cấn đến thư giãn nhẹ nhàng — chọn trải nghiệm hợp gu bạn."
                href={`/diem-den/${place.slug}/hoat-dong`}
              />
              <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-2">
                {place.activities.map((a) => {
                  const badges = [
                    a.durationText,
                    activityPriceBadge(a.ticketFree, a.ticketTiers),
                  ].filter(Boolean) as string[];
                  return (
                    <HRow
                      key={a.slug}
                      href={`/hoat-dong/${a.slug}`}
                      name={a.name}
                      slug={a.slug}
                      images={a.images}
                      description={a.description}
                      badges={badges}
                      cta="Khám phá"
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Tham quan (Spot) */}
          {place.spots.length > 0 && (
            <section id="tham-quan" className="scroll-mt-32">
              <SectionHeading
                num={showChildren ? "03" : "02"}
                eyebrow="Tham quan"
                title="Địa điểm đáng ghé"
                description="Hàng động kỳ ảo, đảo đá vịnh ngọc, di tích lịch sử mảnh ghép của bạn."
                href={`/diem-den/${place.slug}/dia-diem`}
              />
              <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-2">
                {place.spots.map((s) => {
                  const badges = [
                    s.category ? label(SPOT_CATEGORY_LABELS, s.category) : null,
                    s.tags[0] ?? null,
                  ].filter(Boolean) as string[];
                  return (
                    <HRow
                      key={s.slug}
                      href={`/dia-diem/${s.slug}`}
                      name={s.name}
                      slug={s.slug}
                      images={s.images}
                      description={s.description}
                      badges={badges}
                      cta="Xem chi tiết"
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Ẩm thực (đặc sản) */}
          {place.specialties.length > 0 && (
            <section id="am-thuc" className="scroll-mt-32">
              <SectionHeading
                num={showChildren ? "04" : "03"}
                eyebrow="Ẩm thực"
                title="Đặc sản nên thử"
                description="Hương vị bản địa khó quên — gợi ý món & nơi thưởng thức."
                href={`/diem-den/${place.slug}/am-thuc`}
              />
              <div className="mt-7 grid grid-cols-2 gap-5 lg:grid-cols-4">
                {place.specialties.map((sp) => (
                  <Link key={sp.slug} href={`/dac-san/${sp.slug}`} className="group block">
                    <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted shadow-sm shadow-black/5 transition-shadow group-hover:shadow-md">
                      <Image
                        src={coverUrl(sp.images, sp.slug)}
                        alt={sp.name}
                        fill
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur">
                        {sp.kind === "product" ? "Sản vật / quà" : "Món ăn"}
                      </span>
                    </div>
                    <h3 className="mt-3 font-semibold tracking-tight line-clamp-1">
                      {sp.name}
                    </h3>
                    {sp.priceRange && (
                      <p className="mt-0.5 text-sm font-semibold text-primary">
                        {label(PRICE_LABELS, sp.priceRange)}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Lưu trú */}
          {place.accommodations.length > 0 && (
            <section id="luu-tru" className="scroll-mt-32">
              <SectionHeading
                num={showChildren ? "05" : "04"}
                eyebrow="Lưu trú"
                title="Chỗ nghỉ gợi ý"
                description="Resort sang trọng hay homestay ấm cúng — chọn nơi dừng chân hợp túi tiền."
                href={`/diem-den/${place.slug}/luu-tru`}
              />
              <div className="mt-7 grid grid-cols-2 gap-5 lg:grid-cols-4">
                {place.accommodations.map((ac) => (
                  <Link key={ac.slug} href={`/luu-tru/${ac.slug}`} className="group block">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted shadow-sm shadow-black/5 transition-shadow group-hover:shadow-md">
                      <Image
                        src={coverUrl(ac.images, ac.slug)}
                        alt={ac.name}
                        fill
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      {ac.category && (
                        <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur">
                          {label(ACCOMMODATION_CATEGORY_LABELS, ac.category)}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 font-semibold tracking-tight line-clamp-1">
                      {ac.name}
                    </h3>
                    {ac.priceRange && (
                      <p className="mt-0.5 text-sm font-semibold text-primary">
                        {label(PRICE_LABELS, ac.priceRange)}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Di chuyển */}
          {place.transports.length > 0 && (
            <section id="di-chuyen" className="scroll-mt-32">
              <SectionHeading
                num={String(
                  [
                    showChildren,
                    place.activities.length > 0,
                    place.spots.length > 0,
                    place.specialties.length > 0,
                    place.accommodations.length > 0,
                  ].filter(Boolean).length + 1,
                ).padStart(2, "0")}
                eyebrow="Di chuyển"
                title="Đi lại thế nào?"
              />
              <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {getTo.length > 0 && (
                  <TransportGroup title="Đến nơi" icon={PlaneLanding} items={getTo} />
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

        {/* Cẩm nang */}
        <RelatedPosts type="place" id={place.id} />
      </main>

      <SiteFooter />
    </div>
  );
}

/* ── Eyebrow + tiêu đề section ─────────────────────────────────── */
function Eyebrow({ num, text }: { num: string; text: string }) {
  return (
    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
      <span className="text-muted-foreground/50">{num}</span>
      <Sparkles className="size-3.5" aria-hidden />
      {text}
    </p>
  );
}

function SectionHeading({
  num,
  eyebrow,
  title,
  description,
  href,
}: {
  num: string;
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
}) {
  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-widest text-primary">
            <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-[10px] tabular-nums">
              {num}
            </span>
            {eyebrow}
          </p>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h2>
        </div>
        {href && (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
          >
            Xem tất cả <ChevronRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
      {description && (
        <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
      )}
    </>
  );
}

/* ── Card ngang (trải nghiệm / địa điểm) ──────────────────────── */
function HRow({
  href,
  name,
  slug,
  images,
  description,
  badges,
  cta,
}: {
  href: string;
  name: string;
  slug: string;
  images: { url: string; isCover: boolean }[];
  description: string | null;
  badges: string[];
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex gap-4 rounded-2xl bg-card p-3 ring-1 ring-border/50 transition-all duration-200 hover:shadow-md hover:shadow-black/5 hover:ring-border"
    >
      <div className="relative aspect-square w-28 shrink-0 overflow-hidden rounded-xl bg-muted sm:w-36">
        <Image
          src={coverUrl(images, slug)}
          alt={name}
          fill
          sizes="144px"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        {badges.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {badges.map((b, i) => (
              <span
                key={i}
                className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
              >
                {b}
              </span>
            ))}
          </div>
        )}
        <h3 className="mt-1.5 font-semibold tracking-tight line-clamp-1">{name}</h3>
        {description && (
          <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-primary">
          {cta}{" "}
          <ChevronRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </div>
    </Link>
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
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-lg shadow-black/5">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
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
