"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { MICRO } from "@/components/trip/trip-rail";
import type { DayView } from "@/lib/trip";

export function TripDayStrip({
  days,
  activeId,
  onPick,
}: {
  days: DayView[];
  activeId: string | null;
  onPick: (id: string) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  // Cuộn CHÍNH dải này bằng `scrollLeft`, KHÔNG dùng `scrollIntoView`: kể cả với
  // `block: "nearest"`, khi dải còn nằm dưới màn hình (lúc mới mở trang, hero
  // còn chiếm hết khung nhìn) trình duyệt sẽ cuộn luôn CẢ TRANG xuống cho nó lọt
  // vào tầm nhìn — người dùng vừa mở trang đã bị nhảy qua hero.
  // Đây là bài học đã ghi sẵn ở place-tabs.tsx; tôi vẫn giẫm phải.
  useEffect(() => {
    const rail = railRef.current;
    if (!activeId || !rail) return;
    const el = rail.querySelector<HTMLElement>(`[data-day="${activeId}"]`);
    if (!el) return;
    const offset =
      el.getBoundingClientRect().left - rail.getBoundingClientRect().left + rail.scrollLeft;
    rail.scrollTo({ left: offset - (rail.clientWidth - el.clientWidth) / 2 });
  }, [activeId]);

  if (days.length === 0) return null;

  return (
    <div
      ref={railRef}
      className="hide-scrollbar -mx-4 flex gap-6 overflow-x-auto px-4 sm:-mx-6 sm:gap-7 sm:px-6"
    >
      {days.map((day) => {
        const on = day.id === activeId;
        const alert =
          day.items.some((i) => i.warnings.some((w) => w.level === "high")) ||
          day.warnings.some((w) => w.level === "high");

        return (
          <button
            key={day.id}
            type="button"
            data-day={day.id}
            onClick={() => onPick(day.id)}
            aria-pressed={on}
            className={cn(
              "group relative shrink-0 border-b-2 pb-2.5 pt-2 text-left transition-colors",
              on ? "border-warm" : "border-transparent hover:border-border",
            )}
          >
            <span className={cn(MICRO, on ? "text-warm" : "text-muted-foreground")}>
              Ngày {day.index + 1}
              {alert && (
                <span
                  className="ml-1 inline-block size-1.5 rounded-full bg-destructive align-middle"
                  aria-label="có mục chưa mở cửa"
                />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
