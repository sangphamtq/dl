import { MessagesSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { ThreadType } from "@/generated/prisma/enums";
import { isThreadType, isThreadSort } from "@/lib/community";
import { getFeed, getTrips } from "@/lib/community-feed";
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
  title: "Cộng đồng · Hành Trình Việt",
  description:
    "Chia sẻ trải nghiệm, hỏi đáp và tìm bạn đồng hành cho chuyến đi của bạn.",
};

const PER_PAGE = 10;

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; sort?: string; page?: string }>;
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

  const [{ posts, total }, grouped, places, trips, mySale] = await Promise.all([
    getFeed({
      type: type === "all" ? undefined : (type as ThreadType),
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
  const hrefWith = (patch: { type?: string; sort?: string; page?: number }) => {
    const params = new URLSearchParams();
    const t = patch.type ?? type;
    const s = patch.sort ?? sort;
    const p = patch.page ?? 1;
    if (t !== "all") params.set("type", t);
    if (s !== "active") params.set("sort", s);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/cong-dong${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <RealtimeRefresher channelKey="cong-dong" event="feed:changed" enabled={rt} />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border/50 bg-gradient-to-b from-sky-50 to-background dark:from-sky-950/20">
          <div className="mx-auto max-w-6xl px-4 pb-7 pt-10 sm:px-6 sm:pb-8 sm:pt-14">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Cộng đồng
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Chia sẻ trải nghiệm, hỏi đáp và rủ nhau đi.
            </p>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
          <div className="min-w-0">
          {/* Soạn bài */}
          <PostComposer
            isAuthed={isAuthed}
            currentUserName={session?.user?.name ?? null}
            places={places}
            canPostSale={canPostSale}
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
            <div className="mt-8 flex flex-col items-center justify-center py-16 text-center">
              <MessagesSquare className="size-10 text-muted-foreground" aria-hidden />
              <p className="mt-4 text-muted-foreground">
                Chưa có bài nào. Hãy là người mở đầu!
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
