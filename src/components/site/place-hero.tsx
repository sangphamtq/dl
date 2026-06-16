import Link from "next/link";
import { ChevronRight, MapPin, Star } from "lucide-react";
import { PlaceHeroStack, type HeroImage } from "@/components/site/place-hero-stack";
import type { PlaceStat } from "@/lib/place-meta";

type PlaceHeroData = {
  slug: string;
  name: string;
  kind: string;
  tagline: string | null;
  provinceName: string | null;
  isFeatured: boolean;
  parent: { slug: string; name: string } | null;
};

// Hero dùng chung cho trang chi tiết điểm đến & trang danh sách listing.
// extraCrumb: nếu có (vd "Trải nghiệm") thì tên Place thành link, crumb này là mục cuối.
export function PlaceHero({
  place,
  heroImages,
  stats,
  extraCrumb,
}: {
  place: PlaceHeroData;
  heroImages: HeroImage[];
  stats: PlaceStat[];
  extraCrumb?: string;
}) {
  const isProvince = place.kind === "province";

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-accent/50 to-background">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-44 -z-10 size-[36rem] rounded-full border border-primary/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-10 -z-10 size-96 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 bottom-0 -z-10 size-72 rounded-full bg-warm/10 blur-3xl"
      />

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 sm:pb-12">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          {/* Trái: chữ */}
          <div>
            {/* Breadcrumb */}
            <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                Trang chủ
              </Link>
              <ChevronRight className="size-3.5" aria-hidden />
              <Link href="/diem-den" className="hover:text-foreground">
                Điểm đến
              </Link>
              {place.parent && (
                <>
                  <ChevronRight className="size-3.5" aria-hidden />
                  <Link
                    href={`/diem-den/${place.parent.slug}`}
                    className="hover:text-foreground"
                  >
                    {place.parent.name}
                  </Link>
                </>
              )}
              <ChevronRight className="size-3.5" aria-hidden />
              {extraCrumb ? (
                <Link
                  href={`/diem-den/${place.slug}`}
                  className="hover:text-foreground"
                >
                  {place.name}
                </Link>
              ) : (
                <span className="text-foreground">{place.name}</span>
              )}
              {extraCrumb && (
                <>
                  <ChevronRight className="size-3.5" aria-hidden />
                  <span className="text-foreground">{extraCrumb}</span>
                </>
              )}
            </nav>

            {/* Chip loại / tỉnh / nổi bật */}
            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                <MapPin className="size-3" aria-hidden />
                {isProvince ? "Tỉnh / Thành phố" : "Điểm đến"}
              </span>
              {place.provinceName && (
                <span className="text-muted-foreground">{place.provinceName}</span>
              )}
              {place.isFeatured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-warm/15 px-2.5 py-1 text-warm">
                  <Star className="size-3 fill-current" aria-hidden />
                  Nổi bật
                </span>
              )}
            </div>

            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {place.name}
            </h1>
            {place.tagline && (
              <p className="mt-4 max-w-lg text-lg text-muted-foreground">
                {place.tagline}
              </p>
            )}

            {/* Dải thống kê */}
            {stats.length > 0 && (
              <dl className="mt-7 flex flex-wrap items-center gap-2 text-sm">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 ring-1 ring-border/60"
                  >
                    <s.icon className="size-4 text-primary" aria-hidden />
                    <dd className="font-semibold tabular-nums">
                      {s.value.toLocaleString("vi-VN")}
                    </dd>
                    <dt className="text-muted-foreground">{s.label}</dt>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* Phải: chồng ảnh */}
          <PlaceHeroStack images={heroImages} />
        </div>
      </div>
    </section>
  );
}
