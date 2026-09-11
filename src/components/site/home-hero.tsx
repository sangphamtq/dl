"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "@/components/icons";
import { cn } from "@/lib/utils";

export type HeroShot = {
  slug: string;
  name: string;
  province: string | null;
  url: string;
  lat: number | null;
  lng: number | null;
};

function coordLine(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null) return null;
  const ns = lat >= 0 ? "B" : "N";
  const ew = lng >= 0 ? "Đ" : "T";
  return `${Math.abs(lat).toFixed(3)}° ${ns} · ${Math.abs(lng).toFixed(3)}° ${ew}`;
}

export type HeroTitle = { a: string; b: string; mark?: string };

const INTERVAL = 7000;

const SCRIM_V =
  "pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(8,22,15,0.88)_0%,rgba(8,22,15,0.72)_18%,rgba(9,21,16,0.48)_40%,rgba(10,20,17,0.2)_62%,rgba(11,19,18,0.06)_82%,rgba(7,17,14,0.34)_100%)]";
const SCRIM_H =
  "pointer-events-none absolute inset-0 -z-10 hidden bg-[linear-gradient(to_right,rgba(8,22,15,0.46)_0%,rgba(8,22,15,0.22)_40%,rgba(8,22,15,0)_72%)] sm:block";
const WARM =
  "pointer-events-none absolute inset-0 -z-10 mix-blend-screen bg-[radial-gradient(80%_70%_at_-5%_105%,rgba(255,154,31,0.30),rgba(255,154,31,0.09)_38%,transparent_68%)]";
const VIGNETTE =
  "pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(115%_95%_at_50%_35%,transparent_52%,rgba(0,0,0,0.4)_100%)]";

const GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")";

function HeroMark({ b, mark }: { b: string; mark?: string }) {
  const at = mark ? b.indexOf(mark) : -1;
  if (!mark || at < 0) return <>{b}</>;

  return (
    <>
      {b.slice(0, at)}
      <span className="relative inline-block">
        {mark}
        <svg
          aria-hidden
          viewBox="0 0 300 12"
          preserveAspectRatio="none"
          className="absolute -bottom-[0.06em] left-0 h-[0.22em] w-full overflow-visible"
        >
          <path
            d="M3 8.4C58 3.6 118 2.9 178 6.2c40 2.2 78 3.4 119 -2.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="hero-underline"
          />
        </svg>
      </span>
      {b.slice(at + mark.length)}
    </>
  );
}

export function HomeHero({
  shots,
  titles,
  greeting,
  footer,
  children,
}: {
  shots: HeroShot[];
  titles: HeroTitle[];
  greeting?: string | null;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const n = shots.length;
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  // KHÔNG gắn sẵn cả bốn thẻ <Image>: chúng đều nằm trong khung nhìn nên
  // next/image tải hết ngay lần sơn đầu — bốn ảnh 1920px cho một thứ người xem
  // chỉ thấy một. Chỉ ảnh đã cần mới vào cây, cộng ảnh KẾ TIẾP gắn sớm ở
  // `opacity-0` để nó tải xong trong bảy giây chờ, khỏi hiện ra dở dang.
  const [mounted, setMounted] = React.useState<Set<number>>(() =>
    n > 1 ? new Set([0, 1]) : new Set([0]),
  );

  React.useEffect(() => {
    if (paused || n < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const t = window.setTimeout(() => {
      if (document.hidden) return;
      const next = (index + 1) % n;
      setIndex(next);
      const after = (next + 1) % n;
      setMounted((s) => (s.has(after) ? s : new Set(s).add(after)));
    }, INTERVAL);
    return () => window.clearTimeout(t);
  }, [index, paused, n]);

  const active = shots[Math.min(index, n - 1)];
  const title = titles[index % titles.length] ?? titles[0];

  return (
    <section
      className=// Chiều cao là `min-h`, KHÔNG phải `h-` cố định: khối chữ nay có đoạn
      "relative isolate flex min-h-[min(86svh,52rem)] flex-col overflow-hidden bg-neutral-900 text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {shots.map((s, i) =>
        mounted.has(i) ? (
          <Image
            key={s.slug}
            src={s.url}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className={cn(
              "hero-pan -z-10 object-cover object-center transition-opacity duration-1000 ease-out motion-reduce:transition-none",
              i === index ? "opacity-100" : "opacity-0",
            )}
          />
        ) : null,
      )}
      <span aria-hidden className={SCRIM_V} />
      <span aria-hidden className={SCRIM_H} />
      <span aria-hidden className={WARM} />
      <span aria-hidden className={VIGNETTE} />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.055] mix-blend-overlay"
        style={{ backgroundImage: GRAIN_URL }}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-end px-4 pb-8 pt-28 sm:px-6 lg:pb-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <div className="max-w-2xl">
            {greeting ? (
              <p className="hero-rise mb-5 text-sm font-medium text-white/75">
                Chào {greeting}
              </p>
            ) : (
              <p className="hero-rise mb-5 flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-warm-bright">
                <span aria-hidden className="h-px w-8 bg-warm-bright" />
                Thông tin du lịch Việt Nam
              </p>
            )}

            <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.4rem,5.6vw,4rem)] font-normal leading-[1.12] tracking-[-0.005em] [text-shadow:0_2px_28px_rgba(0,0,0,0.5)]">
              <span className="sr-only">
                {titles[0]?.a} {titles[0]?.b}
              </span>
              <span aria-hidden key={index}>
                <span className="block overflow-hidden -mb-[0.14em] pb-[0.14em]">
                  <span className="hero-line block">{title.a}</span>
                </span>
                <span className="block overflow-hidden -mb-[0.18em] pb-[0.18em]">
                  <span className="hero-line block text-warm-bright [animation-delay:120ms]">
                    <HeroMark b={title.b} mark={title.mark} />
                  </span>
                </span>
              </span>
            </h1>

            {children}
          </div>

          <div className="flex shrink-0 flex-col items-start gap-3 lg:mr-14 lg:items-end lg:pb-1">
            {active && (
              <Link
                href={`/diem-den/${active.slug}`}
                className="group inline-flex items-center gap-1.5 text-sm text-white/75 transition-colors hover:text-white"
              >
                <span className="text-white/45">Ảnh:</span>
                <span className="font-medium text-white">{active.name}</span>
                {active.province && (
                  <span className="text-white/60">· {active.province}</span>
                )}
                <ArrowUpRight
                  className="size-3.5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden
                />
              </Link>
            )}

            {active && coordLine(active.lat, active.lng) && (
              <p className="-mt-1 text-[0.7rem] tabular-nums tracking-[0.08em] text-[#ffd9a8]/55">
                {coordLine(active.lat, active.lng)}
              </p>
            )}

            {n > 1 && (
              <div className="flex items-center gap-2">
                {shots.map((s, i) => (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={() => {
                      setIndex(i);
                      setMounted((m) => (m.has(i) ? m : new Set(m).add(i)));
                    }}
                    aria-label={`Xem ảnh ${s.name}`}
                    aria-current={i === index}
                    className="group py-3"
                  >
                    <span
                      className={cn(
                        "block h-[3px] rounded-full transition-all duration-300 motion-reduce:transition-none",
                        i === index
                          ? "w-10 bg-warm-bright"
                          : "w-5 bg-white/40 group-hover:bg-white/75",
                      )}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {footer && (
          // Đường kẻ trên dải KHÔNG phải `border-t` trắng đều: nó là một vệt
          // 1px chuyển từ CAM ở mép trái sang trắng mờ — cùng họ với vạch cam ở
          // nhãn mở đầu, vạch chỉ số ảnh và dấu ngoặc kép của chính dải này.
          // Bốn điểm cam ấy là thứ giữ cho hero không rơi về đen-trắng-xám.
          <div className="relative mt-7 pt-6 lg:mt-9">
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,rgba(255,154,31,0.85),rgba(255,255,255,0.22)_18%,rgba(255,255,255,0.22))]"
            />
            {footer}
          </div>
        )}
      </div>

    </section>
  );
}
