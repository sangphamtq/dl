"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RealtimeRefresher({
  channelKey,
  event,
  enabled,
}: {
  channelKey: string;
  event: string;
  enabled: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      const id = window.setInterval(() => {
        if (document.visibilityState === "visible") router.refresh();
      }, 25000);
      return () => window.clearInterval(id);
    }

    let client: import("ably").Realtime | null = null;
    let cancelled = false;
    (async () => {
      try {
        const Ably = await import("ably");
        if (cancelled) return;
        client = new Ably.Realtime({ authUrl: "/api/ably/token" });
        void client.channels
          .get(channelKey)
          .subscribe(event, () => router.refresh())
          .catch(() => {});
      } catch {
        /* bỏ qua — vẫn làm mới khi focus */
      }
    })();

    const onFocus = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      try {
        client?.close();
      } catch {
        /* bỏ qua */
      }
      client = null;
    };
  }, [enabled, channelKey, event, router]);

  return null;
}
