import Link from "next/link";
import Image from "next/image";
import {
  BedDouble,
  BookOpen,
  Bus,
  CalendarClock,
  ChevronRight,
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

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function AuthorMeta({
  name,
  date,
  className,
}: {
  name: string | null;
  date: Date;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[0.6rem] font-semibold text-primary"
      >
        {initials(name)}
      </span>
      <span className="truncate text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">{name ?? "Ẩn danh"}</span>
        {" · "}
        {dateFmt.format(date)}
      </span>
    </div>
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
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Breadcrumb + masthead */}
          <nav className="flex items-center gap-1.5 pt-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Trang chủ
            </Link>
            <ChevronRight className="size-3.5" aria-hidden />
            <span className="text-foreground/70">Blog du lịch</span>
          </nav>

          <section className="mt-4 grid items-center gap-8 lg:grid-cols-[1fr_28rem]">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Blog du lịch
              </h1>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                Kinh nghiệm du lịch, lịch trình gợi ý, review điểm đến và những
                mẹo hữu ích cho hành trình của bạn.
              </p>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <Chip Icon={Newspaper} text={`${totalPublished} bài viết`} />
                <Chip Icon={CalendarClock} text="Cập nhật hàng tuần" />
                <Chip Icon={Sparkles} text="Nội dung được chọn lọc" />
              </div>
            </div>
            {heroImg && (
              <div className="relative hidden aspect-[16/10] overflow-hidden rounded-3xl bg-muted ring-1 ring-black/5 lg:block">
                <Image
                  src={heroImg}
                  alt="Du lịch Việt Nam"
                  fill
                  priority
                  sizes="28rem"
                  className="object-cover"
                />
              </div>
            )}
          </section>
        </div>

        <div className="mx-auto mt-8 grid max-w-7xl gap-8 px-4 pb-8 sm:px-6 lg:grid-cols-[16rem_1fr] lg:gap-10">
          {/* ── Sidebar ─────────────────────────────── */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="flex flex-col gap-4">
              {/* Danh mục */}
              <div className="rounded-2xl border border-border/60 bg-card p-3">
                <h2 className="px-2 pb-2 pt-1 text-sm font-semibold tracking-tight">
                  Danh mục
                </h2>
                <ul className="flex flex-col gap-0.5">
                  {CATEGORIES.map((c) => {
                    const active = category === c.value;
                    const Icon = c.Icon;
                    return (
                      <li key={c.value}>
                        <Link
                          href={buildHref({ category: c.value })}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                            active
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <Icon className="size-4 shrink-0" aria-hidden />
                          <span className="min-w-0 flex-1 truncate">
                            {c.label}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 text-xs tabular-nums",
                              active ? "text-primary/70" : "text-muted-foreground/50",
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

          {/* ── Nội dung ─────────────────────────────── */}
          <div className="min-w-0">
            {/* Chủ đề nổi bật */}
            <section>
              <h2 className="text-lg font-bold tracking-tight">
                Chủ đề nổi bật
              </h2>
              <div className="mt-3 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {CATEGORIES.filter((c) => c.value !== "all" && countOf(c.value) > 0).map(
                  (c) => {
                    const cover = catCover.get(c.value);
                    return (
                      <Link
                        key={c.value}
                        href={buildHref({ category: c.value })}
                        className="group relative aspect-[16/10] w-44 shrink-0 overflow-hidden rounded-2xl bg-muted"
                      >
                        {cover && (
                          <Image
                            src={coverUrl(cover.images, cover.slug, 300, 190)}
                            alt={c.label}
                            fill
                            sizes="176px"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
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
              <section className="mt-9">
                <h2 className="text-lg font-bold tracking-tight">
                  Bài viết nổi bật
                </h2>
                <div className="mt-3 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                  {/* Lead */}
                  <Link
                    href={`/blog/${lead.slug}`}
                    className="group relative overflow-hidden rounded-3xl bg-muted"
                  >
                    <div className="relative aspect-[16/11]">
                      <Image
                        src={coverUrl(lead.images, lead.slug, 900, 620)}
                        alt={lead.title}
                        fill
                        sizes="(min-width: 1024px) 40rem, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                    </div>
                    <div className="absolute left-4 top-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                        <Sparkles className="size-3.5" aria-hidden />
                        Nổi bật
                      </span>
                    </div>
                    <div className="absolute inset-x-5 bottom-5">
                      {lead.category && (
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/85">
                          {label(POST_CATEGORY_LABELS, lead.category)}
                        </span>
                      )}
                      <h3 className="mt-1 text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl">
                        {lead.title}
                      </h3>
                      {lead.excerpt && (
                        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/80">
                          {lead.excerpt}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-2 text-xs text-white/85">
                        <span
                          aria-hidden
                          className="grid size-6 place-items-center rounded-full bg-white/20 text-[0.6rem] font-semibold"
                        >
                          {initials(lead.author.name)}
                        </span>
                        {lead.author.name ?? "Ẩn danh"} ·{" "}
                        {dateFmt.format(lead.publishedAt ?? lead.createdAt)}
                      </div>
                    </div>
                  </Link>

                  {/* 2 bài phụ */}
                  <div className="flex flex-col gap-5">
                    {featRest.map((p) => (
                      <Link
                        key={p.slug}
                        href={`/blog/${p.slug}`}
                        className="group grid grid-cols-[8rem_1fr] gap-3.5 rounded-2xl border border-border/60 bg-card p-2.5 transition-shadow hover:shadow-lg hover:shadow-black/5"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                          <Image
                            src={coverUrl(p.images, p.slug, 320, 240)}
                            alt={p.title}
                            fill
                            sizes="128px"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                        <div className="flex min-w-0 flex-col justify-center">
                          <h3 className="line-clamp-2 text-sm font-bold leading-snug tracking-tight transition-colors group-hover:text-primary">
                            {p.title}
                          </h3>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {dateFmt.format(p.publishedAt ?? p.createdAt)}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Tất cả bài viết */}
            <section className="mt-9">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold tracking-tight">
                  Tất cả bài viết
                </h2>
                <SortSelect value={sort} />
              </div>

              {posts.length > 0 ? (
                <div className="mt-4 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                  {posts.map((p) => (
                    <Link
                      key={p.slug}
                      href={`/blog/${p.slug}`}
                      className="group flex flex-col"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
                        <Image
                          src={coverUrl(p.images, p.slug, 560, 350)}
                          alt={p.title}
                          fill
                          sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 100vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                        {p.category && (
                          <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold text-primary shadow-sm backdrop-blur">
                            {label(POST_CATEGORY_LABELS, p.category)}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex min-w-0 flex-col">
                        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug tracking-tight transition-colors group-hover:text-primary">
                          {p.title}
                        </h3>
                        {p.excerpt && (
                          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                            {p.excerpt}
                          </p>
                        )}
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <AuthorMeta
                            name={p.author.name}
                            date={p.publishedAt ?? p.createdAt}
                          />
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
                <div className="mt-6 rounded-2xl border border-dashed border-border/70 py-16 text-center">
                  <MapPin
                    className="mx-auto size-8 text-muted-foreground/60"
                    aria-hidden
                  />
                  <p className="mt-3 font-medium">Không có bài viết phù hợp</p>
                  <p className="mt-1 text-sm text-muted-foreground">
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
      <Icon className="size-4 text-primary" aria-hidden />
      {text}
    </span>
  );
}
