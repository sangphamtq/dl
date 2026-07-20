import Link from "next/link";
import { notFound } from "next/navigation";
import { MessagesSquare, Ticket } from "@/components/icons";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { ThreadType } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { ticketPriceLabel } from "@/lib/tickets";
import { label, PRICE_LABELS, SPOT_CATEGORY_LABELS } from "@/lib/listing-labels";
import { isThreadType, isThreadSort } from "@/lib/community";
import { getFeed, getTrips } from "@/lib/community-feed";
import { ablyEnabled, spotFeedChannel, placeFeedChannel } from "@/lib/ably";
import { getVisitors, getReviewSummary, resolveVideos } from "@/lib/place-meta";
import { buildSpotNavItems } from "@/lib/spot-nav";
import { getListingPeers } from "@/lib/peers";
import { isStaffViewer } from "@/lib/preview";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PeerBar } from "@/components/site/peer-bar";
import { type HeroImage } from "@/components/site/place-hero-stack";
import { SpotHero, type SpotQuickFact } from "@/components/site/spot-hero";
import { SpotSectionNav } from "@/components/site/spot-section-nav";
import { PostComposer } from "@/components/community/post-composer";
import { PostCard } from "@/components/community/post-card";
import { CommunityFilter } from "@/components/community/community-filter";
import { CommunitySort } from "@/components/community/community-sort";
import { CommunitySidebar } from "@/components/community/community-sidebar";
import { RealtimeRefresher } from "@/components/community/realtime-refresher";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const spot = await prisma.spot.findUnique({
    where: { slug },
    select: { name: true },
  });
  if (!spot) return {};
  return { title: `Cộng đồng ${spot.name} · Halivivu` };
}

export default async function SpotCommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string; sort?: string; scope?: string }>;
}) {
  const { slug } = await params;
  const spot = await prisma.spot.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      tagline: true,
      slug: true,
      status: true,
      category: true,
      placeId: true,
      ticketFree: true,
      ticketTiers: true,
      priceRange: true,
      description: true,
      notice: true,
      bestTimeNote: true,
      gettingThere: true,
      tips: true,
      place: { select: { slug: true, name: true } },
      images: {
        orderBy: [{ isCover: "desc" }, { order: "asc" }],
        select: { url: true, alt: true, isCover: true },
      },
      videos: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { videoId: true, caption: true },
      },
      _count: { select: { highlights: true, activityLinks: true } },
    },
  });

  const staff = await isStaffViewer();
  if (!spot || (spot.status !== "published" && !staff)) notFound();

  const sp = await searchParams;
  const type = sp.type && isThreadType(sp.type) ? sp.type : "all";
  const sort = sp.sort && isThreadSort(sp.sort) ? sp.sort : "active";
  // Phạm vi (2 lựa chọn): all = cả điểm đến lớn + địa điểm; spot = chỉ địa điểm.
  const scope: "all" | "spot" = sp.scope === "spot" ? "spot" : "all";
  // Đối số lọc theo phạm vi cho getFeed, và where tương ứng cho groupBy đếm.
  const feedScope =
    scope === "spot"
      ? { spotId: spot.id }
      : { spotId: spot.id, includeParentPlaceId: spot.placeId };
  const scopeWhere: Prisma.ThreadWhereInput =
    scope === "spot"
      ? { spotId: spot.id }
      : { OR: [{ spotId: spot.id }, { placeId: spot.placeId }] };

  const session = await auth();
  const currentUserId = session?.user?.id ?? null;
  const isAuthed = !!currentUserId;
  const role = session?.user?.role;
  const isStaff = role === "admin" || role === "editor";
  const rt = ablyEnabled();

  const [{ posts }, grouped, trips, visitors, reviewSummary, checkInRow, introPost, nearbyCount] =
    await Promise.all([
      getFeed({
        ...feedScope, // theo phạm vi: địa điểm / điểm đến cha / cả hai
        type: type === "all" ? undefined : (type as ThreadType),
        sort,
        take: 20,
        currentUserId,
      }),
      prisma.thread.groupBy({
        by: ["type"],
        where: { isHidden: false, ...scopeWhere },
        _count: { _all: true },
      }),
      getTrips({ spotId: spot.id, includeParentPlaceId: spot.placeId }),
      getVisitors("spot", spot.id),
      getReviewSummary("spot", spot.id),
      currentUserId
        ? prisma.checkIn.findUnique({
            where: { userId_spotId: { userId: currentUserId, spotId: spot.id } },
            select: { id: true },
          })
        : Promise.resolve(null),
      prisma.post.findFirst({
        where: { status: "published", refs: { some: { spotId: spot.id } } },
        select: { id: true },
      }),
      // "Quanh đây" có dữ liệu không (để mục nav khớp trang chi tiết).
      Promise.all([
        prisma.spot.count({
          where: { placeId: spot.placeId, status: "published", slug: { not: slug } },
        }),
        prisma.eatery.count({ where: { placeId: spot.placeId, status: "published" } }),
        prisma.accommodation.count({
          where: { placeId: spot.placeId, status: "published" },
        }),
      ]).then(([s, e, a]) => s + e + a),
    ]);

  // ── Dữ liệu hero (dùng chung component SpotHero với trang chi tiết) ──
  const heroImages: HeroImage[] = spot.images.map((i) => ({
    url: i.url,
    alt: i.alt,
    caption: null,
  }));
  if (heroImages.length === 0) {
    heroImages.push({ url: coverUrl([], spot.slug, 1200, 800), alt: spot.name });
  }
  const videos = await resolveVideos(spot.videos);
  const quickFacts: SpotQuickFact[] = [
    {
      icon: Ticket,
      label: "Mức giá",
      value:
        ticketPriceLabel(spot.ticketFree, spot.ticketTiers) ??
        label(PRICE_LABELS, spot.priceRange),
      muted: false,
    },
  ].filter((f): f is SpotQuickFact => Boolean(f.value));
  const checkIn = { checked: !!checkInRow, isAuthed };

  // Mục nav: giống trang chi tiết, nhưng các mục nội dung là link về
  // "/dia-diem/[slug]#id"; "Cộng đồng" là trang hiện tại (currentId).
  const navItems = buildSpotNavItems(
    spot.slug,
    spot.place.slug,
    {
      hasIntro: !!(spot.description || introPost),
      hasHighlights: spot._count.highlights > 0,
      hasActivities: spot._count.activityLinks > 0,
      hasExperience: spot.tips.length > 0 || !!spot.notice,
      hasBestTime: !!spot.bestTimeNote,
      hasGettingThere: !!spot.gettingThere,
      hasNearby: nearbyCount > 0,
    },
    { community: true },
  );

  const spotPeers = await getListingPeers("spot", spot.placeId);

  const totalAll = grouped.reduce((s, g) => s + g._count._all, 0);
  const countOf = (v: string) =>
    v === "all" ? totalAll : (grouped.find((g) => g.type === v)?._count._all ?? 0);
  const base = `/dia-diem/${spot.slug}/cong-dong`;
  const hrefWith = (patch: { type?: string; sort?: string; scope?: string }) => {
    const params = new URLSearchParams();
    const t = patch.type ?? type;
    const s = patch.sort ?? sort;
    const sc = patch.scope ?? scope;
    if (t !== "all") params.set("type", t);
    if (s !== "active") params.set("sort", s);
    if (sc !== "all") params.set("scope", sc);
    const qs = params.toString();
    return `${base}${qs ? `?${qs}` : ""}`;
  };

  // Bộ lọc phạm vi (2 lựa chọn): cả điểm đến lớn hoặc chỉ địa điểm này.
  const scopeOptions: { value: "all" | "spot"; label: string }[] = [
    { value: "all", label: spot.place.name },
    { value: "spot", label: "Địa điểm" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <RealtimeRefresher
        channelKey={spotFeedChannel(spot.slug)}
        event="feed:changed"
        enabled={rt}
      />
      {/* Bài của điểm đến cha cũng hiển thị ở đây → nghe kênh của place để tự mới */}
      <RealtimeRefresher
        channelKey={placeFeedChannel(spot.place.slug)}
        event="feed:changed"
        enabled={rt}
      />

      <main className="flex-1">
        <SpotHero
          id={spot.id}
          name={spot.name}
          tagline={spot.tagline}
          place={spot.place}
          checkInImage={coverUrl(spot.images, spot.slug, 96, 96)}
          categoryLabel={label(SPOT_CATEGORY_LABELS, spot.category) || null}
          heroImages={heroImages}
          videos={videos}
          quickFacts={quickFacts}
          checkIn={checkIn}
          visitors={visitors}
          reviewSummary={reviewSummary}
          reviewsHref={`/dia-diem/${spot.slug}#danh-gia`}
          checkInRedirect={base}
        />

        <SpotSectionNav items={navItems} currentId="cong-dong" />

        <div className="bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Thảo luận về {spot.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Hỏi đáp, chia sẻ kinh nghiệm và rủ nhau ghép đoàn · {totalAll} bài
              </p>
            </div>

            <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
              {/* Cột feed */}
              <div className="min-w-0">
                <PostComposer
                  isAuthed={isAuthed}
                  currentUserName={session?.user?.name ?? null}
                  fixedSpotId={spot.id}
                />

                {/* Thanh công cụ: lọc theo loại; hàng dưới = phạm vi + sắp xếp */}
                <div className="mt-6">
                  <CommunityFilter
                    current={type}
                    counts={countOf}
                    hrefFor={(v) => hrefWith({ type: v })}
                  />
                  <div className="mt-2.5 flex items-center justify-between gap-3">
                    {/* Phạm vi: cả điểm đến lớn hoặc chỉ địa điểm này */}
                    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-border/60 bg-card p-1 text-sm">
                      {scopeOptions.map((o) => (
                        <Link
                          key={o.value}
                          href={hrefWith({ scope: o.value })}
                          scroll={false}
                          className={cn(
                            "rounded-lg px-3 py-1 font-medium transition-colors",
                            scope === o.value
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {o.label}
                        </Link>
                      ))}
                    </div>
                    <CommunitySort
                      current={sort}
                      hrefFor={(v) => hrefWith({ sort: v })}
                    />
                  </div>
                </div>

                {posts.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    {posts.map((p) => (
                      <PostCard
                        key={p.id}
                        post={p}
                        currentUserId={currentUserId}
                        isStaff={isStaff}
                        isAuthed={isAuthed}
                        realtimeEnabled={rt}
                        showPlace={true}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-card/50 py-14 text-center">
                    <MessagesSquare
                      className="mx-auto size-8 text-muted-foreground/60"
                      aria-hidden
                    />
                    <p className="mt-3 font-medium">
                      Chưa có bài nào{type !== "all" ? " ở mục này" : ""}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Hãy là người mở đầu câu chuyện về {spot.name}!
                    </p>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <aside className="lg:sticky lg:top-32 lg:self-start">
                <CommunitySidebar
                  about={{
                    name: spot.name,
                    cover: coverUrl(spot.images, spot.slug, 640, 360),
                    count: totalAll,
                  }}
                  trips={trips}
                  bottomLink={{
                    href: `/diem-den/${spot.place.slug}/cong-dong`,
                    label: `Cộng đồng ${spot.place.name}`,
                  }}
                />
              </aside>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
      <PeerBar
        groups={[{ items: spotPeers }]}
        currentSlug={spot.slug}
        prefix="dia-diem"
        title="Địa điểm khác"
      />
    </div>
  );
}
