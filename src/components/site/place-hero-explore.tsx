import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Star } from "@/components/icons";
import { Ic } from "@/components/icon";
import { ShareButton } from "@/components/site/share-button";
import { CheckInButton } from "@/components/site/check-in-button";
import { PlaceVideos, type PlaceVideo } from "@/components/site/tiktok-videos";
import type { HeroImage } from "@/components/site/place-hero-stack";

type Counts = {
  spot: number;
  activity: number;
  specialty: number;
  eatery: number;
  accommodation: number;
  transport: number;
};

// Hero "bento" — lưới bất đối xứng, tile có chiều sâu (shadow/ring), icon accent:
// ảnh lớn (tên + tagline + chip), tile điểm nhấn (tag), tile số liệu (xanh, 2×2
// có icon + quầng sáng), tile video/ảnh vị trí cao.
export function PlaceHeroExplore({
  place,
  heroImages,
  counts,
  back,
  checkIn,
  visitors,
  reviews,
  videos,
  facts,
}: {
  place: {
    id: string;
    slug: string;
    name: string;
    kind: string;
    tagline: string | null;
    description: string | null;
    provinceName: string | null;
    tags: string[];
    parent: { slug: string; name: string } | null;
  };
  heroImages: HeroImage[];
  counts: Counts;
  back?: { href: string; label: string };
  checkIn?: { checked: boolean; isAuthed: boolean };
  visitors?: { total: number; people: unknown[] };
  reviews?: { stars: number; total: number };
  videos?: PlaceVideo[];
  /** "Thông tin chung" từ CMS — dùng cho ô Điểm nhấn khi Place không gắn tag. */
  facts?: { label: string; value: string }[];
}) {
  const img0 = heroImages[0]?.url ?? null;
  const img1 = heroImages[1]?.url ?? img0;
  const region = place.parent?.name ?? "Việt Nam";
  const desc = place.tagline ?? place.description ?? "";
  const locationLabel = place.provinceName
    ? `${place.name}, ${place.provinceName}`
    : place.name;

  const chip =
    "inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur-md";
  const cTile =
    "col-span-2 min-h-[15rem] lg:col-span-1 lg:col-start-4 lg:row-span-2 lg:min-h-0";

  const breakdown = [
    { n: counts.spot, label: "Địa điểm", icon: "map-pin", href: `/diem-den/${place.slug}/dia-diem` },
    { n: counts.activity, label: "Trải nghiệm", icon: "compass", href: `/diem-den/${place.slug}/hoat-dong` },
    { n: counts.specialty + counts.eatery, label: "Ẩm thực", icon: "utensils", href: `/diem-den/${place.slug}/am-thuc` },
    { n: counts.accommodation, label: "Lưu trú", icon: "bed-double", href: `/diem-den/${place.slug}/luu-tru` },
  ];

  return (
    <section className="px-4 pb-6 pt-5 sm:px-6 lg:px-8">
      {/* Thanh trên: quay lại + điều khiển */}
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
              targetImage={img0}
              redirectTo={`/diem-den/${place.slug}`}
              initialChecked={checkIn.checked}
              isAuthed={checkIn.isAuthed}
              reviewable={place.kind === "destination"}
            />
          )}
          <ShareButton title={place.name} iconOnly />
        </div>
      </div>

      {/* Bento */}
      <div className="grid grid-cols-2 gap-3 lg:h-[34rem] lg:grid-cols-4 lg:grid-rows-2">
        {/* A — Ảnh lớn: tên + tagline + chip */}
        <div className="group relative col-span-2 min-h-[19rem] overflow-hidden rounded-2xl bg-muted shadow-xl shadow-black/10 ring-1 ring-black/5 lg:col-span-2 lg:row-span-2 lg:min-h-0">
          {img0 && (
            <Image
              src={img0}
              alt={place.name}
              fill
              priority
              sizes="(min-width: 1024px) 46rem, 100vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10"
          />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <p className="font-[family-name:var(--font-script)] text-3xl leading-none text-warm sm:text-4xl">
              {region}
            </p>
            <h1 className="mt-1.5 text-balance text-4xl font-extrabold leading-[1.03] tracking-tight text-white drop-shadow sm:text-5xl">
              {place.name}
            </h1>
            {desc && (
              <p className="mt-3 max-w-md text-white/85 line-clamp-2 sm:text-lg">
                {desc}
              </p>
            )}
            {(reviews?.total || visitors?.total) && (
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                {reviews?.total ? (
                  <Link
                    href={`/diem-den/${place.slug}#danh-gia`}
                    scroll
                    className={chip}
                  >
                    <Star className="size-4 fill-warm text-warm" aria-hidden />
                    {reviews.stars.toFixed(1).replace(".", ",")}
                    <span className="text-white/70">· {reviews.total}</span>
                  </Link>
                ) : null}
                {visitors?.total ? (
                  <span className={chip}>
                    <Ic icon="map-pin" className="size-4" aria-hidden />
                    {visitors.total.toLocaleString("vi-VN")} đã đến
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* B — Điểm nhấn (tag) + CTA */}
        <div className="flex min-h-[9rem] flex-col justify-between rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border lg:col-start-3 lg:row-start-1 lg:min-h-0">
          <div className="min-h-0">
            <div className="flex items-center gap-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Ic icon="sparkles" className="size-4" aria-hidden />
              </span>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-primary">
                Điểm nhấn
              </p>
            </div>
            {place.tags.length > 0 ? (
              <div className="mt-3.5 flex flex-wrap gap-2">
                {place.tags.slice(0, 5).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-primary/[0.06] px-3 py-1 text-sm font-medium text-foreground ring-1 ring-primary/15"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : facts && facts.length > 0 ? (
              // Không có tag → lấy vài dòng "Thông tin chung". TRÁNH đổ `desc`
              // vào đây: desc chính là tagline đang hiện ngay trên ảnh lớn,
              // in lại thành ra một hero nói cùng một câu hai lần.
              <dl className="mt-3 space-y-2">
                {facts.slice(0, 3).map((f, i) => (
                  <div key={i}>
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      {f.label}
                    </dt>
                    <dd className="line-clamp-1 text-sm font-medium text-foreground">
                      {f.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              desc && (
                <p className="mt-2 text-[0.95rem] font-medium leading-relaxed text-foreground line-clamp-3">
                  {desc}
                </p>
              )
            )}
          </div>
          <Link
            href="#doi-net"
            className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-[#c9e86a] px-5 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm transition-transform hover:-translate-y-0.5"
          >
            Khám phá ngay
            <Ic icon="arrow-right" className="size-4" aria-hidden />
          </Link>
        </div>

        {/* D — Có gì ở đây: lưới 2×2 số liệu có icon + quầng sáng */}
        <div className="relative flex min-h-[9rem] flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-[#7cbb46] to-[#4c8a29] p-6 text-white shadow-lg shadow-[#4c8a29]/25 lg:col-start-3 lg:row-start-2 lg:min-h-0">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full bg-white/15 blur-2xl"
          />
          <p className="relative text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-white/80">
            Có gì ở đây
          </p>
          <div className="relative mt-3 grid flex-1 grid-cols-2 gap-x-3 gap-y-3">
            {breakdown.map((b) => (
              <Link
                key={b.label}
                href={b.href}
                className="group flex items-center gap-2.5 transition-opacity hover:opacity-90"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/10">
                  <Ic icon={b.icon} className="size-[1.15rem]" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-2xl font-bold leading-none tabular-nums">
                    {b.n}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-white/85">
                    {b.label}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* C — Video (nếu có) / ảnh vị trí cao */}
        {videos && videos.length > 0 ? (
          <PlaceVideos
            videos={videos}
            placeName={place.name}
            className={`aspect-auto rounded-2xl border-0 shadow-lg shadow-black/10 ring-1 ring-black/5 ${cTile}`}
          />
        ) : (
          <div className={`group relative overflow-hidden rounded-2xl bg-muted shadow-lg shadow-black/10 ring-1 ring-black/5 ${cTile}`}>
            {img1 && (
              <Image
                src={img1}
                alt=""
                fill
                sizes="(min-width: 1024px) 22rem, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            )}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent"
            />
            <span className="absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-warm text-warm-foreground shadow-lg ring-4 ring-white/30">
              <Ic icon="map-pin" className="size-5" aria-hidden />
            </span>
            <p className="absolute inset-x-0 bottom-5 px-4 text-center text-lg font-semibold text-white drop-shadow">
              {locationLabel}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
