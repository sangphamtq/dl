import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock,
} from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { POST_CATEGORY_LABELS, label } from "@/lib/listing-labels";
import { proseClass } from "@/lib/prose";
import { coverUrl } from "@/lib/place-image";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ArticleTocBox } from "@/components/blog/article-toc-box";
import { LikeButton } from "@/components/blog/like-button";
import { CommentSection } from "@/components/blog/comment-section";
import { extractToc } from "@/lib/toc";
import { ablyEnabled } from "@/lib/ably";
import { auth } from "@/auth";

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// Ước lượng thời gian đọc (~200 từ/phút) từ HTML thân bài.
function readingMinutes(html: string): number {
  const words = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await prisma.post.findUnique({
    where: { slug },
    select: { title: true, excerpt: true, status: true },
  });
  if (!p || p.status !== "published") return {};
  return { title: p.title, description: p.excerpt ?? undefined };
}

// PostRef → { label, name, href } trỏ tới trang công khai.
function resolveRef(r: {
  place: { slug: string; name: string } | null;
  activity: { slug: string; name: string } | null;
  spot: { slug: string; name: string } | null;
  accommodation: { slug: string; name: string } | null;
}) {
  if (r.place)
    return { label: "Điểm đến", name: r.place.name, href: `/diem-den/${r.place.slug}` };
  if (r.activity)
    return { label: "Hoạt động", name: r.activity.name, href: `/hoat-dong/${r.activity.slug}` };
  if (r.spot)
    return { label: "Địa điểm", name: r.spot.name, href: `/dia-diem/${r.spot.slug}` };
  if (r.accommodation)
    return { label: "Lưu trú", name: r.accommodation.name, href: `/luu-tru/${r.accommodation.slug}` };
  return null;
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      excerpt: true,
      content: true,
      category: true,
      status: true,
      createdAt: true,
      publishedAt: true,
      author: { select: { name: true } },
      images: {
        orderBy: [{ isCover: "desc" }, { order: "asc" }],
        select: { url: true, alt: true, caption: true, isCover: true },
      },
      refs: {
        orderBy: { order: "asc" },
        select: {
          place: { select: { slug: true, name: true } },
          activity: { select: { slug: true, name: true } },
          spot: { select: { slug: true, name: true } },
          accommodation: { select: { slug: true, name: true } },
        },
      },
    },
  });

  const session = await auth();
  const currentUserId = session?.user?.id ?? null;
  const isAuthed = !!currentUserId;
  const role = session?.user?.role;
  const isStaff = role === "admin" || role === "editor";

  if (!post || (post.status !== "published" && !isStaff)) notFound();

  const cover = post.images.find((i) => i.isCover) ?? post.images[0] ?? null;
  const refs = post.refs
    .map(resolveRef)
    .filter((x): x is { label: string; name: string; href: string } => x !== null);
  const minutes = readingMinutes(post.content);
  const date = post.publishedAt ?? post.createdAt;
  const { html: contentHtml, toc } = extractToc(post.content);

  const replySelect = {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      authorId: true,
      content: true,
      createdAt: true,
      author: { select: { name: true } },
    },
  } as const;

  // Bài liên quan + dữ liệu tim/bình luận.
  const [related, likeCount, myLike, comments, commentTotal] = await Promise.all([
    prisma.post.findMany({
      where: {
        status: "published",
        slug: { not: slug },
        ...(post.category ? { category: post.category } : {}),
      } satisfies Prisma.PostWhereInput,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 7,
      select: {
        slug: true,
        title: true,
        category: true,
        createdAt: true,
        publishedAt: true,
        images: { where: { isCover: true }, take: 1, select: { url: true, isCover: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.postLike.count({ where: { postId: post.id } }),
    currentUserId
      ? prisma.postLike.findUnique({
          where: { postId_userId: { postId: post.id, userId: currentUserId } },
          select: { id: true },
        })
      : Promise.resolve(null),
    prisma.comment.findMany({
      where: { postId: post.id, parentId: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        authorId: true,
        content: true,
        createdAt: true,
        author: { select: { name: true } },
        replies: replySelect,
      },
    }),
    prisma.comment.count({ where: { postId: post.id } }),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-[#f6f5f2] text-[#2e2e2e] dark:bg-neutral-950 dark:text-white/85">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto flex max-w-[81.25rem] flex-col items-start gap-10 px-4 py-8 sm:px-6 sm:py-10 lg:flex-row lg:justify-between lg:gap-16 lg:px-8 lg:py-12">
          {/* Cột trái: bài viết */}
          <article className="w-full min-w-0 lg:w-[52.25rem]">
            {/* Breadcrumb */}
            <nav className="flex flex-wrap items-center text-[0.75rem] font-medium uppercase tracking-[0.04em] text-[#2e2e2e]/60 dark:text-white/50">
              <Link href="/" className="transition-colors hover:text-[#348320]">
                Trang chủ
              </Link>
              <span className="mx-2" aria-hidden>/</span>
              <Link href="/blog" className="transition-colors hover:text-[#348320]">
                Cẩm nang
              </Link>
              <span className="mx-2" aria-hidden>/</span>
              <span className="truncate text-[#348320]">{post.title}</span>
            </nav>

            {/* Tiêu đề */}
            <h1 className="mt-5 text-[1.75rem] font-bold leading-snug text-[#1f2226] sm:text-[2rem] dark:text-white">
              {post.title}
            </h1>

            {/* Meta (mobile — sidebar ẩn ở màn nhỏ) */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 lg:hidden">
              <span className="inline-flex items-center gap-1.5 text-sm text-[#2e2e2e]/60 dark:text-white/50">
                <CalendarDays className="size-4" aria-hidden />
                {dateFmt.format(date)}
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm text-[#2e2e2e]/60 dark:text-white/50">
                <Clock className="size-4" aria-hidden />
                {minutes} phút đọc
              </span>
            </div>

            {/* Sapo */}
            {post.excerpt && (
              <p className="mt-6 text-base leading-[1.6] text-[#1f2226] dark:text-white/85">
                {post.excerpt}
              </p>
            )}

            {/* Ảnh bìa (ảnh mở đầu inline) */}
            {cover && (
              <figure className="mt-4">
                <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-[#e5e7de]">
                  <Image
                    src={cover.url}
                    alt={cover.alt ?? post.title}
                    fill
                    priority
                    sizes="(min-width: 1024px) 52rem, 100vw"
                    className="object-cover"
                  />
                </div>
                {cover.caption && (
                  <figcaption className="mt-2 text-center text-[0.875rem] italic text-[#2e2e2e]/55 dark:text-white/40">
                    {cover.caption}
                  </figcaption>
                )}
              </figure>
            )}

            {/* Mục lục — inline trên mobile */}
            {toc.length >= 2 && (
              <div className="mt-2 lg:hidden">
                <ArticleTocBox items={toc} />
              </div>
            )}

            {/* Nội dung bài viết */}
            <div
              className={cn(
                proseClass,
                "mt-6 text-base leading-[1.55] text-[#1f2226] dark:text-white/85",
                "[&_p]:!my-4 [&_li]:!leading-[1.55]",
                "[&_a]:!text-[#2c70f5] [&_a]:!no-underline hover:[&_a]:!underline",
                "[&_h2]:!mt-5 [&_h2]:!mb-4 [&_h2]:!text-[1.75rem] [&_h2]:!font-bold [&_h2]:!leading-[1.45] [&_h2]:!text-[#1f2226] dark:[&_h2]:!text-white [&_h2]:scroll-mt-24",
                "[&_h3]:!mt-4 [&_h3]:!mb-3 [&_h3]:!text-[1.5rem] [&_h3]:!font-bold [&_h3]:!leading-[1.5] [&_h3]:!text-[#1f2226] dark:[&_h3]:!text-white [&_h3]:scroll-mt-24",
                "[&_h4]:!text-[1.375rem] [&_h4]:!font-bold [&_h4]:!text-[#1f2226] dark:[&_h4]:!text-white",
                "[&_img]:!my-4 [&_img]:!w-full [&_img]:!rounded-lg",
                "[&_figure]:!my-4 [&_figcaption]:!mt-2 [&_figcaption]:text-center [&_figcaption]:text-[0.875rem] [&_figcaption]:italic [&_figcaption]:text-[#2e2e2e]/55 dark:[&_figcaption]:text-white/40",
                "[&_blockquote]:!my-5 [&_blockquote]:!border-l-2 [&_blockquote]:!border-[#2e2e2e]/20 [&_blockquote]:!pl-4 [&_blockquote]:!italic [&_blockquote]:!text-[#2e2e2e]/70 dark:[&_blockquote]:!border-white/20 dark:[&_blockquote]:!text-white/70",
              )}
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />

            {/* Tim bài viết */}
            <div className="mt-8">
              <LikeButton
                postId={post.id}
                postSlug={slug}
                initialLiked={!!myLike}
                initialCount={likeCount}
                isAuthed={isAuthed}
              />
            </div>

            {/* Đề cập trong bài (PostRef) */}
            {refs.length > 0 && (
              <section className="mt-12 border-t border-[#e8e6e1] pt-6 dark:border-white/10">
                <h2 className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-[#2e2e2e]/50 dark:text-white/50">
                  Đề cập trong bài
                </h2>
                <ul className="mt-1 divide-y divide-[#e8e6e1] dark:divide-white/10">
                  {refs.map((r) => (
                    <li key={r.href}>
                      <Link
                        href={r.href}
                        className="group flex items-baseline gap-4 py-3.5"
                      >
                        <span className="w-[4.5rem] shrink-0 text-[0.75rem] font-medium uppercase tracking-wide text-[#348320]">
                          {r.label}
                        </span>
                        <span className="flex-1 font-medium text-[#1f2226] transition-colors group-hover:text-[#348320] dark:text-white">
                          {r.name}
                        </span>
                        <ArrowUpRight
                          className="size-4 shrink-0 self-center text-[#2e2e2e]/30 transition-colors group-hover:text-[#348320]"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Thảo luận */}
            <CommentSection
              postId={post.id}
              postSlug={slug}
              comments={comments}
              total={commentTotal}
              currentUserId={currentUserId}
              isStaff={isStaff}
              isAuthed={isAuthed}
              realtimeEnabled={ablyEnabled()}
            />
          </article>

          {/* Cột phải: sidebar */}
          <aside className="hidden lg:block lg:w-[25rem] lg:shrink-0">
            <div className="sticky top-6">
              {/* Ngày + mục lục */}
              <div className="rounded-2xl bg-white p-5 dark:bg-white/5">
                <p className="px-2 inline-flex items-center gap-1.5 text-[0.875rem] text-[#2e2e2e]/60 dark:text-white/50">
                  <CalendarDays className="size-4" aria-hidden />
                  {dateFmt.format(date)}
                </p>

                {toc.length >= 2 && <ArticleTocBox items={toc} />}
              </div>

              {/* Nội dung liên quan */}
              {related.length > 0 && (
                <div className="mt-16">
                  <h2 className="mb-5 text-[1.25rem] font-bold text-[#2e2e2e] dark:text-white">
                    Nội dung liên quan
                  </h2>
                  <ul className="flex flex-col gap-4">
                    {related.slice(0, 3).map((p) => (
                      <li key={p.slug}>
                        <Link
                          href={`/blog/${p.slug}`}
                          className="group flex overflow-hidden rounded-xl bg-white dark:bg-white/5"
                        >
                          <div className="relative size-28 shrink-0 overflow-hidden bg-[#e5e7de]">
                            <Image
                              src={coverUrl(p.images, p.slug, 224, 224)}
                              alt={p.title}
                              fill
                              sizes="112px"
                              className="object-cover"
                            />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col px-4 py-3">
                            <h3 className="line-clamp-2 text-[0.9375rem] font-medium leading-snug text-[#2e2e2e] transition-colors group-hover:text-[#348320] dark:text-white">
                              {p.title}
                            </h3>
                            <div className="mt-auto flex items-center pt-3 text-[0.8125rem]">
                              {p.category && (
                                <>
                                  <span className="truncate font-medium text-[#2e871c]">
                                    {label(POST_CATEGORY_LABELS, p.category)}
                                  </span>
                                  <span className="mx-2.5 h-2 w-px bg-[#2e2e2e]/60" aria-hidden />
                                </>
                              )}
                              <span className="shrink-0 text-[#2e2e2e]/40 dark:text-white/40">
                                {dateFmt.format(p.publishedAt ?? p.createdAt)}
                              </span>
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Có thể bạn cũng thích */}
        {related.length > 3 && (
          <div className="mx-auto mt-8 max-w-[81.25rem] px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
            <div className="mb-10 flex items-center justify-between gap-4">
              <h2 className="text-[2rem] font-semibold leading-tight text-[#2e2e2e] sm:text-[2.75rem] dark:text-white">
                Có thể bạn cũng thích
              </h2>
              <Link
                href="/blog"
                className="hidden shrink-0 items-center rounded-full bg-[#2e871c] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5e9c58] sm:inline-flex"
              >
                Xem tất cả
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.slice(3, 6).map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-[#e5e7de]"
                >
                  <Image
                    src={coverUrl(p.images, p.slug, 640, 800)}
                    alt={p.title}
                    fill
                    sizes="(min-width: 1024px) 25rem, (min-width: 640px) 45vw, 100vw"
                    className="object-cover"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,36,6,0)_59%,rgba(7,36,6,0.52)_73%,#043602_100%)]"
                  />
                  {p.category && (
                    <span className="absolute left-5 top-5 z-10 rounded bg-black/35 px-3 py-2 text-[0.8125rem] font-medium text-white">
                      {label(POST_CATEGORY_LABELS, p.category)}
                    </span>
                  )}
                  <div className="absolute inset-x-3.5 bottom-3.5 rounded-lg bg-white/95 p-4 backdrop-blur transition-colors group-hover:bg-[#faf3e2] dark:bg-neutral-900/95">
                    <h3 className="line-clamp-2 text-[1.125rem] font-medium leading-snug text-[#2e2e2e] group-hover:underline dark:text-white">
                      {p.title}
                    </h3>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-[0.875rem] font-medium text-[#2e2e2e]/60 dark:text-white/60">
                        <CalendarDays className="size-4" aria-hidden />
                        {dateFmt.format(p.publishedAt ?? p.createdAt)}
                      </span>
                      <ArrowRight
                        className="size-5 text-[#2e2e2e]/60 transition-colors group-hover:text-[#2e871c]"
                        aria-hidden
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
