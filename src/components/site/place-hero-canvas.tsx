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

const CONTENT_HITS = [
  "[&_a]:pointer-events-auto",
  "[&_button]:pointer-events-auto",
  "[&_h1]:pointer-events-auto",
  "[&_p]:pointer-events-auto",
  "[&_dt]:pointer-events-auto",
  "[&_dd]:pointer-events-auto",
].join(" ");

const FADE_DURATION = 55;

export function PlaceHeroCanvas({
  images,
  topBar,
  children,
  compact = false,
  intervalMs = 6500,
}: {
  images: HeroImage[];
  topBar?: React.ReactNode;
  children: React.ReactNode;
  /** Nơi có ít nội dung (một ảnh, chưa có số liệu) — xem chú thích ở chiều cao. */
  compact?: boolean;
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

        {/* MỘT lớp phủ duy nhất, đều và nhẹ — xanh rừng rất sâu thay cho đen
            thuần (đen rút sạch màu khỏi ảnh). Giữ đúng một lớp: chồng nhiều
            gradient lên nhau là cách cũ làm ảnh đục. */}
        <div className="pointer-events-none absolute inset-0 bg-[rgba(8,22,15,0.34)]" />
      </div>

      <div
        className={cn(
                    // CHIỀU CAO CO THEO NỘI DUNG. Mặc định hero ăn trọn khung nhìn, nhưng
          // nơi mới có một ảnh và chưa có đánh giá/lượt đến (Tà Xùa) thì không
          // có dải ảnh nhỏ lẫn dải số liệu — ép 100svh ở đó để lại gần nửa dưới
          // trống trơn, đọc ra như trang bị hụt nội dung chứ không phải một hero
          // rộng rãi.
                    "pointer-events-none relative mx-auto flex h-auto min-h-[32rem] w-full max-w-7xl flex-col px-4 pb-12 pt-[calc(env(safe-area-inset-top)+0.875rem)] sm:px-6 sm:pb-16 lg:pb-20 lg:pt-[calc(4rem+1.25rem)]",
          compact
            ? "lg:min-h-[34rem]"
            : "lg:h-[100svh] lg:max-h-[58rem] lg:min-h-[38rem]",
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
                        // Tách ô khỏi ảnh nền bằng một vòng SÁNG mảnh thay cho
                        // bóng đen dày: từ khi hero chỉ còn một lớp phủ nhẹ,
                        // bóng đen quanh mỗi ô cộng dồn với lớp phủ làm cả dải
                        // ảnh xỉn hẳn so với vùng ảnh quanh nó.
                        : "ring-1 ring-white/25 group-hover:ring-white/60",
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
                        // 55% là mức của thời hero còn ba lớp phủ; giữ nguyên
                        // ở nền sáng bây giờ thì ô chưa chọn thành mảng bùn.
                        i === index
                          ? "opacity-0"
                          : "opacity-30 group-hover:opacity-0",
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
                  className={cn(TILE, "ring-1 ring-white/25 hover:ring-white/60")}
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
                        className="absolute inset-0 bg-black/45 transition-opacity duration-500 group-hover:opacity-70"
                      />
                    </>
                  ) : (
                    <span
                      aria-hidden
                      className="absolute inset-0 border border-white/45 bg-white/10 transition-colors group-hover:bg-white/20"
                    />
                  )}
                  {/* Chỉ in số khi CÒN ảnh chưa hiện (`+3`). Hết ảnh dư thì ô
                      này nghĩa là "xem tất cả" — in trơ con số tổng ("5") cạnh
                      đúng 5 ô ảnh đang bày ra thì nó đọc như một ô thứ sáu bị
                      hỏng, không ai hiểu là nút. Số tổng vẫn có ở `aria-label`
                      và tooltip. */}
                  <span className="relative flex h-full flex-col items-center justify-center gap-1 text-white">
                    <LayoutGrid className="size-4 shrink-0" aria-hidden />
                    {rest > 0 && (
                      <span className="text-[0.65rem] font-semibold leading-none tabular-nums">
                        +{rest}
                      </span>
                    )}
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
