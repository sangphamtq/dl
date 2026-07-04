import Link from "next/link";
import { ChevronLeft, MapPin, Star } from "lucide-react";
import { HeroFrame } from "@/components/site/hero-frame";
import { PlaceHeroStack, type HeroImage } from "@/components/site/place-hero-stack";
import { PlaceVideos, type PlaceVideo } from "@/components/site/tiktok-videos";
import { ShareButton } from "@/components/site/share-button";
import { CheckInButton } from "@/components/site/check-in-button";
import { CheckInFaces, type CheckInPerson } from "@/components/site/check-in-faces";
import type { PlaceStat } from "@/lib/place-meta";

type PlaceHeroData = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  tagline: string | null;
  provinceName: string | null;
  isFeatured: boolean;
  parent: { slug: string; name: string } | null;
};

// Hero dùng chung cho trang chi tiết điểm đến & trang danh sách listing.
// back: link "quay lại" do từng trang truyền vào (danh sách điểm đến / trang điểm đến).
export function PlaceHero({
  place,
  heroImages,
  stats,
  videos = [],
  back,
  checkIn,
  visitors,
}: {
  place: PlaceHeroData;
  heroImages: HeroImage[];
  stats: PlaceStat[];
  videos?: PlaceVideo[];
  back?: { href: string; label: string };
  checkIn?: { checked: boolean; isAuthed: boolean };
  visitors?: { total: number; people: CheckInPerson[] };
}) {
  return (
    <HeroFrame images={heroImages.map((i) => i.url)}>
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pb-6 sm:pt-5">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
          {/* Trái: chữ */}
          <div>
            <div className="mb-5 flex items-center justify-between gap-3">
              {back ? (
                <Link
                  href={back.href}
                  className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ChevronLeft
                    className="size-4 transition-transform group-hover:-translate-x-0.5"
                    aria-hidden
                  />
                  {back.label}
                </Link>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                {checkIn && (
                  <CheckInButton
                    placeId={place.id}
                    placeSlug={place.slug}
                    placeName={place.name}
                    initialChecked={checkIn.checked}
                    isAuthed={checkIn.isAuthed}
                  />
                )}
                <ShareButton title={place.name} iconOnly />
              </div>
            </div>

            {/* Tỉnh (ngữ cảnh "thuộc tỉnh nào") + nổi bật */}
            {(place.parent || place.isFeatured) && (
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
                {place.parent && (
                  <Link
                    href={`/diem-den/${place.parent.slug}`}
                    className="inline-flex items-center gap-1.5 text-primary transition-colors hover:text-primary/80"
                  >
                    <MapPin className="size-4" aria-hidden />
                    {place.parent.name}
                  </Link>
                )}
                {place.isFeatured && (
                  <span className="inline-flex items-center gap-1.5 text-warm">
                    <Star className="size-3.5 fill-current" aria-hidden />
                    Nổi bật
                  </span>
                )}
              </div>
            )}

            <h1 className="mt-4 text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
              {place.name}
            </h1>
            {place.tagline && (
              <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted-foreground">
                {place.tagline}
              </p>
            )}

            {/* Dải thống kê + Vivu-er đã đến (cùng hàng) */}
            {(stats.length > 0 || (visitors && visitors.total > 0)) && (
              <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm">
                {stats.length > 0 && (
                  <dl className="flex flex-wrap items-center gap-x-7 gap-y-3">
                    {stats.map((s) => (
                      <div key={s.label} className="flex items-center gap-2">
                        <s.icon
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <dd className="font-semibold tabular-nums">
                          {s.value.toLocaleString("vi-VN")}
                        </dd>
                        <dt className="text-muted-foreground">{s.label}</dt>
                      </div>
                    ))}
                  </dl>
                )}
                {visitors && visitors.total > 0 && (
                  <CheckInFaces people={visitors.people} total={visitors.total} />
                )}
              </div>
            )}
          </div>

          {/* Phải: chồng ảnh — z cao hơn sticky tab (z-40) để shadow đè lên,
              vẫn thấp hơn header (z-50). */}
          <div className="relative z-[45]">
            <PlaceHeroStack images={heroImages} />
            {videos.length > 0 && (
              <PlaceVideos
                videos={videos}
                placeName={place.name}
                className="absolute bottom-3 right-3 z-40 w-[88px] sm:bottom-4 sm:right-4 lg:-bottom-5 lg:-right-5 lg:w-[112px]"
              />
            )}
          </div>
        </div>
      </div>
    </HeroFrame>
  );
}
