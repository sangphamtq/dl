import Link from "next/link";
import {
  ChevronLeft,
  ChevronDown,
  MapPin,
  Star,
  type LucideIcon,
} from "@/components/icons";
import { HeroFrame } from "@/components/site/hero-frame";
import { PlaceHeroStack, type HeroImage } from "@/components/site/place-hero-stack";
import { PlaceVideos, type PlaceVideo } from "@/components/site/tiktok-videos";
import { CheckInButton } from "@/components/site/check-in-button";
import { CheckInFaces, type CheckInPerson } from "@/components/site/check-in-faces";
import { ShareButton } from "@/components/site/share-button";

export type SpotQuickFact = {
  icon: LucideIcon;
  label: string;
  value: string;
  muted: boolean;
};

export type SpotHeroProps = {
  id: string;
  name: string;
  tagline: string | null;
  place: { slug: string; name: string };
  checkInImage: string;
  categoryLabel: string | null;
  heroImages: HeroImage[];
  videos: PlaceVideo[];
  quickFacts: SpotQuickFact[];
  checkIn: { checked: boolean; isAuthed: boolean };
  visitors: { total: number; people: CheckInPerson[] };
  reviewSummary: { total: number; stars: number };
  // Link tới phần đánh giá: "#danh-gia" khi ở trang chi tiết (cuộn), hoặc
  // "/dia-diem/[slug]#danh-gia" khi ở trang con (điều hướng về).
  reviewsHref: string;
  // Nơi quay lại sau khi check-in.
  checkInRedirect: string;
};

// Hero dùng chung cho trang chi tiết địa điểm và các trang con (vd cộng đồng),
// để giữ nhất quán như trang điểm đến. Server component (không hook).
export function SpotHero({
  id,
  name,
  tagline,
  place,
  checkInImage,
  categoryLabel,
  heroImages,
  videos,
  quickFacts,
  checkIn,
  visitors,
  reviewSummary,
  reviewsHref,
  checkInRedirect,
}: SpotHeroProps) {
  return (
    <HeroFrame images={heroImages.map((i) => i.url)}>
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pb-6 sm:pt-5">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
          {/* Trái: chữ */}
          <div>
            {/* Quay lại + đánh dấu đã đến */}
            <div className="mb-5 flex items-center justify-between gap-3">
              <Link
                href={`/diem-den/${place.slug}/dia-diem`}
                className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft
                  className="size-4 transition-transform group-hover:-translate-x-0.5"
                  aria-hidden
                />
                Địa điểm tại {place.name}
              </Link>
              <div className="flex items-center gap-2">
                <CheckInButton
                  targetKind="spot"
                  targetId={id}
                  targetName={name}
                  targetImage={checkInImage}
                  redirectTo={checkInRedirect}
                  initialChecked={checkIn.checked}
                  isAuthed={checkIn.isAuthed}
                />
                <ShareButton title={name} iconOnly />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
              {categoryLabel && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                  {categoryLabel}
                </span>
              )}
              <Link
                href={`/diem-den/${place.slug}`}
                className="inline-flex items-center gap-1.5 text-primary transition-colors hover:text-primary/80"
              >
                <MapPin className="size-4" aria-hidden />
                {place.name}
              </Link>
            </div>

            <h1 className="mt-4 text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
              {name}
            </h1>
            {tagline && (
              <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted-foreground">
                {tagline}
              </p>
            )}
            {/* Fact nhanh */}
            {quickFacts.length > 0 && (
              <dl className="mt-6 flex flex-wrap gap-x-7 gap-y-4 text-sm">
                {quickFacts.map((f) => (
                  <div key={f.label} className="flex items-center gap-2.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <f.icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <dd
                        className={
                          f.muted
                            ? "font-medium text-muted-foreground"
                            : "font-semibold"
                        }
                      >
                        {f.value}
                      </dd>
                      <dt className="text-xs text-muted-foreground">{f.label}</dt>
                    </div>
                  </div>
                ))}
              </dl>
            )}

            {/* Vivu-er đã đến + tổng quan đánh giá */}
            {(visitors.total > 0 || reviewSummary.total > 0) && (
              <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm">
                {visitors.total > 0 && (
                  <CheckInFaces people={visitors.people} total={visitors.total} />
                )}
                {reviewSummary.total > 0 && (
                  <a
                    href={reviewsHref}
                    className="group inline-flex items-center gap-1.5"
                  >
                    <Star
                      className="size-4 shrink-0 fill-warm text-warm"
                      aria-hidden
                    />
                    <span className="font-semibold tabular-nums">
                      {reviewSummary.stars.toFixed(1).replace(".", ",")}
                    </span>
                    <span className="text-muted-foreground transition-colors group-hover:text-foreground">
                      · {reviewSummary.total} đánh giá
                    </span>
                    <ChevronDown
                      className="size-4 text-muted-foreground transition-transform group-hover:translate-y-0.5"
                      aria-hidden
                    />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Phải: chồng ảnh */}
          <div className="relative z-[45]">
            <PlaceHeroStack images={heroImages} />
            {videos.length > 0 && (
              <PlaceVideos
                videos={videos}
                placeName={name}
                className="absolute bottom-3 right-3 z-40 w-[88px] sm:bottom-4 sm:right-4 lg:-bottom-5 lg:-right-5 lg:w-[112px]"
              />
            )}
          </div>
        </div>
      </div>
    </HeroFrame>
  );
}
