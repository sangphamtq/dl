"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "@/components/icons";
import { cn } from "@/lib/utils";

// Hero trang chủ — ẢNH TRÀN VIỀN, chữ là LỜI HỨA CỦA SITE.
//
// Ảnh đổi, chữ thì KHÔNG. Bản trước của kiểu hero này (`hero-slideshow.tsx`,
// đã gỡ) để tên điểm đến làm chữ to nhất màn hình: đẹp, nhưng biến trang chủ
// thành quảng cáo cho một nơi thay đổi mỗi bảy giây, và h1 thật thì teo lại
// thành một dòng chữ hoa nhỏ xíu. Ở đây ảnh chỉ là KHÔNG KHÍ; nơi trong ảnh
// được ghi tên đàng hoàng ở dải chân hero — kèm link, nên vẫn là một lối vào.
//
// Vì hero tràn viền chạy dưới header, `/` phải nằm ở nhánh `overlay` của
// `src/lib/site-chrome.ts` (không phải LIGHT_ROUTES) — nếu không header sẽ là
// kính trắng chữ mực đè lên ảnh tối.

export type HeroShot = {
  slug: string;
  name: string;
  province: string | null;
  url: string;
  lat: number | null;
  lng: number | null;
};

// Toạ độ nơi trong ảnh, viết theo quy ước tiếng Việt (Bắc/Nam · Đông/Tây).
// Đây là DỮ LIỆU THẬT lấy từ `Place.lat/lng` — chi tiết kiểu sổ tay thực địa,
// không phải một dòng chữ trang trí bịa ra cho đẹp. Nơi nào chưa có toạ độ thì
// không hiện gì (nhiều tỉnh vẫn đang thiếu — xem `backfill:place-coords`).
function coordLine(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null) return null;
  const ns = lat >= 0 ? "B" : "N";
  const ew = lng >= 0 ? "Đ" : "T";
  return `${Math.abs(lat).toFixed(3)}° ${ns} · ${Math.abs(lng).toFixed(3)}° ${ew}`;
}

// Một biến thể tiêu đề. `mark` là đoạn trong dòng hai được gạch chân vẽ tay —
// phải là chuỗi con của `b`, nếu không thì bỏ qua phần gạch.
export type HeroTitle = { a: string; b: string; mark?: string };

const INTERVAL = 7000;

// ─── CHỈNH MÀU CHO HERO (lần lượt từ dưới lên) ─────────────────────────────
//
// Trước đây hero chỉ có hai lớp đen thuần: ảnh xanh + chữ trắng + xám, nhìn ra
// một tấm ảnh bị "dìm" chứ không phải một tấm ảnh được CHỈNH MÀU. Bốn lớp dưới
// đây đều là chuyện ánh sáng, không phải hoạ tiết dán thêm — không có quả cầu
// mờ, không có đốm sáng lơ lửng giữa khung.
//
//  1. SCRIM_V — dằn dọc, nhưng bằng XANH RỪNG RẤT SÂU (#08160f) thay cho đen
//     thuần. Cùng độ tối, nhưng vùng dưới hero có nhiệt độ màu chứ không xám
//     chì, và nó ngả về đúng phía màu thương hiệu.
//  2. SCRIM_H — dằn mép trái (chỉ từ `sm`, xem lý do bên dưới), cùng tông.
//  3. WARM — vệt nắng ấm hắt lên từ GÓC DƯỚI TRÁI, `mix-blend-screen` nên nó
//     hành xử như ÁNH SÁNG (nâng vùng tối lên) chứ không như một lớp sơn cam.
//     Neo vào một góc và tắt trước 68% nên đọc ra là nắng xiên, không phải một
//     mảng gradient trôi nổi. Đây là chỗ đưa màu thứ hai của site (cam) vào
//     hero, cùng họ với vạch cam ở nhãn và dấu ngoặc kép ở dải câu hỏi.
//  4. VIGNETTE + GRAIN — tối bốn góc rất nhẹ và một lớp hạt 5%. Hai thứ này
//     không "nhìn thấy" được, chỉ cảm thấy: hạt phá dải màu (banding) của
//     gradient trên nền tối, và làm ảnh bớt vẻ nhựa.
//
// Gradient DỌC phải tự đủ một mình: ở khổ hẹp khối chữ chiếm trọn bề ngang nên
// không có vệt ngang nào giúp được. Gradient NGANG chỉ bật từ `sm` — ở màn
// 320px nó sẽ bôi xám gần hết tấm ảnh.
const SCRIM_V =
  "pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(8,22,15,0.88)_0%,rgba(8,22,15,0.72)_18%,rgba(9,21,16,0.48)_40%,rgba(10,20,17,0.2)_62%,rgba(11,19,18,0.06)_82%,rgba(7,17,14,0.34)_100%)]";
const SCRIM_H =
  "pointer-events-none absolute inset-0 -z-10 hidden bg-[linear-gradient(to_right,rgba(8,22,15,0.46)_0%,rgba(8,22,15,0.22)_40%,rgba(8,22,15,0)_72%)] sm:block";
const WARM =
  "pointer-events-none absolute inset-0 -z-10 mix-blend-screen bg-[radial-gradient(80%_70%_at_-5%_105%,rgba(255,154,31,0.30),rgba(255,154,31,0.09)_38%,transparent_68%)]";
const VIGNETTE =
  "pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(115%_95%_at_50%_35%,transparent_52%,rgba(0,0,0,0.4)_100%)]";

// Hạt phim: một ô 160×160 sinh bằng feTurbulence rồi lặp. Nhẹ hơn hẳn một file
// ảnh nhiễu, và `mix-blend-overlay` giữ cho nó chỉ làm nhám bề mặt chứ không
// làm bạc màu.
const GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")";

// Dòng hai của tiêu đề, có một đoạn được GẠCH CHÂN VẼ TAY. Nét vẽ là SVG co
// theo bề rộng đoạn chữ (`preserveAspectRatio="none"`) nhưng độ dày giữ nguyên
// (`vectorEffect="non-scaling-stroke"`), và tự vẽ từ trái sang phải.
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
  /** Các biến thể tiêu đề, đổi CÙNG NHỊP với ảnh. */
  titles: HeroTitle[];
  /** Tên người đã đăng nhập — thay chỗ nhãn mở đầu. */
  greeting?: string | null;
  /** Dải cuối hero, tràn hết bề ngang container (server render). */
  footer?: React.ReactNode;
  /** Phần chữ dưới h1 (server render): câu dẫn + nút. */
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
    // `bg-neutral-900` (không phải token): đây là nền TẠM sau tấm ảnh, và ảnh
    // hero thì luôn tối ở cả hai theme — dùng `bg-foreground` thì ở dark mode
    // nó lật thành gần trắng, loé lên một khung sáng trong lúc ảnh chưa về.
    <section
      className=// Chiều cao là `min-h`, KHÔNG phải `h-` cố định: khối chữ nay có đoạn
      // giới thiệu + hàng nhãn + hai nút, trên điện thoại hẹp nó cao hơn 86svh
      // — chiều cao cứng thì phần dưới tràn ra đè lên section kế tiếp (ảnh
      // `fill` neo theo section này nên section KHÔNG được cắt bớt).
      // `min(86svh,52rem)`: gần một màn hình, nhưng không kéo dài vô tận trên
      // màn hình cao.
      // `overflow-hidden` BẮT BUỘC: `hero-pan` phóng ảnh lên 1.07, mà thẻ
      // <Image fill> chỉ neo theo section chứ không bị nó cắt — thiếu dòng này
      // thì phần ảnh dư tràn xuống dưới hero thành một dải ảnh lạc lõng nằm
      // giữa hero và section kế tiếp (và các lớp scrim `inset-0` không phủ tới
      // đó nên nó còn sáng nguyên).
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
              // `hero-pan`: trôi rất chậm 7% trong 22s, đảo chiều liên tục —
              // tấm ảnh còn thở mà không ai kịp nhận ra nó đang động.
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

      {/* Khối chữ dồn xuống ĐÁY, bó trong đúng container của header nên tiêu
          đề bắt đầu thẳng cột với logo. `pt-28` chừa chỗ cho header trong veo. */}
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

            {/* TIÊU ĐỀ ĐỔI THEO ẢNH — cùng một nhịp, không đẻ thêm đồng hồ thứ
                hai: hai thứ chạy hai chu kỳ khác nhau thì hero lúc nào cũng có
                một cái gì đó đang động. Bấm vạch chuyển ảnh cũng đổi tiêu đề.

                A11Y/SEO: `<h1>` luôn chứa MỘT tên cố định (biến thể đầu, đọc
                bằng `sr-only`); phần chạy chữ là trang trí nên `aria-hidden`.
                Trình đọc màn hình và bộ thu thập không bao giờ gặp một tiêu đề
                đổi mỗi bảy giây.

                `key={i}` để React tháo-lắp lại hai dòng ⇒ animation khung cắt
                chạy lại từ đầu ở mỗi lượt. Không cần animation THOÁT: khung cắt
                đã che chỗ chữ cũ biến mất. */}
            <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.4rem,5.6vw,4rem)] font-bold leading-[1.05] tracking-tight [text-shadow:0_2px_28px_rgba(0,0,0,0.5)]">
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

          {/* Cụm điều khiển ảnh — tên nơi đang hiện + vạch chuyển.
              `lg:mr-14` chừa LÀN CỦA `TripDock`: viên tròn 44px cố định ở giữa
              mép phải màn hình, không chừa thì nó đè lên đuôi dòng "Ảnh: …". */}
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

            {/* CHUYỂN ẢNH BẰNG TAY — bốn vạch, không phải chấm tròn. Vạch nói
                được cả ba thứ trong một hình: có mấy ảnh, đang ở ảnh nào (vạch
                dài ra), và bấm được. Chấm tròn chỉ nói được hai.
                Vùng bấm cao 44px nhờ `py-3` dù vạch chỉ dày 3px. */}
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
                        // Vạch đang chọn màu CAM: chấm màu duy nhất ở nửa
                        // dưới hero, cùng họ với vạch cam ở nhãn mở đầu và dấu
                        // ngoặc kép của dải câu hỏi — ba điểm cam đủ để hero
                        // không còn là một tấm ảnh trắng-đen chữ.
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
