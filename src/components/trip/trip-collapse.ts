"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Ngày đang THU GỌN của một chuyến — sở thích XEM của từng người (như menu Hiển thị), lưu `localStorage` theo chuyến, không
 * vào DB. Đọc bằng `useSyncExternalStore` để không lệch hydration.
 * ⚠️ `read` phải trả CÙNG một Set khi chuỗi lưu không đổi, không thì React render lại vô tận.
 */
const EMPTY: ReadonlySet<string> = new Set();
const cache = new Map<string, { raw: string | null; set: ReadonlySet<string> }>();
const listeners = new Set<() => void>();

const keyOf = (tripId: string) => `halivivu:trip-collapsed:${tripId}`;

function read(tripId: string): ReadonlySet<string> {
  let raw: string | null;
  try {
    raw = localStorage.getItem(keyOf(tripId));
  } catch {
    return EMPTY;
  }
  const hit = cache.get(tripId);
  if (hit && hit.raw === raw) return hit.set;
  let set: ReadonlySet<string> = EMPTY;
  try {
    const ids = raw ? (JSON.parse(raw) as unknown) : null;
    if (Array.isArray(ids)) set = new Set(ids.filter((x): x is string => typeof x === "string"));
  } catch {
    /* chuỗi hỏng ⇒ coi như chưa thu gọn ngày nào */
  }
  cache.set(tripId, { raw, set });
  return set;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function write(tripId: string, set: ReadonlySet<string>) {
  const raw = set.size ? JSON.stringify([...set]) : null;
  try {
    if (raw) localStorage.setItem(keyOf(tripId), raw);
    else localStorage.removeItem(keyOf(tripId));
  } catch {
    /* chế độ riêng tư chặn storage — vẫn đổi được trong phiên này */
  }
  cache.set(tripId, { raw, set });
  for (const cb of listeners) cb();
}

/** `[ngày đang thu gọn, đặt thu gọn/mở cho một ngày]`. */
export function useCollapsedDays(tripId: string) {
  const collapsed = useSyncExternalStore(
    subscribe,
    () => read(tripId),
    () => EMPTY,
  );
  const setCollapsed = useCallback(
    (dayId: string, shut: boolean) => {
      const cur = read(tripId);
      if (cur.has(dayId) === shut) return;
      const next = new Set(cur);
      if (shut) next.add(dayId);
      else next.delete(dayId);
      write(tripId, next);
    },
    [tripId],
  );
  return [collapsed, setCollapsed] as const;
}
