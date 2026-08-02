"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "@/components/icons";
import { useHeroAmbient } from "@/components/site/hero-frame";
import { HeroLightbox } from "@/components/site/hero-lightbox";

export type HeroImage = {
  url: string;
  alt?: string | null;
  caption?: string | null;
  href?: string | null;
};

// Hero "chồng ảnh polaroid" cho trang chi tiết: 3 thẻ ảnh viền trắng xếp lệch
// theo chiều sâu (2 thẻ sau nghiêng, ló góc ra), autoplay cyclic 5s, glass
// controls, vuốt ngang / tap mở gallery.

// Chiều sâu của deck: 2 thẻ sau nhỏ dần, đẩy lên và nghiêng ngược chiều nhau →
// góc ló ra ở hai bên mép trên (không thò xuống che nội dung bên dưới).
// Thẻ rơi khỏi 3 lớp đầu giữ transform của lớp cuối và mờ đi tại chỗ.
const DEPTH = [
  {
    transform: "translate(0,0) rotate(0deg) scale(1)",
    shadow: "0 26px 60px -30px rgba(15,23,42,.5)",
  },
  {
    transform: "translate(-1.5%,-2.5%) rotate(-3.4deg) scale(0.96)",
    shadow: "0 20px 46px -30px rgba(15,23,42,.4)",
  },
  {
    transform: "translate(1.5%,-4.5%) rotate(4.2deg) scale(0.925)",
    shadow: "0 16px 36px -28px rgba(15,23,42,.32)",
  },
];
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
  const [reduced, setReduced] = useState(false);

  const next = useCallback(() => setIndex((i) => (i + 1) % n), [n]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + n) % n), [n]);

  // Báo ảnh đang xem lên khung hero → nền ambient crossfade theo.
  const setAmbient = useHeroAmbient();
  useEffect(() => {
    setAmbient?.(index);
  }, [index, setAmbient]);

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

  return (
    <>
      {/* Padding = chỗ chừa cho 2 thẻ sau ló ra (không cắt bằng overflow-hidden);
          thẻ trước sau khi trừ padding vẫn xấp xỉ 16/9. */}
      <div className="group/heroframe relative aspect-[16/10] w-full px-1 pt-7 sm:pt-9">
        <div className="relative h-full w-full">
          {images.map((img, i) => {
            const depth = (i - index + n) % n;
            const isActive = depth === 0;
            const visible = depth <= 2;
            const ds = DEPTH[Math.min(depth, 2)];
            return (
              <div
                key={i}
                aria-hidden={!isActive}
                className="absolute inset-0 select-none rounded-[1.35rem] bg-card p-1.5 ring-1 ring-black/5 sm:p-2 dark:ring-white/10"
                style={{
                  transformOrigin: "0% 100%",
                  transform: ds.transform,
                  opacity: visible ? 1 : 0,
                  zIndex: n - depth,
                  boxShadow: visible ? ds.shadow : "none",
                  pointerEvents: isActive ? "auto" : "none",
                  transition:
                    "transform 700ms cubic-bezier(0.22,1,0.36,1), opacity 700ms ease-out, box-shadow 700ms ease-out",
                }}
              >
                <div className="relative h-full w-full overflow-hidden rounded-[1rem] bg-muted sm:rounded-[1.1rem]">
                  <Image
                    src={img.url}
                    alt={img.alt ?? ""}
                    fill
                    priority={isActive}
                    sizes="(min-width: 1152px) 1100px, 100vw"
                    className="object-cover"
                    draggable={false}
                  />

                  {/* Thẻ sau lùi lại bằng một lớp phủ nhạt */}
                  {!isActive && (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 z-10 bg-background/25"
                    />
                  )}

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
                            <span className="min-w-0 truncate text-base font-semibold text-white drop-shadow sm:text-lg">
                              {img.caption}
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

      {lightbox && (
        <HeroLightbox
          images={images}
          index={index}
          onIndexChange={setIndex}
          onClose={() => setLightbox(false)}
        />
      )}
    </>
  );
}
