"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowUpRight, Camera, Pause, Play } from "@/components/icons";
import { Ic } from "@/components/icon";
import { cn } from "@/lib/utils";

// Trang nháp so sánh CÁC KIỂU DANH SÁCH ẢNH cho hero điểm đến.
// Cả năm đều giữ nguyên ý tưởng "chiếc xe máy chạy hết một lượt rồi đổi ảnh",
// chỉ khác nhau ở bố cục và ngôn ngữ hình khối.
//
// Cố ý KHÔNG dùng Embla ở đây: bản thật (place-hero-canvas.tsx) chạy carousel để
// kéo tay được, còn trang này chỉ để nhìn hình thức nên một bộ đếm giờ là đủ.
// Chốt được kiểu nào thì bê phần JSX của kiểu đó sang, thay `setIndex(i)` bằng
// `api?.scrollTo(i)` là xong.

export type Shot = { url: string; caption: string };

// ---------------------------------------------------------------- dùng chung

function useSlideshow(n: number, intervalMs: number) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const playing = !paused && n > 1;

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % n), intervalMs);
    return () => clearTimeout(t);
  }, [index, playing, intervalMs, n]);

  return { index, setIndex, paused, setPaused, playing };
}

// Chạy một lần sau khi mount → cho phép CSS transition khởi động từ giá trị đầu.
//
// KHUÔN CHUNG: mọi thứ đếm giờ đều được gắn `key={index}` để mỗi lần đổi ảnh là
// mount lại, chạy lại từ mốc đầu của chặng đó. Nhờ vậy đoạn nối vòng (ảnh cuối →
// ảnh đầu) không bị chạy ngược — lỗi kinh điển khi tính vị trí bằng `index / n`
// rồi để CSS nội suy.
function useRunOnce() {
  const [run, setRun] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setRun(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return run;
}

// Mỗi ảnh chiếm MỘT CHẶNG; ảnh nằm ở GIỮA chặng còn xe chạy từ đầu tới cuối
// chặng → xe "đi ngang qua" ảnh đúng lúc ảnh đang mở, và chặng cuối kết thúc gọn
// ở mép phải.
const milestoneAt = (i: number, n: number) => ((i + 0.5) / n) * 100;

function Bike({ className }: { className?: string }) {
  // Material `two_wheeler` vẽ xe quay mặt sang phải, trùng chiều chạy.
  return <Ic icon="two-wheeler" className={cn("block", className)} />;
}

function Stage({
  activeUrl,
  children,
}: {
  activeUrl: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate h-[27rem] w-full overflow-hidden rounded-2xl bg-neutral-900 sm:h-[32rem]">
      <Image
        key={activeUrl}
        src={activeUrl}
        alt=""
        fill
        sizes="(min-width: 1280px) 45vw, 100vw"
        className="animate-in fade-in object-cover duration-700"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20"
      />
      <div className="pointer-events-none absolute inset-x-0 top-[34%] -translate-y-1/2 px-6 text-center">
        <p className="font-[family-name:var(--font-display)] text-lg font-bold leading-tight tracking-tight text-warm-bright">
          Quảng Ninh
        </p>
        <h3 className="mt-2 font-[family-name:var(--font-display)] text-5xl font-extrabold leading-none tracking-[-0.04em] text-white sm:text-6xl">
          Hạ Long
        </h3>
      </div>
      {children}
    </div>
  );
}

// Núm trượt hình chiếc xe + quãng đã đi. Dùng lại ở nhiều biến thể.
function Thumb({
  from,
  to,
  duration,
  playing,
  size = "md",
}: {
  from: number;
  to: number;
  duration: number;
  playing: boolean;
  size?: "sm" | "md";
}) {
  const run = useRunOnce();
  const pos = playing && run ? to : from;
  const ease = playing ? `${duration}ms linear` : undefined;

  return (
    <>
      {/* Quãng đã đi TỰ bo tròn hai đầu thay vì trông cậy `overflow-hidden` của
          rãnh — rãnh phải để lọt núm thò ra ngoài hai mép. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-warm-bright"
        style={{ width: `${pos}%`, transition: ease && `width ${ease}` }}
      />
      {/* Núm trắng đặc, xe màu tối bên trong: để núm cũng cam thì nó chìm vào
          quãng đã đi ngay phía sau. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-neutral-900 shadow-lg shadow-black/40",
          size === "sm" ? "size-6" : "size-7 sm:size-8",
        )}
        style={{ left: `${pos}%`, transition: ease && `left ${ease}` }}
      >
        <Bike className={size === "sm" ? "size-3.5" : "size-4 sm:size-[1.15rem]"} />
      </span>
    </>
  );
}

const GLASS =
  "bg-white/10 ring-1 ring-white/15 backdrop-blur-md transition-colors hover:bg-white/20 hover:text-white";

function PauseBtn({
  paused,
  onToggle,
  className,
}: {
  paused: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={paused ? "Tiếp tục" : "Tạm dừng"}
      className={cn("grid size-8 shrink-0 place-items-center rounded-full text-white/80", GLASS, className)}
    >
      {paused ? (
        <Play className="size-4" aria-hidden />
      ) : (
        <Pause className="size-4" aria-hidden />
      )}
    </button>
  );
}

function GalleryBtn({ total, className }: { total: number; className?: string }) {
  return (
    <button
      type="button"
      aria-label={`Xem tất cả ${total} ảnh`}
      title={`Xem tất cả ${total} ảnh`}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-white/80",
        GLASS,
        className,
      )}
    >
      <Camera className="size-4 shrink-0" aria-hidden />
      <span className="tabular-nums">{total}</span>
    </button>
  );
}

function CaptionLine({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white/85">
      {text}
      <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
    </span>
  );
}

// ================================================ A · bản đang chạy trên site

export function VariantCurrent({
  shots,
  intervalMs,
  total,
}: {
  shots: Shot[];
  intervalMs: number;
  total: number;
}) {
  const s = useSlideshow(shots.length, intervalMs);
  const n = shots.length;

  return (
    <Stage activeUrl={shots[s.index].url}>
      <div className="absolute inset-x-0 bottom-5 flex justify-center px-5 sm:bottom-7">
        <div className="grid w-full max-w-md grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-3 sm:max-w-xl">
          <div className="col-start-2 row-start-1 flex w-full items-center gap-2">
            {shots.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => s.setIndex(i)}
                aria-label={`Ảnh ${i + 1}`}
                className={cn(
                  "relative h-14 min-w-0 flex-1 overflow-hidden rounded-xl ring-1 transition-all duration-500 sm:h-16",
                  i === s.index
                    ? "scale-[1.06] opacity-100 shadow-xl shadow-black/50 ring-white/80"
                    : "opacity-55 shadow-lg shadow-black/30 ring-white/10 hover:opacity-85",
                )}
              >
                <Image src={img.url} alt="" fill sizes="120px" className="object-cover" />
              </button>
            ))}
          </div>

          <div className="relative col-start-2 row-start-2 h-5">
            <div
              className="absolute top-0 -translate-x-1/2 whitespace-nowrap transition-[left] duration-500 ease-out"
              style={{ left: `${milestoneAt(s.index, n)}%` }}
            >
              <CaptionLine text={shots[s.index].caption} />
            </div>
          </div>

          <PauseBtn
            paused={s.paused}
            onToggle={() => s.setPaused((p) => !p)}
            className="col-start-1 row-start-3"
          />
          <div className="relative col-start-2 row-start-3 h-1 rounded-full bg-white/20">
            <Thumb
              key={s.index}
              from={(s.index / n) * 100}
              to={((s.index + 1) / n) * 100}
              duration={intervalMs}
              playing={s.playing}
            />
          </div>
          <GalleryBtn total={total} className="col-start-3 row-start-3" />
        </div>
      </div>
    </Stage>
  );
}

// ==================================================== B · tối giản tràn viền

export function VariantEdge({
  shots,
  intervalMs,
  total,
}: {
  shots: Shot[];
  intervalMs: number;
  total: number;
}) {
  const s = useSlideshow(shots.length, intervalMs);
  const n = shots.length;

  return (
    <Stage activeUrl={shots[s.index].url}>
      {/* Bỏ hẳn ảnh nhỏ. Thanh chạy bám sát mép dưới hero, tràn hết bề ngang —
          nó thành đường kết của khung hình chứ không phải một widget đặt lên. */}
      <div className="absolute inset-x-0 bottom-0">
        <div className="flex items-end justify-between gap-4 px-5 pb-4 sm:px-7 sm:pb-5">
          <CaptionLine text={shots[s.index].caption} />
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs font-medium tabular-nums tracking-[0.2em] text-white/55">
              {String(s.index + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
            </span>
            <PauseBtn paused={s.paused} onToggle={() => s.setPaused((p) => !p)} />
            <GalleryBtn total={total} />
          </div>
        </div>

        {/* Rãnh nằm ĐÚNG mép dưới, không bo góc: bo tròn ở đây sẽ thành một
            thanh trôi nổi, mất hẳn ý "đường kết của khung hình". */}
        <div className="relative h-0.5 w-full bg-white/20">
          <Thumb
            key={s.index}
            from={(s.index / n) * 100}
            to={((s.index + 1) / n) * 100}
            duration={intervalMs}
            playing={s.playing}
            size="sm"
          />
        </div>
      </div>
    </Stage>
  );
}

// ======================================================== C · viên kính gom

export function VariantPill({
  shots,
  intervalMs,
  total,
}: {
  shots: Shot[];
  intervalMs: number;
  total: number;
}) {
  const s = useSlideshow(shots.length, intervalMs);
  const n = shots.length;

  return (
    <Stage activeUrl={shots[s.index].url}>
      <div className="absolute inset-x-0 bottom-5 flex flex-col items-center gap-3 px-5 sm:bottom-7">
        <CaptionLine text={shots[s.index].caption} />

        {/* Mọi thứ gom vào MỘT viên kính nổi. Ảnh nhỏ thu thành chấm bấm được —
            đủ để nhảy tới ảnh bất kỳ mà không kéo cả hàng ảnh vào viên. */}
        <div
          className={cn(
            "flex h-12 max-w-full items-center gap-3 rounded-full px-2 pr-3",
            "bg-black/25 ring-1 ring-white/15 backdrop-blur-xl",
          )}
        >
          <PauseBtn
            paused={s.paused}
            onToggle={() => s.setPaused((p) => !p)}
            className="bg-transparent ring-0 backdrop-blur-none"
          />

          <div className="relative h-1 w-32 rounded-full bg-white/20 sm:w-56">
            <Thumb
              key={s.index}
              from={(s.index / n) * 100}
              to={((s.index + 1) / n) * 100}
              duration={intervalMs}
              playing={s.playing}
              size="sm"
            />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {shots.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => s.setIndex(i)}
                aria-label={`Ảnh ${i + 1}`}
                className={cn(
                  "size-1.5 rounded-full transition-all duration-300",
                  i === s.index ? "scale-125 bg-white" : "bg-white/35 hover:bg-white/70",
                )}
              />
            ))}
          </div>

          <GalleryBtn total={total} className="bg-transparent ring-0 backdrop-blur-none" />
        </div>
      </div>
    </Stage>
  );
}

// ================================================== D · thẻ kính lệch góc trái

export function VariantCard({
  shots,
  intervalMs,
  total,
}: {
  shots: Shot[];
  intervalMs: number;
  total: number;
}) {
  const s = useSlideshow(shots.length, intervalMs);
  const n = shots.length;
  const next = (s.index + 1) % n;

  return (
    <Stage activeUrl={shots[s.index].url}>
      {/* Cụm rời hẳn trục giữa → tên điểm đến độc chiếm chính giữa khung.
          Thẻ cho xem trước ẢNH KẾ TIẾP thay vì cả hàng ảnh: hero đang chiếu ảnh
          hiện tại rồi, thứ người xem chưa biết là cái sắp tới. */}
      <div className="absolute bottom-5 left-5 w-60 rounded-2xl bg-black/25 p-3 ring-1 ring-white/15 backdrop-blur-xl sm:bottom-7 sm:left-8 sm:w-72">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => s.setIndex(next)}
            aria-label="Ảnh tiếp theo"
            className="relative size-12 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/20 transition-transform duration-300 hover:scale-105 sm:size-14"
          >
            <Image src={shots[next].url} alt="" fill sizes="80px" className="object-cover" />
          </button>
          <div className="min-w-0">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/45">
              Tiếp theo
            </p>
            <p className="truncate text-sm font-medium text-white/90">
              {shots[next].caption}
            </p>
          </div>
        </div>

        <div className="relative mt-4 h-1 rounded-full bg-white/20">
          <Thumb
            key={s.index}
            from={(s.index / n) * 100}
            to={((s.index + 1) / n) * 100}
            duration={intervalMs}
            playing={s.playing}
            size="sm"
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs font-medium tabular-nums tracking-[0.2em] text-white/50">
            {String(s.index + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
          </span>
          <div className="flex items-center gap-2">
            <PauseBtn paused={s.paused} onToggle={() => s.setPaused((p) => !p)} />
            <GalleryBtn total={total} />
          </div>
        </div>
      </div>
    </Stage>
  );
}

// ============================================ E · xe chạy trên mép hàng ảnh

export function VariantOnEdge({
  shots,
  intervalMs,
  total,
}: {
  shots: Shot[];
  intervalMs: number;
  total: number;
}) {
  const s = useSlideshow(shots.length, intervalMs);
  const n = shots.length;

  return (
    <Stage activeUrl={shots[s.index].url}>
      <div className="absolute inset-x-0 bottom-5 flex justify-center px-5 sm:bottom-7">
        <div className="w-full max-w-md sm:max-w-xl">
          <div className="mb-2 flex items-end justify-between gap-4">
            <CaptionLine text={shots[s.index].caption} />
            <div className="flex shrink-0 items-center gap-2">
              <PauseBtn paused={s.paused} onToggle={() => s.setPaused((p) => !p)} />
              <GalleryBtn total={total} />
            </div>
          </div>

          {/* KHÔNG có rãnh riêng: mép trên của hàng ảnh chính là con đường. Vạch
              nằm chồng lên mép ảnh (`-top-px`) nên hai thứ đọc ra là một. */}
          <div className="relative">
            <div className="flex w-full items-end gap-2">
              {shots.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => s.setIndex(i)}
                  aria-label={`Ảnh ${i + 1}`}
                  className={cn(
                    "relative min-w-0 flex-1 overflow-hidden rounded-b-xl transition-all duration-500",
                    // Ảnh đang mở CAO hơn hẳn — chênh lệch chiều cao thay cho
                    // viền đánh dấu, và mép trên vẫn thẳng hàng để xe chạy qua.
                    i === s.index ? "h-16 opacity-100 sm:h-20" : "h-11 opacity-50 hover:opacity-80 sm:h-14",
                  )}
                >
                  <Image src={img.url} alt="" fill sizes="120px" className="object-cover" />
                </button>
              ))}
            </div>

            <div className="absolute inset-x-0 -top-px h-0.5 rounded-full bg-white/25">
              <Thumb
                key={s.index}
                from={(s.index / n) * 100}
                to={((s.index + 1) / n) * 100}
                duration={intervalMs}
                playing={s.playing}
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>
    </Stage>
  );
}
