"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Pause, Play } from "@/components/icons";
import { cn } from "@/lib/utils";
import { CtaButton } from "@/components/site/cta-button";

export type HeroStat = { label: string; n: number };

export type HeroShot = {
  slug: string;
  name: string;
  province: string | null;
  tagline: string | null;
  url: string;
  /** Bản nhỏ dùng cho hàng ảnh chọn ở góc dưới. */
  thumb: string;
  /** Số liệu THẬT của nơi này, đã lọc mục rỗng, theo đúng thứ tự các mục. */
  stats: HeroStat[];
};

const INTERVAL = 7000;

// Lớp phủ — HAI GRADIENT CHỒNG NHAU, theo đúng chỗ chữ nằm.
//
// Đổi hẳn công thức cũ (đậm ở đỉnh): khối chữ trước đây ở phần TRÊN ảnh, nay
// dồn xuống GÓC DƯỚI TRÁI nên chỗ cần dằn cũng chuyển theo.
//   · gradient DỌC là lớp CHÍNH và phải tự đủ một mình — ở khổ hẹp khối chữ
//     chiếm trọn bề ngang nên không có vệt ngang nào giúp được. Vẫn để đỉnh
//     tối nhẹ vì header trang này là kính TỐI đè lên ảnh (phần việc đó đã có
//     scrim riêng của `HeaderChrome`, đây chỉ đỡ thêm).
//   · gradient NGANG dằn mép trái — cần vì ảnh phong cảnh hay có mảng sáng
//     (sương, trời, mặt nước) rơi đúng vào giữa khung: bản chỉ-dọc để chữ
//     `white/80` nằm trên nền sương Tà Xùa, đọc rất chật vật. Tắt hẳn ở 72%
//     để nửa phải bức ảnh không bị bẩn.
const SCRIM_V =
  "pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.66)_20%,rgba(0,0,0,0.44)_42%,rgba(0,0,0,0.2)_62%,rgba(0,0,0,0.06)_82%,rgba(0,0,0,0.3)_100%)]";
// Tách thành span RIÊNG có `hidden sm:block` thay vì nhồi hai gradient vào một
// class: ở khổ hẹp khối chữ chiếm trọn bề ngang, mà vệt ngang tắt ở 72% bề
// rộng — trên máy 320px nghĩa là bôi xám gần hết tấm ảnh. Chỉ màn rộng, nơi
// chữ dồn về một phía, mới cần nó.
const SCRIM_H =
  "pointer-events-none absolute inset-0 -z-10 hidden bg-[linear-gradient(to_right,rgba(0,0,0,0.45)_0%,rgba(0,0,0,0.22)_40%,rgba(0,0,0,0)_72%)] sm:block";

// Hero trang chủ.
//
// ĐỔI VAI SO VỚI BẢN CŨ: ảnh không còn là giấy dán tường. Mỗi lượt là MỘT ĐIỂM
// ĐẾN CÓ THẬT, và khối chữ nói về đúng nơi trong ảnh — tỉnh, tên, câu giới
// thiệu, rồi số liệu từng mục. Vì vậy chữ phải nằm trong component client này
// chứ không ở `page.tsx` như trước: nó đổi theo từng ảnh.
//
// Hai việc mà bản cũ không làm được, nay gộp vào một khối:
//   · GIỚI THIỆU NƠI CHỐN — ảnh + tên + câu giới thiệu + nút vào thẳng trang đó
//     (trước đây lối vào duy nhất là một viên chip nhỏ ở góc dưới trái).
//   · NÓI TRANG NÀY LÀM GÌ — bằng hàng số liệu "24 địa điểm · 18 quán ăn · …",
//     tức là CHỨNG MINH cấu trúc năm mục của một trang điểm đến thay vì kể ra
//     năm danh từ trần. Dòng danh từ cũ còn trùng nguyên văn với section "Một
//     trang điểm đến có gì" ngay bên dưới.
//
// Khối chữ bó trong `max-w-7xl px-4 sm:px-6` — TRÙNG container của header, nên
// tên điểm đến bắt đầu thẳng cột với logo.
export function HeroSlideshow({
  shots,
  destCount,
  greeting,
}: {
  shots: HeroShot[];
  /** Tổng số điểm đến — nhãn của nút phụ. */
  destCount: number;
  /** Tên người đã đăng nhập, nếu có. */
  greeting?: string | null;
}) {
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
  if (!active) return null;

  return (
    <>
      {/* KHÔNG render sẵn cả năm thẻ <Image>: chúng đều nằm trong khung nhìn nên
          next/image sẽ tải hết ngay từ lần sơn đầu — năm ảnh 1920px cho một thứ
          mà người xem chỉ thấy một. Ở đây chỉ những ảnh ĐÃ TỪNG cần mới được gắn
          vào cây, cộng ảnh KẾ TIẾP gắn sớm ở `opacity-0` để nó tải xong trong 7
          giây chờ, khỏi hiện ra dở dang lúc chuyển. */}
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
      <span aria-hidden className={SCRIM_V} />
      <span aria-hidden className={SCRIM_H} />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 sm:px-6">
        {/* `key={index}` để khối chữ chạy lại hiệu ứng vào mỗi lượt đổi ảnh:
            ảnh crossfade 1s, chữ trồi lên nhẹ 500ms — cùng một nhịp, không giật.
            CỐ Ý KHÔNG có `fade-in`. `animate-in` chạy keyframe `enter` với
            `animation-fill-mode: none`, mà keyframe đó lấy `opacity: 0` làm
            khung đầu — nghĩa là chừng nào animation chưa chạy xong thì chữ
            KHÔNG NHÌN THẤY. Đây là nội dung quan trọng nhất trang, không được
            phụ thuộc vào một animation mới hiện ra. Chỉ dịch chuyển thì hỏng
            animation cũng chỉ lệch 12px, chữ vẫn đọc được.
            (Bắt được đúng lỗi này khi chụp ảnh kiểm: headless Chrome đóng băng
            đồng hồ animation nên hero ra một tấm ảnh trống trơn.) */}
        <div
          key={index}
          className="max-w-3xl animate-in slide-in-from-bottom-3 duration-500 motion-reduce:animate-none"
        >
          {greeting && (
            <p className="mb-3 text-sm font-medium text-white/70">
              Chào {greeting}
            </p>
          )}

          {/* h1 là LỜI HỨA CỦA SITE, không phải tên điểm đến: tên đổi mỗi 7
              giây, mà h1 thì phải đứng yên (SEO + trình đọc màn hình). Nó nhỏ
              nhưng đứng đầu — vai trò của nó là trả lời "đây là trang gì". */}
          <h1 className="font-[family-name:var(--font-display)] text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-white/75 sm:text-xs">
            Mỗi nơi một trang, đủ cho cả chuyến đi
          </h1>

          <p className="mt-5 text-sm font-medium text-white/70">
            {active.province ?? "Việt Nam"}
          </p>

          {/* Tên nơi: thứ TO NHẤT trên trang. Là <p> chứ không phải heading —
              nó đổi liên tục nên không thể làm mốc cấu trúc; lối vào ngữ nghĩa
              nằm ở nút "Xem …" ngay dưới. */}
          <p className="mt-1 font-[family-name:var(--font-display)] text-[clamp(2.75rem,7.5vw,5.5rem)] font-bold leading-[1.02] tracking-tight text-white [text-shadow:0_2px_28px_rgba(0,0,0,0.5)]">
            {active.name}
          </p>

          {active.tagline && (
            <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-white/90 [text-shadow:0_1px_12px_rgba(0,0,0,0.75)] sm:text-lg">
              {active.tagline}
            </p>
          )}

          {/* Hàng số liệu — phần "trang này làm được gì", nói bằng dữ liệu của
              chính nơi đang hiện. Mục rỗng đã lọc từ server: một nơi chưa có
              quán ăn nào mà hero ghi "0 quán ăn" thì thà đừng ghi.
              Không bọc thẻ, không viền: đây là một CÂU, ngắt bằng dấu chấm
              giữa — cùng cách viết với dòng dữ kiện ở màn hình Ẩm thực. */}
          {active.stats.length > 0 && (
            <p className="mt-6 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-white/90 [text-shadow:0_1px_12px_rgba(0,0,0,0.75)] sm:text-base">
              {active.stats.map((s, i) => (
                <span key={s.label} className="inline-flex items-center gap-2.5">
                  {i > 0 && (
                    <span aria-hidden className="text-white/40">
                      ·
                    </span>
                  )}
                  <span>
                    <strong className="font-semibold tabular-nums text-white">
                      {s.n}
                    </strong>{" "}
                    {s.label}
                  </span>
                </span>
              ))}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {/* Nút chính đi THẲNG vào nơi đang hiện — trước đây muốn tới đó
                phải tìm ra viên chip nhỏ ở góc. */}
            <CtaButton href={`/diem-den/${active.slug}`} tone="photo">
              Xem {active.name}
            </CtaButton>
            {/* Nút phụ dẫn ra danh sách — giữ lối cũ cho người chưa biết mình
                muốn đi đâu. Viền mảnh chứ không nền đặc: một màn hình chỉ một
                nút chính. */}
            <Link
              href="/diem-den"
              className="inline-flex h-12 items-center rounded-full border border-white/45 px-5 text-[0.95rem] font-medium text-white transition-colors hover:border-white hover:bg-white/10"
            >
              {destCount} điểm đến khác
            </Link>
          </div>
        </div>

        {/* Hàng ảnh nhỏ để chuyển nơi. Hàng chấm tròn nói được "có 5 ảnh, đang ở
            ảnh 2" nhưng không nói ảnh nào là ảnh nào — mà đây là năm ĐỊA DANH
            khác nhau, mỗi ô một nội dung riêng. */}
        {n > 1 && (
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto sm:gap-2 [&::-webkit-scrollbar]:hidden">
              {shots.map((s, i) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Xem ${s.name}`}
                  aria-current={i === index ? "true" : undefined}
                  className={cn(
                    "relative h-10 w-14 shrink-0 overflow-hidden rounded-lg transition-all duration-300 sm:h-12 sm:w-16",
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
                className="grid size-9 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              >
                {paused ? (
                  <Play className="size-4" aria-hidden />
                ) : (
                  <Pause className="size-4" aria-hidden />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {active.name}
        {active.province ? ` · ${active.province}` : ""}
      </p>
    </>
  );
}
