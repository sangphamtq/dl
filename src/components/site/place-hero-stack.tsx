"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, Pause, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type HeroImage = {
  url: string;
  alt?: string | null;
  caption?: string | null;
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

  // Phím tắt khi mở lightbox.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, next, prev]);

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
      <div className="group/heroframe relative aspect-[16/10] w-full">
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
                    {/* Caption đáy */}
                    {img.caption && (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/65 to-transparent p-4 pt-10 sm:p-6 sm:pt-14">
                        <p className="line-clamp-2 text-sm text-white drop-shadow">
                          {img.caption}
                        </p>
                      </div>
                    )}

                    {/* Lớp nhận gesture (dưới controls) */}
                    <button
                      type="button"
                      aria-label="Mở thư viện ảnh"
                      onPointerDown={onPointerDown}
                      onPointerUp={onPointerUp}
                      className="absolute inset-0 z-20 cursor-pointer"
                    />

                    {/* Counter pill glass — góc trên-trái */}
                    {n > 1 && (
                      <div className="absolute left-3 top-3 z-30 flex items-center gap-2 rounded-full bg-black/40 py-1 pl-1 pr-2.5 text-white backdrop-blur-md sm:left-4 sm:top-4">
                        <span className="relative flex size-7 items-center justify-center">
                          <svg
                            viewBox="0 0 32 32"
                            className="absolute inset-0 size-full -rotate-90"
                          >
                            <circle
                              cx="16"
                              cy="16"
                              r="14"
                              fill="none"
                              stroke="rgba(255,255,255,0.25)"
                              strokeWidth="2.5"
                            />
                            <circle
                              key={index}
                              cx="16"
                              cy="16"
                              r="14"
                              fill="none"
                              stroke="white"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeDasharray="88"
                              style={{
                                ["--hero-ring-c" as string]: "88",
                                animation: playing
                                  ? `hero-ring-fill ${intervalMs}ms linear forwards`
                                  : "none",
                                strokeDashoffset: playing ? undefined : 0,
                              }}
                            />
                          </svg>
                          <span className="text-[11px] font-semibold tabular-nums">
                            {index + 1}
                          </span>
                        </span>
                        <span className="text-xs tabular-nums text-white/70">
                          / {n}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPaused((p) => !p)}
                          aria-label={paused ? "Tiếp tục" : "Tạm dừng"}
                          className="ml-0.5 grid size-6 place-items-center rounded-full transition-transform hover:bg-white/15 active:scale-95"
                        >
                          {paused ? (
                            <Play className="size-3.5" aria-hidden />
                          ) : (
                            <Pause className="size-3.5" aria-hidden />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Nút next liquid-glass — ẩn, hiện khi hover (luôn hiện trên touch) */}
                    {n > 1 && (
                      <button
                        type="button"
                        onClick={next}
                        aria-label="Ảnh tiếp theo"
                        className="absolute right-3 top-1/2 z-30 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-white/15 text-white opacity-100 shadow-lg backdrop-blur-md transition-all hover:bg-white/25 active:scale-95 sm:right-4 sm:opacity-0 sm:group-hover/heroframe:opacity-100"
                      >
                        <ChevronRight className="size-5" aria-hidden />
                      </button>
                    )}
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

      {/* Lightbox full-screen */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            aria-label="Đóng"
            className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md transition-transform hover:bg-white/20 active:scale-95"
          >
            <X className="size-5" aria-hidden />
          </button>
          <div
            className="relative h-full max-h-[85vh] w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={active.url}
              alt={active.alt ?? ""}
              fill
              sizes="100vw"
              className="object-contain"
            />
            {active.caption && (
              <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-center text-sm text-white">
                {active.caption}
              </p>
            )}
          </div>
          {n > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Ảnh tiếp theo"
              className="absolute right-4 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-white/15 text-white backdrop-blur-md transition-transform hover:bg-white/25 active:scale-95"
            >
              <ChevronRight className="size-6" aria-hidden />
            </button>
          )}
        </div>
      )}
    </>
  );
}
