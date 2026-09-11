"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { RefreshCw } from "@/components/icons";
import { Button } from "@/components/ui/button";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function OfflineRetry() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true, // lúc render trên server: coi như có mạng
  );

  const wasOffline = useRef(false);
  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      return;
    }
    if (wasOffline.current) window.location.reload();
  }, [online]);

  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        size="lg"
        className="rounded-full"
        onClick={() => window.location.reload()}
      >
        <RefreshCw className="size-4" aria-hidden />
        Thử lại
      </Button>
      <p
        className="text-xs text-muted-foreground"
        aria-live="polite"
        suppressHydrationWarning
      >
        {online
          ? "Có vẻ đã có mạng — bấm Thử lại để tiếp tục."
          : "Đang chờ kết nối…"}
      </p>
    </div>
  );
}
