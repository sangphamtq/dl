import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Compass,
  Clock,
  CalendarDays,
  BadgeCheck,
  type LucideIcon,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { coverUrl } from "@/lib/place-image";
import {
  SPOT_CATEGORY_LABELS,
  ACCOMMODATION_CATEGORY_LABELS,
  label,
} from "@/lib/listing-labels";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { RelatedPosts } from "@/components/site/related-posts";
import { isStaffViewer } from "@/lib/preview";
import { PlaceCard } from "@/components/site/place-card";
import { SectionHeading } from "@/components/site/section-heading";
import { SpotShowcase } from "@/components/site/spot-showcase";
import { Rail } from "@/components/site/rail";
import { PlaceViewTracker } from "@/components/site/place-view-tracker";
import { PlaceHero } from "@/components/site/place-hero";
import { PlaceTabs } from "@/components/site/place-tabs";
import { ReviewsSection, type ReviewListItem } from "@/components/site/place-reviews";
import { summarizeReviews } from "@/lib/review-meta";
import { PeerBar } from "@/components/site/peer-bar";
import { getDestinationPeerGroups } from "@/lib/peers";
import {
  getPlaceCounts,
  buildPlaceTabs,
  buildPlaceStats,
  buildHeroImages,
  resolveVideos,
  getVisitors,
} from "@/lib/place-meta";

const pub = { status: "published" as const };

// Card trải nghiệm — ảnh làm chủ, tên + dòng fact (thời lượng · mùa) (Layout A).
// Hover: mô tả ngắn hiện lên trên ảnh (gradient đáy + chữ trắng fade/trượt).
function ExperienceCard({
  href,
  name,
  slug,
  images,
  facts,
  description,
}: {
  href: string;
  name: string;
  slug: string;
  images: { url: string; isCover: boolean }[];
  facts: { icon: LucideIcon; text: string }[];
  description?: string;
}) {
  return (
    <Link href={href} className="group block">
      <div className="relative aspect-[5/4] overflow-hidden rounded-2xl bg-muted">
        <Image
          src={coverUrl(images, slug)}
          alt={name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 40vw, 80vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
        />
        {description && (
          <div
            className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/75 via-black/25 to-transparent p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none"
            aria-hidden
          >
            <p className="translate-y-1 text-sm leading-relaxed text-white line-clamp-3 transition-transform duration-200 group-hover:translate-y-0 motion-reduce:transform-none">
              {description}
            </p>
          </div>
        )}
      </div>
      <h3 className="mt-3 text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">
        {name}
      </h3>
      {facts.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {facts.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1.5">
              <f.icon className="size-3.5 shrink-0" aria-hidden />
              {f.text}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

// Card đặc sản — gallery ảnh vuông, tên phủ lên đáy ("ăn ảnh").
function SpecialtyCard({
  href,
  name,
  slug,
  images,
}: {
  href: string;
  name: string;
  slug: string;
  images: { url: string; isCover: boolean }[];
}) {
  return (
    <Link
      href={href}
      className="group relative block aspect-square overflow-hidden rounded-2xl bg-muted"
    >
      <Image
        src={coverUrl(images, slug)}
        alt={name}
        fill
        sizes="(min-width: 1024px) 20vw, (min-width: 640px) 25vw, 40vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
      <h3 className="absolute inset-x-0 bottom-0 text-balance p-3.5 text-base font-bold leading-snug tracking-tight text-white drop-shadow-md">
        {name}
      </h3>
    </Link>
  );
}

// Card lưu trú — ảnh + tên + loại hình + huy hiệu đã xác minh (danh bạ chính chủ).
function StayCard({
  href,
  name,
  slug,
  images,
  category,
  isVerified,
}: {
  href: string;
  name: string;
  slug: string;
  images: { url: string; isCover: boolean }[];
  category: string | null;
  isVerified: boolean;
}) {
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:border-border hover:shadow-md hover:shadow-black/5"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={coverUrl(images, slug)}
          alt={name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 90vw"
          className="object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="line-clamp-1 text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">
          {name}
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
          {category && <span className="text-muted-foreground">{category}</span>}
          {isVerified && (
            <span className="inline-flex items-center gap-1 font-medium text-primary">
              <BadgeCheck className="size-4 shrink-0" aria-hidden />
              Đã xác minh
            </span>
          )}
        </div>
      </div>
    </Link>
  );
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
    title: `${place.name} · Halivivu`,
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
      quickInfo: true,
      isFeatured: true,
      viewCount: true,
      provinceName: true,
      parentId: true,
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
        // 'spot' = đặc trưng nhỏ chỉ ở 1 spot → không hiện ở cấp điểm đến.
        where: { ...pub, kind: { not: "spot" } },
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
        take: 6,
        select: {
          slug: true,
          name: true,
          description: true,
          durationText: true,
          seasonText: true,
          images: listingImages,
        },
      },
      spots: {
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
        take: 7,
        select: {
          slug: true,
          name: true,
          tagline: true,
          category: true,
          wardName: true,
          districtName: true,
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
          images: listingImages,
        },
      },
      accommodations: {
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
        take: 4,
        select: {
          slug: true,
          name: true,
          category: true,
          isVerified: true,
          images: listingImages,
        },
      },
      videos: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { videoId: true, caption: true },
      },
    },
  });

  const staff = await isStaffViewer();
  if (!place || (place.status !== "published" && !staff)) notFound();

  // Trạng thái check-in "đã đến" của user hiện tại + tổng số người đã đến.
  const session = await auth();
  const userId = session?.user?.id;
  const [checkInRow, visitors] = await Promise.all([
    userId
      ? prisma.checkIn.findUnique({
          where: { userId_placeId: { userId, placeId: place.id } },
          select: { id: true },
        })
      : Promise.resolve(null),
    getVisitors("place", place.id),
  ]);
  const checkIn = { checked: !!checkInRow, isAuthed: !!userId };

  // Đánh giá (chỉ điểm đến lớn): tổng hợp review đang hiện + review của chính user.
  const isDestination = place.kind === "destination";
  const [reviewRows, myReviewRow] = isDestination
    ? await Promise.all([
        prisma.review.findMany({
          // Chỉ hiện review khi tác giả HIỆN còn đánh dấu đã đến nơi này (bỏ đánh
          // dấu → tự ẩn & không tính vào tổng hợp; đánh dấu lại → tự hiện).
          where: {
            placeId: place.id,
            isHidden: false,
            author: { checkIns: { some: { placeId: place.id } } },
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
              where: {
                placeId_authorId: { placeId: place.id, authorId: userId },
              },
              select: {
                stance: true,
                highlights: true,
                caveats: true,
                content: true,
              },
            })
          : Promise.resolve(null),
      ])
    : [[], null];
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

  const counts = await getPlaceCounts(place.id);
  const stats = buildPlaceStats(place.viewCount);
  const tabs = buildPlaceTabs(place.slug, counts);

  // Thanh chuyển nhanh: mọi điểm đến lớn gom theo miền (làm nổi cái đang xem).
  const peerGroups = await getDestinationPeerGroups();

  // Bài giới thiệu: post (đã xuất bản) nổi bật/mới nhất gắn với điểm đến này.
  const introPost = await prisma.post.findFirst({
    where: { status: "published", refs: { some: { placeId: place.id } } },
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    select: {
      slug: true,
      title: true,
      images: { where: { isCover: true }, take: 1, select: { url: true, isCover: true } },
    },
  });

  const isProvince = place.kind === "province";
  // Hero (giữ nguyên trên mọi tab — xem buildHeroImages): ảnh điểm đến + ảnh bìa
  // địa điểm con (điểm đến con nếu là tỉnh + spot), khử trùng URL.
  const heroImages = buildHeroImages(
    place.images,
    place.children,
    place.spots,
    place.slug,
    place.name,
  );

  const showChildren = isProvince && place.children.length > 0;

  // Không có mục con nào để liệt kê → hiện trạng thái rỗng thân thiện.
  const hasAnyContent =
    place.children.length > 0 ||
    place.spots.length > 0 ||
    place.activities.length > 0 ||
    place.specialties.length > 0 ||
    place.accommodations.length > 0 ||
    counts.transport > 0;

  const videos = await resolveVideos(place.videos);

  // "Trước khi đi": danh sách {label, value} biên tập trong CMS.
  const quickFacts =
    (place.quickInfo as { label: string; value: string }[] | null) ?? [];

  return (
    <div className="flex flex-1 flex-col">
      <PlaceViewTracker placeId={place.id} />
      <SiteHeader />

      <main className="flex-1">
        <PlaceHero
          place={place}
          heroImages={heroImages}
          stats={stats}
          videos={videos}
          back={{ href: "/diem-den", label: "Điểm đến" }}
          checkIn={checkIn}
          visitors={visitors}
          reviews={
            isDestination && reviewSummary.total > 0
              ? { stars: reviewSummary.stars, total: reviewSummary.total }
              : undefined
          }
        />

        {/* Thanh tab: Tổng quan + xem tất cả từng listing + nút Video */}
        <PlaceTabs items={tabs} videos={videos} placeName={place.name} />

        <div className="mx-auto max-w-7xl space-y-16 px-4 py-14 sm:space-y-20 sm:px-6 sm:py-20">
          {/* Đôi nét */}
          {(place.description || quickFacts.length > 0) && (
            <section id="doi-net" className="scroll-mt-32">
              <SectionHeading title={`Đôi nét về ${place.name}`} />
              <div
                className={
                  quickFacts.length > 0
                    ? "mt-5 grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-16"
                    : "mt-5"
                }
              >
                <div className={quickFacts.length > 0 ? "" : "max-w-prose"}>
                  {place.description && (
                    <p className="whitespace-pre-line leading-8 text-foreground/90">
                      {place.description}
                    </p>
                  )}
                  {place.tags.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {place.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
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
                </div>
                {quickFacts.length > 0 && <QuickInfo facts={quickFacts} />}
              </div>
            </section>
          )}

          {/* Điểm đến con (chỉ tỉnh) — lưới (là Place, cấp khác) */}
          {showChildren && (
            <section id="diem-den-con" className="scroll-mt-32">
              <SectionHeading title={`Điểm đến tại ${place.name}`} />
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {place.children.map((c) => (
                  <PlaceCard key={c.slug} place={c} />
                ))}
              </div>
            </section>
          )}

          {/* Tham quan (Spot) — rail */}
          {place.spots.length > 0 && (
            <section id="tham-quan" className="scroll-mt-32">
              <SpotShowcase
                title="Địa điểm đáng ghé"
                count={counts.spot}
                allHref={`/diem-den/${place.slug}/dia-diem`}
                spots={place.spots.map((s) => ({
                  slug: s.slug,
                  name: s.name,
                  category: s.category
                    ? label(SPOT_CATEGORY_LABELS, s.category)
                    : null,
                  location: s.wardName ?? s.districtName ?? null,
                  image: coverUrl(s.images, s.slug),
                  tagline: s.tagline,
                }))}
              />
            </section>
          )}

          {/* Trải nghiệm — rail cuộn ngang */}
          {place.activities.length > 0 && (
            <section id="trai-nghiem" className="scroll-mt-32">
              <SectionHeading
                title="Trải nghiệm nổi bật"
                href={`/diem-den/${place.slug}/hoat-dong`}
                count={counts.activity}
                unit="trải nghiệm"
              />
              <Rail itemClassName="basis-4/5 sm:basis-2/5 lg:basis-1/4">
                {place.activities.map((a) => (
                  <ExperienceCard
                    key={a.slug}
                    href={`/hoat-dong/${a.slug}`}
                    name={a.name}
                    slug={a.slug}
                    images={a.images}
                    description={a.description ?? undefined}
                    facts={[
                      a.durationText && { icon: Clock, text: a.durationText },
                      a.seasonText && {
                        icon: CalendarDays,
                        text: a.seasonText,
                      },
                    ].filter(
                      (x): x is { icon: LucideIcon; text: string } => Boolean(x),
                    )}
                  />
                ))}
              </Rail>
            </section>
          )}

          {/* Ẩm thực (đặc sản) — rail card nhỏ */}
          {place.specialties.length > 0 && (
            <section id="am-thuc" className="scroll-mt-32">
              <SectionHeading
                title="Đặc sản địa phương"
                href={`/diem-den/${place.slug}/am-thuc`}
                count={counts.specialty + counts.eatery}
                unit="món"
              />
              <Rail itemClassName="basis-2/5 sm:basis-1/4 lg:basis-1/5">
                {place.specialties.map((sp) => (
                  <SpecialtyCard
                    key={sp.slug}
                    href={`/diem-den/${place.slug}/am-thuc#specialty-${sp.slug}`}
                    name={sp.name}
                    slug={sp.slug}
                    images={sp.images}
                  />
                ))}
              </Rail>
            </section>
          )}

          {/* Lưu trú — rail */}
          {place.accommodations.length > 0 && (
            <section id="luu-tru" className="scroll-mt-32">
              <SectionHeading
                title="Nơi lưu trú"
                href={`/diem-den/${place.slug}/luu-tru`}
                count={counts.accommodation}
                unit="chỗ ở"
              />
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {place.accommodations.map((ac) => (
                  <StayCard
                    key={ac.slug}
                    href={`/luu-tru/${ac.slug}`}
                    name={ac.name}
                    slug={ac.slug}
                    images={ac.images}
                    category={
                      ac.category
                        ? label(ACCOMMODATION_CATEGORY_LABELS, ac.category)
                        : null
                    }
                    isVerified={ac.isVerified}
                  />
                ))}
              </div>
            </section>
          )}

          {!hasAnyContent && (
            <div className="rounded-2xl border border-dashed border-border/70 px-6 py-16 text-center">
              <Compass className="mx-auto size-8 text-muted-foreground/60" aria-hidden />
              <p className="mt-3 font-medium">Nội dung đang được cập nhật</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Điểm đến này chưa có địa điểm, trải nghiệm hay nơi lưu trú nào — quay
                lại sau nhé.
              </p>
            </div>
          )}

          {/* Đánh giá của Vivu-er (chỉ điểm đến lớn) */}
          {isDestination && (
            <ReviewsSection
              target={{
                kind: "place",
                id: place.id,
                slug: place.slug,
                name: place.name,
                image: coverUrl(place.images, place.slug, 96, 96),
              }}
              summary={reviewSummary}
              reviews={reviewItems}
              myReview={myReviewRow}
              isAuthed={checkIn.isAuthed}
            />
          )}
        </div>

        {/* Cẩm nang */}
        <RelatedPosts type="place" id={place.id} />
      </main>

      <SiteFooter />
      <PeerBar
        groups={peerGroups}
        currentSlug={place.slug}
        prefix="diem-den"
        title="Điểm đến"
      />
    </div>
  );
}


/* ── Thẻ "Trước khi đi" cạnh đoạn Giới thiệu (nội dung từ CMS) ─────── */
function QuickInfo({ facts }: { facts: { label: string; value: string }[] }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-5">
      <p className="text-sm font-semibold">Trước khi đi</p>
      <dl className="mt-2 divide-y divide-border/60">
        {facts.map((f, i) => (
          <div
            key={i}
            className="flex items-baseline justify-between gap-4 py-2.5"
          >
            <dt className="text-sm text-muted-foreground">{f.label}</dt>
            <dd className="text-right text-sm font-medium">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

