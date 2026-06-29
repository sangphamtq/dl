import { notFound } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ThreadType } from "@/generated/prisma/enums";
import { coverUrl } from "@/lib/place-image";
import { isThreadType, isThreadSort } from "@/lib/community";
import { getFeed, getTrips } from "@/lib/community-feed";
import { ablyEnabled, placeFeedChannel } from "@/lib/ably";
import {
  getPlaceHeader,
  getPlaceHero,
  getPlaceCounts,
  buildPlaceTabs,
  buildPlaceStats,
} from "@/lib/place-meta";
import { getDestinationPeerGroups } from "@/lib/peers";
import { isStaffViewer } from "@/lib/preview";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PeerBar } from "@/components/site/peer-bar";
import { PlaceHero } from "@/components/site/place-hero";
import { PlaceTabs } from "@/components/site/place-tabs";
import { PostComposer } from "@/components/community/post-composer";
import { PostCard } from "@/components/community/post-card";
import { CommunityFilter } from "@/components/community/community-filter";
import { CommunitySort } from "@/components/community/community-sort";
import { CommunitySidebar } from "@/components/community/community-sidebar";
import { RealtimeRefresher } from "@/components/community/realtime-refresher";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ placeSlug: string }>;
}) {
  const { placeSlug } = await params;
  const place = await getPlaceHeader(placeSlug);
  if (!place) return {};
  return { title: `Cộng đồng ${place.name} · Hành Trình Việt` };
}

export default async function PlaceCommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ placeSlug: string }>;
  searchParams: Promise<{ type?: string; sort?: string }>;
}) {
  const { placeSlug } = await params;
  const heroData = await getPlaceHero(placeSlug);
  const staff = await isStaffViewer();
  if (!heroData || (heroData.place.status !== "published" && !staff)) notFound();
  const place = heroData.place;

  const sp = await searchParams;
  const type = sp.type && isThreadType(sp.type) ? sp.type : "all";
  const sort = sp.sort && isThreadSort(sp.sort) ? sp.sort : "active";

  const session = await auth();
  const currentUserId = session?.user?.id ?? null;
  const isAuthed = !!currentUserId;
  const role = session?.user?.role;
  const isStaff = role === "admin" || role === "editor";
  const rt = ablyEnabled();

  const [counts, peerGroups, { posts }, grouped, trips] = await Promise.all([
    getPlaceCounts(place.id),
    getDestinationPeerGroups(),
    getFeed({
      placeId: place.id,
      type: type === "all" ? undefined : (type as ThreadType),
      sort,
      take: 20,
      currentUserId,
    }),
    prisma.thread.groupBy({
      by: ["type"],
      where: { isHidden: false, placeId: place.id },
      _count: { _all: true },
    }),
    getTrips({ placeId: place.id }),
  ]);

  const checkInCount = await prisma.checkIn.count({ where: { placeId: place.id } });
  const stats = buildPlaceStats(place.viewCount, checkInCount);
  const tabs = buildPlaceTabs(place.slug, counts);

  // Trạng thái check-in "đã đến" của user hiện tại (nút ở hero).
  const checkIn = {
    checked: currentUserId
      ? !!(await prisma.checkIn.findUnique({
          where: { userId_placeId: { userId: currentUserId, placeId: place.id } },
          select: { id: true },
        }))
      : false,
    isAuthed: !!currentUserId,
  };

  const totalAll = grouped.reduce((s, g) => s + g._count._all, 0);
  const countOf = (v: string) =>
    v === "all" ? totalAll : (grouped.find((g) => g.type === v)?._count._all ?? 0);
  const base = `/diem-den/${place.slug}/cong-dong`;
  const hrefWith = (patch: { type?: string; sort?: string }) => {
    const params = new URLSearchParams();
    const t = patch.type ?? type;
    const s = patch.sort ?? sort;
    if (t !== "all") params.set("type", t);
    if (s !== "active") params.set("sort", s);
    const qs = params.toString();
    return `${base}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <RealtimeRefresher
        channelKey={placeFeedChannel(place.slug)}
        event="feed:changed"
        enabled={rt}
      />

      <main className="flex-1">
        <PlaceHero
          place={place}
          heroImages={heroData.heroImages}
          stats={stats}
          videos={heroData.videos}
          back={{ href: `/diem-den/${place.slug}`, label: "Tổng quan" }}
          checkIn={checkIn}
        />

        <PlaceTabs items={tabs} videos={heroData.videos} placeName={place.name} />

        <div className="bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Thảo luận cộng đồng
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Hỏi đáp, chia sẻ và rủ nhau đi {place.name}.
            </p>
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
            {/* Cột feed */}
            <div className="min-w-0">
              <PostComposer
                isAuthed={isAuthed}
                currentUserName={session?.user?.name ?? null}
                fixedPlaceId={place.id}
              />

              {/* Lọc theo loại + sắp xếp */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <CommunityFilter
                    current={type}
                    counts={countOf}
                    hrefFor={(v) => hrefWith({ type: v })}
                  />
                </div>
                <CommunitySort
                  current={sort}
                  hrefFor={(v) => hrefWith({ sort: v })}
                />
              </div>

              {posts.length > 0 ? (
                <div className="mt-5 space-y-4">
                  {posts.map((p) => (
                    <PostCard
                      key={p.id}
                      post={p}
                      currentUserId={currentUserId}
                      isStaff={isStaff}
                      isAuthed={isAuthed}
                      realtimeEnabled={rt}
                      showPlace={false}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-8 flex flex-col items-center justify-center py-16 text-center">
                  <MessagesSquare
                    className="size-10 text-muted-foreground"
                    aria-hidden
                  />
                  <p className="mt-4 text-muted-foreground">
                    Chưa có bài nào{type !== "all" ? " ở mục này" : ""}. Hãy là
                    người mở đầu!
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="lg:sticky lg:top-32 lg:self-start">
              <CommunitySidebar
                about={{
                  name: place.name,
                  cover: coverUrl(place.images, place.slug, 640, 360),
                  count: totalAll,
                }}
                trips={trips}
                bottomLink={{ href: "/cong-dong", label: "Cộng đồng toàn quốc" }}
              />
            </aside>
          </div>
        </div>
        </div>
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
