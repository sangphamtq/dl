import { notFound } from "next/navigation";
import { MessagesSquare } from "@/components/icons";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ThreadType } from "@/generated/prisma/enums";
import { coverUrl } from "@/lib/place-image";
import { isThreadType, isThreadSort } from "@/lib/community";
import { getFeed, getTrips } from "@/lib/community-feed";
import { ablyEnabled, placeFeedChannel } from "@/lib/ably";
import { getPlaceHeader, getPlaceHero } from "@/lib/place-meta";
import { isStaffViewer } from "@/lib/preview";
import { PostComposer } from "@/components/community/post-composer";
import { PostCard } from "@/components/community/post-card";
import { CommunityFilter } from "@/components/community/community-filter";
import { CommunitySort } from "@/components/community/community-sort";
import { CommunitySidebar } from "@/components/community/community-sidebar";
import { RealtimeRefresher } from "@/components/community/realtime-refresher";
import { notFoundMetadata } from "@/lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ placeSlug: string }>;
}) {
  const { placeSlug } = await params;
  const place = await getPlaceHeader(placeSlug);
  if (!place) return notFoundMetadata;
  return { title: `Cộng đồng ${place.name}` };
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

  const [{ posts }, grouped, trips] = await Promise.all([
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

  // Số liệu điểm đến, tab, check-in, dải lân cận: đã lên `(tabs)/layout.tsx`.

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

  // Khung (thanh ngữ cảnh · thanh tab · dải lân cận) nằm ở `(tabs)/layout.tsx`.
  return (
    <>
      <RealtimeRefresher
        channelKey={placeFeedChannel(place.slug)}
        event="feed:changed"
        enabled={rt}
      />

        <div className="bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              Thảo luận về {place.name}
            </h2>
            {/* Ngăn bằng khoảng trắng rộng, không phải dấu chấm giữa — quy
                ước dải phân cách của dự án (xem skill `design`). */}
            <p className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span>Hỏi đáp, chia sẻ kinh nghiệm và rủ nhau ghép đoàn</span>
              <span>
                <b className="font-semibold text-foreground">{totalAll}</b> bài
              </span>
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

              {/* Thanh công cụ: lọc theo loại + sắp xếp */}
              <div className="mt-6">
                <CommunityFilter
                  current={type}
                  counts={countOf}
                  hrefFor={(v) => hrefWith({ type: v })}
                />
                <div className="mt-2.5 flex justify-end">
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
                      showPlace={false}
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
                    Hãy là người mở đầu câu chuyện về {place.name}!
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
    </>
  );
}
