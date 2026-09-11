import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { coverUrl } from "@/lib/place-image";
import { cn } from "@/lib/utils";
import { PlaceAboutVideo } from "@/components/site/place-about-video";
import {
  SPOT_CATEGORY_LABELS,
  ACTIVITY_CATEGORY_LABELS,
  ACCOMMODATION_CATEGORY_LABELS,
  EATERY_CATEGORY_LABELS,
  label,
} from "@/lib/listing-labels";
import { RelatedPosts } from "@/components/site/related-posts";
import { isStaffViewer } from "@/lib/preview";
import { PlaceCard } from "@/components/site/place-card";
import { SectionHeading } from "@/components/site/section-heading";
import { SpotPreview } from "@/components/site/spot-preview";
import { ExperienceGrid } from "@/components/site/experience-grid";
import { FoodMenu } from "@/components/site/food-menu";
import { StayDirectory } from "@/components/site/stay-directory";
import { TransportBrief } from "@/components/site/transport-brief";
import { CommunityPreview } from "@/components/site/community-preview";
import { getPlaceCommunityDigest } from "@/lib/community-feed";
import { getSettings } from "@/lib/settings";
import { PlaceViewTracker } from "@/components/site/place-view-tracker";
import { PlaceHero } from "@/components/site/place-hero";
import { PlaceHeroCenter } from "@/components/site/place-hero-center";
import { PlaceTabs } from "@/components/site/place-tabs";
import { ReviewsSection, type ReviewListItem } from "@/components/site/place-reviews";
import { summarizeReviews } from "@/lib/review-meta";
import { PeerBar } from "@/components/site/peer-bar";
import { PlainProse } from "@/components/site/plain-prose";
import { Glyph } from "@/components/site/glyphs";
import { ticketPriceLabel } from "@/lib/tickets";
import { R_CARD } from "@/lib/radius";

import { getDestinationPeerGroups } from "@/lib/peers";
import {
  getPlaceCounts,
  buildPlaceTabs,
  buildPlaceStats,
  buildHeroImages,
  resolveVideos,
  getVisitors,
} from "@/lib/place-meta";
import { notFoundMetadata } from "@/lib/metadata";

const pub = { status: "published" as const };

function Band({
  tint,
  minor,
  children,
}: {
  tint?: boolean;
  minor?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={tint ? "bg-muted/60" : undefined}>
      <div
        className={cn(
          "mx-auto max-w-7xl space-y-16 px-4 sm:space-y-20 sm:px-6",
          minor ? "py-10 sm:py-12" : "py-14 sm:py-20",
        )}
      >
        {children}
      </div>
    </div>
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
  if (!place || place.status !== "published") return notFoundMetadata;
  return {
    title: `${place.name}`,
    description: place.description ?? undefined,
  };
}

// Cờ TẠM ẨN phần Cộng đồng trên trang điểm đến (cùng đợt gỡ khỏi header và
// thanh tab). Khai báo kiểu `boolean` chứ KHÔNG để TS suy ra literal `false`:
// literal khiến TS coi nhánh JSX bên trong là không chạm tới được, và mọi thu
// hẹp kiểu (vd `place` đã qua `notFound()`) không còn hiệu lực trong đó.
const COMMUNITY_ENABLED: boolean = false;

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
        where: { ...pub, kind: { not: "spot" } },
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
        take: 4,
        select: {
          slug: true,
          name: true,
          description: true,
          category: true,
          durationText: true,
          seasonText: true,
          images: listingImages,
          spotLinks: {
            take: 2,
            orderBy: { order: "asc" },
            select: { spot: { select: { name: true } } },
          },
          _count: { select: { spotLinks: true } },
        },
      },
      spots: {
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
        take: 5,
        select: {
          slug: true,
          name: true,
          tagline: true,
          description: true,
          category: true,
          wardName: true,
          images: listingImages,
          bestTime: true,
          notice: true,
          ticketFree: true,
          ticketTiers: true,
        },
      },
      // Đặc sản (Specialty) KHÔNG còn được lấy: phần món ăn đã tắt hiển thị
      // công khai. Dữ liệu vẫn nguyên trong DB, chỉ là không render ở đâu.
      // CHỈ quán ĂN. Quán nước lấy bằng truy vấn riêng bên dưới: nhét chung một
      // `take: 3` thì quán nước gần như không bao giờ lọt (chúng đứng cuối theo
      // `order`), mà đó lại là thứ đáng xem nhất ở những nơi đi vì cảnh.
      eateries: {
        where: { ...pub, venueKind: { in: ["eat", "both"] as const } },
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
        take: 6,
        select: {
          slug: true,
          name: true,
          category: true,
          venueKind: true,
          viewType: true,
          bestTime: true,
          meals: true,
          wardName: true,
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
          address: true,
          isVerified: true,
          images: listingImages,
        },
      },
      // Di chuyển — mục này trước đây KHÔNG được truy vấn ở trang tổng quan, dù
      // thanh tab vẫn đếm và quảng cáo "Di chuyển N". Chỉ lấy đúng các trường mà
      // bảng tuyến cần; phần hướng dẫn bằng lời (nhà xe, hotline, cảnh báo) để
      // dành cho màn hình /di-chuyen.
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
          distanceKm: true,
          priceFrom: true,
          priceTo: true,
          isRecommended: true,
        },
      },
      videos: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { videoId: true, caption: true },
      },
    },
  });

  const staff = await isStaffViewer();
  const settings = await getSettings();
  if (!place || (place.status !== "published" && !staff)) notFound();

  const session = await auth();
  const userId = session?.user?.id;
  const [checkInRow, visitors, tripTemplates] = await Promise.all([
    userId
      ? prisma.checkIn.findUnique({
          where: { userId_placeId: { userId, placeId: place.id } },
          select: { id: true },
        })
      : Promise.resolve(null),
    getVisitors("place", place.id),
    prisma.trip.findMany({
      where: { isTemplate: true, status: "published", placeId: place.id },
      orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
      take: 3,
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        _count: {
          select: {
            days: true,
            items: { where: { dayId: { not: null } } },
          },
        },
      },
    }),
  ]);
  const checkIn = { checked: !!checkInRow, isAuthed: !!userId };

  const isDestination = place.kind === "destination";
  const [reviewRows, myReviewRow] = isDestination
    ? await Promise.all([
        prisma.review.findMany({
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

  const [spotFacts, activityFacts, foodFacts, stayFacts] = await Promise.all([
    counts.spot > 0
      ? prisma.spot.findMany({
          where: { placeId: place.id, ...pub },
          select: { category: true, ticketFree: true, ticketTiers: true, notice: true },
        })
      : Promise.resolve([]),
    counts.activity > 0
      ? prisma.activity.findMany({
          where: { placeId: place.id, ...pub, kind: { not: "spot" } },
          select: { category: true, seasonText: true },
        })
      : Promise.resolve([]),
    counts.eatery > 0
      ? prisma.eatery.findMany({
          where: { placeId: place.id, ...pub },
          select: { category: true, viewType: true, bestTime: true },
        })
      : Promise.resolve([]),
    counts.accommodation > 0
      ? prisma.accommodation.findMany({
          where: { placeId: place.id, ...pub },
          select: { category: true, isVerified: true },
        })
      : Promise.resolve([]),
  ]);
  const verifiedStays = stayFacts.filter((f) => f.isVerified).length;
  const drinkVenues =
    counts.eatery > 0
      ? await prisma.eatery.findMany({
          where: {
            placeId: place.id,
            ...pub,
            venueKind: { in: ["drink", "both"] },
          },
          orderBy: [
            { isFeatured: "desc" },
            { order: "asc" },
            { name: "asc" },
          ],
          take: 6,
          select: {
            slug: true,
            name: true,
            category: true,
            venueKind: true,
            viewType: true,
            bestTime: true,
            meals: true,
            wardName: true,
            images: listingImages,
          },
        })
      : [];

  const stats = buildPlaceStats(place.viewCount);
  const tabs = buildPlaceTabs(place.slug, counts);
  const heroReviews =
    isDestination && reviewSummary.total > 0
      ? { stars: reviewSummary.stars, total: reviewSummary.total }
      : undefined;

  const community = { total: 0 } as Awaited<
    ReturnType<typeof getPlaceCommunityDigest>
  >;

  const peerGroups = await getDestinationPeerGroups();

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
  const heroImages = buildHeroImages(
    place.images,
    place.children,
    place.spots,
    place.slug,
    place.name,
  );

  const showChildren = isProvince && place.children.length > 0;

  const hasAnyContent =
    place.children.length > 0 ||
    place.spots.length > 0 ||
    place.activities.length > 0 ||
    place.eateries.length > 0 ||
    drinkVenues.length > 0 ||
    place.accommodations.length > 0 ||
    counts.transport > 0;

  const videos = await resolveVideos(place.videos);

  const quickFacts =
    (place.quickInfo as { label: string; value: string }[] | null) ?? [];

  const [lede, descBody] = splitLede(place.description);

  let bandIndex = 0;
  const tinted = () => bandIndex++ % 2 === 0;

  return (
    <div className="flex flex-1 flex-col">
      <PlaceViewTracker
        placeId={place.id}
        name={place.name}
        provinceName={place.provinceName}
      />

      <main className="flex-1">
        {settings.heroLayout === "classic" ? (
          <PlaceHero
            place={place}
            heroImages={heroImages}
            stats={stats}
            back={{ href: "/diem-den", label: "Điểm đến" }}
            checkIn={checkIn}
            visitors={visitors}
            reviews={heroReviews}
          />
        ) : (
          <PlaceHeroCenter
            place={place}
            heroImages={heroImages}
            stats={stats}
            back={{ href: "/diem-den", label: "Điểm đến" }}
            checkIn={checkIn}
            visitors={visitors}
            reviews={heroReviews}
          />
        )}

        <PlaceTabs items={tabs} />

        {(place.description || quickFacts.length > 0 || showChildren) && (
        <Band>
          {(place.description || quickFacts.length > 0) && (
            <section id="doi-net" className="scroll-mt-32">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_18rem] md:items-start md:gap-10 lg:grid-cols-[1fr_24rem] lg:gap-14">
                <div>
                  {lede && (
                    <p className="max-w-[46rem] text-xl font-medium leading-relaxed text-foreground first-letter:float-left first-letter:mr-2.5 first-letter:mt-1 first-letter:text-[3.25rem] first-letter:font-semibold first-letter:leading-[0.85] sm:text-2xl sm:leading-relaxed sm:first-letter:text-[4rem]">
                      {lede}
                    </p>
                  )}
                  {descBody && (
                    <PlainProse
                      text={descBody}
                      className="mt-4 max-w-[46rem] leading-7 text-muted-foreground"
                    />
                  )}
                  {introPost && (
                    <Link
                      href={`/blog/${introPost.slug}`}
                      className="group mt-6 flex max-w-[46rem] items-center gap-4"
                    >
                      <span className={cn(R_CARD, "relative size-14 shrink-0 overflow-hidden bg-muted")}>
                        <Image
                          src={coverUrl(
                            introPost.images,
                            introPost.slug,
                            160,
                            160,
                          )}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                          Bài giới thiệu
                        </span>
                        <span className="mt-0.5 line-clamp-2 font-semibold leading-6 text-foreground decoration-primary/40 underline-offset-4 transition-colors group-hover:text-primary group-hover:underline">
                          {introPost.title}
                        </span>
                      </span>
                      <Glyph
                        name="forward"
                        className="size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary"
                      />
                    </Link>
                  )}
                </div>
                {videos.length > 0 ? (
                  <PlaceAboutVideo videos={videos} placeName={place.name} />
                ) : (
                  <AboutMedia
                    images={heroImages}
                    slug={place.slug}
                    name={place.name}
                  />
                )}
              </div>

              {quickFacts.length > 0 && <QuickInfo facts={quickFacts} />}
            </section>
          )}


          {showChildren && (
            <section id="diem-den-con" className="scroll-mt-32">
              <SectionHeading serif title={`Điểm đến ở ${place.name}`} />
              <div
                className={cn(
                  "mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2",
                  place.children.length === 1
                    ? "max-w-sm"
                    : place.children.length === 2
                      ? "lg:max-w-2xl"
                      : place.children.length === 3
                        ? "lg:grid-cols-3"
                        : "lg:grid-cols-4",
                )}
              >
                {place.children.map((c) => (
                  <PlaceCard key={c.slug} place={c} />
                ))}
              </div>
            </section>
          )}
        </Band>
        )}

        {place.spots.length > 0 && (
          <Band tint={tinted()}>
          <section id="tham-quan" className="scroll-mt-32">
            <SpotPreview
              title="Địa điểm đáng ghé"
              count={counts.spot}
              allHref={`/diem-den/${place.slug}/dia-diem`}
              facts={spotFacts.map((f) => ({
                categoryLabel: f.category
                  ? label(SPOT_CATEGORY_LABELS, f.category)
                  : null,
                free: f.ticketFree,
                paid: !f.ticketFree && !!ticketPriceLabel(false, f.ticketTiers),
                noticed: !!f.notice,
              }))}
              spots={place.spots.map((s) => ({
                slug: s.slug,
                name: s.name,
                tagline: s.tagline,
                description: s.description,
                categoryLabel: s.category
                  ? label(SPOT_CATEGORY_LABELS, s.category)
                  : null,
                area: s.wardName ?? null,
                bestTime: s.bestTime,
                notice: s.notice,
                price: s.ticketFree
                  ? null
                  : ticketPriceLabel(false, s.ticketTiers),
                image: coverUrl(s.images, s.slug),
              }))}
            />
          </section>
          </Band>
        )}

        {place.activities.length > 0 && (
          <Band tint={tinted()}>
            <section id="trai-nghiem" className="scroll-mt-32">
              <ExperienceGrid
                title="Trải nghiệm nổi bật"
                href={`/diem-den/${place.slug}/hoat-dong`}
                count={counts.activity}
                unit="trải nghiệm"
                facts={activityFacts.map((f) => ({
                  categoryLabel: f.category
                    ? label(ACTIVITY_CATEGORY_LABELS, f.category)
                    : null,
                  seasonal: !!f.seasonText,
                }))}
                items={place.activities.map((a) => ({
                  slug: a.slug,
                  name: a.name,
                  category: a.category
                    ? label(ACTIVITY_CATEGORY_LABELS, a.category)
                    : null,
                  image: coverUrl(a.images, a.slug),
                  duration: shortFact(a.durationText),
                  season: shortFact(a.seasonText),
                  spotNames: a.spotLinks.map((l) => l.spot.name),
                  spotCount: a._count.spotLinks,
                }))}
              />
            </section>
          </Band>
        )}

        {(place.eateries.length > 0 || drinkVenues.length > 0) && (
          <Band tint={tinted()}>
            <section id="am-thuc" className="scroll-mt-32">
              <FoodMenu
                placeName={place.name}
                href={`/diem-den/${place.slug}/am-thuc`}
                count={counts.eatery}
                facts={foodFacts.map((f) => ({
                  categoryLabel:
                    f.category && f.category !== "other"
                      ? label(EATERY_CATEGORY_LABELS, f.category)
                      : null,
                  hasView: !!f.viewType,
                  hasBestTime: !!f.bestTime,
                }))}
                eateries={place.eateries}
                drinks={drinkVenues}
              />
            </section>
          </Band>
        )}

        {place.accommodations.length > 0 && (
          <Band tint={tinted()}>
            <section id="luu-tru" className="scroll-mt-32">
              <StayDirectory
                placeName={place.name}
                href={`/diem-den/${place.slug}/luu-tru`}
                total={counts.accommodation}
                verifiedTotal={verifiedStays}
                facts={stayFacts.map((f) => ({
                  categoryLabel: f.category
                    ? label(ACCOMMODATION_CATEGORY_LABELS, f.category)
                    : null,
                }))}
                stays={place.accommodations}
              />
            </section>
          </Band>
        )}

        {place.transports.length > 0 && (
          <Band tint={tinted()}>
            <section id="di-chuyen" className="scroll-mt-32">
              <SectionHeading
                serif
                title={`Đi lại ở ${place.name}`}
                href={`/diem-den/${place.slug}/di-chuyen`}
                linkLabel="Xem hướng dẫn đầy đủ"
              />
              <div className="mt-7">
                <TransportBrief items={place.transports} />
              </div>
            </section>
          </Band>
        )}

        {tripTemplates.length > 0 && (
          <Band tint={tinted()} minor>
            <section id="lich-trinh" className="scroll-mt-32">
              <SectionHeading
                serif
                title={`Gợi ý lịch trình ở ${place.name}`}
                href="/lich-trinh"
                size="minor"
              />
              <ul
                className={cn(
                  "mt-5 grid grid-cols-1 gap-4",
                  tripTemplates.length === 1
                    ? "max-w-xl"
                    : tripTemplates.length === 2
                      ? "sm:grid-cols-2 lg:max-w-4xl"
                      : "sm:grid-cols-2 lg:grid-cols-3",
                )}
              >
                {tripTemplates.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/lich-trinh/${t.slug}`}
                      className={cn(
                        R_CARD,
                        "group flex h-full flex-col border border-border bg-card p-5 transition-colors hover:border-foreground",
                      )}
                    >
                      <span className="flex items-center gap-x-2 text-xs text-muted-foreground">
                        <Glyph name="route" className="size-4 shrink-0" />
                        <span>
                          <b className="font-semibold tabular-nums text-foreground">
                            {t._count.days}
                          </b>{" "}
                          ngày
                        </span>
                        <span className="ps-3">
                          <b className="font-semibold tabular-nums text-foreground">
                            {t._count.items}
                          </b>{" "}
                          điểm dừng
                        </span>
                      </span>
                      <span className="mt-2 font-[family-name:var(--font-display)] font-semibold leading-snug tracking-tight underline-offset-4 group-hover:underline">
                        {t.title}
                      </span>
                      {t.summary && (
                        <span className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                          {t.summary}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </Band>
        )}

        {!hasAnyContent && (
          <Band tint={tinted()}>
            <div className={cn(R_CARD, "border border-dashed border-border px-6 py-16 text-center")}>
              <Glyph
                name="navigation"
                className="mx-auto size-10 text-muted-foreground/60"
              />
              <p className="mt-3 font-medium">Nội dung đang được cập nhật</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Điểm đến này chưa có địa điểm, trải nghiệm hay nơi lưu trú nào — quay
                lại sau nhé.
              </p>
            </div>
          </Band>
        )}

        {COMMUNITY_ENABLED && community.total > 0 && (
          <Band tint={tinted()}>
            <section id="hoi-dap" className="scroll-mt-32">
              <SectionHeading
                serif
                title="Hỏi đáp cộng đồng"
                href={`/diem-den/${place.slug}/cong-dong`}
                count={community.total}
                unit="thảo luận"
              />
              <CommunityPreview
                digest={community}
                href={`/diem-den/${place.slug}/cong-dong`}
                placeName={place.name}
              />
            </section>
          </Band>
        )}

        {isDestination && (
          <Band tint={tinted()}>
            <ReviewsSection
              serif
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
          </Band>
        )}

        <RelatedPosts serif type="place" id={place.id} />
      </main>

      <PeerBar
        groups={peerGroups}
        currentSlug={place.slug}
        prefix="diem-den"
        title="Điểm đến"
      />
    </div>
  );
}


function shortFact(text: string | null): string | null {
  if (!text) return null;
  const head = text.split(/[;(]/)[0].trim().replace(/[,.]$/, "");
  return head || null;
}

function splitLede(text: string | null): [string | null, string | null] {
  if (!text) return [null, null];
  const m = text.match(/^([\s\S]+?[.!?…])\s+(?=[\p{Lu}"'"“„])/u);
  const first = m?.[1];
  if (!first || first.length < 40 || first.length > 320) return [null, text];
  return [first, text.slice(m[0].length) || null];
}

function AboutMedia({
  images,
  slug,
  name,
}: {
  images: { url: string; alt?: string | null }[];
  slug: string;
  name: string;
}) {
  const big = images[0] ?? { url: coverUrl([], `${slug}-doi-net`, 900, 1100) };
  const small = images[1];
  return (
    <div className="mx-auto w-full max-w-[15rem] space-y-3 lg:max-w-none">
      <div className={cn(R_CARD, "relative aspect-[3/4] overflow-hidden bg-muted")}>
        <Image
          src={big.url}
          alt={big.alt || name}
          fill
          sizes="(min-width: 1024px) 16rem, 15rem"
          className="object-cover"
        />
      </div>
      {small && (
        <div className={cn(R_CARD, "relative aspect-[16/10] overflow-hidden bg-muted")}>
          <Image
            src={small.url}
            alt={small.alt || name}
            fill
            sizes="(min-width: 1024px) 16rem, 15rem"
            className="object-cover"
          />
        </div>
      )}
    </div>
  );
}

function QuickInfo({ facts }: { facts: { label: string; value: string }[] }) {
  return (
    <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-y border-border/60 py-6 md:grid-cols-4">
      {facts.map((f, i) => (
        <div key={i}>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {f.label}
          </dt>
          <dd className="mt-1.5 break-words text-sm font-medium leading-6 text-foreground">
            {f.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

