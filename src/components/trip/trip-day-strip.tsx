"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { TOOLBAR_TRAY } from "@/components/trip/trip-fields";
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
    // DẢI PHÂN ĐOẠN: các ngày nằm trong MỘT khay nền nhạt, ngày đang chọn là ô TRẮNG nổi nhẹ (kiểu segmented control) —
    // không gạch chân, không viền từng ô. Ngày lịch chỉ hiện Ở ĐÂY (đầu ngày bên dưới không lặp lại).
    // TRẢI HẾT bề ngang: các ngày chia đều (`flex-1`), nhiều ngày quá thì mỗi ô giữ tối thiểu 5.5rem và cuộn ngang.
    <div ref={railRef} className={cn("hide-scrollbar overflow-x-auto rounded-[6px]", TOOLBAR_TRAY)}>
      <div className="flex w-full gap-0.5 p-1">
        {days.map((day) => {
          const on = day.id === activeId;
          const alert =
            day.items.some((i) => i.warnings.some((w) => w.level === "high")) ||
            day.warnings.some((w) => w.level === "high");
          // Dòng phụ: ngày lịch rút gọn ("T6 6/11"); chuyến chưa định ngày ⇒ số điểm dừng.
          const stops = day.items.filter((i) => i.stopNo != null).length;
          const sub = shortDate(day.dateLabel) ?? (day.items.length ? `${stops} điểm dừng` : "Trống");

          return (
            <button
              key={day.id}
              type="button"
              data-day={day.id}
              onClick={() => onPick(day.id)}
              aria-pressed={on}
              className={cn(
                "relative flex min-w-[5.5rem] flex-1 flex-col items-center rounded-[4px] px-3 py-1.5 text-center transition-[background-color,box-shadow,color] duration-150",
                on
                  ? "bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08),0_1px_6px_-2px_rgb(0_0_0/0.12)] dark:shadow-none dark:ring-1 dark:ring-white/10"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
                Ngày {day.index + 1}
                {alert && (
                  <span
                    className="inline-block size-1.5 rounded-full bg-destructive"
                    aria-label="có mục chưa mở cửa"
                  />
                )}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-xs tabular-nums leading-tight",
                  on ? "text-muted-foreground" : "text-muted-foreground/80",
                )}
              >
                {sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** "Thứ 6, 6/11" ⇒ "T6 6/11"; "Chủ Nhật, 8/11" ⇒ "CN 8/11". */
function shortDate(label: string | null): string | null {
  if (!label) return null;
  return label
    .replace(/^Chủ\s*Nhật/i, "CN")
    .replace(/^Thứ\s*/i, "T")
    .replace(",", "");
}
