"use client";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

export type HeroImage = {
  url: string;
  alt?: string | null;
  caption?: string | null;
  href?: string | null;
};

// Hero "chồng ảnh polaroid" cho trang chi tiết: stack 3 thẻ theo chiều sâu,
// autoplay cyclic 5s, đổi bài mượt, glass controls, vuốt ngang / tap mở gallery.
export function PlaceHeroStack({
  images,
  intervalMs = 5000,
}: {
  images: HeroImage[];
  intervalMs?: number;
}) {
  const n = images.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [lbApi, setLbApi] = useState<CarouselApi>();
  const [reduced, setReduced] = useState(false);

  const next = useCallback(() => setIndex((i) => (i + 1) % n), [n]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + n) % n), [n]);

  // Tôn trọng prefers-reduced-motion: tắt autoplay.
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);

  // Autoplay: timer reset mỗi khi đổi slide / pause / mở lightbox.
  const playing = !paused && !lightbox && !reduced && n > 1;
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(next, intervalMs);
    return () => clearTimeout(t);
  }, [index, playing, intervalMs, next]);

  // Phím tắt khi mở lightbox — điều khiển trực tiếp carousel.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") lbApi?.scrollNext();
      if (e.key === "ArrowLeft") lbApi?.scrollPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, lbApi]);

  // Đồng bộ slide carousel ↔ index của stack (đóng lại vẫn đúng ảnh đang xem).
  useEffect(() => {
    if (!lbApi) return;
    const onSel = () => setIndex(lbApi.selectedScrollSnap());
    lbApi.on("select", onSel);
    return () => {
      lbApi.off("select", onSel);
    };
  }, [lbApi]);

  // Gesture: vuốt ngang ≥45px đổi slide; tap (không kéo) mở gallery.
  const down = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    down.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = down.current;
    down.current = null;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else prev();
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      setLightbox(true);
    }
  };

  if (n === 0) return null;

  const active = images[index];

  // Depth tương đối: 0 = active, 1/2 = phía sau, ≥3 ẩn.
  const depthStyles = [
    { transform: "translate(0px,0px) rotate(0deg) scale(1)", opacity: 1 },
    { transform: "translate(10px,14px) rotate(1deg) scale(0.97)", opacity: 0.85 },
    { transform: "translate(20px,26px) rotate(2deg) scale(0.94)", opacity: 0.55 },
  ];
  const depthShadow = [
    "0 30px 60px -20px rgba(15,23,42,.32), 0 12px 24px -12px rgba(15,23,42,.3)",
    "0 18px 36px -18px rgba(15,23,42,.25)",
    "0 10px 24px -16px rgba(15,23,42,.18)",
  ];

  return (
    <>
      <div className="group/heroframe relative aspect-[3/2] w-full sm:aspect-[16/10] lg:aspect-[3/2]">
        <div className="relative h-full w-full">
          {images.map((img, i) => {
            const depth = (i - index + n) % n;
            const isActive = depth === 0;
            const visible = depth <= 2;
            const ds = depthStyles[Math.min(depth, 2)];
            return (
              <div
                key={i}
                aria-hidden={!isActive}
                className={cn(
                  "absolute inset-0 overflow-hidden rounded-2xl select-none",
                  isActive && "ring-1 ring-black/5",
                  // Mobile chỉ hiện thẻ active; desktop mới thấy chiều sâu.
                  depth >= 1 && "hidden sm:block",
                )}
                style={{
                  transform: ds.transform,
                  opacity: visible ? ds.opacity : 0,
                  zIndex: n - depth,
                  boxShadow: visible ? depthShadow[Math.min(depth, 2)] : "none",
                  pointerEvents: isActive ? "auto" : "none",
                  transition:
                    "transform 700ms cubic-bezier(0.22,1,0.36,1), opacity 700ms ease-out, box-shadow 700ms ease-out",
                }}
              >
                <Image
                  src={img.url}
                  alt={img.alt ?? ""}
                  fill
                  priority={isActive}
                  sizes="(min-width: 1152px) 1100px, 100vw"
                  className="object-cover"
                  draggable={false}
                />

                {isActive && (
                  <>
                    {/* Gradient đáy cho tên + góc trên-phải cho nút */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-2/5 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

                    {/* Lớp nhận gesture (dưới controls) */}
                    <button
                      type="button"
                      aria-label="Mở thư viện ảnh"
                      onPointerDown={onPointerDown}
                      onPointerUp={onPointerUp}
                      className="absolute inset-0 z-20 cursor-pointer"
                    />

                    {/* Tạm dừng / tiếp tục — góc trên phải */}
                    {n > 1 && (
                      <button
                        type="button"
                        onClick={() => setPaused((p) => !p)}
                        aria-label={paused ? "Tiếp tục" : "Tạm dừng"}
                        className="absolute right-3 top-3 z-30 grid size-8 place-items-center rounded-full bg-black/35 text-white opacity-100 backdrop-blur-md transition-all hover:bg-black/55 sm:right-4 sm:top-4 sm:opacity-0 sm:group-hover/heroframe:opacity-100"
                      >
                        {paused ? (
                          <Play className="size-3.5" aria-hidden />
                        ) : (
                          <Pause className="size-3.5" aria-hidden />
                        )}
                      </button>
                    )}

                    {/* Prev / Next — ẩn, hover mới hiện (desktop); mobile vuốt */}
                    {n > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={prev}
                          aria-label="Ảnh trước"
                          className="absolute left-3 top-1/2 z-30 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur-md transition-all hover:bg-black/55 active:scale-95 sm:grid sm:group-hover/heroframe:opacity-100"
                        >
                          <ChevronLeft className="size-5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={next}
                          aria-label="Ảnh tiếp theo"
                          className="absolute right-3 top-1/2 z-30 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur-md transition-all hover:bg-black/55 active:scale-95 sm:grid sm:group-hover/heroframe:opacity-100"
                        >
                          <ChevronRight className="size-5" aria-hidden />
                        </button>
                      </>
                    )}

                    {/* Đếm i/n — góc dưới-phải, ẩn/hover (mobile vẫn hiện) */}
                    {n > 1 && (
                      <span className="absolute bottom-5 right-4 z-30 text-sm font-medium tabular-nums text-white/90 opacity-100 drop-shadow transition-opacity sm:opacity-0 sm:group-hover/heroframe:opacity-100">
                        {index + 1} / {n}
                      </span>
                    )}

                    {/* Tên ảnh — cụm trái, luôn hiện; click sang địa điểm */}
                    {img.caption &&
                      (img.href ? (
                        <Link
                          href={img.href}
                          className="group/badge absolute bottom-4 left-3 z-30 flex max-w-[75%] items-center gap-3 sm:bottom-5 sm:left-5"
                        >
                          <span className="min-w-0">
                            <span className="block text-[11px] font-medium uppercase tracking-[0.2em] text-white/70">
                              Địa điểm
                            </span>
                            <span className="mt-0.5 block truncate text-base font-semibold text-white drop-shadow sm:text-lg">
                              {img.caption}
                            </span>
                          </span>
                          <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/30 bg-white/15 text-white opacity-100 backdrop-blur-md transition-all group-hover/badge:translate-x-0.5 group-hover/badge:bg-white/25 sm:opacity-0 sm:group-hover/heroframe:opacity-100">
                            <ArrowUpRight className="size-4" aria-hidden />
                          </span>
                        </Link>
                      ) : (
                        <p className="absolute bottom-4 left-3 z-30 max-w-[75%] truncate text-base font-semibold text-white drop-shadow sm:bottom-5 sm:left-5 sm:text-lg">
                          {img.caption}
                        </p>
                      ))}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Bản caption cho screen-reader */}
        <p className="sr-only" aria-live="polite">
          Ảnh {index + 1} trên {n}
          {active.caption ? `: ${active.caption}` : ""}
        </p>
      </div>

      {/* Lightbox full-screen — carousel kéo/vuốt + dải thumbnail.
          Portal ra body để thoát stacking context z-[45] của hero (header z-50). */}
      {lightbox &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex flex-col bg-black/95 backdrop-blur-sm"
            onClick={() => setLightbox(false)}
          >
          {/* Thanh trên */}
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium tabular-nums text-white/80">
              {index + 1} / {n}
            </span>
            <button
              type="button"
              aria-label="Đóng"
              onClick={() => setLightbox(false)}
              className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          {/* Ảnh — carousel chiếm phần giữa */}
          <div className="relative min-h-0 flex-1">
            <Carousel
              setApi={setLbApi}
              opts={{ startIndex: index, loop: n > 1, watchDrag: n > 1 }}
              className="h-full [&>div]:h-full"
            >
              <CarouselContent className="ml-0 h-full">
                {images.map((img, i) => (
                  <CarouselItem key={i} className="h-full pl-0">
                    {/* Vùng letterbox quanh ảnh: click để đóng; click ảnh thì không. */}
                    <div className="flex h-full items-center justify-center p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.alt ?? ""}
                        draggable={false}
                        onClick={(e) => e.stopPropagation()}
                        className="max-h-full max-w-full select-none object-contain"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>

            {n > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Ảnh trước"
                  onClick={(e) => {
                    e.stopPropagation();
                    lbApi?.scrollPrev();
                  }}
                  className="absolute left-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 sm:left-6"
                >
                  <ChevronLeft className="size-6" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Ảnh tiếp theo"
                  onClick={(e) => {
                    e.stopPropagation();
                    lbApi?.scrollNext();
                  }}
                  className="absolute right-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 sm:right-6"
                >
                  <ChevronRight className="size-6" aria-hidden />
                </button>
              </>
            )}
          </div>

          {/* Caption + dải thumbnail */}
          <div className="shrink-0 space-y-3 px-4 pb-5 pt-2 sm:px-6">
            {active.caption && (
              <p className="mx-auto max-w-2xl truncate text-center text-sm text-white/80">
                {active.caption}
              </p>
            )}
            {n > 1 && (
              <div className="flex justify-center">
                <div className="flex max-w-full gap-2 overflow-x-auto p-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        lbApi?.scrollTo(i);
                      }}
                      aria-label={`Ảnh ${i + 1}`}
                      aria-current={i === index ? "true" : undefined}
                      className={cn(
                        "relative aspect-[3/2] w-16 shrink-0 overflow-hidden rounded-md transition-all",
                        i === index
                          ? "ring-2 ring-white"
                          : "opacity-50 hover:opacity-100",
                      )}
                    >
                      <Image
                        src={img.url}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}
