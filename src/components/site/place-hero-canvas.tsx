"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import Fade from "embla-carousel-fade";
import { ArrowUpRight, LayoutGrid, Pause, Play } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { HeroLightbox } from "@/components/site/hero-lightbox";
import type { HeroImage } from "@/components/site/place-hero-stack";
import { R_BADGE } from "@/lib/radius";

const TILE = `group relative aspect-[3/4] w-14 cursor-pointer overflow-hidden transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50 sm:w-24 ${R_BADGE}`;

const cloudPath = (radii: number[], base: number, h = 220) =>
  `M0,${h} L0,${base} ` +
  radii.map((r) => `a${r},${r} 0 0 1 ${2 * r},0`).join(" ") +
  ` L1440,${h} Z`;

const CONTENT_HITS = [
  "[&_a]:pointer-events-auto",
  "[&_button]:pointer-events-auto",
  "[&_h1]:pointer-events-auto",
  "[&_p]:pointer-events-auto",
  "[&_dt]:pointer-events-auto",
  "[&_dd]:pointer-events-auto",
].join(" ");

const FADE_DURATION = 55;

const CLOUD_HAZE = cloudPath(
  [70, 54, 62, 46, 74, 58, 50, 66, 44, 72, 56, 68],
  92,
);
const CLOUD_BACK = cloudPath(
  [52, 30, 44, 26, 58, 34, 40, 24, 50, 36, 46, 28, 54, 32, 42, 26, 48, 50],
  108,
);
const CLOUD_FRONT = cloudPath(
  [36, 48, 28, 56, 34, 44, 24, 52, 38, 30, 46, 26, 42, 32, 50, 28, 56, 50],
  120,
);

export function PlaceHeroCanvas({
  images,
  topBar,
  children,
  intervalMs = 6500,
}: {
  images: HeroImage[];
  topBar?: React.ReactNode;
  children: React.ReactNode;
  intervalMs?: number;
}) {
  const shots = images.slice(0, 5);
  const n = shots.length;
  const total = images.length;
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  const playing = !paused && !lightbox && !reduced && n > 1;
  useEffect(() => {
    if (!playing || !api) return;
    const t = setTimeout(() => api.scrollNext(), intervalMs);
    return () => clearTimeout(t);
  }, [index, playing, intervalMs, api]);

  if (n === 0) return null;
  const active = shots[index];
  const rest = total - n;
  const more = images[n] ?? null;

  return (
    <section className="relative isolate w-full overflow-hidden bg-neutral-900">
      <div aria-hidden className="absolute inset-0">
        <Carousel
          setApi={setApi}
          plugins={n > 1 ? [Fade()] : []}
          opts={{ loop: n > 1, watchDrag: n > 1, duration: FADE_DURATION }}
          className="h-full [&>div]:h-full"
        >
          <CarouselContent className="ml-0 h-full touch-pan-y">
            {shots.map((img, i) => (
              <CarouselItem key={i} className="h-full overflow-hidden pl-0">
                <div className="relative h-full w-full">
                  <Image
                    src={img.url}
                    alt=""
                    fill
                    priority={i === 0}
                    // Hero bó trong `max-w-7xl` (= 90rem ở dự án này), nên trên
                    // màn rộng hơn thế nó KHÔNG còn full-viewport: khai `100vw`
                    // là bắt trình duyệt tải bản to hơn mức dùng, và Next log
                    // đúng cảnh báo đó.
                    sizes="(min-width: 90rem) 90rem, 100vw"
                    draggable={false}
                    style={{ transitionDuration: `${intervalMs}ms` }}
                    className={cn(
                      "object-cover transition-transform ease-out motion-reduce:transition-none",
                      i === index ? "scale-100" : "scale-110",
                    )}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 from-10% via-black/30 via-45% to-black/10" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/45 via-black/5 to-transparent" />
        <svg
          viewBox="0 0 1440 140"
          preserveAspectRatio="none"
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full sm:h-24 lg:h-28"
        >
          <defs>
            <filter id="hero-cloud-soft" x="-5%" y="-40%" width="110%" height="180%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
            <filter id="hero-cloud-softer" x="-5%" y="-40%" width="110%" height="180%">
              <feGaussianBlur stdDeviation="18" />
            </filter>
          </defs>
          <path
            d={CLOUD_HAZE}
            filter="url(#hero-cloud-softer)"
            className="fill-background/35"
          />
          <path
            d={CLOUD_BACK}
            filter="url(#hero-cloud-soft)"
            className="fill-background/60"
          />
          <path
            d={CLOUD_FRONT}
            filter="url(#hero-cloud-soft)"
            className="fill-background"
          />
        </svg>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 via-black/15 to-transparent lg:hidden"
      />

      <div
        className={cn(
          "pointer-events-none relative mx-auto flex h-auto min-h-[32rem] w-full max-w-7xl flex-col px-4 pb-10 pt-[calc(env(safe-area-inset-top)+0.875rem)] sm:px-6 sm:pb-14 lg:h-[100svh] lg:max-h-[58rem] lg:min-h-[38rem] lg:pb-20 lg:pt-[calc(4rem+1.25rem)]",
          CONTENT_HITS,
        )}
      >
        {topBar}

        <div
          className={cn(
            "flex flex-col",
            "min-h-0 flex-1 justify-between gap-8 pt-6",
          )}
        >
          <div
            className={cn(
              "min-w-0",
              "flex flex-1 flex-col justify-center",
            )}
          >
            {children}
          </div>

          <div
            className={cn(
              "shrink-0",
              "flex flex-col items-center text-center",
              n === 1 && "hidden",
            )}
          >
            <div className="flex w-full flex-col items-center gap-3.5">
              <div className="flex w-full items-center justify-center gap-1.5 sm:gap-2.5">
                {shots.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => api?.scrollTo(i)}
                    aria-label={img.alt || `Ảnh ${i + 1}`}
                    aria-current={i === index ? "true" : undefined}
                    className={cn(
                      TILE,
                      i === index
                        ? "shadow-[0_0_0_2px_var(--warm-bright)]"
                        : "shadow-lg shadow-black/40",
                    )}
                  >
                    <Image
                      src={img.url}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 96px, 56px"
                      className="object-cover"
                    />
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-0 bg-black transition-opacity duration-500",
                        i === index
                          ? "opacity-0"
                          : "opacity-55 group-hover:opacity-25",
                      )}
                    />
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setLbIndex(rest > 0 ? n : index);
                    setLightbox(true);
                  }}
                  aria-label={`Xem tất cả ${total} ảnh`}
                  title={`Xem tất cả ${total} ảnh`}
                  className={cn(TILE, "shadow-lg shadow-black/40")}
                >
                  {more ? (
                    <>
                      <Image
                        src={more.url}
                        alt=""
                        fill
                        sizes="(min-width: 640px) 96px, 56px"
                        className="object-cover"
                      />
                      <span
                        aria-hidden
                        className="absolute inset-0 bg-black/60 transition-opacity duration-500 group-hover:opacity-75"
                      />
                    </>
                  ) : (
                    <span
                      aria-hidden
                      className="absolute inset-0 border border-white/30 bg-white/5 transition-colors group-hover:bg-white/15"
                    />
                  )}
                  <span className="relative flex h-full flex-col items-center justify-center gap-1 text-white">
                    <LayoutGrid className="size-4 shrink-0" aria-hidden />
                    <span className="text-[0.65rem] font-semibold leading-none tabular-nums">
                      {rest > 0 ? `+${rest}` : total}
                    </span>
                  </span>
                </button>
              </div>

              <div className="flex h-5 items-center justify-center gap-3">
                {n > 1 && (
                  <button
                    type="button"
                    onClick={() => setPaused((p) => !p)}
                    aria-label={paused ? "Tiếp tục" : "Tạm dừng"}
                    className="relative shrink-0 cursor-pointer text-white/60 transition-colors before:absolute before:-inset-2 before:content-[''] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                  >
                    {paused ? (
                      <Play className="size-3.5" aria-hidden />
                    ) : (
                      <Pause className="size-3.5" aria-hidden />
                    )}
                  </button>
                )}

                {active.caption &&
                  (active.href ? (
                    <Link
                      key={index}
                      href={active.href}
                      className="group inline-flex min-w-0 animate-in items-center gap-1.5 fade-in text-sm font-medium text-white/85 transition-colors duration-500 hover:text-white"
                    >
                      <span className="truncate">{active.caption}</span>
                      <ArrowUpRight
                        className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        aria-hidden
                      />
                    </Link>
                  ) : (
                    <p
                      key={index}
                      className="animate-in truncate fade-in text-sm font-medium text-white/85 duration-500"
                    >
                      {active.caption}
                    </p>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Ảnh {index + 1} trên {n}
        {active.caption ? `: ${active.caption}` : ""}
      </p>

      {lightbox && (
        <HeroLightbox
          images={images}
          index={lbIndex}
          onIndexChange={setLbIndex}
          onClose={() => {
            setLightbox(false);
            if (lbIndex < n) api?.scrollTo(lbIndex, true);
          }}
        />
      )}
    </section>
  );
}
