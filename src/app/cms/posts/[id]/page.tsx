import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  ExternalLink,
  Star,
  User,
  ImageOff,
  ImagePlus,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PostAdminControls } from "../admin-controls";
import { proseClass } from "@/components/cms/rich-text-editor";
import { POST_CATEGORIES, labelOf } from "../constants";

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      category: true,
      status: true,
      isFeatured: true,
      order: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { name: true, email: true } },
      images: {
        orderBy: [{ isCover: "desc" }, { order: "asc" }],
        select: { id: true, url: true, alt: true, isCover: true },
      },
      refs: {
        orderBy: { order: "asc" },
        select: {
          place: { select: { id: true, name: true } },
          activity: { select: { id: true, name: true } },
          spot: { select: { id: true, name: true } },
          specialty: { select: { id: true, name: true } },
          eatery: { select: { id: true, name: true } },
          accommodation: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!post) notFound();

  const published = post.status === "published";
  const refs = post.refs
    .map((r) => {
      if (r.place)
        return { label: "Điểm đến", name: r.place.name, href: `/cms/places/${r.place.id}` };
      if (r.activity)
        return { label: "Hoạt động", name: r.activity.name, href: `/cms/activities/${r.activity.id}` };
      if (r.spot)
        return { label: "Địa điểm", name: r.spot.name, href: `/cms/spots/${r.spot.id}` };
      if (r.specialty)
        return { label: "Đặc sản", name: r.specialty.name, href: `/cms/specialties/${r.specialty.id}` };
      if (r.eatery)
        return { label: "Quán ăn", name: r.eatery.name, href: `/cms/eateries/${r.eatery.id}` };
      if (r.accommodation)
        return { label: "Lưu trú", name: r.accommodation.name, href: `/cms/accommodations/${r.accommodation.id}` };
      return null;
    })
    .filter((x): x is { label: string; name: string; href: string } => x !== null);
  const cover = post.images.find((i) => i.isCover) ?? post.images[0] ?? null;

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <Link
        href="/cms/posts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Bài viết
      </Link>

      {/* Header card */}
      <div className="rounded-2xl border p-4 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-72">
            {cover ? (
              <Image
                src={cover.url}
                alt={cover.alt ?? post.title}
                fill
                sizes="(max-width: 640px) 100vw, 18rem"
                className="object-cover"
                priority
              />
            ) : (
              <Link
                href={`/cms/posts/${post.id}/edit`}
                className="flex h-full flex-col items-center justify-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <ImageOff className="size-6" aria-hidden />
                <span className="text-xs">Chưa có ảnh bìa</span>
              </Link>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Bài viết</Badge>
                {post.category && (
                  <Badge variant="outline">
                    {labelOf(POST_CATEGORIES, post.category)}
                  </Badge>
                )}
                <Badge variant={published ? "default" : "outline"}>
                  {published ? "Đã xuất bản" : "Bản nháp"}
                </Badge>
                {post.isFeatured && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="size-3 fill-current" aria-hidden />
                    Nổi bật
                  </Badge>
                )}
              </div>

              <div className="hidden shrink-0 items-center gap-2 sm:flex">
                <Link
                  href={`/blog/${post.slug}`}
                  target="_blank"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  <ExternalLink className="size-4" />
                  Xem web
                </Link>
                <Link
                  href={`/cms/posts/${post.id}/edit`}
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  <Pencil className="size-4" />
                  Sửa
                </Link>
              </div>
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="mt-1 text-sm text-muted-foreground">{post.excerpt}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <User className="size-3.5" aria-hidden />
                {post.author.name ?? post.author.email ?? "—"}
              </span>
              <span>{dateFmt.format(post.createdAt)}</span>
            </div>

            <div className="mt-4 flex items-center gap-2 sm:hidden">
              <Link
                href={`/cms/posts/${post.id}/edit`}
                className={cn(buttonVariants({ size: "sm" }), "flex-1")}
              >
                <Pencil className="size-4" />
                Sửa
              </Link>
              <Link
                href={`/blog/${post.slug}`}
                target="_blank"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "flex-1",
                )}
              >
                <ExternalLink className="size-4" />
                Xem web
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Nội dung (rich text) */}
          <section>
            <h2 className="text-lg font-semibold tracking-tight">Nội dung</h2>
            {post.content.trim() ? (
              <div
                className={cn(proseClass, "mt-3")}
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Chưa có nội dung.
              </p>
            )}
          </section>

          {post.images.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold tracking-tight">
                Thư viện ảnh
              </h2>
              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {post.images.map((img) => (
                  <div
                    key={img.id}
                    className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                  >
                    <Image
                      src={img.url}
                      alt={img.alt ?? post.title}
                      fill
                      sizes="(min-width: 640px) 25vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Địa điểm liên kết (PostRef) */}
          {refs.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold tracking-tight">
                Địa điểm liên kết
              </h2>
              <ul className="mt-3 divide-y overflow-hidden rounded-xl border">
                {refs.map((r) => (
                  <li key={r.href}>
                    <Link
                      href={r.href}
                      className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50"
                    >
                      <Badge variant="outline" className="shrink-0">
                        {r.label}
                      </Badge>
                      <span className="flex-1 truncate font-medium">
                        {r.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <PostAdminControls
            id={post.id}
            status={post.status}
            isFeatured={post.isFeatured}
            order={post.order}
          />

          <div className="rounded-xl border p-4">
            <h3 className="text-sm font-semibold">Thông tin</h3>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Slug</dt>
                <dd className="text-right font-mono text-xs">/blog/{post.slug}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Tác giả</dt>
                <dd className="text-right">{post.author.name ?? "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Cập nhật</dt>
                <dd className="text-right">{dateFmt.format(post.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          {post.tags.length > 0 && (
            <div className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Tags</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {post.tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Link
            href={`/cms/posts/${post.id}/edit`}
            className="flex items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            <ImagePlus className="size-4" aria-hidden />
            Quản lý ảnh ({post.images.length})
          </Link>
        </aside>
      </div>
    </div>
  );
}
