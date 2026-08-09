"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MapPin, Pause, Play } from "@/components/icons";
import { cn } from "@/lib/utils";

export type HeroShot = {
  slug: string;
  name: string;
  province: string | null;
  url: string;
  /** Bản nhỏ dùng cho hàng ảnh chọn ở góc dưới. */
  thumb: string;
};

const INTERVAL = 7000;

// Ảnh nền hero tự đổi. Chỉ lo phần ẢNH và cụm điều khiển ở góc — chữ vẫn nằm
// trong page.tsx (Server Component) để không kéo cả khối tiêu đề sang client.
//
// KHÔNG render sẵn cả năm thẻ <Image>: chúng đều nằm trong khung nhìn nên
// next/image sẽ tải hết ngay từ lần sơn đầu — năm ảnh 1920px cho một thứ mà
// người xem chỉ thấy một. Ở đây chỉ những ảnh ĐÃ TỪNG cần mới được gắn vào cây,
// cộng thêm ảnh KẾ TIẾP gắn sớm ở `opacity-0` để nó tải xong trong 7 giây chờ,
// khỏi hiện ra dở dang lúc chuyển.
export function HeroSlideshow({ shots }: { shots: HeroShot[] }) {
  const n = shots.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  // Ảnh đã được gắn vào cây. Khởi tạo sẵn ảnh 0 và ảnh 1 để lượt chuyển ĐẦU
  // TIÊN cũng mượt; từ đó về sau mỗi lần đổi lại gắn thêm ảnh kế tiếp.
  const [mounted, setMounted] = useState<Set<number>>(() =>
    n > 1 ? new Set([0, 1]) : new Set([0]),
  );

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);

  const playing = !paused && !reduced && n > 1;

  // Đổi ảnh VÀ gắn sẵn ảnh kế tiếp — làm cùng một chỗ, và làm trong CALLBACK
  // chứ không phải trong thân effect. Gọi `setState` thẳng trong thân effect bị
  // React Compiler chặn (cascading render); ở trong `setTimeout`/`onClick` thì
  // không phải là render đồng bộ nên hợp lệ.
  const goTo = (next: number) => {
    setIndex(next);
    const after = (next + 1) % n;
    setMounted((s) => (s.has(after) ? s : new Set(s).add(after)));
  };

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      const next = (index + 1) % n;
      setIndex(next);
      const after = (next + 1) % n;
      setMounted((s) => (s.has(after) ? s : new Set(s).add(after)));
    }, INTERVAL);
    return () => clearTimeout(t);
  }, [index, playing, n]);

  const active = shots[Math.min(index, n - 1)];

  return (
    <>
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
              "-z-10 object-cover object-center transition-opacity duration-1000 ease-out motion-reduce:transition-none",
              i === index ? "opacity-100" : "opacity-0",
            )}
          />
        ) : null,
      )}

      {/* Cụm góc dưới: tên nơi trong ảnh + hàng ẢNH NHỎ để chọn + nút tạm dừng.
          Hàng chấm tròn trước đây nói được "có 5 ảnh, đang ở ảnh 2" nhưng không
          nói ảnh nào là ảnh nào — mà đây là năm ĐỊA DANH khác nhau, tức mỗi ô
          có nội dung riêng chứ không phải năm trang của cùng một thứ.
          Xếp CỘT ở khổ hẹp: một hàng gồm tên nơi + năm ảnh nhỏ + nút dừng rộng
          hơn 358px của màn 390. */}
      <div className="absolute inset-x-4 bottom-5 z-10 flex flex-col items-start gap-3 sm:inset-x-6 sm:flex-row sm:items-center sm:justify-between">
        {active && (
          <Link
            href={`/diem-den/${active.slug}`}
            className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full bg-black/35 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md transition-colors hover:bg-black/55"
          >
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{active.name}</span>
            {active.province && (
              <span className="hidden text-white/60 sm:inline">
                · {active.province}
              </span>
            )}
          </Link>
        )}

        {n > 1 && (
          <div className="flex max-w-full shrink-0 items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {shots.map((s, i) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Xem ảnh ${s.name}`}
                  aria-current={i === index ? "true" : undefined}
                  className={cn(
                    "relative h-9 w-12 shrink-0 overflow-hidden rounded-lg transition-all duration-300 sm:h-12 sm:w-16",
                    // Ảnh chưa chọn làm mờ đi chứ không thu nhỏ: thu nhỏ thì cả
                    // hàng nhấp nhô mỗi lần đổi ảnh.
                    i === index
                      ? "opacity-100 ring-2 ring-white"
                      : "opacity-55 ring-1 ring-white/30 hover:opacity-90",
                  )}
                >
                  <Image
                    src={s.thumb}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>

            {!reduced && (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? "Tiếp tục đổi ảnh" : "Tạm dừng đổi ảnh"}
                className="grid size-8 shrink-0 place-items-center rounded-full bg-black/35 text-white/90 backdrop-blur-md transition-colors hover:bg-black/55"
              >
                {paused ? (
                  <Play className="size-3.5" aria-hidden />
                ) : (
                  <Pause className="size-3.5" aria-hidden />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {active ? `Ảnh nền: ${active.name}` : ""}
      </p>
    </>
  );
}
