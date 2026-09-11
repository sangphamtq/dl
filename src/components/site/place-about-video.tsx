"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUp, ArrowUpRight, X } from "@/components/icons";
import { cn } from "@/lib/utils";
import { tiktokPlayerSrc, tiktokSearchUrl } from "@/lib/tiktok";
import {
  TikTokGlyph,
  type PlaceVideo,
} from "@/components/site/tiktok-videos";

const MINI_BTN =
  "grid size-7 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/25 backdrop-blur-sm transition-colors hover:bg-black/75";

function SideVideo({
  video,
  side,
  label,
  onSelect,
}: {
  video: PlaceVideo;
  side: "left" | "right";
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Xem ${label}`}
      className={cn(
        "absolute inset-y-[5%] w-[26%] overflow-hidden bg-muted opacity-60 blur-[3px] transition-all duration-300 hover:opacity-95 hover:blur-[1px]",
        side === "left"
          ? "right-full -mr-[11%] rounded-l-2xl"
          : "left-full -ml-[11%] rounded-r-2xl",
      )}
    >
      {video.thumbnail && (
        <Image
          src={video.thumbnail}
          alt=""
          fill
          sizes="120px"
          unoptimized
          className="object-cover"
        />
      )}
    </button>
  );
}

export function PlaceAboutVideo({
  videos,
  placeName,
}: {
  videos: PlaceVideo[];
  placeName: string;
}) {
  const [active, setActive] = useState(0);

  const boxRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [away, setAway] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!e.origin.endsWith("tiktok.com")) return;
      if (e.source !== iframeRef.current?.contentWindow) return;
      const raw = e.data;
      const msg: unknown =
        typeof raw === "string"
          ? (() => {
              try {
                return JSON.parse(raw);
              } catch {
                return null;
              }
            })()
          : raw;
      if (!msg || typeof msg !== "object") return;
      const d = msg as { "x-tiktok-player"?: boolean; type?: string; value?: unknown };
      if (d["x-tiktok-player"] !== true) return;
      // Quy ước trạng thái giống YouTube: 1 = đang phát, còn lại (0 chưa chạy,
      // 2 tạm dừng, 3 kết thúc) đều là KHÔNG phát.
      if (d.type === "onStateChange") setPlaying(d.value === 1);
      else if (d.type === "onPlayerReady") setPlaying(false);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        const top = e.rootBounds?.top ?? 0;
        setAway(!e.isIntersecting && e.boundingClientRect.bottom <= top + 1);
      },
      { threshold: 0, rootMargin: "-72px 0px -20% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const current = videos[active];
  if (!current) return null;

  const mini = away && playing && dismissedId !== current.id;
  const labelOf = (i: number) =>
    videos[i]?.caption ?? `${placeName} — video ${i + 1}`;
  const label = labelOf(active);
  const n = videos.length;
  const prev = n > 2 ? (active - 1 + n) % n : null;
  const next = n > 1 ? (active + 1) % n : null;

  return (
    <div className="mx-auto w-full max-w-[24rem] lg:max-w-none">
      <div className="relative mx-auto w-[74%]">
        {prev !== null && (
          <SideVideo
            video={videos[prev]}
            side="left"
            label={labelOf(prev)}
            onSelect={() => setActive(prev)}
          />
        )}
        <div
          ref={boxRef}
          className={cn(
            "relative aspect-[9/16] w-full",
            mini ? "z-50" : "z-10",
          )}
        >
          <div
            className={cn(
              "overflow-hidden rounded-2xl bg-muted shadow-xl shadow-black/15",
              mini
                ?
                  "fixed bottom-[calc(var(--bottom-nav-h,0px)+1rem)] right-4 z-50 w-32 shadow-2xl ring-1 ring-black/10 sm:right-6 sm:w-40"
                : "absolute inset-0",
            )}
          >
            <iframe
              ref={iframeRef}
              key={current.id}
              src={tiktokPlayerSrc(current.id)}
              title={label}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              loading="lazy"
              className="aspect-[9/16] w-full"
            />
            {mini && (
              <div className="absolute right-1.5 top-1.5 flex gap-1">
                <button
                  type="button"
                  onClick={() =>
                    boxRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    })
                  }
                  aria-label="Quay lại video trong bài"
                  title="Quay lại video trong bài"
                  className={MINI_BTN}
                >
                  <ArrowUp className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedId(current.id)}
                  aria-label="Đóng video thu nhỏ"
                  title="Đóng"
                  className={MINI_BTN}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            )}
          </div>
        </div>
        {next !== null && (
          <SideVideo
            video={videos[next]}
            side="right"
            label={labelOf(next)}
            onSelect={() => setActive(next)}
          />
        )}
      </div>

      {(n > 1 || current.caption) && (
        <div className="mt-3 flex items-baseline gap-2">
          {n > 1 && (
            <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
              {active + 1}/{n}
            </span>
          )}
          {current.caption && (
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {current.caption}
            </p>
          )}
        </div>
      )}

      <a
        href={tiktokSearchUrl(placeName)}
        target="_blank"
        rel="noopener noreferrer"
        className="group mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <TikTokGlyph className="size-3.5" />
        Thêm video du lịch {placeName} trên TikTok
        <ArrowUpRight
          className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden
        />
      </a>
    </div>
  );
}
