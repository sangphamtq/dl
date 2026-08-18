"use client";

import { useSyncExternalStore } from "react";
import { Eye } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Chọn xem MỖI MỤC hiện những gì.
//
// Vì sao có: mỗi người xếp lịch theo một thứ khác nhau. Người đi ăn cần giờ mở
// cửa; người đi chơi cần thời gian ở lại; người đã thuộc đường thì chỉ muốn một
// danh sách tên cho gọn. Trước đây mỗi lần thấy chật là gỡ hẳn một trường ra
// khỏi code — cách đó chỉ đúng cho một kiểu người dùng.
//
// KHÔNG cho tắt: giờ đến, tên, và CẢNH BÁO. Hai cái đầu là danh tính của mục;
// cảnh báo là lý do tồn tại của cả tính năng (docs/lich-trinh.md §1) — cho tắt
// thì người dùng tự tay bỏ đi thứ đáng giá nhất mà không biết.
//
// Lưu ở localStorage, KHÔNG ở DB: đây là sở thích xem, không phải dữ liệu
// chuyến đi. Đọc bằng useSyncExternalStore để không lệch hydration — cùng cách
// header-chrome.tsx theo dõi vị trí cuộn.

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

// ── Kho nhỏ quanh localStorage ──────────────────────────────────────────
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
  // Trả về CÙNG một object khi chuỗi lưu không đổi — getSnapshot mà trả object
  // mới mỗi lần gọi thì React sẽ render lại vô tận.
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
  // Nhiều tab / nhiều thẻ cùng mở một chuyến vẫn khớp nhau.
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

// ── Nút chọn ────────────────────────────────────────────────────────────

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
