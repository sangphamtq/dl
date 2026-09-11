"use client";

import { useState, type ReactNode } from "react";
import { Backpack, ChevronLeft, ChevronRight, Layers, Map as MapIcon, Route } from "@/components/icons";
import { cn } from "@/lib/utils";
import { MICRO } from "@/components/trip/trip-rail";
import { TripSideNav } from "@/components/trip/trip-side-nav";

type Pane = "days" | "aside" | "map";

// Hai cột ngoài dính sát MÉP TRÊN khung nhìn: ở các trang lịch trình, header
// của site cố ý KHÔNG dính (xem lib/site-chrome → TRIP_DETAIL), nên không phải
// chừa 4rem cho nó nữa — cuộn qua header là hai cột chiếm trọn màn hình.
const STICKY = "lg:sticky lg:top-0 lg:h-[100dvh]";

const RIGHT_STICKY = "lg:sticky lg:top-0 lg:max-h-[100dvh] lg:self-start";

const RIGHT_ICONS = { map: MapIcon, backpack: Backpack } as const;

const COLS: Record<string, string> = {
  "open-none": "lg:grid-cols-[14rem_minmax(0,1fr)]",
  "shut-none": "lg:grid-cols-[2.75rem_minmax(0,1fr)]",
  "open-map": "lg:grid-cols-[14rem_minmax(0,1fr)_minmax(24rem,32rem)]",
  "shut-map": "lg:grid-cols-[2.75rem_minmax(0,1fr)_minmax(24rem,32rem)]",
  "open-panel": "lg:grid-cols-[14rem_minmax(0,1fr)_21rem]",
  "shut-panel": "lg:grid-cols-[2.75rem_minmax(0,1fr)_21rem]",
  "open-rail": "lg:grid-cols-[14rem_minmax(0,1fr)_2.75rem]",
  "shut-rail": "lg:grid-cols-[2.75rem_minmax(0,1fr)_2.75rem]",
};

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
  const RightIcon = RIGHT_ICONS[rightIcon ?? "map"];
  const panes: { id: Pane; label: string; icon: typeof Route; badge?: number }[] = [
    { id: "days", label: "Lịch trình", icon: Route },
    ...(hasAside
      ? [{ id: "aside" as const, label: asideTitle ?? "", icon: Layers, badge: asideCount }]
      : []),
    ...(map ? [{ id: "map" as const, label: "Bản đồ", icon: MapIcon }] : []),
    ...(right
      ? [{ id: "map" as const, label: rightTitle ?? "", icon: RightIcon }]
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
      {header}

      {/* Chọn khung nhìn — chỉ dưới lg, và chỉ khi có nhiều hơn một khung.
          Đánh dấu bằng ICON TÔ CAM + chữ đậm, KHÔNG phải viên nền: cùng cách
          PlaceTabs làm, và vì đúng lý do đã ghi ở đó (viên nền biến thanh thành
          "bộ lọc app thương mại điện tử"). */}
      {panes.length > 1 && (
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
      )}

      <div
        className={cn(
          "flex-1 lg:grid lg:transition-[grid-template-columns] lg:duration-300 lg:ease-out motion-reduce:transition-none",
          cols,
        )}
      >
        <aside
          className={cn(
            "min-w-0 lg:overflow-y-auto lg:overflow-x-hidden lg:border-r",
            hasAside && "border-b lg:border-b-0",
            STICKY,
            hasAside ? pane !== "aside" && "hidden lg:block" : "hidden lg:block",
          )}
        >
          {!asideOpen && (
            <div className="hidden h-full flex-col items-center gap-2 py-3 lg:flex">
              <button
                type="button"
                onClick={() => setAsideOpen(true)}
                aria-expanded={false}
                aria-label="Mở rộng cột trái"
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>

              {navTripId && <TripSideNav tripId={navTripId} collapsed />}

              {hasAside && (
                <button
                  type="button"
                  onClick={() => setAsideOpen(true)}
                  title={`${asideTitle} (${asideCount})`}
                  className="mt-1 grid w-full place-items-center gap-1 border-t pt-3 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Layers className="size-4 shrink-0" aria-hidden />
                  <span className="text-xs font-semibold tabular-nums">{asideCount}</span>
                  <span className="sr-only">{asideTitle}</span>
                </button>
              )}
            </div>
          )}

          <div className={cn("lg:w-56", !asideOpen && "lg:hidden")}>
            {navTripId && (
              <div className="px-2 py-3">
                <div className="hidden justify-end pb-1 lg:flex">
                  <button
                    type="button"
                    onClick={() => setAsideOpen(false)}
                    aria-label="Thu gọn cột trái"
                    className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </button>
                </div>
                <TripSideNav tripId={navTripId} />
              </div>
            )}

            {hasAside && (
              <div className={cn("px-3 pb-5", navTripId ? "border-t pt-4" : "py-5")}>
                <div className="flex items-center gap-1">
                  <h2 className={cn(MICRO, "min-w-0 flex-1 truncate text-muted-foreground")}>
                    {asideTitle}
                    <span className="ml-1.5 tabular-nums text-muted-foreground/60">
                      {asideCount}
                    </span>
                  </h2>
                  {!navTripId && (
                    <button
                      type="button"
                      onClick={() => setAsideOpen(false)}
                      aria-label="Thu gọn"
                      className="hidden size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:grid"
                    >
                      <ChevronLeft className="size-4" aria-hidden />
                    </button>
                  )}
                </div>
                <div className="mt-3">{aside}</div>
              </div>
            )}
          </div>
        </aside>

        <div className={cn("min-w-0 px-4 py-5 sm:px-6", pane !== "days" && "hidden lg:block")}>
          {main}
        </div>

        {right && (
          <div
            className={cn(
              "flex flex-col border-t lg:border-l lg:border-t-0",
              RIGHT_STICKY,
              pane !== "map" && "hidden lg:flex",
            )}
          >
            {!rightOpen && (
              <button
                type="button"
                onClick={() => setRightOpen(true)}
                aria-expanded={false}
                title={rightTitle}
                className="hidden h-full w-full flex-col items-center gap-3 py-4 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground lg:flex"
              >
                <ChevronLeft className="size-4 shrink-0" aria-hidden />
                <RightIcon className="size-4 shrink-0" aria-hidden />
                <span className="text-xs [writing-mode:vertical-rl]">{rightTitle}</span>
              </button>
            )}

            <div className={cn("flex min-h-0 flex-auto flex-col", !rightOpen && "lg:hidden")}>
              <div className="hidden shrink-0 items-center justify-between gap-2 border-b px-4 py-2.5 lg:flex">
                <h2 className={cn(MICRO, "min-w-0 truncate text-muted-foreground")}>
                  {rightTitle}
                </h2>
                <button
                  type="button"
                  onClick={() => setRightOpen(false)}
                  aria-label="Thu gọn"
                  className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              </div>
              <div className="min-h-0 flex-auto">{right}</div>
            </div>
          </div>
        )}

        {map && (
          <div
            className={cn(
              "relative min-h-[26rem] border-t lg:border-l lg:border-t-0",
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
