"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { R_CTRL } from "@/lib/radius";

// Thanh chuyển nhanh giữa các section của một trang danh sách — VIÊN SÁNG TRƯỢT
// bám theo section đang xem.
//
// Tách ra từ `destination-filter.tsx` khi trang /dia-diem cần đúng cơ chế này:
// phần đo đạc (scroll-spy + khoá lúc cuộn theo lệnh bấm + đo lại viên sáng khi
// đổi khổ) là ~90 dòng, nhân đôi sang file thứ hai thì hai bản sẽ lệch nhau ngay
// lần sửa đầu tiên.
//
// Vì sao là viên sáng trượt chứ không phải gạch chân: bản trước là gạch 2px dưới
// nhãn đang xem — đúng nghĩa, nhưng đứng cạnh nhóm sắp xếp thì nó là thứ mảnh
// nhất trong thanh, gần như biến mất. Viên nền `primary/10` bám lấy nhãn đang
// xem và TRƯỢT sang nhãn kế khi cuộn qua section khác: chuyển động ở đây không
// phải trang trí, nó chính là scroll-spy hiện hình.
//
// Kích thước viên đo từ nút THẬT (`offsetLeft`/`offsetWidth`) nên nhãn giữ được
// bề ngang tự nhiên — ép các nhãn bằng nhau thì thanh phình thêm cả trăm pixel ở
// khổ hẹp.
//
// Vẫn khác hẳn nhóm sắp xếp bên phải (rãnh xám + viên trắng nổi): bên này không
// có rãnh, chỉ một vệt màu — hai điều khiển cạnh nhau không bị đọc nhầm thành
// một cặp sinh đôi.
export function SectionTabs({
  /** Nhãn từng section, theo đúng thứ tự chúng xuất hiện trong trang. */
  labels,
  /** Tiền tố id của section: section thứ i phải có `id={`${idPrefix}-${i}`}`. */
  idPrefix,
  /** Nhãn vùng cho trình đọc màn hình, vd "Chuyển nhanh theo miền". */
  ariaLabel,
  /**
   * Đổi giá trị này khi danh sách section được dựng lại (lọc, tìm kiếm, sắp
   * xếp) để hook đo lại từ đầu — nội dung đổi thì mốc cuộn cũng đổi.
   */
  resetKey,
  /**
   * Bo góc của viên sáng + vùng bấm. Mặc định `R_CTRL` — bộ bo góc chung của
   * site (xem `lib/radius.ts`). Truyền giá trị khác chỉ khi có lý do riêng.
   */
  shapeClassName = R_CTRL,
  /**
   * Hình của dấu chỉ mục đang xem.
   *  · `pill` (mặc định): viên nền `primary/10` ôm lấy nhãn — nổi, hợp thanh
   *    lọc có nhiều điều khiển nền xám khác.
   *  · `underline`: một nét 1.5px sát đáy nhãn — mảnh, hợp trang chạy ngôn ngữ
   *    editorial (hairline + chữ hoa giãn ký tự).
   *  · `solid`: một ô nền MỰC phủ kín nhãn, chữ lật sang màu nền — đậm nhất,
   *    dùng khi tab là trục duyệt chính của trang và phải nhìn thấy từ xa.
   * Cả hai đều TRƯỢT sang nhãn kế khi cuộn: chuyển động không phải trang trí,
   * nó là chính scroll-spy hiện hình.
   */
  indicator = "pill",
  /** Chữ của từng nhãn (cỡ, weight, letter-spacing). */
  tabClassName,
}: {
  labels: string[];
  idPrefix: string;
  ariaLabel: string;
  resetKey?: string;
  shapeClassName?: string;
  indicator?: "pill" | "underline" | "solid";
  tabClassName?: string;
}) {
  const [active, setActive] = useState(0);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Đang cuộn theo lệnh bấm: bỏ qua các section đi ngang qua, chỉ nhả khoá khi
  // tới đúng đích — nếu không thì nhãn nhảy loạn suốt quãng cuộn mượt.
  const locked = useRef<number | null>(null);

  const count = labels.length;

  useEffect(() => {
    const els = Array.from({ length: count }, (_, i) =>
      document.getElementById(`${idPrefix}-${i}`),
    ).filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    // Section đang ở mốc ~30% chiều cao khung nhìn.
    const measure = () => {
      const line = window.innerHeight * 0.3;
      let a = 0;
      els.forEach((el) => {
        if (el.getBoundingClientRect().top <= line)
          a = Number(el.id.slice(idPrefix.length + 1));
      });
      return a;
    };

    // Hoãn lần đo đầu sang frame kế (sau khi trình duyệt khôi phục vị trí cuộn)
    // và chặn observer tới khi đo xong → không nháy về section đầu khi tải lại.
    let ready = false;
    const raf = requestAnimationFrame(() => {
      setActive(measure());
      ready = true;
    });

    const obs = new IntersectionObserver(
      (entries) => {
        if (!ready) return;
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (!vis[0]) return;
        const top = Number(vis[0].target.id.slice(idPrefix.length + 1));
        if (locked.current !== null) {
          if (top === locked.current) locked.current = null;
          else return;
        }
        setActive(top);
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    els.forEach((el) => obs.observe(el));
    // Nhả khoá khi cuộn mượt kết thúc (phòng khi không tới được đúng đỉnh đích).
    const onScrollEnd = () => {
      locked.current = null;
    };
    window.addEventListener("scrollend", onScrollEnd);
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
      window.removeEventListener("scrollend", onScrollEnd);
    };
  }, [count, idPrefix, resetKey]);

  // Đo lại viên sáng khi đổi section đang xem, đổi số section, hay nav đổi bề
  // ngang (xoay máy, đổi khổ cửa sổ). `offsetLeft` tính theo `nav` vì nav là
  // `relative` — tức offsetParent của các nút.
  useEffect(() => {
    const nav = navRef.current;
    const el = tabRefs.current[active];
    if (!nav || !el || active < 0) {
      setPill(null);
      return;
    }
    const m = () => setPill({ x: el.offsetLeft, w: el.offsetWidth });
    m();
    const ro = new ResizeObserver(m);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [active, count]);

  if (count <= 1) return null;

  return (
    <nav
      ref={navRef}
      aria-label={ariaLabel}
      className="relative flex shrink-0 items-center"
    >
      {pill && (
        <span
          aria-hidden
          style={{ width: pill.w, transform: `translateX(${pill.x}px)` }}
          className={cn(
            "pointer-events-none absolute left-0 transition-all duration-300 ease-out motion-reduce:transition-none",
            indicator === "underline"
              ? "bottom-0 h-[1.5px] bg-foreground"
              : indicator === "solid"
                ? cn("inset-y-0 bg-foreground", shapeClassName)
                : cn("inset-y-1 bg-primary/10", shapeClassName),
          )}
        />
      )}
      {labels.map((label, i) => (
        <button
          key={label}
          type="button"
          ref={(el) => {
            tabRefs.current[i] = el;
          }}
          aria-current={active === i ? "true" : undefined}
          onClick={() => {
            setActive(i);
            locked.current = i;
            document
              .getElementById(`${idPrefix}-${i}`)
              ?.scrollIntoView({ behavior: "smooth" });
          }}
          className={cn(
            // Đệm hẹp ở khổ base: 320px chỉ vừa đúng cho cả ba nhóm của thanh,
            // rộng thêm chút là nhóm sắp xếp lòi khỏi mép. Từ sm mới nới ra cho
            // viên sáng có chỗ thở.
            "relative h-9 shrink-0 whitespace-nowrap px-1.5 text-sm font-medium transition-colors sm:px-3.5",
            indicator === "underline" ? null : shapeClassName,
            tabClassName,
            active === i
              ? indicator === "underline"
                ? "text-foreground"
                : indicator === "solid"
                  ? "text-background"
                  : "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
