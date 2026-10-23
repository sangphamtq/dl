"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const EVERY_MS = 15_000;

// Đang gõ / đang mở menu, popover thì KHÔNG làm mới: dữ liệu mới đổ vào giữa lúc
// đó là giật mất thứ người dùng đang cầm. Lần hỏi sau sẽ bắt lại.
function userIsBusy(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return true;
  // Chỉ dialog Radix/vaul ĐANG MỞ (`data-state="open"`) — bảng mời cài app cũng là
  // `role="dialog"` nhưng nằm lì đó, bắt nó là tắt hẳn việc tự cập nhật.
  return (
    document.querySelector(
      '[role="dialog"][data-state="open"], [role="menu"], [data-radix-popper-content-wrapper]',
    ) !== null
  );
}

/**
 * Chuyến có người cùng sửa: hỏi `version` (một số) rồi `router.refresh()` khi nó
 * tăng — cập nhật tại chỗ, không tải lại trang. Chỉ hỏi khi tab đang hiện.
 */
export function useTripLiveSync({
  tripId,
  version,
  enabled,
  busy,
}: {
  tripId: string;
  version: number;
  enabled: boolean;
  busy: boolean;
}) {
  const router = useRouter();
  const seen = useRef(version);
  const busyRef = useRef(busy);
  const requested = useRef(version);

  useEffect(() => {
    seen.current = version;
    busyRef.current = busy;
  });

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let inFlight = false;

    async function check() {
      if (inFlight || document.hidden || busyRef.current || userIsBusy()) return;
      inFlight = true;
      try {
        const res = await fetch(`/api/trips/${tripId}/version`, { cache: "no-store" });
        if (!res.ok || !alive) return;
        const { version: latest } = (await res.json()) as { version: number };
        // Kiểm lại `busy` SAU khi chờ mạng: người dùng có thể vừa bắt đầu kéo.
        if (latest > seen.current && latest > requested.current && !busyRef.current) {
          requested.current = latest;
          router.refresh();
          toast("Lịch trình vừa có thay đổi mới, đã cập nhật.", { id: `trip-sync-${tripId}` });
        }
      } catch {
        // Mất mạng: im lặng, lần sau hỏi lại.
      } finally {
        inFlight = false;
      }
    }

    const timer = setInterval(check, EVERY_MS);
    const onVisible = () => {
      if (!document.hidden) void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [enabled, tripId, router]);
}
