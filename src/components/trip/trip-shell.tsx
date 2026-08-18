"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Layers, Map as MapIcon, Route } from "@/components/icons";
import { cn } from "@/lib/utils";
import { MICRO } from "@/components/trip/trip-rail";

// Vỏ BA CỘT tràn viền, dùng chung cho trang soạn và trang chỉ-đọc (mẫu / bản
// chia sẻ). Tách ra vì ba trang này là anh em: để mỗi trang tự dựng khung thì
// chỉ vài lần sửa là chúng trôi khác nhau, mà người dùng đi thẳng từ trang mẫu
// sang trang soạn (bấm "Dùng lịch trình này") nên sự lệch đó lộ ngay.
//
//   ┌ header tràn viền ──────────────────────────────────────┐
//   ├────────┬─────────────────────────┬────────────────────┤
//   │ Chưa   │ dải chọn ngày           │                    │
//   │ xếp  « │ các ngày, cuộn          │  bản đồ (dính)     │
//   └────────┴─────────────────────────┴────────────────────┘
//
// Cột "Chưa xếp ngày" HẸP (14rem) và THU GỌN ĐƯỢC thành một thanh dọc mỏng.
//
// Ba lần sai trước đó, ghi lại để khỏi lặp:
//   1. Khối gập dưới đáy cột lịch trình → phải cuộn qua hết mọi ngày mới tới,
//      phá đúng nguyên tắc "phải thấy được ngay lúc đang xếp ngày".
//   2. Cột rộng 19rem → thấy suốt, nhưng ăn bề ngang của CẢ hai cột kia.
//   3. Thẻ nổi trên bản đồ → SAI VỀ Ý NGHĨA: đây là hàng chờ để xếp việc, thuộc
//      miền LẬP KẾ HOẠCH chứ không phải miền địa lý; mà nó còn che đúng thứ bản
//      đồ sinh ra để hiện.
//      (Chấm mờ `.dl-trip-ghost` thì Ở LẠI bản đồ — "mấy chỗ đã lưu nằm đâu"
//      mới đúng là việc của bản đồ. Hai thứ khác nhau, đừng gộp lại lần nữa.)
//
// Dưới `lg` ba cột không nhét vừa nên đổi bằng ba viên chọn khung nhìn.

type Pane = "days" | "aside" | "map";

// Hai cột ngoài dính sát MÉP TRÊN khung nhìn: ở các trang lịch trình, header
// của site cố ý KHÔNG dính (xem lib/site-chrome → TRIP_DETAIL), nên không phải
// chừa 4rem cho nó nữa — cuộn qua header là hai cột chiếm trọn màn hình.
const STICKY = "lg:sticky lg:top-0 lg:h-[100dvh]";

export function TripShell({
  header,
  asideTitle,
  asideCount,
  aside,
  main,
  map,
}: {
  header: ReactNode;
  /** Nhãn cột trái: "Chưa xếp ngày" khi soạn, "Gợi ý thêm" khi chỉ đọc. */
  asideTitle: string;
  asideCount: number;
  aside: ReactNode;
  main: ReactNode;
  map: ReactNode;
}) {
  const [pane, setPane] = useState<Pane>("days");
  // Thu gọn cột trái khi cần bề ngang cho dòng thời gian.
  const [asideOpen, setAsideOpen] = useState(true);

  const panes: { id: Pane; label: string; icon: typeof Route; badge?: number }[] = [
    { id: "days", label: "Lịch trình", icon: Route },
    { id: "aside", label: asideTitle, icon: Layers, badge: asideCount },
    { id: "map", label: "Bản đồ", icon: MapIcon },
  ];

  return (
    <div className="flex flex-1 flex-col">
      {header}

      {/* Chọn khung nhìn — chỉ dưới lg, nơi ba cột không nhét vừa.
          Đánh dấu bằng ICON TÔ CAM + chữ đậm, KHÔNG phải viên nền: cùng cách
          PlaceTabs làm, và vì đúng lý do đã ghi ở đó (viên nền biến thanh thành
          "bộ lọc app thương mại điện tử"). */}
      <div className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur lg:hidden">
        <div className="flex">
          {panes.map(({ id, label, icon: Icon, badge }) => {
            const on = pane === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPane(id)}
                aria-pressed={on}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-2 py-2.5 text-xs transition-colors sm:text-sm",
                  on
                    ? "border-warm font-semibold text-foreground"
                    : "border-transparent text-muted-foreground",
                )}
              >
                <Icon className={cn("size-4 shrink-0", on && "text-warm")} aria-hidden />
                {label}
                {badge != null && badge > 0 && (
                  <span className="tabular-nums text-muted-foreground">{badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={cn(
          "flex-1 lg:grid",
          // Hai chuỗi class ĐẦY ĐỦ chứ không ghép động: Tailwind quét mã nguồn
          // theo literal, ghép kiểu `lg:grid-cols-[${w}_...]` sẽ không sinh ra CSS.
          asideOpen
            ? "lg:grid-cols-[14rem_minmax(0,1fr)_minmax(24rem,32rem)]"
            : "lg:grid-cols-[2.75rem_minmax(0,1fr)_minmax(24rem,32rem)]",
        )}
      >
        {/* ── Cột trái: Chưa xếp ngày / Gợi ý thêm ─────────────── */}
        <aside
          className={cn(
            "min-w-0 border-b lg:border-b-0 lg:border-r lg:overflow-y-auto",
            STICKY,
            pane !== "aside" && "hidden lg:block",
          )}
        >
          {/* Thu gọn: còn một thanh dọc mỏng mang icon + số đếm. Dưới `lg` không
              có chuyện thu gọn — ở đó nó là một khung nhìn riêng, luôn đầy đủ. */}
          {!asideOpen && (
            <button
              type="button"
              onClick={() => setAsideOpen(true)}
              aria-expanded={false}
              title={`${asideTitle} (${asideCount})`}
              className="hidden h-full w-full flex-col items-center gap-2 py-4 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground lg:flex"
            >
              <ChevronRight className="size-4 shrink-0" aria-hidden />
              <Layers className="size-4 shrink-0" aria-hidden />
              <span className="text-xs font-semibold tabular-nums">{asideCount}</span>
              <span className="sr-only">{asideTitle}</span>
            </button>
          )}

          <div className={cn("px-3 py-5", !asideOpen && "lg:hidden")}>
            <div className="flex items-center gap-1">
              <h2 className={cn(MICRO, "min-w-0 flex-1 truncate text-muted-foreground")}>
                {asideTitle}
                <span className="ml-1.5 tabular-nums text-muted-foreground/60">{asideCount}</span>
              </h2>
              <button
                type="button"
                onClick={() => setAsideOpen(false)}
                aria-label="Thu gọn"
                className="hidden size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:grid"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
            </div>
            <div className="mt-3">{aside}</div>
          </div>
        </aside>

        {/* ── Cột giữa: các ngày ────────────────────────────────── */}
        <div className={cn("min-w-0 px-4 py-5 sm:px-6", pane !== "days" && "hidden lg:block")}>
          {main}
        </div>

        {/* ── Cột phải: bản đồ ──────────────────────────────────── */}
        <div
          className={cn(
            "relative min-h-[26rem] border-t lg:border-l lg:border-t-0",
            STICKY,
            pane !== "map" && "hidden lg:block",
          )}
        >
          {map}
        </div>
      </div>
    </div>
  );
}
