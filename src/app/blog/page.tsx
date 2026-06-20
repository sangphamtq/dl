import Link from "next/link";
import Image from "next/image";
import { Newspaper } from "lucide-react";
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

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const category =
    sp.category && sp.category in POST_CATEGORY_LABELS ? sp.category : "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const PER_PAGE = 12;

  const where: Prisma.PostWhereInput = {
    status: "published",
    ...(category !== "all" && { category }),
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
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
      images: {
        where: { isCover: true },
        take: 1,
        select: { url: true, isCover: true },
      },
      },
    }),
    prisma.post.count({ where }),
  ]);
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
        <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Cẩm nang du lịch
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Kinh nghiệm, lịch trình và gợi ý để chuyến đi của bạn trọn vẹn hơn.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Link
                key={c.value}
                href={c.value === "all" ? "/blog" : `/blog?category=${c.value}`}
                className={cn(
                  "rounded-full px-3 py-1 text-sm transition-colors",
                  category === c.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70",
                )}
              >
                {c.label}
              </Link>
            ))}
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
          {posts.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="group block">
                  <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted">
                    <Image
                      src={coverUrl(p.images, p.slug, 800, 450)}
                      alt={p.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {p.category && (
                      <span className="text-xs font-medium text-primary">
                        {label(POST_CATEGORY_LABELS, p.category)}
                      </span>
                    )}
                    <h2 className="font-semibold leading-snug tracking-tight">
                      {p.title}
                    </h2>
                    {p.excerpt && (
                      <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {p.excerpt}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {p.author.name ?? "—"} ·{" "}
                      {dateFmt.format(p.publishedAt ?? p.createdAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Newspaper
                className="size-10 text-muted-foreground"
                aria-hidden
              />
              <p className="mt-4 text-muted-foreground">
                Chưa có bài viết nào.
              </p>
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} hrefFor={pageHref} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
