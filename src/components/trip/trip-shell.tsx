"use client";

import { useState, type ReactNode } from "react";
import { Glyph, type GlyphName } from "@/components/site/glyphs";
import { cn } from "@/lib/utils";
import { R_CARD, R_CTRL } from "@/lib/radius";
import { MICRO } from "@/components/trip/trip-rail";
import { TripSideNav } from "@/components/trip/trip-side-nav";

type Pane = "days" | "aside" | "map";

// Khung trang: CONTAINER `max-w-7xl`, và các cột KHÔNG có nét ngăn. Bản cũ kẻ
// viền ở mọi mép (khung · header · cột trái · cột phải · bản đồ) — hồi còn tràn
// viền thì mấy nét đó là mép màn hình, vào container chúng thành một cái lưới
// bảng tính. Ngăn cột bằng KHOẢNG TRẮNG; bản đồ và bảng công cụ tự đọc ra là
// khối nhờ nền + bo góc.
const SHELL = "mx-auto w-full max-w-7xl px-4 sm:px-6";

// Hai cột ngoài dính cách mép trên 1.5rem, bằng đúng phần đệm dọc của khung:
// ở các trang lịch trình, header của site cố ý KHÔNG dính (xem lib/site-chrome
// → TRIP_DETAIL) nên không phải chừa 4rem cho nó.
const STICKY = "lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)]";

// Cột trái và bảng công cụ phải là KHỐI NỀN, không phải một dải chữ trôi cạnh
// cột giữa: bỏ hết viền rồi thì nền là thứ duy nhất còn nói được "đây là hai
// vùng khác nhau". Ôm sát nội dung (`self-start`) chứ không kéo dài hết màn —
// ở mấy mục chỉ có 5 hàng nav, một mảng nền cao 100dvh đọc ra như trang lỗi.
const PANEL =
  "rounded-[6px] bg-muted/40 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:self-start";

const RIGHT_ICONS = { map: "pin", backpack: "bag" } as const;

// Bản đồ ăn theo PHẦN bề ngang còn lại (`0.62fr`), không phải một số rem cố
// định: trong container, mỗi rem bản đồ lấy thêm là một rem cột lịch trình mất
// đi. Bản cũ (`minmax(24rem,32rem)`) luôn lấy đủ 32rem trước — thuật toán lưới
// nới track tới growth limit RỒI mới chia phần cho `fr` — nên ở 1024px cột giữa
// chỉ còn 288px, hẹp hơn cả bản điện thoại.
const COLS: Record<string, string> = {
  "open-none": "lg:grid-cols-[14rem_minmax(0,1fr)]",
  "shut-none": "lg:grid-cols-[2.5rem_minmax(0,1fr)]",
  "open-map": "lg:grid-cols-[14rem_minmax(0,1fr)_minmax(19rem,0.62fr)]",
  "shut-map": "lg:grid-cols-[2.5rem_minmax(0,1fr)_minmax(19rem,0.62fr)]",
  "open-panel": "lg:grid-cols-[14rem_minmax(0,1fr)_20rem]",
  "shut-panel": "lg:grid-cols-[2.5rem_minmax(0,1fr)_20rem]",
  "open-rail": "lg:grid-cols-[14rem_minmax(0,1fr)_2.5rem]",
  "shut-rail": "lg:grid-cols-[2.5rem_minmax(0,1fr)_2.5rem]",
};

const ICON_BTN =
  "grid shrink-0 place-items-center rounded-[3px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

function CollapseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Thu gọn cột trái"
      className={cn(ICON_BTN, "hidden size-6 lg:grid")}
    >
      <Glyph name="back" className="size-4" />
    </button>
  );
}

export function TripShell({
  header,
  navTripId,
  asideTitle,
  asideCount,
  aside,
  main,
  map,
  right,
  rightTitle,
  rightIcon,
}: {
  header: ReactNode;
  navTripId?: string;
  asideTitle?: string;
  asideCount?: number;
  aside?: ReactNode;
  main: ReactNode;
  /** Bản đồ — cột phải KHÔNG thu gọn được (nó là nội dung, không phải công cụ). */
  map?: ReactNode;
  right?: ReactNode;
  rightTitle?: string;
  rightIcon?: keyof typeof RIGHT_ICONS;
}) {
  const [rawPane, setPane] = useState<Pane>("days");
  const [asideOpen, setAsideOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const hasAside = aside != null;
  const rightGlyph: GlyphName = RIGHT_ICONS[rightIcon ?? "map"];
  const panes: { id: Pane; label: string; glyph: GlyphName; badge?: number }[] = [
    { id: "days", label: "Lịch trình", glyph: "route" },
    ...(hasAside
      ? [
          {
            id: "aside" as const,
            label: asideTitle ?? "",
            glyph: "rows" as GlyphName,
            badge: asideCount,
          },
        ]
      : []),
    ...(map ? [{ id: "map" as const, label: "Bản đồ", glyph: "pin" as GlyphName }] : []),
    ...(right
      ? [{ id: "map" as const, label: rightTitle ?? "", glyph: rightGlyph }]
      : []),
  ];

  const pane: Pane =
    (rawPane === "map" && !map && !right) || (rawPane === "aside" && !hasAside)
      ? "days"
      : rawPane;

  const rightKey = map ? "map" : right ? (rightOpen ? "panel" : "rail") : "none";
  const cols = COLS[`${asideOpen ? "open" : "shut"}-${rightKey}`];

  return (
    <div className="flex flex-1 flex-col">
      <div className={cn(SHELL, "pt-5 sm:pt-8")}>{header}</div>

      {/* Chọn khung nhìn — chỉ dưới lg, và chỉ khi có nhiều hơn một khung.
          Đánh dấu bằng ICON TÔ CAM + chữ đậm, KHÔNG phải viên nền: cùng cách
          PlaceTabs làm, và vì đúng lý do đã ghi ở đó (viên nền biến thanh thành
          "bộ lọc app thương mại điện tử"). */}
      {panes.length > 1 && (
        <div className="sticky top-0 z-30 mt-4 bg-background/90 backdrop-blur lg:hidden">
          <div className={cn(SHELL, "flex")}>
            {panes.map(({ id, label, glyph, badge }) => {
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
                  <Glyph
                    name={glyph}
                    className={cn("size-4 shrink-0", on && "text-warm")}
                  />
                  {label}
                  {badge != null && badge > 0 && (
                    <span className="tabular-nums text-muted-foreground">{badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        className={cn(
          SHELL,
          "flex-1 pb-12 pt-6 lg:grid lg:gap-x-8 lg:transition-[grid-template-columns] lg:duration-300 lg:ease-out motion-reduce:transition-none",
          cols,
        )}
      >
        <aside
          className={cn(
            "min-w-0 lg:overflow-y-auto lg:overflow-x-hidden",
            PANEL,
            asideOpen ? "p-3" : "p-1.5",
            hasAside ? pane !== "aside" && "hidden lg:block" : "hidden lg:block",
          )}
        >
          {!asideOpen && (
            <div className="hidden flex-col items-center gap-1.5 lg:flex">
              <button
                type="button"
                onClick={() => setAsideOpen(true)}
                aria-expanded={false}
                aria-label="Mở rộng cột trái"
                className={cn(ICON_BTN, "size-8")}
              >
                <Glyph name="forward" className="size-4" />
              </button>

              {navTripId && <TripSideNav tripId={navTripId} collapsed />}

              {hasAside && (
                <button
                  type="button"
                  onClick={() => setAsideOpen(true)}
                  title={`${asideTitle} (${asideCount})`}
                  className="mt-3 grid w-full place-items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Glyph name="rows" className="size-4 shrink-0" />
                  <span className="text-xs font-semibold tabular-nums">{asideCount}</span>
                  <span className="sr-only">{asideTitle}</span>
                </button>
              )}
            </div>
          )}

          <div className={cn(!asideOpen && "lg:hidden")}>
            {/* Nút thu gọn đi cùng TIÊU ĐỀ khối dưới, không nổi lên góc cột:
                đặt ở góc thì nó rơi đúng vào hàng nav đầu tiên và đè lên nền
                của mục đang mở. */}
            {/* Dưới `lg` dải mục đã nằm ở viên chọn mục trên header — hiện lại
                ở đây là hai lối đi giống hệt nhau trong một màn hình. */}
            {navTripId && (
              <div className="hidden lg:block">
                <TripSideNav tripId={navTripId} />
              </div>
            )}

            {(hasAside || !navTripId) && (
              <div className={navTripId ? "lg:mt-8" : undefined}>
                <div className="flex items-center gap-1">
                  <h2 className={cn(MICRO, "min-w-0 flex-1 truncate text-muted-foreground")}>
                    {asideTitle}
                    {asideCount != null && (
                      <span className="ml-1.5 tabular-nums text-muted-foreground/60">
                        {asideCount}
                      </span>
                    )}
                  </h2>
                  <CollapseButton onClick={() => setAsideOpen(false)} />
                </div>
                {hasAside && <div className="mt-3">{aside}</div>}
              </div>
            )}

            {navTripId && !hasAside && (
              <div className="mt-6 hidden justify-start lg:flex">
                <CollapseButton onClick={() => setAsideOpen(false)} />
              </div>
            )}
          </div>
        </aside>

        <div className={cn("min-w-0", pane !== "days" && "hidden lg:block")}>{main}</div>

        {right && (
          <div
            className={cn(
              "mt-8 flex flex-col lg:sticky lg:top-6 lg:mt-0 lg:max-h-[calc(100dvh-3rem)] lg:self-start",
              pane !== "map" && "hidden lg:flex",
            )}
          >
            {!rightOpen && (
              <button
                type="button"
                onClick={() => setRightOpen(true)}
                aria-expanded={false}
                title={rightTitle}
                className={cn(
                  R_CTRL,
                  "hidden h-full w-full flex-col items-center gap-3 bg-muted/50 py-4 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex",
                )}
              >
                <Glyph name="back" className="size-4 shrink-0" />
                <Glyph name={rightGlyph} className="size-4 shrink-0" />
                <span className="text-xs [writing-mode:vertical-rl]">{rightTitle}</span>
              </button>
            )}

            {/* Bảng công cụ là TIN PHỤ ⇒ khai bằng NỀN, không khai bằng viền. */}
            <div
              className={cn(
                "flex min-h-0 flex-auto flex-col rounded-[6px] bg-muted/40",
                !rightOpen && "lg:hidden",
              )}
            >
              <div className="hidden shrink-0 items-center justify-between gap-2 px-3 pb-1 pt-2 lg:flex">
                <h2 className={cn(MICRO, "min-w-0 truncate text-muted-foreground")}>
                  {rightTitle}
                </h2>
                <button
                  type="button"
                  onClick={() => setRightOpen(false)}
                  aria-label="Thu gọn"
                  className={cn(ICON_BTN, "size-6")}
                >
                  <Glyph name="forward" className="size-4" />
                </button>
              </div>
              <div className="min-h-0 flex-auto">{right}</div>
            </div>
          </div>
        )}

        {map && (
          <div
            className={cn(
              R_CARD,
              "relative mt-8 min-h-[26rem] overflow-hidden bg-muted lg:mt-0",
              STICKY,
              pane !== "map" && "hidden lg:block",
            )}
          >
            {map}
          </div>
        )}
      </div>
    </div>
  );
}
