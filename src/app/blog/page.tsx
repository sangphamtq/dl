import Link from "next/link";
import Image from "next/image";
import {
  BedDouble,
  BookOpen,
  Bus,
  CalendarClock,
  CalendarDays,
  Compass,
  LayoutGrid,
  MapPin,
  Newspaper,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { POST_CATEGORY_LABELS, label } from "@/lib/listing-labels";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Pagination } from "@/components/pagination";
import { PostStats } from "@/components/blog/post-stats";
import { SortSelect } from "@/components/blog/sort-select";
import { BlogFilters, type FilterOption } from "@/components/blog/blog-filters";

export const metadata = {
  title: "Blog du lịch · Halivivu",
  description: "Kinh nghiệm, lịch trình gợi ý và review điểm đến khắp Việt Nam.",
};

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const CATEGORIES: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: "all", label: "Tất cả bài viết", Icon: LayoutGrid },
  { value: "cam-nang", label: "Cẩm nang", Icon: BookOpen },
  { value: "trai-nghiem", label: "Trải nghiệm", Icon: Compass },
  { value: "am-thuc", label: "Ẩm thực", Icon: UtensilsCrossed },
  { value: "luu-tru", label: "Lưu trú", Icon: BedDouble },
  { value: "di-chuyen", label: "Di chuyển", Icon: Bus },
  { value: "tin-tuc", label: "Tin tức", Icon: Newspaper },
];

const PER_PAGE = 9;

function DateMeta({ date, className }: { date: Date; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-[#2e2e2e]/50 dark:text-white/40",
        className,
      )}
    >
      <CalendarDays className="size-3.5" aria-hidden />
      {dateFmt.format(date)}
    </span>
  );
}

function timeCutoff(t: string): Date | null {
  const now = Date.now();
  const days = (n: number) => new Date(now - n * 86_400_000);
  switch (t) {
    case "tuan-nay":
      return days(7);
    case "thang-nay":
      return days(30);
    case "6-thang":
      return days(183);
    case "nam-nay":
      return new Date(new Date().getFullYear(), 0, 1);
    default:
      return null;
  }
}

const coverSelect = {
  where: { isCover: true },
  take: 1,
  select: { url: true, isCover: true },
} as const;

const cardSelect = {
  slug: true,
  title: true,
  excerpt: true,
  category: true,
  isFeatured: true,
  createdAt: true,
  publishedAt: true,
  author: { select: { name: true } },
  images: coverSelect,
  _count: { select: { likes: true, comments: true } },
} satisfies Prisma.PostSelect;

type Card = Prisma.PostGetPayload<{ select: typeof cardSelect }>;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    dd?: string;
    tag?: string;
    time?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const category =
    sp.category && sp.category in POST_CATEGORY_LABELS ? sp.category : "all";
  const dd = sp.dd?.split(",").filter(Boolean) ?? [];
  const tags = sp.tag?.split(",").filter(Boolean) ?? [];
  const time = sp.time ?? "";
  const sort = sp.sort ?? "moi-nhat";
  const page = Math.max(1, Number(sp.page) || 1);
  const cutoff = timeCutoff(time);
  const noFilter =
    category === "all" && dd.length === 0 && tags.length === 0 && !time;

  const where: Prisma.PostWhereInput = {
    status: "published",
    ...(category !== "all" ? { category } : {}),
    ...(dd.length ? { refs: { some: { place: { slug: { in: dd } } } } } : {}),
    ...(tags.length ? { tags: { hasSome: tags } } : {}),
    ...(cutoff ? { publishedAt: { gte: cutoff } } : {}),
  };

  const orderBy: Prisma.PostOrderByWithRelationInput[] =
    sort === "cu-nhat"
      ? [{ publishedAt: "asc" }, { createdAt: "asc" }]
      : sort === "pho-bien"
        ? [{ popularity: "desc" }, { publishedAt: "desc" }]
        : [{ isFeatured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }];

  const showFeatured = page === 1 && noFilter;

  const [posts, total, grouped, featured, destRows, topicRows, catCoverRows] =
    await Promise.all([
    prisma.post.findMany({
      where,
      orderBy,
      take: PER_PAGE,
      skip: (page - 1) * PER_PAGE,
      select: cardSelect,
    }),
    prisma.post.count({ where }),
    prisma.post.groupBy({
      by: ["category"],
      where: { status: "published" },
      _count: { _all: true },
    }),
    showFeatured
      ? prisma.post.findMany({
          where: { status: "published" },
          orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
          take: 3,
          select: cardSelect,
        })
      : Promise.resolve([] as Card[]),
    prisma.place.findMany({
      where: { postRefs: { some: { post: { status: "published" } } } },
      select: {
        name: true,
        slug: true,
        _count: {
          select: { postRefs: { where: { post: { status: "published" } } } },
        },
      },
    }),
    prisma.$queryRaw<{ tag: string; count: number }[]>`
      SELECT unnest(tags) AS tag, count(*)::int AS count
      FROM "Post" WHERE status = 'published'
      GROUP BY tag ORDER BY count DESC, tag ASC LIMIT 12`,
    prisma.post.findMany({
      where: { status: "published", category: { not: null } },
      orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
      select: { category: true, slug: true, images: coverSelect },
    }),
  ]);

  const totalPublished = grouped.reduce((s, g) => s + g._count._all, 0);
  const countOf = (v: string) =>
    v === "all"
      ? totalPublished
      : (grouped.find((g) => g.category === v)?._count._all ?? 0);

  const destinations: FilterOption[] = destRows
    .map((d) => ({ value: d.slug, label: d.name, count: d._count.postRefs }))
    .sort((a, b) => b.count - a.count);
  const topics: FilterOption[] = topicRows.map((t) => ({
    value: t.tag,
    label: t.tag,
    count: Number(t.count),
  }));

  // Ảnh đại diện cho từng danh mục (dùng ở "Chủ đề nổi bật").
  const catCover = new Map<string, { images: typeof catCoverRows[number]["images"]; slug: string }>();
  for (const r of catCoverRows) {
    if (r.category && !catCover.has(r.category))
      catCover.set(r.category, { images: r.images, slug: r.slug });
  }

  const totalPages = Math.ceil(total / PER_PAGE);

  const buildHref = (patch: {
    category?: string;
    page?: number;
  }): string => {
    const p = new URLSearchParams();
    const cat = patch.category ?? category;
    if (cat !== "all") p.set("category", cat);
    if (dd.length) p.set("dd", dd.join(","));
    if (tags.length) p.set("tag", tags.join(","));
    if (time) p.set("time", time);
    if (sort !== "moi-nhat") p.set("sort", sort);
    const pg = patch.page ?? 1;
    if (pg > 1) p.set("page", String(pg));
    const qs = p.toString();
    return `/blog${qs ? `?${qs}` : ""}`;
  };

  const lead = featured[0] ?? null;
  const featRest = featured.slice(1);

  // Ảnh masthead: dùng bìa một bài khác bài lead (tái dùng catCoverRows).
  const heroSrc =
    catCoverRows.find((r) => r.slug !== lead?.slug) ?? catCoverRows[0];
  const heroImg = heroSrc
    ? coverUrl(heroSrc.images, heroSrc.slug, 900, 560)
    : null;

  return (
    <div className="flex flex-1 flex-col bg-[#f6f5f2] text-[#2e2e2e] dark:bg-neutral-950 dark:text-white/85">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-[81.25rem] px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb + masthead */}
          <nav className="flex items-center pt-8 text-[0.75rem] font-medium uppercase tracking-[0.04em] text-[#2e2e2e]/60 dark:text-white/50">
            <Link href="/" className="transition-colors hover:text-[#348320]">
              Trang chủ
            </Link>
            <span className="mx-2" aria-hidden>/</span>
            <span className="text-[#348320]">Cẩm nang</span>
          </nav>

          <section className="mt-6 grid items-center gap-10 lg:grid-cols-[1fr_30rem]">
            <div>
              <p className="text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-[#348320]">
                Cẩm nang du lịch
              </p>
              <h1 className="mt-3 text-[2rem] font-bold leading-tight text-[#1f2226] sm:text-[2.75rem] dark:text-white">
                Kinh nghiệm cho mọi hành trình
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-[#2e2e2e]/70 dark:text-white/60">
                Lịch trình gợi ý, review điểm đến, quán xá và những mẹo hữu ích
                cho chuyến đi khắp Việt Nam.
              </p>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#2e2e2e]/70 dark:text-white/60">
                <Chip Icon={Newspaper} text={`${totalPublished} bài viết`} />
                <Chip Icon={CalendarClock} text="Cập nhật hàng tuần" />
                <Chip Icon={Sparkles} text="Nội dung chọn lọc" />
              </div>
            </div>
            {heroImg && (
              <div className="relative hidden aspect-[16/10] overflow-hidden rounded-2xl bg-[#e5e7de] lg:block">
                <Image
                  src={heroImg}
                  alt="Du lịch Việt Nam"
                  fill
                  priority
                  sizes="30rem"
                  className="object-cover"
                />
              </div>
            )}
          </section>
        </div>

        <div className="mx-auto mt-12 grid max-w-[81.25rem] gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[16rem_1fr] lg:gap-14 lg:px-8">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="flex flex-col gap-6">
              {/* Danh mục */}
              <div>
                <h2 className="mb-3 text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-[#1f2226] dark:text-white">
                  Danh mục
                </h2>
                <ul className="flex flex-col">
                  {CATEGORIES.map((c) => {
                    const active = category === c.value;
                    const Icon = c.Icon;
                    return (
                      <li key={c.value}>
                        <Link
                          href={buildHref({ category: c.value })}
                          className={cn(
                            "flex items-center gap-2.5 border-l-2 py-2 pl-3 text-sm transition-colors",
                            active
                              ? "border-[#348320] font-semibold text-[#348320]"
                              : "border-[#e8e6e1] text-[#2e2e2e]/70 hover:border-[#348320]/40 hover:text-[#1f2226] dark:border-white/15 dark:text-white/60",
                          )}
                        >
                          <Icon className="size-4 shrink-0" aria-hidden />
                          <span className="min-w-0 flex-1 truncate">
                            {c.label}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 text-xs tabular-nums",
                              active ? "text-[#348320]/70" : "text-[#2e2e2e]/35 dark:text-white/30",
                            )}
                          >
                            {countOf(c.value)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Bộ lọc */}
              <BlogFilters
                destinations={destinations}
                topics={topics}
                selectedDest={dd}
                selectedTopics={tags}
                time={time}
              />
            </div>
          </aside>

          {/* Nội dung */}
          <div className="min-w-0">
            {/* Chủ đề nổi bật */}
            <section>
              <h2 className="text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-[#1f2226] dark:text-white">
                Chủ đề nổi bật
              </h2>
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {CATEGORIES.filter((c) => c.value !== "all" && countOf(c.value) > 0).map(
                  (c) => {
                    const cover = catCover.get(c.value);
                    return (
                      <Link
                        key={c.value}
                        href={buildHref({ category: c.value })}
                        className="group relative aspect-[16/10] w-44 shrink-0 overflow-hidden rounded-xl bg-[#e5e7de]"
                      >
                        {cover && (
                          <Image
                            src={coverUrl(cover.images, cover.slug, 300, 190)}
                            alt={c.label}
                            fill
                            sizes="176px"
                            className="object-cover"
                          />
                        )}
                        <div
                          aria-hidden
                          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,36,6,0)_40%,rgba(7,36,6,0.55)_75%,#043602_100%)]"
                        />
                        <div className="absolute inset-x-3 bottom-2.5">
                          <p className="text-sm font-semibold text-white">
                            {c.label}
                          </p>
                          <p className="text-[11px] text-white/80">
                            {countOf(c.value)} bài viết
                          </p>
                        </div>
                      </Link>
                    );
                  },
                )}
              </div>
            </section>

            {/* Bài viết nổi bật */}
            {lead && (
              <section className="mt-12">
                <h2 className="text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-[#1f2226] dark:text-white">
                  Bài viết nổi bật
                </h2>
                <div className="mt-4 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                  {/* Lead */}
                  <Link
                    href={`/blog/${lead.slug}`}
                    className="group relative block overflow-hidden rounded-2xl bg-[#e5e7de]"
                  >
                    <div className="relative aspect-[16/11]">
                      <Image
                        src={coverUrl(lead.images, lead.slug, 900, 620)}
                        alt={lead.title}
                        fill
                        sizes="(min-width: 1024px) 40rem, 100vw"
                        className="object-cover"
                      />
                      <div
                        aria-hidden
                        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,36,6,0)_30%,rgba(7,36,6,0.55)_68%,#043602_100%)]"
                      />
                    </div>
                    <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 bg-[#ff8800] px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-white">
                      <Sparkles className="size-3.5" aria-hidden />
                      Nổi bật
                    </span>
                    <div className="absolute inset-x-5 bottom-5">
                      {lead.category && (
                        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-white/85">
                          {label(POST_CATEGORY_LABELS, lead.category)}
                        </span>
                      )}
                      <h3 className="mt-1.5 text-xl font-bold leading-snug text-white sm:text-2xl">
                        {lead.title}
                      </h3>
                      {lead.excerpt && (
                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/80">
                          {lead.excerpt}
                        </p>
                      )}
                      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/80">
                        <CalendarDays className="size-3.5" aria-hidden />
                        {dateFmt.format(lead.publishedAt ?? lead.createdAt)}
                      </p>
                    </div>
                  </Link>

                  {/* 2 bài phụ */}
                  <div className="flex flex-col gap-4">
                    {featRest.map((p) => (
                      <Link
                        key={p.slug}
                        href={`/blog/${p.slug}`}
                        className="group grid grid-cols-[8rem_1fr] gap-4 overflow-hidden rounded-xl bg-white dark:bg-white/5"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-[#e5e7de]">
                          <Image
                            src={coverUrl(p.images, p.slug, 320, 240)}
                            alt={p.title}
                            fill
                            sizes="128px"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex min-w-0 flex-col justify-center pr-3">
                          {p.category && (
                            <span className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#348320]">
                              {label(POST_CATEGORY_LABELS, p.category)}
                            </span>
                          )}
                          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-[#1f2226] transition-colors group-hover:text-[#348320] dark:text-white">
                            {p.title}
                          </h3>
                          <DateMeta
                            date={p.publishedAt ?? p.createdAt}
                            className="mt-2"
                          />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Tất cả bài viết */}
            <section className="mt-12">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8e6e1] pb-4 dark:border-white/10">
                <h2 className="text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-[#1f2226] dark:text-white">
                  Tất cả bài viết
                </h2>
                <SortSelect value={sort} />
              </div>

              {posts.length > 0 ? (
                <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                  {posts.map((p) => (
                    <Link
                      key={p.slug}
                      href={`/blog/${p.slug}`}
                      className="group flex flex-col"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-[#e5e7de]">
                        <Image
                          src={coverUrl(p.images, p.slug, 560, 350)}
                          alt={p.title}
                          fill
                          sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 100vw"
                          className="object-cover"
                        />
                      </div>
                      <div className="mt-4 flex min-w-0 flex-col">
                        {p.category && (
                          <span className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#348320]">
                            {label(POST_CATEGORY_LABELS, p.category)}
                          </span>
                        )}
                        <h3 className="line-clamp-2 text-[1.0625rem] font-bold leading-snug text-[#1f2226] transition-colors group-hover:text-[#348320] dark:text-white">
                          {p.title}
                        </h3>
                        {p.excerpt && (
                          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#2e2e2e]/65 dark:text-white/55">
                            {p.excerpt}
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <DateMeta date={p.publishedAt ?? p.createdAt} />
                          <PostStats
                            likes={p._count.likes}
                            comments={p._count.comments}
                          />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-8 border border-dashed border-[#dcd9d2] py-16 text-center dark:border-white/15">
                  <MapPin
                    className="mx-auto size-8 text-[#2e2e2e]/40"
                    aria-hidden
                  />
                  <p className="mt-3 font-semibold text-[#1f2226] dark:text-white">
                    Không có bài viết phù hợp
                  </p>
                  <p className="mt-1 text-sm text-[#2e2e2e]/60 dark:text-white/50">
                    Thử bỏ bớt bộ lọc để xem thêm bài viết.
                  </p>
                </div>
              )}

              <Pagination
                page={page}
                totalPages={totalPages}
                hrefFor={(p) => buildHref({ page: p })}
              />
            </section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function Chip({ Icon, text }: { Icon: LucideIcon; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-4 text-[#348320]" aria-hidden />
      {text}
    </span>
  );
}
