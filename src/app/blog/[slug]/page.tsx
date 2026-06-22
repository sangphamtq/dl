import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronRight, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { POST_CATEGORY_LABELS, label } from "@/lib/listing-labels";
import { proseClass } from "@/components/cms/rich-text-editor";
import { coverUrl } from "@/lib/place-image";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Badge } from "@/components/ui/badge";
import { ShareBar } from "@/components/blog/share-bar";
import { ArticleToc } from "@/components/blog/article-toc";
import { LikeButton } from "@/components/blog/like-button";
import { CommentSection } from "@/components/blog/comment-section";
import { PostStats } from "@/components/blog/post-stats";
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

// Chữ cái đầu của tác giả cho avatar.
function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1]?.[0] ?? "";
  const first = parts[0]?.[0] ?? "";
  return (parts.length > 1 ? first + last : first).toUpperCase();
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
        select: { url: true, alt: true, isCover: true },
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
      take: 4,
      select: {
        slug: true,
        title: true,
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
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          {/* Breadcrumb */}
          <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Trang chủ
            </Link>
            <ChevronRight className="size-3.5" aria-hidden />
            <Link href="/blog" className="hover:text-foreground">
              Cẩm nang
            </Link>
          </nav>

          <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-14">
            {/* Cột bài viết */}
            <article className="min-w-0">
              {post.category && (
                <Link
                  href={`/blog?category=${post.category}`}
                  className="text-sm font-semibold uppercase tracking-wide text-primary hover:underline"
                >
                  {label(POST_CATEGORY_LABELS, post.category)}
                </Link>
              )}
              <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                {post.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground/80">
                  {post.author.name ?? "Ẩn danh"}
                </span>
                <span aria-hidden>·</span>
                <span>{dateFmt.format(date)}</span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" aria-hidden />
                  {minutes} phút đọc
                </span>
              </div>

              {cover && (
                <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
                  <Image
                    src={cover.url}
                    alt={cover.alt ?? post.title}
                    fill
                    priority
                    sizes="(min-width: 1024px) 44rem, 100vw"
                    className="object-cover"
                  />
                </div>
              )}

              {post.excerpt && (
                <p className="mt-6 border-l-2 border-primary/40 pl-4 text-lg leading-relaxed text-muted-foreground">
                  {post.excerpt}
                </p>
              )}

              {/* Nội dung HTML (rich text) — heading có scroll-mt cho neo mục lục */}
              <div
                className={cn(
                  proseClass,
                  "mt-6 text-[1.05rem] leading-8 [&_h2]:scroll-mt-24 [&_h3]:scroll-mt-24",
                )}
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />

              {/* Tim + Chia sẻ */}
              <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border/50 pt-6">
                <LikeButton
                  postId={post.id}
                  postSlug={slug}
                  initialLiked={!!myLike}
                  initialCount={likeCount}
                  isAuthed={isAuthed}
                />
                <ShareBar />
              </div>

              {/* Trong bài nhắc đến (PostRef) */}
              {refs.length > 0 && (
                <section className="mt-8">
                  <h2 className="text-lg font-bold tracking-tight">
                    Trong bài nhắc đến
                  </h2>
                  <ul className="mt-4 space-y-2">
                    {refs.map((r) => (
                      <li key={r.href}>
                        <Link
                          href={r.href}
                          className="flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
                        >
                          <Badge variant="outline" className="shrink-0">
                            {r.label}
                          </Badge>
                          <span className="flex-1 truncate font-medium">{r.name}</span>
                          <ChevronRight
                            className="size-4 shrink-0 text-muted-foreground"
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

            {/* Sidebar */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="flex flex-col gap-8">
                {/* Mục lục */}
                {toc.length >= 2 && <ArticleToc items={toc} />}

                {/* Tác giả */}
                <div className="flex items-center gap-3 rounded-2xl bg-muted/40 p-4">
                  <span
                    aria-hidden
                    className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-base font-semibold text-primary"
                  >
                    {initials(post.author.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Viết bởi</p>
                    <p className="truncate font-semibold tracking-tight">
                      {post.author.name ?? "Ẩn danh"}
                    </p>
                  </div>
                </div>

                {/* Đọc thêm */}
                {related.length > 0 && (
                  <div>
                    <h2 className="mb-3 text-sm font-semibold tracking-tight">
                      Đọc thêm
                    </h2>
                    <ul className="flex flex-col gap-4">
                      {related.map((p) => (
                        <li key={p.slug}>
                          <Link href={`/blog/${p.slug}`} className="group flex gap-3">
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
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                                <span>{dateFmt.format(p.publishedAt ?? p.createdAt)}</span>
                                <PostStats
                                  likes={p._count.likes}
                                  comments={p._count.comments}
                                />
                              </div>
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
                    Khám phá điểm đến
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    Tra cứu điểm đến, hoạt động và đặc sản trên khắp Việt Nam.
                  </p>
                  <Link
                    href="/diem-den"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Xem điểm đến
                    <ChevronRight className="size-4" />
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
