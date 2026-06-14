import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronRight, User, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { POST_CATEGORY_LABELS, label } from "@/lib/listing-labels";
import { proseClass } from "@/components/cms/rich-text-editor";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Badge } from "@/components/ui/badge";
import { isStaffViewer } from "@/lib/preview";

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

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
  specialty: { slug: string; name: string } | null;
  eatery: { slug: string; name: string } | null;
  accommodation: { slug: string; name: string } | null;
}) {
  if (r.place)
    return { label: "Điểm đến", name: r.place.name, href: `/diem-den/${r.place.slug}` };
  if (r.activity)
    return { label: "Hoạt động", name: r.activity.name, href: `/hoat-dong/${r.activity.slug}` };
  if (r.spot)
    return { label: "Địa điểm", name: r.spot.name, href: `/dia-diem/${r.spot.slug}` };
  if (r.specialty)
    return { label: "Đặc sản", name: r.specialty.name, href: `/dac-san/${r.specialty.slug}` };
  if (r.eatery)
    return { label: "Quán ăn", name: r.eatery.name, href: `/quan-an/${r.eatery.slug}` };
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
          specialty: { select: { slug: true, name: true } },
          eatery: { select: { slug: true, name: true } },
          accommodation: { select: { slug: true, name: true } },
        },
      },
    },
  });

  const staff = await isStaffViewer();
  if (!post || (post.status !== "published" && !staff)) notFound();

  const cover = post.images.find((i) => i.isCover) ?? post.images[0] ?? null;
  const refs = post.refs
    .map(resolveRef)
    .filter((x): x is { label: string; name: string; href: string } => x !== null);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <article className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
          <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Trang chủ
            </Link>
            <ChevronRight className="size-3.5" aria-hidden />
            <Link href="/blog" className="hover:text-foreground">
              Cẩm nang
            </Link>
          </nav>

          {post.category && (
            <p className="mt-6 text-sm font-medium text-primary">
              {label(POST_CATEGORY_LABELS, post.category)}
            </p>
          )}
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {post.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <User className="size-4" aria-hidden />
              {post.author.name ?? "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden />
              {dateFmt.format(post.publishedAt ?? post.createdAt)}
            </span>
          </div>

          {cover && (
            <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-xl bg-muted">
              <Image
                src={cover.url}
                alt={cover.alt ?? post.title}
                fill
                priority
                sizes="(min-width: 768px) 42rem, 100vw"
                className="object-cover"
              />
            </div>
          )}

          {post.excerpt && (
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              {post.excerpt}
            </p>
          )}

          {/* Nội dung HTML (rich text) */}
          <div
            className={cn(proseClass, "mt-6")}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Trong bài nhắc đến (PostRef) */}
          {refs.length > 0 && (
            <section className="mt-10 border-t pt-8">
              <h2 className="text-lg font-semibold tracking-tight">
                Trong bài nhắc đến
              </h2>
              <ul className="mt-4 space-y-2">
                {refs.map((r) => (
                  <li key={r.href}>
                    <Link
                      href={r.href}
                      className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
                    >
                      <Badge variant="outline" className="shrink-0">
                        {r.label}
                      </Badge>
                      <span className="flex-1 truncate font-medium">
                        {r.name}
                      </span>
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
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
