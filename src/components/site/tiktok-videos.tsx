"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Player chính thức của TikTok (nhẹ hơn embed blockquote). Tắt mô tả/gợi ý
// video lạ, giữ phụ đề + thanh điều khiển. KHÔNG autoplay: trình duyệt ép tắt
// tiếng video tự phát — để user bấm play trong player thì mới có âm thanh.
const PLAYER_BASE = "https://www.tiktok.com/player/v1";
const PLAYER_PARAMS =
  "music_info=0&description=0&rel=0&native_context_menu=0&closed_caption=1&controls=1";

export type PlaceVideo = {
  id: string;
  caption?: string;
  thumbnail?: string | null;
};

// Logo TikTok đơn sắc (lucide không có icon brand) — tô theo currentColor.
function TikTokGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .59.05.86.13V9.4a6.33 6.33 0 0 0-1-.06A6.34 6.34 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-6.9a8.16 8.16 0 0 0 4.77 1.53v-3.4a4.85 4.85 0 0 1-1.04-.14z" />
    </svg>
  );
}

/* ── Modal player + danh sách thumbnail chọn clip ───────────────── */
function VideoModal({
  videos,
  placeName,
  open,
  onOpenChange,
  active,
  setActive,
}: {
  videos: PlaceVideo[];
  placeName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  active: number;
  setActive: (i: number) => void;
}) {
  const labelOf = (i: number) =>
    videos[i]?.caption ?? `${placeName} — video ${i + 1}`;
  const current = videos[active];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="w-auto max-w-[95vw] gap-0 border-0 bg-transparent p-0 text-white shadow-none"
      >
        <DialogTitle className="sr-only">{labelOf(active)}</DialogTitle>
        <div className="relative mx-auto h-[72vh] max-h-[820px] w-[40.5vh] max-w-[461px] overflow-hidden rounded-2xl bg-black">
          {open && (
            <iframe
              key={`${current.id}-${active}`}
              src={`${PLAYER_BASE}/${current.id}?${PLAYER_PARAMS}`}
              title={labelOf(active)}
              allow="autoplay; fullscreen"
              className="absolute inset-0 size-full"
            />
          )}
        </div>

        <p className="mt-4 truncate text-center text-base font-medium text-white">
          {current.caption ?? `Video ${active + 1}`}
          {videos.length > 1 && (
            <span className="ml-2 text-sm tabular-nums text-white/60">
              {active + 1}/{videos.length}
            </span>
          )}
        </p>

        {videos.length > 1 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            {videos.map((v, i) => (
              <button
                key={`${v.id}-${i}`}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Xem ${labelOf(i)}`}
                aria-current={i === active ? "true" : undefined}
                className={cn(
                  "relative aspect-[9/16] w-14 shrink-0 overflow-hidden rounded-md border-2 bg-black/40 transition-all",
                  i === active
                    ? "border-white"
                    : "border-transparent opacity-60 hover:opacity-100",
                )}
              >
                {v.thumbnail && (
                  <Image
                    src={v.thumbnail}
                    alt=""
                    fill
                    sizes="56px"
                    unoptimized
                    className="object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Tìm thêm video trên TikTok */}
        <a
          href={`https://www.tiktok.com/search?q=${encodeURIComponent(`du lịch ${placeName}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          <TikTokGlyph className="size-4" />
          Thêm video du lịch {placeName} trên TikTok
          <ExternalLink className="size-3.5 opacity-70" aria-hidden />
        </a>
      </DialogContent>
    </Dialog>
  );
}

/* ── Card video nổi (hero) ──────────────────────────────────────── */
export function PlaceVideos({
  videos,
  placeName,
  className,
}: {
  videos: PlaceVideo[];
  placeName: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  if (videos.length === 0) return null;

  const first = videos[0];
  const label = first.caption ?? `${placeName} — video 1`;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setActive(0);
          setOpen(true);
        }}
        aria-label={`Xem ${label}${videos.length > 1 ? ` (+${videos.length - 1} video)` : ""}`}
        className={cn(
          "group relative aspect-[9/16] overflow-hidden rounded-xl border-2 border-background bg-muted shadow-xl shadow-black/25 transition-transform hover:scale-[1.03]",
          className,
        )}
      >
        {first.thumbnail && (
          <Image
            src={first.thumbnail}
            alt={label}
            fill
            sizes="120px"
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        <span className="absolute inset-0 grid place-items-center bg-black/15 transition-colors group-hover:bg-black/30">
          <span className="grid size-9 place-items-center rounded-full bg-background/90 text-primary shadow-md backdrop-blur transition-transform group-hover:scale-110">
            <Play className="size-4 translate-x-px fill-current" aria-hidden />
          </span>
        </span>
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-6 text-left">
          <span className="text-[11px] font-semibold text-white">
            {videos.length > 1 ? `${videos.length} video` : "Xem video"}
          </span>
        </span>
      </button>

      <VideoModal
        videos={videos}
        placeName={placeName}
        open={open}
        onOpenChange={setOpen}
        active={active}
        setActive={setActive}
      />
    </>
  );
}

/* ── Nút "Video" trong thanh tab sticky → mở từ bất kỳ vị trí cuộn ── */
export function PlaceVideoTabButton({
  videos,
  placeName,
  className,
}: {
  videos: PlaceVideo[];
  placeName: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  if (videos.length === 0) return null;
  const first = videos[0];

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setActive(0);
          setOpen(true);
        }}
        aria-label="Xem video điểm đến"
        className={cn(
          "inline-flex shrink-0 items-center gap-2 py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
          className,
        )}
      >
        <span className="relative -my-1 size-7 shrink-0 overflow-hidden rounded-full bg-muted">
          {first.thumbnail && (
            <Image
              src={first.thumbnail}
              alt=""
              fill
              sizes="28px"
              unoptimized
              className="object-cover"
            />
          )}
          <span className="absolute inset-0 grid place-items-center bg-black/30">
            <Play className="size-3 fill-white text-white" aria-hidden />
          </span>
        </span>
        Video
        {videos.length > 1 && (
          <span className="tabular-nums text-muted-foreground">{videos.length}</span>
        )}
      </button>

      <VideoModal
        videos={videos}
        placeName={placeName}
        open={open}
        onOpenChange={setOpen}
        active={active}
        setActive={setActive}
      />
    </>
  );
}
