"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials, timeAgo } from "@/lib/format";
import { notifMessage } from "@/lib/notification-labels";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/thong-bao/actions";

type Item = {
  id: string;
  type: string;
  url: string;
  excerpt: string | null;
  isRead: boolean;
  createdAt: string;
  actor: { name: string | null };
};

export function NotificationBell({
  initialUnread,
  userId,
  realtimeEnabled,
}: {
  initialUnread: number;
  userId: string;
  realtimeEnabled: boolean;
}) {
  const router = useRouter();
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const openRef = useRef(false);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const refreshCount = async () => {
    try {
      const r = await fetch("/api/notifications?c=1");
      const j = await r.json();
      setUnread(j.unread ?? 0);
    } catch {
      /* bỏ qua */
    }
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/notifications");
      const j = await r.json();
      setItems(j.items ?? []);
      setUnread(j.unread ?? 0);
    } finally {
      setLoading(false);
    }
  };

  // Realtime: nhận "notif" trên kênh riêng → cập nhật ngay. Chưa bật Ably thì
  // rơi về polling 30s. Luôn làm mới khi quay lại tab.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") refreshCount();
    };
    window.addEventListener("focus", onFocus);

    if (!realtimeEnabled) {
      const id = window.setInterval(() => {
        if (document.visibilityState === "visible") refreshCount();
      }, 30000);
      return () => {
        window.clearInterval(id);
        window.removeEventListener("focus", onFocus);
      };
    }

    let client: import("ably").Realtime | null = null;
    (async () => {
      try {
        const Ably = await import("ably");
        client = new Ably.Realtime({ authUrl: "/api/ably/token" });
        client.channels.get(`user:${userId}`).subscribe("notif", () => {
          if (openRef.current) loadItems();
          else refreshCount();
        });
      } catch {
        /* bỏ qua — vẫn còn refresh khi mở/đổi tab */
      }
    })();
    return () => {
      window.removeEventListener("focus", onFocus);
      client?.close();
    };
  }, [realtimeEnabled, userId]);

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) loadItems();
  };

  const markAll = async () => {
    setUnread(0);
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    await markAllNotificationsRead();
  };

  const onItemClick = (it: Item) => {
    setOpen(false);
    if (!it.isRead) {
      setUnread((u) => Math.max(0, u - 1));
      markNotificationRead(it.id);
    }
    router.push(it.url);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Thông báo"
          className="relative grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="size-5" aria-hidden />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-warm px-1 text-[0.625rem] font-semibold leading-4 text-warm-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
          <span className="text-sm font-semibold">Thông báo</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAll}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <CheckCheck className="size-3.5" aria-hidden />
              Đánh dấu đã đọc
            </button>
          )}
        </div>

        <div className="max-h-[24rem] overflow-y-auto">
          {loading && items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Đang tải…
            </p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Chưa có thông báo nào.
            </p>
          ) : (
            <ul>
              {items.map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => onItemClick(it)}
                    className={cn(
                      "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                      !it.isRead && "bg-primary/5",
                    )}
                  >
                    <span
                      aria-hidden
                      className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                    >
                      {initials(it.actor.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug">
                        <span className="font-medium">
                          {it.actor.name ?? "Ai đó"}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {notifMessage(it.type)}
                        </span>
                      </span>
                      {it.excerpt && (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          “{it.excerpt}”
                        </span>
                      )}
                      <span className="mt-0.5 block text-xs text-muted-foreground/80">
                        {timeAgo(new Date(it.createdAt))}
                      </span>
                    </span>
                    {!it.isRead && (
                      <span
                        aria-hidden
                        className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border/60 px-4 py-2 text-center">
          <Link
            href="/thong-bao"
            onClick={() => setOpen(false)}
            className="text-sm font-medium text-primary hover:underline"
          >
            Xem tất cả
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
