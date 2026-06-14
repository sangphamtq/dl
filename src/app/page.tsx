import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PlaceCard, type PlaceCardData } from "@/components/site/place-card";

const placeSelect = {
  slug: true,
  name: true,
  kind: true,
  description: true,
  images: {
    where: { isCover: true },
    take: 1,
    select: { url: true, isCover: true },
  },
} as const;

export default async function Home() {
  const [session, featured] = await Promise.all([
    auth(),
    prisma.place.findMany({
      where: { status: "published", isFeatured: true },
      orderBy: [{ order: "asc" }, { popularity: "desc" }, { name: "asc" }],
      take: 8,
      select: placeSelect,
    }),
  ]);
  const user = session?.user;

  // Dự phòng nếu chưa đánh dấu nổi bật: lấy điểm đến mới xuất bản.
  const places: PlaceCardData[] =
    featured.length > 0
      ? featured
      : await prisma.place.findMany({
          where: { status: "published" },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: placeSelect,
        });

  const startHref = places[0] ? `/diem-den/${places[0].slug}` : "/diem-den";

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative">
          <div className="relative h-[460px] w-full sm:h-[540px]">
            <Image
              src="https://picsum.photos/seed/vietnam-hero-landscape/1800/1000"
              alt="Phong cảnh thiên nhiên Việt Nam"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/35" />
            <div className="absolute inset-0">
              <div className="mx-auto flex h-full max-w-6xl flex-col justify-end px-4 pb-12 text-white sm:px-6 sm:pb-16">
                <p className="text-sm font-medium text-white/80">
                  Xin chào, {user?.name ?? "bạn"} 👋
                </p>
                <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                  Khám phá Việt Nam theo cách của bạn
                </h1>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
                  Từ tỉnh đến từng điểm đến: ăn gì, chơi gì, ở đâu và đi lại thế
                  nào — tất cả trong một hành trình.
                </p>
                <div className="mt-7">
                  <Link
                    href={startHref}
                    className={buttonVariants({ size: "lg" })}
                  >
                    Bắt đầu khám phá
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured destinations (từ DB) */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Điểm đến nổi bật
              </h2>
              <p className="text-muted-foreground">
                Những vùng đất được yêu thích nhất để bắt đầu.
              </p>
            </div>
            <Link
              href="/diem-den"
              className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex"
            >
              Xem tất cả
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          {places.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {places.map((p) => (
                <PlaceCard key={p.slug} place={p} />
              ))}
            </div>
          ) : (
            <p className="mt-8 text-muted-foreground">
              Chưa có điểm đến nào được xuất bản.
            </p>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
