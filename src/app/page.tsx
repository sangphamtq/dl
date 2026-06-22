import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { POST_CATEGORY_LABELS, label } from "@/lib/listing-labels";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PostStats } from "@/components/blog/post-stats";
import { type PlaceCardData } from "@/components/site/place-card";

const pub = { status: "published" as const };

const placeSelect = {
  slug: true,
  name: true,
  kind: true,
  tagline: true,
  description: true,
  images: { where: { isCover: true }, take: 1, select: { url: true, isCover: true } },
} as const;

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default async function Home() {
  const [session, featured, posts] = await Promise.all([
    auth(),
    prisma.place.findMany({
      where: { ...pub, isFeatured: true },
      orderBy: [{ order: "asc" }, { popularity: "desc" }, { name: "asc" }],
      take: 8,
      select: placeSelect,
    }),
    prisma.post.findMany({
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
        take: 3,
        select: {
          slug: true,
          title: true,
          excerpt: true,
          category: true,
          publishedAt: true,
          createdAt: true,
          author: { select: { name: true } },
          images: {
            where: { isCover: true },
            take: 1,
            select: { url: true, isCover: true },
          },
          _count: { select: { likes: true, comments: true } },
        },
      }),
    ]);
  const user = session?.user;

  const places =
    featured.length > 0
      ? featured
      : await prisma.place.findMany({
          where: pub,
          orderBy: { createdAt: "desc" },
          take: 8,
          select: placeSelect,
        });

  const heroBg = places[0]
    ? coverUrl(places[0].images, places[0].slug, 1920, 1080)
    : "https://picsum.photos/seed/vietnam-hero/1920/1080";

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero — giới thiệu & kêu gọi */}
        <section className="relative isolate flex min-h-[520px] items-center overflow-hidden sm:min-h-[580px]">
          <Image
            src={heroBg}
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-black/80 via-black/55 to-black/65" />

          <div className="mx-auto w-full max-w-7xl px-4 py-20 text-white sm:px-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 py-1 pl-1.5 pr-3 text-xs font-medium backdrop-blur">
              <span className="rounded-full bg-white/25 px-2 py-0.5">Xin chào</span>
              {user?.name ?? "bạn"} 👋
            </span>
            <h1 className="mt-5 max-w-3xl text-balance text-4xl font-bold leading-[1.02] tracking-tight drop-shadow-sm sm:text-5xl lg:text-6xl">
              Hành trình Việt Nam, theo cách của bạn
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
              Một nơi để biết nên ăn gì, chơi gì, ở đâu và đi lại thế nào — gọn
              gàng cho từng điểm đến, để bạn chỉ việc xách balo lên và đi.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/diem-den"
                className={cn(buttonVariants({ size: "lg" }), "rounded-full")}
              >
                Bắt đầu khám phá
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/blog"
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                Xem cẩm nang
              </Link>
            </div>
          </div>
        </section>

        {/* Điểm đến nổi bật — danh sách dưới hero */}
        {places.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
            <SectionHead
              eyebrow="Điểm đến"
              title="Điểm đến nổi bật"
              href="/diem-den"
            />
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {places.map((p) => (
                <DestTile key={p.slug} place={p} />
              ))}
            </div>
          </section>
        )}

        {/* Cẩm nang */}
        {posts.length > 0 && (
          <section className="border-y border-border/60 bg-muted/30">
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
              <SectionHead
                eyebrow="Cẩm nang"
                title="Kinh nghiệm cho chuyến đi"
                href="/blog"
              />
              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((p) => (
                  <PostCard key={p.slug} post={p} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12 sm:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full border border-primary-foreground/15"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-24 -left-10 size-80 rounded-full border border-primary-foreground/10"
            />
            <div className="relative mx-auto max-w-xl">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Sẵn sàng cho chuyến đi tiếp theo?
              </h2>
              <p className="mt-3 text-primary-foreground/85">
                Chọn một điểm đến và để chúng tôi lo phần còn lại — từ ăn chơi đến
                lưu trú, đi lại.
              </p>
              <Link
                href="/diem-den"
                className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-background px-6 py-3 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5"
              >
                Khám phá điểm đến
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function SectionHead({
  eyebrow,
  title,
  href,
}: {
  eyebrow: string;
  title: string;
  href?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-primary">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          {title}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary"
        >
          Xem tất cả
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      )}
    </div>
  );
}

function DestTile({ place }: { place: PlaceCardData }) {
  return (
    <Link
      href={`/diem-den/${place.slug}`}
      className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-muted shadow-sm shadow-black/5"
    >
      <Image
        src={coverUrl(place.images, place.slug, 480, 600)}
        alt={place.name}
        fill
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="text-xs font-medium text-white/80">
          {place.kind === "province" ? "Tỉnh / Thành phố" : "Điểm đến"}
        </p>
        <h3 className="mt-0.5 text-lg font-bold leading-tight tracking-tight text-white">
          {place.name}
        </h3>
      </div>
    </Link>
  );
}

type PostData = {
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  author: { name: string | null } | null;
  images: { url: string; isCover: boolean }[];
  _count: { likes: number; comments: number };
};

function PostCard({ post }: { post: PostData }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-muted shadow-sm shadow-black/5">
        <Image
          src={coverUrl(post.images, post.slug, 640, 360)}
          alt={post.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="mt-3">
        {post.category && (
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">
            {label(POST_CATEGORY_LABELS, post.category)}
          </span>
        )}
        <h3 className="mt-1 font-semibold tracking-tight line-clamp-2 transition-colors group-hover:text-primary">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            {post.author?.name ? `${post.author.name} · ` : ""}
            {dateFmt.format(post.publishedAt ?? post.createdAt)}
          </span>
          <PostStats likes={post._count.likes} comments={post._count.comments} />
        </div>
      </div>
    </Link>
  );
}
