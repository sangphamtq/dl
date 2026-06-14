import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Search, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { coverUrl } from "@/lib/place-image";
import { PostRowActions } from "./row-actions";
import { POST_CATEGORIES, labelOf } from "./constants";

type SearchParams = { status?: string; category?: string; q?: string };
type Filters = { status: string; category: string; q: string };

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const STATUS_FILTERS = [
  { value: "all", label: "Mọi trạng thái" },
  { value: "published", label: "Đã xuất bản" },
  { value: "draft", label: "Bản nháp" },
];

function buildHref(base: SearchParams, patch: Partial<SearchParams>) {
  const merged = { ...base, ...patch };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v && v !== "all") sp.set(k, v);
  const qs = sp.toString();
  return `/cms/posts${qs ? `?${qs}` : ""}`;
}

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const status =
    sp.status === "published" || sp.status === "draft" ? sp.status : "all";
  const category =
    sp.category && POST_CATEGORIES.some((c) => c.value === sp.category)
      ? sp.category
      : "all";
  const q = sp.q?.trim() ?? "";
  const filters: Filters = { status, category, q };

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bài viết</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cẩm nang, kinh nghiệm, top-list du lịch.
          </p>
        </div>
        <Link href="/cms/posts/new" className={cn(buttonVariants())}>
          <Plus className="size-4" />
          Viết bài
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={buildHref(sp, { status: f.value })}
              className={cn(
                "rounded-full px-3 py-1 text-sm transition-colors",
                status === f.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {f.label}
            </Link>
          ))}
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          <Link
            href={buildHref(sp, { category: "all" })}
            className={cn(
              "rounded-full px-3 py-1 text-sm transition-colors",
              category === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            Mọi loại
          </Link>
          {POST_CATEGORIES.map((c) => (
            <Link
              key={c.value}
              href={buildHref(sp, { category: c.value })}
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

        <form className="relative" action="/cms/posts">
          {status !== "all" && (
            <input type="hidden" name="status" value={status} />
          )}
          {category !== "all" && (
            <input type="hidden" name="category" value={category} />
          )}
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Tìm theo tiêu đề…"
            className="w-full pl-9 sm:w-64"
          />
        </form>
      </div>

      <Suspense key={`${status}|${category}|${q}`} fallback={<PostsSkeleton />}>
        <PostList filters={filters} />
      </Suspense>
    </div>
  );
}

async function PostList({ filters }: { filters: Filters }) {
  const { status, category, q } = filters;
  const where: Prisma.PostWhereInput = {
    ...(status !== "all" && {
      status: status as Prisma.PostWhereInput["status"],
    }),
    ...(category !== "all" && { category }),
    ...(q && { title: { contains: q, mode: "insensitive" } }),
  };

  const posts = await prisma.post.findMany({
    where,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      status: true,
      isFeatured: true,
      createdAt: true,
      author: { select: { name: true } },
      images: {
        where: { isCover: true },
        take: 1,
        select: { url: true, isCover: true },
      },
    },
  });

  return (
    <>
      <p className="mt-4 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{posts.length}</span> bài
        viết
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border">
        <ul className="divide-y">
          {posts.map((p) => {
            const published = p.status === "published";
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4"
              >
                <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={coverUrl(p.images, p.slug, 160, 120)}
                    alt={p.title}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/cms/posts/${p.id}`}
                      className="truncate font-medium hover:underline"
                    >
                      {p.title}
                    </Link>
                    {p.isFeatured && (
                      <Star
                        className="size-3.5 shrink-0 fill-primary text-primary"
                        aria-label="Nổi bật"
                      />
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.author.name ?? "—"}
                    {p.category && ` · ${labelOf(POST_CATEGORIES, p.category)}`}
                    {` · ${dateFmt.format(p.createdAt)}`}
                  </p>
                </div>
                <Badge
                  variant={published ? "default" : "outline"}
                  className="hidden sm:inline-flex"
                >
                  {published ? "Xuất bản" : "Nháp"}
                </Badge>
                <PostRowActions
                  id={p.id}
                  title={p.title}
                  published={published}
                />
              </li>
            );
          })}
        </ul>

        {posts.length === 0 && (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {q || status !== "all" || category !== "all"
                ? "Không tìm thấy bài viết nào khớp bộ lọc."
                : "Chưa có bài viết nào."}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function PostsSkeleton() {
  return (
    <div className="mt-7 overflow-hidden rounded-xl border">
      <ul className="divide-y">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-12 w-16 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="size-8 rounded-md" />
          </li>
        ))}
      </ul>
    </div>
  );
}
