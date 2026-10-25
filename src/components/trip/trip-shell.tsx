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
  "rounded-[6px] lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:self-start";

const RIGHT_ICONS = { map: "pin", backpack: "bag", note: "note" } as const;

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
      <Glyph name="panel-left" className="size-4" />
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
  banner,
}: {
  header: ReactNode;
  /**
   * Trang soạn: phần đầu là DẢI ẢNH điểm đến trải hết bề ngang (chữ trắng trên lớp tối), phần
   * dưới trắng, cột trái ngăn bằng một đường mảnh. Không có ảnh THẬT ⇒ nền trắng + đường ngăn.
   */
  banner?: boolean;
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
    // Trang soạn: cả trang nền `band`, riêng cột lịch là TỜ TRẮNG — chỗ làm việc nổi lên, phần còn
    // lại (đầu trang, cột trái, cột phải) lùi về sau.
    <div className={cn("flex flex-1 flex-col", banner && "bg-band")}>
      {banner ? (
        // lg:pt chừa 4rem cho header site nằm đè lên dải này (`underlay` ở lib/site-chrome).
        <div className={cn(SHELL, "pb-2 pt-5 sm:pb-4 sm:pt-8 lg:pt-[5.5rem]")}>{header}</div>
      ) : (
        <div className={cn(SHELL, "pt-5 sm:pt-8")}>{header}</div>
      )}

      {/* Chọn khung nhìn — chỉ dưới lg, và chỉ khi có nhiều hơn một khung.
          Đánh dấu bằng ICON TÔ CAM + chữ đậm, KHÔNG phải viên nền: cùng cách
          PlaceTabs làm, và vì đúng lý do đã ghi ở đó (viên nền biến thanh thành
          "bộ lọc app thương mại điện tử"). */}
      {panes.length > 1 && (
        <div className={cn("sticky top-0 z-30 mt-4 backdrop-blur lg:hidden", banner ? "bg-band/90" : "bg-background/90")}>
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
            // Trang soạn: cột trái KHÔNG có khối nền riêng — ngăn với lịch trình bằng đường mảnh.
            banner ? "bg-transparent lg:pl-0" : "bg-muted/40",
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
                <Glyph name="panel-left" className="size-4" />
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
            {/* Dưới `lg` dải mục đã nằm ở viên chọn mục trên header — hiện lại ở đây là hai lối
                đi giống hệt nhau trong một màn hình. Nút thu gọn nằm ở hàng tiêu đề đầu cột. */}
            {navTripId && (
              <div className="hidden lg:block">
                <div className="mb-1.5 flex h-6 items-center justify-between pl-2.5">
                  <span className={cn(MICRO, "text-foreground/60")}>Chuyến đi</span>
                  <CollapseButton onClick={() => setAsideOpen(false)} />
                </div>
                <TripSideNav tripId={navTripId} />
              </div>
            )}

            {(hasAside || !navTripId) && (
              <section className={navTripId ? "lg:mt-7 lg:border-t lg:border-border/60 lg:pt-5" : undefined}>
                <div className="flex h-6 items-center gap-2 lg:pl-2.5">
                  <h2 className={cn(MICRO, "min-w-0 truncate text-foreground/60")}>{asideTitle}</h2>
                  {asideCount != null && asideCount > 0 && (
                    <span className="rounded-[3px] bg-muted px-1.5 text-[0.6875rem] font-semibold leading-5 tabular-nums text-muted-foreground">
                      {asideCount}
                    </span>
                  )}
                  {!navTripId && (
                    <span className="ml-auto">
                      <CollapseButton onClick={() => setAsideOpen(false)} />
                    </span>
                  )}
                </div>
                {/* Khay "chưa xếp" là chỗ KÉO ĐI — đặt trong một tấm trắng để nó có trọng lượng của một
                    vùng làm việc, không lẫn vào nền `band` như chữ chú thích. */}
                {hasAside && (
                  <div
                    className={cn(
                      "mt-2.5",
                      banner &&
                        "rounded-[6px] bg-background p-2 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_4px_16px_-4px_rgb(0_0_0/0.06)]",
                    )}
                  >
                    {aside}
                  </div>
                )}
              </section>
            )}
          </div>
        </aside>

        <div
          className={cn(
            "min-w-0",
            pane !== "days" && "hidden lg:block",
            // Tờ trắng: dưới lg tràn hết bề ngang (lề âm = lề khung), từ lg là tấm bo góc + bóng mềm.
            // Chỉ BÓNG, không viền — mỗi khối khai độ nổi một lần.
            banner &&
              "-mx-4 bg-background px-4 pb-10 sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-[6px] lg:px-8 lg:pt-2 lg:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_4px_16px_-4px_rgb(0_0_0/0.06)]",
          )}
        >
          {main}
        </div>

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
                <Glyph name="panel-right" className="size-4 shrink-0" />
                <Glyph name={rightGlyph} className="size-4 shrink-0" />
                <span className="text-xs [writing-mode:vertical-rl]">{rightTitle}</span>
              </button>
            )}

            {/* Bảng công cụ là TIN PHỤ ⇒ khai bằng NỀN, không khai bằng viền. Trang soạn (nền `band`):
                tờ trắng + bóng mềm như cột lịch — nền xám mờ trên nền `band` đọc ra nhạt nhoà. */}
            <div
              className={cn(
                "flex min-h-0 flex-auto flex-col rounded-[6px]",
                banner
                  ? "bg-background lg:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_4px_16px_-4px_rgb(0_0_0/0.06)]"
                  : "bg-muted/40",
                !rightOpen && "lg:hidden",
              )}
            >
              <div className="hidden shrink-0 items-center justify-between gap-2 px-4 pb-1 pt-3 lg:flex">
                <h2 className="min-w-0 truncate text-sm font-semibold">{rightTitle}</h2>
                <button
                  type="button"
                  onClick={() => setRightOpen(false)}
                  aria-label="Thu gọn"
                  className={cn(ICON_BTN, "size-6")}
                >
                  <Glyph name="panel-right" className="size-4" />
                </button>
              </div>
              {/* flex-col: nội dung cột (gợi ý đồ, ghi chú) tự cuộn bằng `min-h-0 flex-auto overflow-y-auto`. */}
              <div className="flex min-h-0 flex-auto flex-col">{right}</div>
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
