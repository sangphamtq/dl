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
} from "@/components/icons";
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
  const gallery = post.images.filter((i) => i.id !== cover?.id);

  return (
    <div className="p-6 sm:p-8">
      {/* Breadcrumb + tiêu đề + hành động */}
      <Link
        href="/cms/posts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Bài viết
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {post.title}
            </h1>
            {post.isFeatured && (
              <Star
                className="size-4 fill-primary text-primary"
                aria-label="Nổi bật"
              />
            )}
          </div>
          {post.excerpt && (
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              {post.excerpt}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Bài viết</Badge>
            {post.category && (
              <Badge variant="outline">
                {labelOf(POST_CATEGORIES, post.category)}
              </Badge>
            )}
            <Badge variant={published ? "default" : "outline"}>
              {published ? "Đã xuất bản" : "Bản nháp"}
            </Badge>
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <User className="size-3.5" aria-hidden />
              {post.author.name ?? post.author.email ?? "—"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/blog/${post.slug}`}
            target="_blank"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <ExternalLink className="size-4" />
            Xem web
          </Link>
          <Link
            href={`/cms/posts/${post.id}/edit`}
            className={cn(buttonVariants())}
          >
            <Pencil className="size-4" />
            Sửa
          </Link>
        </div>
      </div>

      {/* Bố cục 2 cột: nội dung dài bên trái + thông tin bên phải */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Ảnh bìa */}
          <section>
            {cover ? (
              <div className="flex max-w-2xl gap-3">
                <div className="relative aspect-video max-h-72 flex-1 overflow-hidden rounded-xl bg-muted">
                  <Image
                    src={cover.url}
                    alt={cover.alt ?? post.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 32rem"
                    className="object-cover"
                    priority
                  />
                </div>
                {gallery.length > 0 && (
                  <div className="flex max-h-72 w-16 shrink-0 flex-col gap-2 overflow-y-auto sm:w-20">
                    {gallery.map((img) => (
                      <div
                        key={img.id}
                        className="relative aspect-square shrink-0 overflow-hidden rounded-lg bg-muted"
                      >
                        <Image
                          src={img.url}
                          alt={img.alt ?? post.title}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex aspect-video max-h-72 max-w-2xl flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground">
                <ImageOff className="size-7" aria-hidden />
                <p className="text-sm">Chưa có ảnh bìa</p>
                <Link
                  href={`/cms/posts/${post.id}/edit`}
                  className="text-sm text-primary hover:underline"
                >
                  Thêm ảnh
                </Link>
              </div>
            )}
          </section>

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
        </div>

        {/* Sidebar: thông tin & liên kết */}
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
              <Meta label="Slug">
                <span className="font-mono text-xs">/blog/{post.slug}</span>
              </Meta>
              <Meta label="Tác giả">
                {post.author.name ?? post.author.email ?? "—"}
              </Meta>
              {post.category && (
                <Meta label="Loại">
                  {labelOf(POST_CATEGORIES, post.category)}
                </Meta>
              )}
              <Meta label="Tạo lúc">{dateFmt.format(post.createdAt)}</Meta>
              <Meta label="Cập nhật">{dateFmt.format(post.updatedAt)}</Meta>
            </dl>
          </div>

          {refs.length > 0 && (
            <div className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">
                Địa điểm liên kết ({refs.length})
              </h3>
              <ul className="mt-3 space-y-1">
                {refs.map((r) => (
                  <li key={r.href}>
                    <Link
                      href={r.href}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/60"
                    >
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {r.label}
                      </Badge>
                      <span className="flex-1 truncate font-medium">
                        {r.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

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

        </aside>
      </div>
    </div>
  );
}

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
