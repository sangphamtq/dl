"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Camera, Pause, Play } from "@/components/icons";
import { cn } from "@/lib/utils";
import { HeroLightbox } from "@/components/site/hero-lightbox";
import type { HeroImage } from "@/components/site/place-hero-stack";

// Kim tiến trình của dải phim: chạy từ mép trái tới hết khung đang xem, nên vị
// trí của nó vừa là "còn bao lâu đổi ảnh" vừa là "đang ở khung thứ mấy".
// Mount lại theo `key={index}` → mỗi lần đổi ảnh là chạy tiếp đoạn kế.
function StripPlayhead({
  index,
  count,
  duration,
}: {
  index: number;
  count: number;
  duration: number;
}) {
  const [run, setRun] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setRun(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <span
      aria-hidden
      className="absolute inset-y-0 left-0 bg-white"
      style={{
        width: `${((index + (run ? 1 : 0)) / count) * 100}%`,
        transition: `width ${duration}ms linear`,
      }}
    />
  );
}

// Dải mây ở đáy hero: silhouette ghép từ các nửa cung tròn bán kính lệch nhau
// (đều nhau sẽ ra "vỏ sò"). Path vẽ lún xuống dưới đáy viewBox (h=220 > 140) để
// sau khi làm mờ, mép dưới vẫn đặc → không hở ảnh ở chỗ giáp nội dung trang.
const cloudPath = (radii: number[], base: number, h = 220) =>
  `M0,${h} L0,${base} ` +
  radii.map((r) => `a${r},${r} 0 0 1 ${2 * r},0`).join(" ") +
  ` L1440,${h} Z`;

// Tổng bán kính mỗi lớp = 720 → 2×720 = 1440 = bề ngang viewBox.
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

// Khung hero full-bleed: ảnh tràn viền tự crossfade + zoom chậm (Ken Burns),
// phủ scrim để chữ trắng đọc rõ, đáy tan dần vào nền trang. Nội dung do phía
// server truyền vào qua slot `topBar` (thanh điều khiển) và `children` (khối
// chữ) — nhờ vậy stats/check-in vẫn render ở server.
//
// Bố cục: chữ nằm giữa khung, bộ chuyển ảnh (dải phim) gom xuống đáy, canh giữa.
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
  // Vòng chạy = 5 ảnh THẬT đầu tiên. Dải khớp 1:1 với vòng chạy (không lật
  // trang, không cửa sổ trượt) và không nạp cả chục ảnh khổ lớn làm lớp nền.
  // Toàn bộ ảnh vẫn xem được qua "Xem tất cả N ảnh".
  const shots = images.slice(0, 5);
  const n = shots.length;
  const total = images.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Lightbox giữ index RIÊNG: nó duyệt được toàn bộ ảnh, trong khi hero chỉ
  // quay vòng 5 ảnh đầu. Trước đây lightbox dùng chung `index` của hero rồi bị
  // hero kẹp lại ở 0–4 → chọn ảnh thứ 6 thì carousel nhảy đúng ảnh nhưng số
  // đếm, chú thích và thumbnail đang chọn đứng im ở ảnh cũ.
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

  const playing = !paused && !lightbox && !reduced && n > 1;
  useEffect(() => {
    if (!playing) return;
    // Đặt thẳng trong effect (không useCallback): `n` suy ra từ mảng cắt mỗi lần
    // render, gói qua useCallback thì React Compiler không giữ được memo hoá.
    const t = setTimeout(() => setIndex((i) => (i + 1) % n), intervalMs);
    return () => clearTimeout(t);
  }, [index, playing, intervalMs, n]);

  if (n === 0) return null;
  const active = shots[index];

  return (
    <section className="relative isolate w-full overflow-hidden bg-neutral-900">
      {/* Lớp ảnh: crossfade + zoom chậm về 100% cho ảnh đang xem */}
      <div aria-hidden className="absolute inset-0">
        {shots.map((img, i) => (
          <div
            key={i}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000 ease-out",
              i === index ? "opacity-100" : "opacity-0",
            )}
          >
            <Image
              src={img.url}
              alt=""
              fill
              priority={i === 0}
              sizes="100vw"
              // Zoom chạy đúng bằng thời lượng slide: đặt dài hơn thì ảnh bị
              // chuyển đi giữa chừng, hoá ra chỉ zoom được một phần.
              style={{ transitionDuration: `${intervalMs}ms` }}
              className={cn(
                "object-cover transition-transform ease-out motion-reduce:transition-none",
                i === index ? "scale-100" : "scale-110",
              )}
            />
          </div>
        ))}
        {/* Scrim: một dải đáy dốc dài (chỗ đặt chữ) + một dải từ trái. Đủ để chữ
            trắng đọc rõ mà không cần drop-shadow trên từng chữ. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 from-10% via-black/30 via-45% to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/5 to-transparent" />
        {/* Đáy: ba lớp mây làm mờ bằng feGaussianBlur — sương chứ không phải
            silhouette cắt nét. Lớp càng cao càng nhạt & nhoè mạnh; lớp trước đặc
            màu nền để mép dưới liền mạch với nội dung trang. */}
        <svg
          viewBox="0 0 1440 140"
          preserveAspectRatio="none"
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-20 w-full sm:h-24 lg:h-28"
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

      {/* Header trang là `fixed` và chìm lên hero, nên hero tự chừa 4rem trên
          cùng để thanh trong hero (back/chia sẻ) không chui xuống dưới logo. pb
          đủ lớn để nội dung không đè lên đỉnh mây (mây cao ~60% chiều cao dải).
          Chiều cao theo thiết bị:
          - mobile/tablet: `h-auto` — cao đúng bằng nội dung (~650px). Ép 100svh
            ở đây vừa thừa (điện thoại màn dài thành hero lê thê) vừa rủi ro:
            section có overflow-hidden nên máy màn ngắn sẽ bị CẮT mất dải ảnh.
          - lg trở lên: trọn màn hình, kẹp trần 58rem cho màn rất cao. */}
      <div className="relative mx-auto flex h-auto min-h-[34rem] w-full max-w-7xl flex-col px-4 pb-10 pt-[calc(4rem+1.25rem)] sm:px-6 sm:pb-14 lg:h-[100svh] lg:max-h-[58rem] lg:min-h-[38rem] lg:pb-20">
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

          {/* Chú thích ảnh đang xem + bộ chuyển ảnh dạng KẺ MẢNH. Thay filmstrip
              thumbnail (nhiều hộp bo góc, viền trắng) bằng vạch 1px + số thứ tự
              tabular — cùng chất liệu với hairline của dải số liệu, không thêm
              một ngôn ngữ hình khối nào nữa.
              bottom: nằm cột phải; center: gom xuống đáy, canh giữa. */}
          <div
            className={cn(
              "shrink-0",
              "flex flex-col items-center text-center",
            )}
          >
            {/* Ô chú thích LUÔN chiếm chỗ (h-5 = đúng một dòng text-sm): chỉ ảnh
                của điểm đến/địa điểm con mới có caption + link, ảnh thường thì
                không — để nó tự mất/hiện thì cả cụm nhảy lên xuống mỗi lần đổi ảnh. */}
            <div className="flex h-5 items-center justify-center">
              {active.caption &&
                (active.href ? (
                  <Link
                    href={active.href}
                    className="group inline-flex max-w-full items-center gap-2 text-sm text-white/75 transition-colors hover:text-white"
                  >
                    <span className="truncate">{active.caption}</span>
                    <ArrowUpRight
                      className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden
                    />
                  </Link>
                ) : (
                  <p className="truncate text-sm text-white/75">
                    {active.caption}
                  </p>
                ))}
            </div>

            <div
              className={cn(
                "mt-4 flex items-center justify-center gap-4",
              )}
            >
              {n > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setPaused((p) => !p)}
                    aria-label={paused ? "Tiếp tục" : "Tạm dừng"}
                    className="shrink-0 text-white/55 transition-colors hover:text-white"
                  >
                    {paused ? (
                      <Play className="size-4" aria-hidden />
                    ) : (
                      <Pause className="size-4" aria-hidden />
                    )}
                  </button>

                  {/* "thumbs": các khung ảnh dính liền thành MỘT dải phim, dưới
                      là một đường kẻ duy nhất — kim chạy suốt chiều dài dải nên
                      vị trí kim vừa cho biết còn bao lâu, vừa cho biết đang ở
                      khung nào. Khỏi cần vạch riêng cho từng ảnh (rối) hay phóng
                      to ảnh đang xem (giật layout). */}
                  {/* Cuộn ngang khi dải rộng hơn màn: khung to nên 6 khung là
                      quá bề ngang điện thoại. Kim tiến trình nằm TRONG lớp cuộn
                      (w-max) nên vẫn trải đúng bề ngang thật của dải. */}
                  <div className="max-w-full overflow-x-auto hide-scrollbar">
                    <div className="relative flex w-max overflow-hidden rounded-lg">
                        {shots.map((img, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setIndex(i)}
                            aria-label={`Ảnh ${i + 1}`}
                            aria-current={i === index ? "true" : undefined}
                            className={cn(
                              "relative h-16 w-20 shrink-0 border-l border-black/25 transition-opacity duration-500 first:border-l-0 sm:h-20 sm:w-28",
                              i === index
                                ? "opacity-100"
                                : "opacity-35 hover:opacity-70",
                            )}
                          >
                            <Image
                              src={img.url}
                              alt=""
                              fill
                              sizes="112px"
                              className="object-cover"
                            />
                          </button>
                        ))}

                        {/* Kim nằm NGAY TRONG dải (mép đáy) — khỏi tốn thêm một
                            hàng. Dải tối mỏng phía sau để vạch trắng không chìm
                            vào khung ảnh sáng. */}
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-black/45 to-transparent"
                        />
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/25">
                          {playing ? (
                            <StripPlayhead
                              key={index}
                              index={index}
                              count={n}
                              duration={intervalMs}
                            />
                          ) : (
                            <span
                              aria-hidden
                              className="absolute inset-y-0 left-0 bg-white"
                              style={{ width: `${((index + 1) / n) * 100}%` }}
                            />
                          )}
                        </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setLbIndex(index);
                setLightbox(true);
              }}
              className="group mt-3 inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
            >
              <Camera className="size-4 shrink-0" aria-hidden />
              <span className="border-b border-white/25 pb-px transition-colors group-hover:border-white">
                Xem tất cả {total} ảnh
              </span>
            </button>
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
          // Đóng lại: chỉ kéo hero theo nếu ảnh vừa xem nằm trong vòng chạy;
          // ngoài vùng đó thì hero giữ nguyên ảnh cũ.
          onClose={() => {
            setLightbox(false);
            if (lbIndex < n) setIndex(lbIndex);
          }}
        />
      )}
    </section>
  );
}
