import Link from "next/link";
import { MapPin, MessagesSquare } from "@/components/icons";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { ThreadType } from "@/generated/prisma/enums";
import { isThreadType, isThreadSort } from "@/lib/community";
import { getFeed, getTrips } from "@/lib/community-feed";
import { getHomeProvince } from "@/lib/home-province";
import { ablyEnabled } from "@/lib/ably";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Pagination } from "@/components/pagination";
import { PostComposer } from "@/components/community/post-composer";
import { PostCard } from "@/components/community/post-card";
import { CommunityFilter } from "@/components/community/community-filter";
import { CommunitySort } from "@/components/community/community-sort";
import { CommunitySidebar } from "@/components/community/community-sidebar";
import { RealtimeRefresher } from "@/components/community/realtime-refresher";

export const metadata = {
  title: "Cộng đồng · Halivivu",
  description:
    "Chia sẻ trải nghiệm, hỏi đáp và tìm bạn đồng hành cho chuyến đi của bạn.",
};

const PER_PAGE = 10;

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    sort?: string;
    page?: string;
    near?: string;
  }>;
}) {
  const sp = await searchParams;
  const type = sp.type && isThreadType(sp.type) ? sp.type : "all";
  const sort = sp.sort && isThreadSort(sp.sort) ? sp.sort : "active";
  const page = Math.max(1, Number(sp.page) || 1);

  const session = await auth();
  const currentUserId = session?.user?.id ?? null;
  const isAuthed = !!currentUserId;
  const role = session?.user?.role;
  const isStaff = role === "admin" || role === "editor";
  const rt = ablyEnabled();

  // "Gần bạn": lọc bài ở các điểm đến thuộc tỉnh nhà (chỉ khi đã chọn tỉnh).
  const homeProvince = await getHomeProvince(currentUserId ?? undefined);
  const near = sp.near === "1" && !!homeProvince;

  const [{ posts, total }, grouped, places, trips, mySale] = await Promise.all([
    getFeed({
      type: type === "all" ? undefined : (type as ThreadType),
      nearProvince: near ? homeProvince! : undefined,
      sort,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      currentUserId,
    }),
    prisma.thread.groupBy({
      by: ["type"],
      where: { isHidden: false },
      _count: { _all: true },
    }),
    isAuthed
      ? prisma.place.findMany({
          where: { status: "published" },
          orderBy: [{ kind: "asc" }, { name: "asc" }],
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    getTrips({}),
    currentUserId
      ? prisma.saleProfile.findUnique({
          where: { userId: currentUserId },
          select: { status: true },
        })
      : Promise.resolve(null),
  ]);
  const canPostSale = mySale?.status === "approved";

  const totalAll = grouped.reduce((s, g) => s + g._count._all, 0);
  const countOf = (v: string) =>
    v === "all" ? totalAll : (grouped.find((g) => g.type === v)?._count._all ?? 0);

  const totalPages = Math.ceil(total / PER_PAGE);
  const hrefWith = (patch: {
    type?: string;
    sort?: string;
    page?: number;
    near?: boolean;
  }) => {
    const params = new URLSearchParams();
    const t = patch.type ?? type;
    const s = patch.sort ?? sort;
    const p = patch.page ?? 1;
    const n = patch.near ?? near;
    if (t !== "all") params.set("type", t);
    if (s !== "active") params.set("sort", s);
    if (n) params.set("near", "1");
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/cong-dong${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <RealtimeRefresher channelKey="cong-dong" event="feed:changed" enabled={rt} />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10">
          <h1 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">
            Cộng đồng
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Chia sẻ trải nghiệm, hỏi đáp trước chuyến đi và rủ nhau ghép đoàn.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-8 pt-5 sm:px-6 sm:pb-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
          <div className="min-w-0">
          {/* Soạn bài */}
          <PostComposer
            isAuthed={isAuthed}
            currentUserName={session?.user?.name ?? null}
            places={places}
            canPostSale={canPostSale}
          />

          {/* Thanh công cụ: lọc theo loại + (gần bạn) + sắp xếp */}
          <div className="mt-6">
            <CommunityFilter
              current={type}
              counts={countOf}
              hrefFor={(v) => hrefWith({ type: v })}
            />
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
              {homeProvince ? (
                <Link
                  href={hrefWith({ near: !near, page: 1 })}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    near
                      ? "border-transparent bg-warm/15 text-warm"
                      : "border-border/60 text-muted-foreground hover:bg-muted",
                  )}
                >
                  <MapPin className="size-3.5" aria-hidden />
                  Gần bạn · {homeProvince}
                </Link>
              ) : (
                <span />
              )}
              <CommunitySort
                current={sort}
                hrefFor={(v) => hrefWith({ sort: v })}
              />
            </div>
          </div>

          {/* Feed */}
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
                  showPlace
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-border/70 py-14 text-center">
              <MessagesSquare
                className="mx-auto size-8 text-muted-foreground/60"
                aria-hidden
              />
              <p className="mt-3 font-medium">Chưa có bài nào ở đây</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Hãy là người mở đầu câu chuyện cho cộng đồng!
              </p>
            </div>
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            hrefFor={(p) => hrefWith({ page: p })}
          />
          </div>

          {/* Sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <CommunitySidebar
              trips={trips}
              bottomLink={{ href: "/diem-den", label: "Khám phá điểm đến" }}
            />
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
