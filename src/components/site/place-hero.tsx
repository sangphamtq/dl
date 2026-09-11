import Link from "next/link";
import { ChevronLeft, ChevronDown, Star } from "@/components/icons";
import { HeroFrame } from "@/components/site/hero-frame";
import { PlaceHeroStack, type HeroImage } from "@/components/site/place-hero-stack";
import { ShareButton } from "@/components/site/share-button";
import { CheckInButton } from "@/components/site/check-in-button";
import { PlanTripButton } from "@/components/site/plan-trip-button";
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

export function PlaceHero({
  place,
  heroImages,
  stats,
  back,
  checkIn,
  visitors,
  reviews,
}: {
  place: PlaceHeroData;
  heroImages: HeroImage[];
  stats: PlaceStat[];
  back?: { href: string; label: string };
  checkIn?: { checked: boolean; isAuthed: boolean };
  visitors?: { total: number; people: CheckInPerson[] };
  reviews?: { stars: number; total: number };
}) {
  return (
    <HeroFrame images={heroImages.map((i) => i.url)}>
      <div className="mx-auto max-w-7xl px-4 pb-14 pt-6 sm:px-6 sm:pb-12 sm:pt-5">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
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
                    targetKind="place"
                    targetId={place.id}
                    targetName={place.name}
                    targetImage={heroImages[0]?.url ?? null}
                    redirectTo={`/diem-den/${place.slug}`}
                    initialChecked={checkIn.checked}
                    isAuthed={checkIn.isAuthed}
                    reviewable={place.kind === "destination"}
                  />
                )}
                <ShareButton title={place.name} iconOnly />
              </div>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              {place.parent ? (
                <Link
                  href={`/diem-den/${place.parent.slug}`}
                  className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-warm-bright transition-opacity hover:opacity-90 sm:text-xs"
                >
                  {place.parent.name}
                </Link>
              ) : (
                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-warm-bright sm:text-xs">
                  {place.kind === "province" ? "Tỉnh · Thành phố" : "Điểm đến"}
                </span>
              )}
            </div>

            <h1 className="mt-2 text-balance font-[family-name:var(--font-display)] text-[clamp(1.875rem,5vw,3rem)] font-normal uppercase leading-[1.1] tracking-[0.06em] text-foreground sm:tracking-[0.1em]">
              {place.name}
            </h1>
            {place.tagline && (
              <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted-foreground">
                {place.tagline}
              </p>
            )}

            {checkIn && (
              <div className="mt-6">
                <PlanTripButton
                  placeId={place.id}
                  placeName={place.name}
                  isAuthed={checkIn.isAuthed}
                  className="h-11 px-6 text-base"
                />
              </div>
            )}

            {(stats.length > 0 ||
              (visitors && visitors.total > 0) ||
              (reviews && reviews.total > 0)) && (
              <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-3 text-sm sm:gap-x-7">
                {stats.length > 0 && (
                  <dl className="flex flex-wrap items-center gap-x-3 gap-y-3 sm:gap-x-7">
                    {stats.map((s) => (
                      <div
                        key={s.label}
                        className="flex items-center gap-1.5 sm:gap-2"
                      >
                        <s.icon
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <dd className="font-semibold tabular-nums">
                          {s.value.toLocaleString("vi-VN")}
                        </dd>
                        <dt className="hidden text-muted-foreground sm:block">
                          {s.label}
                        </dt>
                      </div>
                    ))}
                  </dl>
                )}
                {reviews && reviews.total > 0 && (
                  <Link
                    href={`/diem-den/${place.slug}#danh-gia`}
                    scroll
                    className="group inline-flex items-center gap-1.5"
                  >
                    <Star
                      className="size-4 shrink-0 fill-warm text-warm"
                      aria-hidden
                    />
                    <span className="font-semibold tabular-nums">
                      {reviews.stars.toFixed(1).replace(".", ",")}
                    </span>
                    <span className="whitespace-nowrap text-muted-foreground transition-colors group-hover:text-foreground">
                      · {reviews.total}
                      <span className="hidden sm:inline"> đánh giá</span>
                    </span>
                    <ChevronDown
                      className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-y-0.5 sm:block"
                      aria-hidden
                    />
                  </Link>
                )}
                {visitors && visitors.total > 0 && (
                  <CheckInFaces
                    people={visitors.people}
                    total={visitors.total}
                    dense
                  />
                )}
              </div>
            )}
          </div>

          <div className="relative z-10">
            <PlaceHeroStack images={heroImages} />
          </div>
        </div>
      </div>
    </HeroFrame>
  );
}
