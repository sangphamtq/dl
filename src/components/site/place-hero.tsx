import Link from "next/link";
import { MapPin, Star } from "lucide-react";
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
export function PlaceHero({
  place,
  heroImages,
  stats,
}: {
  place: PlaceHeroData;
  heroImages: HeroImage[];
  stats: PlaceStat[];
}) {
  return (
    <section className="relative bg-gradient-to-b from-primary/[0.07] via-accent/50 to-background">
      {/* Lớp họa tiết nền — clip riêng để không tràn, KHÔNG cắt shadow của ảnh */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        {/* Lưới chấm mờ dần từ trên xuống */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(var(--border) 1.2px, transparent 1.2px)",
            backgroundSize: "22px 22px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 60% at 50% 0%, #000 30%, transparent 100%)",
          }}
        />
        {/* Vầng sáng primary — trên phải */}
        <div className="absolute -right-32 -top-28 size-[34rem] rounded-full bg-primary/10 blur-3xl" />
        {/* Vầng sáng cam — trái dưới */}
        <div className="absolute -left-28 top-24 size-[26rem] rounded-full bg-warm/[0.08] blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-6 sm:pb-6 sm:pt-6">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-12">
          {/* Trái: chữ */}
          <div>
            {/* Tỉnh / nổi bật — ẩn với trang tỉnh */}
            {place.kind !== "province" && (
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                {place.provinceName &&
                  (place.parent ? (
                    <Link
                      href={`/diem-den/${place.parent.slug}`}
                      className="inline-flex items-center gap-1.5 text-primary transition-colors hover:text-primary/80"
                    >
                      <MapPin className="size-4" aria-hidden />
                      {place.provinceName}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="size-4" aria-hidden />
                      {place.provinceName}
                    </span>
                  ))}
                {place.isFeatured && (
                  <span className="inline-flex items-center gap-1.5 text-warm">
                    <Star className="size-3.5 fill-current" aria-hidden />
                    Nổi bật
                  </span>
                )}
              </div>
            )}

            <h1 className="mt-4 text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              {place.name}
            </h1>
            {place.tagline && (
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
                {place.tagline}
              </p>
            )}

            {/* Dải thống kê */}
            {stats.length > 0 && (
              <dl className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm">
                {stats.map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <s.icon className="size-4 shrink-0 text-primary" aria-hidden />
                    <dd className="font-semibold tabular-nums">
                      {s.value.toLocaleString("vi-VN")}
                    </dd>
                    <dt className="text-muted-foreground">{s.label}</dt>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* Phải: chồng ảnh — z cao hơn sticky tab (z-40) để shadow đè lên,
              vẫn thấp hơn header (z-50). */}
          <div className="relative z-[45]">
            <PlaceHeroStack images={heroImages} />
          </div>
        </div>
      </div>
    </section>
  );
}
