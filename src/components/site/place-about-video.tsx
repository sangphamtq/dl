"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowUpRight } from "@/components/icons";
import { cn } from "@/lib/utils";
import { tiktokPlayerSrc, tiktokSearchUrl } from "@/lib/tiktok";
import {
  TikTokGlyph,
  type PlaceVideo,
} from "@/components/site/tiktok-videos";

/* ── Clip kề bên: dải mờ cao gần bằng player, thò ra hai cạnh ─────────
   Đặt ABSOLUTE theo player (`inset-y-[5%]` → cao 90% player) chứ không nằm
   trong hàng flex: chỉ có cách này chiều cao mới bám theo player, còn để
   cùng khổ 9/16 trong hàng flex thì hẹp bao nhiêu sẽ thấp bấy nhiêu.
   Ảnh bị cắt (object-cover) thành một dải dọc — đúng ý "thò ra sau".
   Dùng ẢNH chứ không phải iframe: ba player cùng lúc vừa nặng vừa vô nghĩa. */
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
        // Thò ra khỏi cạnh player rồi kéo ngược vào 11% để chồng lên nhau;
        // margin % của phần tử absolute tính theo bề rộng player nên cụm co
        // giãn đồng bộ, không tràn cột.
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

// Video của mục "Đôi nét": player TikTok nhúng THẲNG trong trang, bấm play là
// chạy tại chỗ — khác card ở hero (PlaceVideos) vốn mở modal.
// Giữ ĐÚNG khổ dọc 9/16 của TikTok thay vì nhồi vào khung ngang rồi lấp hai bên
// bằng nền mờ. Chiều cao khống chế bằng bề rộng cột (cột phải ~24rem ở trang
// Place) chứ không bằng cách bóp méo tỉ lệ. iframe `loading="lazy"` để không
// kéo script bên thứ ba ngay khi vào trang (mục này nằm dưới hero).
export function PlaceAboutVideo({
  videos,
  placeName,
}: {
  videos: PlaceVideo[];
  placeName: string;
}) {
  const [active, setActive] = useState(0);
  const current = videos[active];
  if (!current) return null;
  const labelOf = (i: number) =>
    videos[i]?.caption ?? `${placeName} — video ${i + 1}`;
  const label = labelOf(active);
  // Chỉ số clip nhấp nhô hai bên. 1 clip: không có bên nào. 2 clip: chỉ bên
  // phải (bên trái sẽ là chính clip kia → lặp). Từ 3 clip: quay vòng hai bên.
  const n = videos.length;
  const prev = n > 2 ? (active - 1 + n) % n : null;
  const next = n > 1 ? (active + 1) % n : null;

  return (
    <div className="mx-auto w-full max-w-[24rem] lg:max-w-none">
      {/* Player quyết định chiều cao của cả cụm; clip hai bên bám theo nó.
          Bề rộng 74% cột, hai bên thò thêm 15% mỗi bên → cụm chiếm ~96% cột. */}
      <div className="relative mx-auto w-[74%]">
        {prev !== null && (
          <SideVideo
            video={videos[prev]}
            side="left"
            label={labelOf(prev)}
            onSelect={() => setActive(prev)}
          />
        )}
        <iframe
          key={current.id}
          src={tiktokPlayerSrc(current.id)}
          title={label}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          loading="lazy"
          className="relative z-10 aspect-[9/16] w-full rounded-2xl bg-muted shadow-xl shadow-black/15"
        />
        {next !== null && (
          <SideVideo
            video={videos[next]}
            side="right"
            label={labelOf(next)}
            onSelect={() => setActive(next)}
          />
        )}
      </div>

      {/* Đếm clip: cho biết đang xem cái mấy trên tổng mấy — người dùng hiểu
          ngay hai bên là clip khác chứ không phải hình trang trí. */}
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

      {/* Lối ra TikTok cho người muốn xem thêm ngoài vài clip đã biên tập. */}
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
