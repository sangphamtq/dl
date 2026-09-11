"use client";

import { useSyncExternalStore } from "react";
import { Eye } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type TripField = "image" | "stay" | "hours" | "note" | "leg";

export type TripFields = Record<TripField, boolean>;

export const ALL_ON: TripFields = {
  image: true,
  stay: true,
  hours: true,
  note: true,
  leg: true,
};

const LABELS: { id: TripField; label: string; hint: string }[] = [
  { id: "image", label: "Ảnh", hint: "Tắt thì còn ô icon theo loại" },
  { id: "stay", label: "Thời gian ở lại", hint: "" },
  { id: "hours", label: "Giờ mở cửa", hint: "" },
  { id: "note", label: "Ghi chú", hint: "" },
  { id: "leg", label: "Chặng di chuyển", hint: "Thời gian giữa hai điểm" },
];

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

export function TripFieldsMenu() {
  const fields = useTripFields();
  const hidden = LABELS.filter((f) => !fields[f.id]).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted",
            hidden > 0 ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <Eye className="size-4" aria-hidden />
          Hiển thị
          {hidden > 0 && <span className="tabular-nums text-muted-foreground">−{hidden}</span>}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64">
        <p className="text-sm font-semibold tracking-tight">Hiện gì trên mỗi mục</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          Giờ đến, tên và cảnh báo luôn hiện.
        </p>

        <ul className="mt-3 -mx-1">
          {LABELS.map((f) => (
            <li key={f.id}>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-muted">
                <input
                  type="checkbox"
                  checked={fields[f.id]}
                  onChange={(e) => write({ ...fields, [f.id]: e.target.checked })}
                  className="mt-0.5 size-4 shrink-0 accent-primary"
                />
                <span className="min-w-0">
                  <span className="block text-sm leading-snug">{f.label}</span>
                  {f.hint && (
                    <span className="block text-xs text-muted-foreground">{f.hint}</span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>

        {hidden > 0 && (
          <button
            type="button"
            onClick={() => write(ALL_ON)}
            className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Hiện lại tất cả
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
