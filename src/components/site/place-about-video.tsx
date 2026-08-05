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

// Nút trên player thu nhỏ: nền tối trong mờ để nổi trên mọi khung hình video.
const MINI_BTN =
  "grid size-7 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/25 backdrop-blur-sm transition-colors hover:bg-black/75";

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

  // ── Thu nhỏ thành player góc màn khi cuộn qua ────────────────────────────
  // Ràng buộc quyết định cách làm: KHÔNG được dời <iframe> sang chỗ khác trong
  // DOM (portal, hay render ở nhánh khác) — trình duyệt tải lại iframe, TikTok
  // chạy lại từ đầu và mất luôn chỗ đang xem. Nên player thu nhỏ phải là CHÍNH
  // node đó, chỉ đổi class từ `absolute inset-0` sang `fixed` + khổ nhỏ.
  // Hộp ngoài (`boxRef`) giữ nguyên chỗ trong luồng nên trang không nhảy khi
  // player rời đi.
  const boxRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [away, setAway] = useState(false); // hộp đã cuộn khỏi tầm nhìn
  const [engaged, setEngaged] = useState(false); // người dùng đã bấm vào player
  const [dismissed, setDismissed] = useState(false);

  // Chỉ thu nhỏ khi người dùng ĐÃ bấm vào player. Không có cách nào hỏi iframe
  // của TikTok "đang phát chưa" (khác origin), nên dùng dấu hiệu gần nhất: click
  // vào iframe làm cửa sổ mất focus và `activeElement` chính là iframe đó.
  // Thiếu điều kiện này thì ai chỉ lướt qua cũng bị một khung video bám theo.
  useEffect(() => {
    const onBlur = () => {
      if (document.activeElement === iframeRef.current) setEngaged(true);
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, []);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        // CHỈ tính là "đã cuộn qua" khi hộp nằm PHÍA TRÊN vùng quan sát. Nếu
        // chỉ xét `!isIntersecting` thì cuộn ngược lên hero (hộp rơi xuống dưới
        // khung nhìn) cũng bật player thu nhỏ — mà lúc đó nút mũi tên LÊN lại
        // chỉ sai hướng, phải cuộn xuống mới về được chỗ cũ.
        //
        // So với `rootBounds.top`, KHÔNG phải với 0. IntersectionObserver chỉ
        // báo đúng LÚC vượt ranh giới, mà ranh giới đây đã bị `rootMargin` đẩy
        // xuống 72px — nên ngay khoảnh khắc đó `bottom` ≈ 72, chưa âm. Đo với
        // mốc 0 thì điều kiện không bao giờ đúng, cuộn tiếp cũng không có lần
        // báo nào nữa (observer không bắn liên tục) → player không bao giờ thu
        // nhỏ. Đây chính là lỗi làm nó ngừng hoạt động.
        const top = e.rootBounds?.top ?? 0;
        setAway(!e.isIntersecting && e.boundingClientRect.bottom <= top + 1);
        // Cuộn trở lại chỗ cũ thì xoá dấu "đã tắt" — lần cuộn qua sau lại mời
        // thu nhỏ, thay vì tắt một lần là tắt vĩnh viễn.
        if (e.isIntersecting) setDismissed(false);
      },
      // Rời hẳn khung nhìn mới tính, không phải vừa nhú lên mép trên.
      { threshold: 0, rootMargin: "-72px 0px -20% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const mini = away && engaged && !dismissed;

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
        {/* Hộp giữ chỗ: luôn nằm trong luồng, đúng khổ 9/16 của player. Player
            bên trong rời đi (fixed) thì chỗ này vẫn còn, trang không co giật.
            `z-10` (nằm trên hai clip mờ hai bên) TẠO MỘT NGỮ CẢNH XẾP LỚP, nên
            `z-50` của player thu nhỏ bên trong chỉ có tác dụng TRONG hộp này —
            so với phần còn lại của trang nó vẫn chỉ là lớp 10, thua thanh tab
            dính (z-40) và bị đè. Vì vậy phải nâng z của CHÍNH HỘP khi thu nhỏ. */}
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
                ? // Góc dưới–phải, trên thanh tab dưới (`--bottom-nav-h`).
                  // Không dùng transition giữa hai trạng thái: absolute↔fixed là
                  // đổi hệ toạ độ, nội suy ra một đường bay chéo qua cả trang.
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
            {/* Hai nút của player thu nhỏ. Không thể dùng chính khung video làm
                vùng bấm "quay lại": click ở đó thuộc về iframe TikTok (nút phát,
                thanh tua), chặn lấy là hỏng luôn phần điều khiển. Nên phải có
                nút riêng. */}
            {mini && (
              <div className="absolute right-1.5 top-1.5 flex gap-1">
                <button
                  type="button"
                  // Cuộn hộp giữ chỗ về giữa màn; nó vào tầm nhìn thì
                  // IntersectionObserver tự tắt chế độ thu nhỏ — không cần set
                  // state ở đây, khỏi hai nguồn sự thật đá nhau.
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
                  onClick={() => setDismissed(true)}
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
