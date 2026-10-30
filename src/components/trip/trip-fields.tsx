"use client";

import { useSyncExternalStore } from "react";
import { Glyph, type GlyphName } from "@/components/site/glyphs";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type TripField = "icon" | "image" | "address" | "tags" | "stay" | "note" | "leg" | "warn";

export type TripFields = Record<TripField, boolean>;

export const ALL_ON: TripFields = {
  icon: true,
  image: true,
  address: true,
  tags: true,
  stay: true,
  note: true,
  leg: true,
  warn: true,
};

const LABELS: { id: TripField; label: string; hint: string; glyph: GlyphName }[] = [
  { id: "icon", label: "Icon loại", hint: "Núi, bát, giường, phương tiện… đầu mỗi thẻ", glyph: "sparkle" },
  { id: "image", label: "Ảnh", hint: "Ảnh của nơi, quán, chỗ ở", glyph: "mountain" },
  { id: "address", label: "Địa chỉ, khu vực", hint: "Cả dòng “tại …” của hoạt động", glyph: "pin" },
  { id: "tags", label: "Thẻ hoạt động", hint: "Tắm biển, lướt ván… dưới mỗi nơi", glyph: "compass" },
  { id: "stay", label: "Thời gian ở lại", hint: "Nhãn “1g30” dưới mốc trên trục", glyph: "clock" },
  { id: "note", label: "Ghi chú", hint: "Của từng mục và của ngày", glyph: "note" },
  { id: "leg", label: "Chặng di chuyển", hint: "Thời gian, km giữa hai điểm", glyph: "car" },
  { id: "warn", label: "Cảnh báo", hint: "Chưa mở cửa, sắp đóng, chặng dài", glyph: "warn" },
];

/** Khay chung của thanh công cụ ngày (thanh ngày + nút Hiển thị): cùng một chất liệu nên đọc ra MỘT thanh. */
export const TOOLBAR_TRAY = "bg-[color-mix(in_oklab,var(--color-foreground)_5%,var(--color-background))]";

const KEY = "halivivu:trip-fields";

let cache: TripFields = ALL_ON;
let cacheRaw: string | null = null;
const listeners = new Set<() => void>();

function read(): TripFields {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return ALL_ON;
  }
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      cache = raw ? { ...ALL_ON, ...(JSON.parse(raw) as Partial<TripFields>) } : ALL_ON;
    } catch {
      cache = ALL_ON;
    }
  }
  return cache;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function write(next: TripFields) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* chế độ riêng tư chặn storage — vẫn đổi được trong phiên này */
  }
  cacheRaw = JSON.stringify(next);
  cache = next;
  for (const cb of listeners) cb();
}

export function useTripFields(): TripFields {
  return useSyncExternalStore(subscribe, read, () => ALL_ON);
}

/** Icon "tuỳ chỉnh hiển thị": hai thanh trượt, núm lệch nhau — đọc ra "chỉnh", không phải "xem" như con mắt. */
function ViewIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M4 8h8.5M17.5 8H20M4 16h2.5M11.5 16H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="15" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="16" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

/** Công tắc vuông (bo 4px — quy ước site, KHÔNG `rounded-full` như Switch của shadcn). */
function Toggle({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex h-[1.125rem] w-8 shrink-0 items-center rounded-[4px] p-0.5 transition-colors duration-150",
        on ? "bg-primary" : "bg-foreground/15",
      )}
    >
      <span
        className={cn(
          "block size-3.5 rounded-[3px] bg-background shadow-[0_1px_2px_rgb(0_0_0/0.2)] transition-transform duration-150",
          on && "translate-x-[0.875rem]",
        )}
      />
    </span>
  );
}

export function TripFieldsMenu({ omit = [] }: { omit?: TripField[] }) {
  const fields = useTripFields();
  const options = LABELS.filter((f) => !omit.includes(f.id));
  const hidden = options.filter((f) => !fields[f.id]).length;
  const setAll = (on: boolean) =>
    write({ ...fields, ...Object.fromEntries(options.map((f) => [f.id, on])) });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={hidden ? `Hiển thị — đang ẩn ${hidden} thông tin` : "Hiển thị"}
          className={cn(
            "inline-flex h-full shrink-0 items-center gap-2 rounded-[6px] px-3 text-sm font-medium text-foreground/80 transition-colors hover:bg-[color-mix(in_oklab,var(--color-foreground)_9%,var(--color-background))] hover:text-foreground data-[state=open]:bg-[color-mix(in_oklab,var(--color-foreground)_9%,var(--color-background))] sm:px-3.5",
            TOOLBAR_TRAY,
          )}
        >
          <ViewIcon className="size-5" />
          <span className="hidden sm:inline">Hiển thị</span>
          {hidden > 0 && (
            <span className="grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-[3px] bg-foreground px-1 text-[0.6875rem] font-semibold tabular-nums leading-none text-background">
              {hidden}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-[min(22rem,calc(100vw-2rem))] rounded-[6px] p-0">
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 pb-3 pt-3.5">
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">Hiện gì trên mỗi mục</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Giờ đến và tên luôn hiện.</p>
          </div>
          {/* Hai lối tắt dạng phân đoạn — cái đang đúng với trạng thái hiện tại thì mờ đi. */}
          <div className={cn("inline-flex shrink-0 rounded-[4px] p-0.5 text-xs font-medium", TOOLBAR_TRAY)}>
            <button
              type="button"
              disabled={hidden === options.length}
              onClick={() => setAll(false)}
              className="rounded-[3px] px-2 py-1 transition-colors enabled:hover:bg-background disabled:text-muted-foreground/50"
            >
              Ẩn hết
            </button>
            <button
              type="button"
              disabled={hidden === 0}
              onClick={() => setAll(true)}
              className="rounded-[3px] px-2 py-1 transition-colors enabled:hover:bg-background disabled:text-muted-foreground/50"
            >
              Hiện hết
            </button>
          </div>
        </div>

        <ul className="max-h-[min(60vh,26rem)] overflow-y-auto p-1.5">
          {options.map((f) => {
            const on = fields[f.id];
            return (
              <li key={f.id}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => write({ ...fields, [f.id]: !on })}
                  className="flex w-full items-center gap-3 rounded-[4px] px-2.5 py-2 text-left transition-colors hover:bg-muted"
                >
                  <Glyph
                    name={f.glyph}
                    className={cn("size-4 shrink-0 transition-colors", on ? "text-foreground/70" : "text-muted-foreground/50")}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm leading-snug", !on && "text-muted-foreground")}>{f.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{f.hint}</span>
                  </span>
                  <Toggle on={on} />
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
