import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
  Clock,
  CalendarDays,
  Building2,
  MapPin,
  Ticket,
  Phone,
  Globe,
  ExternalLink,
} from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { coverUrl } from "@/lib/place-image";
import { proseClass } from "@/lib/prose";
import { parseTicketTiers, tierPriceLabel } from "@/lib/tickets";
import {
  ACTIVITY_CATEGORY_LABELS,
  SPOT_CATEGORY_LABELS,
  label,
} from "@/lib/listing-labels";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { RelatedPosts } from "@/components/site/related-posts";
import { ListingViewTracker } from "@/components/site/listing-view-tracker";
import { isStaffViewer } from "@/lib/preview";
import { PeerBar } from "@/components/site/peer-bar";
import { getListingPeers } from "@/lib/peers";
import { HeroFrame } from "@/components/site/hero-frame";
import { PlaceHeroStack, type HeroImage } from "@/components/site/place-hero-stack";
import { ShareButton } from "@/components/site/share-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const pub = { status: "published" as const };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = await prisma.activity.findUnique({
    where: { slug },
    select: { name: true, description: true, status: true },
  });
  if (!a || a.status !== "published") return {};
  return { title: a.name, description: a.description ?? undefined };
}

export default async function ActivityPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const activity = await prisma.activity.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      content: true,
      category: true,
      status: true,
      durationText: true,
      seasonText: true,
      operatorName: true,
      bookingUrl: true,
      website: true,
      phone: true,
      ticketFree: true,
      ticketTiers: true,
      tags: true,
      placeId: true,
      place: { select: { slug: true, name: true } },
      spotLinks: {
        where: { spot: pub },
        orderBy: { order: "asc" },
        select: {
          spot: {
            select: {
              slug: true,
              name: true,
              category: true,
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
  if (!activity || (activity.status !== "published" && !staff)) notFound();

  const peers = await getListingPeers("activity", activity.placeId);

  const tiers = parseTicketTiers(activity.ticketTiers);

  // Ảnh cho hero stack (chung mô-típ với trang Địa điểm / Điểm đến).
  const heroImages: HeroImage[] = activity.images.map((i) => ({
    url: i.url,
    alt: i.alt,
    caption: null,
  }));
  if (heroImages.length === 0) {
    heroImages.push({
      url: coverUrl([], activity.slug, 1200, 800),
      alt: activity.name,
    });
  }

  // Thông tin thực tế — gộp chung card với giá ở sidebar (thời lượng / mùa / đơn vị).
  const infoRows = [
    { icon: Clock, label: "Thời lượng", value: activity.durationText },
    { icon: CalendarDays, label: "Mùa / thời điểm", value: activity.seasonText },
    { icon: Building2, label: "Đơn vị", value: activity.operatorName },
  ].filter((f) => f.value);
  const hasPrice = activity.ticketFree || tiers.length > 0;
  const hasInfo = infoRows.length > 0;
  const hasBooking = Boolean(activity.bookingUrl);
  const hasLinks = Boolean(activity.phone || activity.website);

  const categoryLabel = label(ACTIVITY_CATEGORY_LABELS, activity.category);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <ListingViewTracker
        type="activity"
        id={activity.id}
        name={activity.name}
        placeId={activity.placeId}
      />

      <main className="flex-1">
        {/* Hero — chung mô-típ nền ambient sáng với trang Địa điểm / Điểm đến */}
        <HeroFrame images={heroImages.map((i) => i.url)}>
          <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pb-6 sm:pt-5">
            <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
              {/* Trái: chữ */}
              <div>
                {/* Quay lại + chia sẻ */}
                <div className="mb-5 flex items-center justify-between gap-3">
                  <Link
                    href={`/diem-den/${activity.place.slug}/hoat-dong`}
                    className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ChevronLeft
                      className="size-4 transition-transform group-hover:-translate-x-0.5"
                      aria-hidden
                    />
                    Trải nghiệm tại {activity.place.name}
                  </Link>
                  <ShareButton title={activity.name} iconOnly />
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                  {categoryLabel && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                      {categoryLabel}
                    </span>
                  )}
                  <Link
                    href={`/diem-den/${activity.place.slug}`}
                    className="inline-flex items-center gap-1.5 text-primary transition-colors hover:text-primary/80"
                  >
                    <MapPin className="size-4" aria-hidden />
                    {activity.place.name}
                  </Link>
                </div>

                <h1 className="mt-4 text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
                  {activity.name}
                </h1>
              </div>

              {/* Phải: chồng ảnh */}
              <div className="relative z-[45]">
                <PlaceHeroStack images={heroImages} />
              </div>
            </div>
          </div>
        </HeroFrame>

        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_288px] lg:gap-12">
            <div className="min-w-0 space-y-14">
              {(activity.content || activity.description) && (
                <section>
                  <h2 className="mb-4 text-xl font-bold tracking-tight sm:text-2xl">
                    Giới thiệu
                  </h2>
                  {activity.content ? (
                    <div
                      className={proseClass}
                      dangerouslySetInnerHTML={{ __html: activity.content }}
                    />
                  ) : (
                    <p className="whitespace-pre-line text-base leading-7 text-foreground/90">
                      {activity.description}
                    </p>
                  )}
                </section>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
              {/* Thông tin nhanh — Giá + đặt chỗ → thông tin → liên hệ */}
              {(hasPrice || hasBooking || hasInfo || hasLinks) && (
                <div className="rounded-2xl border border-border/60 bg-card p-5">
                  {/* 1. Giá vé + nút đặt chỗ (nhóm hành động, không divider giữa) */}
                  {(hasPrice || hasBooking) && (
                    <div>
                      {hasPrice && (
                        <>
                          <h2 className="flex items-center gap-2 text-sm font-semibold">
                            <Ticket
                              className="size-4 text-muted-foreground"
                              aria-hidden
                            />
                            Giá vé
                          </h2>
                          {activity.ticketFree ? (
                            <p className="mt-3 text-sm font-medium text-primary">
                              Miễn phí
                            </p>
                          ) : (
                            <dl className="mt-3 space-y-2.5 text-sm">
                              {tiers.map((t, i) => (
                                <div
                                  key={i}
                                  className="flex items-baseline justify-between gap-3"
                                >
                                  <dt className="text-muted-foreground">
                                    {t.label}
                                    {t.note && (
                                      <span className="ml-1 text-xs">
                                        ({t.note})
                                      </span>
                                    )}
                                  </dt>
                                  <dd className="text-right font-medium tabular-nums">
                                    {tierPriceLabel(t)}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          )}
                        </>
                      )}
                      {hasBooking && (
                        <a
                          href={activity.bookingUrl!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            buttonVariants({ size: "lg" }),
                            "w-full",
                            hasPrice && "mt-4",
                          )}
                        >
                          Đặt chỗ ngay
                          <ExternalLink className="size-4" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* 2. Thông tin (thời lượng / mùa / đơn vị) */}
                  {hasInfo && (
                    <dl
                      className={cn(
                        "space-y-3 text-sm",
                        (hasPrice || hasBooking) &&
                          "mt-5 border-t border-border/60 pt-5",
                      )}
                    >
                      {infoRows.map((f) => (
                        <div key={f.label} className="flex gap-2.5">
                          <f.icon
                            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                          <div>
                            <dt className="text-xs text-muted-foreground">
                              {f.label}
                            </dt>
                            <dd className="font-medium">{f.value}</dd>
                          </div>
                        </div>
                      ))}
                    </dl>
                  )}

                  {/* 3. Liên hệ (điện thoại / website) */}
                  {hasLinks && (
                    <div
                      className={cn(
                        "space-y-3",
                        (hasPrice || hasBooking || hasInfo) &&
                          "mt-5 border-t border-border/60 pt-5",
                      )}
                    >
                      {activity.phone && (
                        <a
                          href={`tel:${activity.phone}`}
                          className="flex items-center gap-2.5 text-sm text-foreground/90 transition-colors hover:text-primary"
                        >
                          <Phone
                            className="size-4 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                          {activity.phone}
                        </a>
                      )}
                      {activity.website && (
                        <a
                          href={activity.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 text-sm text-foreground/90 transition-colors hover:text-primary"
                        >
                          <Globe
                            className="size-4 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                          Website
                          <ExternalLink className="size-3.5 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Diễn ra ở đâu */}
              {activity.spotLinks.length > 0 && (
                <div className="rounded-2xl border border-border/60 bg-card p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <MapPin
                      className="size-4 text-muted-foreground"
                      aria-hidden
                    />
                    Diễn ra ở đâu
                  </h2>
                  <ul className="mt-3 space-y-0.5">
                    {activity.spotLinks.map(({ spot: s }) => (
                      <li key={s.slug}>
                        <Link
                          href={`/dia-diem/${s.slug}`}
                          className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
                        >
                          <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                            <Image
                              src={coverUrl(s.images, s.slug, 96, 96)}
                              alt=""
                              fill
                              sizes="44px"
                              className="object-cover"
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {s.name}
                            </span>
                            {label(SPOT_CATEGORY_LABELS, s.category) && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {label(SPOT_CATEGORY_LABELS, s.category)}
                              </span>
                            )}
                          </span>
                          <ChevronRight
                            className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                            aria-hidden
                          />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activity.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activity.tags.map((t) => (
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
        <RelatedPosts type="activity" id={activity.id} />
      </main>

      <SiteFooter />
      <PeerBar
        groups={[{ items: peers }]}
        currentSlug={activity.slug}
        prefix="hoat-dong"
        title="Trải nghiệm khác"
      />
    </div>
  );
}
