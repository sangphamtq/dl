import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Newspaper } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { POST_CATEGORY_LABELS, label } from "@/lib/listing-labels";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Pagination } from "@/components/pagination";

export const metadata = {
  title: "Cẩm nang du lịch · Hành Trình Việt",
  description: "Cẩm nang, kinh nghiệm và gợi ý du lịch Việt Nam.",
};

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const CATEGORIES = [
  { value: "all", label: "Tất cả" },
  { value: "cam-nang", label: "Cẩm nang" },
  { value: "am-thuc", label: "Ẩm thực" },
  { value: "luu-tru", label: "Lưu trú" },
  { value: "trai-nghiem", label: "Trải nghiệm" },
  { value: "di-chuyen", label: "Di chuyển" },
  { value: "tin-tuc", label: "Tin tức" },
];

// Chữ cái đầu của tác giả cho avatar nhỏ.
function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1]?.[0] ?? "";
  const first = parts[0]?.[0] ?? "";
  return (parts.length > 1 ? first + last : first).toUpperCase();
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
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[0.65rem] font-semibold text-primary"
      >
        {initials(name)}
      </span>
      <span className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground/80">{name ?? "Ẩn danh"}</span>
        {" · "}
        {dateFmt.format(date)}
      </span>
    </div>
  );
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const category =
    sp.category && sp.category in POST_CATEGORY_LABELS ? sp.category : "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const PER_PAGE = 8;

  const where: Prisma.PostWhereInput = {
    status: "published",
    ...(category !== "all" && { category }),
  };

  const coverSelect = {
    where: { isCover: true },
    take: 1,
    select: { url: true, isCover: true },
  } as const;

  const [posts, total, grouped, popular] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: [
        { isFeatured: "desc" },
        { publishedAt: "desc" },
        { createdAt: "desc" },
      ],
      take: PER_PAGE,
      skip: (page - 1) * PER_PAGE,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        category: true,
        createdAt: true,
        publishedAt: true,
        author: { select: { name: true } },
        images: coverSelect,
      },
    }),
    prisma.post.count({ where }),
    // Đếm bài theo danh mục cho sidebar.
    prisma.post.groupBy({
      by: ["category"],
      where: { status: "published" },
      _count: { _all: true },
    }),
    // Bài nổi bật cho sidebar (độc lập với lọc/phân trang).
    prisma.post.findMany({
      where: { status: "published" },
      orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
      take: 5,
      select: {
        slug: true,
        title: true,
        createdAt: true,
        publishedAt: true,
        images: coverSelect,
      },
    }),
  ]);

  const totalPublished = grouped.reduce((s, g) => s + g._count._all, 0);
  const countOf = (value: string) =>
    value === "all"
      ? totalPublished
      : (grouped.find((g) => g.category === value)?._count._all ?? 0);

  const totalPages = Math.ceil(total / PER_PAGE);
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/blog${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Tiêu đề — dải nền xanh trời rất nhẹ */}
        <section className="relative overflow-hidden border-b border-border/50 bg-gradient-to-b from-sky-50 to-background dark:from-sky-950/20">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/5 blur-2xl"
          />
          <div className="mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-6 sm:pb-10 sm:pt-16">
            <p className="text-sm font-medium text-primary">Hành Trình Việt</p>
            <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">
              Cẩm nang du lịch
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
              Kinh nghiệm thực tế, lịch trình gợi ý và những câu chuyện trên đường
              — để mỗi chuyến đi của bạn trọn vẹn hơn.
            </p>
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1fr_19rem] lg:gap-14">
          {/* Cột chính — danh sách bài viết */}
          <div className="min-w-0">
            {posts.length > 0 ? (
              <ul className="flex flex-col">
                {posts.map((p, i) => (
                  <li key={p.slug}>
                    <Link
                      href={`/blog/${p.slug}`}
                      className={cn(
                        "group grid gap-5 py-7 sm:grid-cols-[15rem_1fr] sm:gap-6",
                        i > 0 && "border-t border-border/50",
                        i === 0 && "pt-0",
                      )}
                    >
                      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted shadow-sm shadow-black/5 transition-shadow group-hover:shadow-lg group-hover:shadow-black/5">
                        <Image
                          src={coverUrl(p.images, p.slug, 600, 375)}
                          alt={p.title}
                          fill
                          sizes="(min-width: 640px) 15rem, 100vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                      </div>
                      <div className="flex min-w-0 flex-col justify-center">
                        {p.category && (
                          <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                            {label(POST_CATEGORY_LABELS, p.category)}
                          </span>
                        )}
                        <h2 className="mt-1.5 text-xl font-bold leading-snug tracking-tight transition-colors group-hover:text-primary sm:text-2xl">
                          {p.title}
                        </h2>
                        {p.excerpt && (
                          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                            {p.excerpt}
                          </p>
                        )}
                        <AuthorMeta
                          name={p.author.name}
                          date={p.publishedAt ?? p.createdAt}
                          className="mt-4"
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Newspaper className="size-10 text-muted-foreground" aria-hidden />
                <p className="mt-4 text-muted-foreground">Chưa có bài viết nào.</p>
              </div>
            )}

            <Pagination page={page} totalPages={totalPages} hrefFor={pageHref} />
          </div>

          {/* Sidebar */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="flex flex-col gap-8">
              {/* Danh mục */}
              <div>
                <h2 className="mb-3 text-sm font-semibold tracking-tight">
                  Danh mục
                </h2>
                <ul className="flex flex-col gap-0.5">
                  {CATEGORIES.map((c) => {
                    const active = category === c.value;
                    return (
                      <li key={c.value}>
                        <Link
                          href={
                            c.value === "all" ? "/blog" : `/blog?category=${c.value}`
                          }
                          className={cn(
                            "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                            active
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <span>{c.label}</span>
                          <span
                            className={cn(
                              "text-xs tabular-nums",
                              active
                                ? "text-primary/70"
                                : "text-muted-foreground/60",
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

              {/* Bài nổi bật */}
              {popular.length > 0 && (
                <div>
                  <h2 className="mb-3 text-sm font-semibold tracking-tight">
                    Bài nổi bật
                  </h2>
                  <ul className="flex flex-col gap-4">
                    {popular.map((p) => (
                      <li key={p.slug}>
                        <Link
                          href={`/blog/${p.slug}`}
                          className="group flex gap-3"
                        >
                          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                            <Image
                              src={coverUrl(p.images, p.slug, 128, 128)}
                              alt={p.title}
                              fill
                              sizes="64px"
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                          <div className="min-w-0">
                            <h3 className="line-clamp-2 text-sm font-medium leading-snug tracking-tight transition-colors group-hover:text-primary">
                              {p.title}
                            </h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {dateFmt.format(p.publishedAt ?? p.createdAt)}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA nhỏ */}
              <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-sky-50 p-5 dark:to-sky-950/20">
                <p className="text-sm font-semibold tracking-tight">
                  Lên kế hoạch chuyến đi?
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Khám phá điểm đến theo tỉnh, hoạt động và đặc sản trên khắp Việt Nam.
                </p>
                <Link
                  href="/diem-den"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Khám phá điểm đến
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
