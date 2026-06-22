"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Tự làm mới (router.refresh) khi nhận sự kiện Ably trên kênh; nếu chưa cấu hình
// Ably thì rơi về polling. Không render UI. Dùng cho trang danh sách cộng đồng.
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
    (async () => {
      try {
        const Ably = await import("ably");
        client = new Ably.Realtime({ authUrl: "/api/ably/token" });
        client.channels.get(channelKey).subscribe(event, () => router.refresh());
      } catch {
        /* bỏ qua — vẫn làm mới khi focus */
      }
    })();

    const onFocus = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      client?.close();
    };
  }, [enabled, channelKey, event, router]);

  return null;
}
