"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { FAB_BTN } from "@/lib/fab-ui";
import { FabSlot } from "./fab-stack";

const R = 20;
const C = 2 * Math.PI * R;

/**
 * Nút lên đầu trang: viên tròn 44px (cùng khuôn với nút Lịch trình nổi), icon vẽ riêng — chỉ đầu mũi tên (chevron) lên, KHÔNG thân
 * dọc, không vạch đỉnh. Rộng 11 cao 5.5, tâm nhích lên 0.5 (canh đúng tâm hình học thì dấu ^ trông tụt xuống), nét 2.2 — và VÒNG TIẾN ĐỘ cuộn chạy quanh viền — biết mình đang ở đâu trong trang.
 */
export function BackToTop() {
  const [progress, setProgress] = useState(0);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      // NGƯỠNG KÉP: hiện khi qua 600px, chỉ ẩn khi về dưới 400px — một ngưỡng thì cuộn lăn tăn quanh mốc làm nút nháy liên tục.
      const y = window.scrollY;
      setShown((on) => (on ? y > 400 : y > 600));
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <FabSlot order={100}>
      {/* Ô bọc thu chiều cao về 0 (và bù khe `gap`) khi ẩn ⇒ nút phía trên trong cụm trượt xuống thay vì treo lơ lửng. */}
      <div
        className={cn(
          "transition-[height,margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
          shown ? "h-11" : "-mt-2.5 h-0",
        )}
      >
        <button
          type="button"
          aria-label="Lên đầu trang"
          tabIndex={shown ? 0 : -1}
          onClick={() => {
            const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
          }}
          className={cn(
            FAB_BTN,
            "group will-change-transform",
            shown
              ? "visible translate-y-0 scale-100 opacity-100 transition-[opacity,transform,visibility] duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              : "pointer-events-none invisible translate-y-3 scale-[0.85] opacity-0 transition-[opacity,transform,visibility] duration-200 ease-[cubic-bezier(0.4,0,1,1)]",
            "motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:transition-opacity",
          )}
        >
          {/* Vòng tiến độ: rãnh mờ + cung màu chính, bắt đầu ở đỉnh. */}
          <svg viewBox="0 0 44 44" aria-hidden className="absolute inset-0 -rotate-90">
            <circle cx="22" cy="22" r={R} fill="none" strokeWidth="2" className="stroke-foreground/10" />
            <circle
              cx="22"
              cy="22"
              r={R}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              className="stroke-primary"
            />
          </svg>
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="relative size-[1.375rem] transition-transform duration-200 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6.5 14.25 12 8.75l5.5 5.5" />
          </svg>
        </button>
      </div>
    </FabSlot>
  );
}
