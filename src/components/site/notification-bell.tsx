"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NavIcon } from "./nav-icons";
import { Glyph, type GlyphName } from "./glyphs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { HEADER_ICON_BTN } from "@/lib/header-ui";
import { initials, timeAgo } from "@/lib/format";
import { notifMessage } from "@/lib/notification-labels";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/(site)/thong-bao/actions";

type Item = {
  id: string;
  type: string;
  url: string;
  excerpt: string | null;
  isRead: boolean;
  createdAt: string;
  actor: { name: string | null; image: string | null };
};


/** Ký hiệu nhỏ góc avatar — nói LOẠI tương tác trước khi đọc chữ. */
const TYPE_GLYPH: Record<string, GlyphName> = {
  thread_comment: "message",
  thread_reply: "message",
  blog_reply: "message",
  thread_like: "heart",
  reply_like: "heart",
  sale_approved: "check",
  sale_rejected: "close",
  thread_moderated: "shield",
  trip_invite: "route",
};

const DAY = 86_400_000;
function groupOf(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d >= today) return "Hôm nay";
  if (d.getTime() >= today.getTime() - 6 * DAY) return "Tuần này";
  return "Trước đó";
}

function groupItems(items: Item[]) {
  const out: { label: string; items: Item[] }[] = [];
  for (const it of items) {
    const label = groupOf(it.createdAt);
    const last = out[out.length - 1];
    if (last?.label === label) last.items.push(it);
    else out.push({ label, items: [it] });
  }
  return out;
}

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
  const [onlyUnread, setOnlyUnread] = useState(false);
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
    let cancelled = false;
    (async () => {
      try {
        const Ably = await import("ably");
        if (cancelled) return;
        client = new Ably.Realtime({ authUrl: "/api/ably/token" });
        client.connection.on("failed", () => {});
        const sub = client.channels.get(`user:${userId}`).subscribe("notif", () => {
          if (openRef.current) loadItems();
          else refreshCount();
        });
        Promise.resolve(sub).catch(() => {});
      } catch {
        /* bỏ qua — vẫn còn refresh khi mở/đổi tab */
      }
    })();
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      try {
        client?.close();
      } catch {
        /* bỏ qua */
      }
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

  const shown = onlyUnread ? items.filter((i) => !i.isRead) : items;
  const groups = groupItems(shown);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={unread > 0 ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
              className={HEADER_ICON_BTN}
            >
              <NavIcon name="bell" active={false} className="size-[1.15rem]" />
              {unread > 0 && (
                <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-[5px] bg-warm px-1 text-[0.625rem] font-semibold tabular-nums leading-none text-warm-foreground ring-2 ring-background [text-shadow:none]">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        {!open && <TooltipContent>Thông báo</TooltipContent>}
      </Tooltip>

      <PopoverContent
        align="end"
        sideOffset={10}
        collisionPadding={16}
        className="flex w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[14px] border-border/70 p-0 shadow-[0_20px_48px_-16px_rgb(0_0_0/0.25)]"
      >
        <div className="px-4 pb-3 pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[1.0625rem] font-semibold tracking-tight">Thông báo</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="-mr-1.5 rounded-[6px] px-1.5 py-1 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
              >
                Đánh dấu đã đọc hết
              </button>
            )}
          </div>

          {/* Bộ lọc hai trạng thái — đoạn chọn, không phải tab: chỉ lọc danh sách đang có. */}
          <div role="radiogroup" aria-label="Lọc thông báo" className="mt-3 inline-flex rounded-[8px] bg-foreground/[0.05] p-0.5">
            {[
              { on: false, label: "Tất cả" },
              { on: true, label: unread > 0 ? `Chưa đọc ${unread}` : "Chưa đọc" },
            ].map((f) => (
              <button
                key={f.label}
                type="button"
                role="radio"
                aria-checked={onlyUnread === f.on}
                onClick={() => setOnlyUnread(f.on)}
                className={cn(
                  "h-7 rounded-[6px] px-3 text-[0.8125rem] font-medium tabular-nums transition-colors",
                  onlyUnread === f.on
                    ? "bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[min(26rem,60vh)] overflow-y-auto overscroll-contain px-1.5 pb-1.5">
          {loading && items.length === 0 ? (
            <ul aria-label="Đang tải" className="space-y-1">
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex gap-3 px-2.5 py-2.5">
                  <span className="size-9 shrink-0 animate-pulse rounded-full bg-foreground/[0.07]" />
                  <span className="flex-1 space-y-2 pt-1">
                    <span className="block h-3 w-4/5 animate-pulse rounded-[3px] bg-foreground/[0.07]" />
                    <span className="block h-3 w-1/3 animate-pulse rounded-[3px] bg-foreground/[0.05]" />
                  </span>
                </li>
              ))}
            </ul>
          ) : shown.length === 0 ? (
            <div className="flex flex-col items-center px-6 pb-8 pt-6 text-center">
              <span className="grid size-11 place-items-center rounded-[10px] bg-foreground/[0.05] text-foreground/50">
                <NavIcon name="bell" active={false} className="size-5" />
              </span>
              <p className="mt-3 text-sm font-medium">
                {onlyUnread ? "Bạn đã đọc hết rồi" : "Chưa có thông báo nào"}
              </p>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
                {onlyUnread
                  ? "Thông báo mới sẽ hiện ở đây."
                  : "Khi có người trả lời, thích hay mời bạn cùng sửa lịch trình, bạn sẽ thấy ở đây."}
              </p>
            </div>
          ) : (
            groups.map((g) => (
              <section key={g.label} aria-label={g.label}>
                <p className="px-2.5 pb-1 pt-2 text-xs font-medium text-muted-foreground">{g.label}</p>
                <ul>
                  {g.items.map((it) => (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => onItemClick(it)}
                        className="group flex w-full gap-3 rounded-[8px] px-2.5 py-2.5 text-left transition-colors hover:bg-foreground/[0.05] focus-visible:bg-foreground/[0.05] focus-visible:outline-none"
                      >
                        <span className="relative block size-9 shrink-0">
                          <Avatar className="size-9 ring-1 ring-foreground/10">
                            {it.actor.image && <AvatarImage src={it.actor.image} alt="" />}
                            <AvatarFallback className="bg-foreground/[0.06] text-xs font-semibold text-foreground/70">
                              {initials(it.actor.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span
                            aria-hidden
                            className="absolute -bottom-1 -right-1 grid size-[1.125rem] place-items-center rounded-[5px] bg-background text-foreground/70 ring-1 ring-foreground/10"
                          >
                            <Glyph name={TYPE_GLYPH[it.type] ?? "info"} className="size-3" />
                          </span>
                        </span>

                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "line-clamp-2 text-sm leading-snug",
                              it.isRead ? "text-muted-foreground" : "text-foreground",
                            )}
                          >
                            <span className={cn("font-semibold", it.isRead ? "text-foreground/80" : "text-foreground")}>
                              {it.actor.name ?? "Ai đó"}
                            </span>{" "}
                            {notifMessage(it.type)}
                          </span>
                          {it.excerpt && (
                            <span className="mt-1 line-clamp-1 border-l-2 border-foreground/10 pl-2 text-[0.8125rem] text-muted-foreground">
                              {/* Trích đoạn lưu nguyên markdown của bài — bỏ ký hiệu kẻo hiện "**chữ**". */}
                              {it.excerpt.replace(/[*_`#>~]+/g, "")}
                            </span>
                          )}
                          <span className="mt-1 block text-xs text-muted-foreground/80">
                            {timeAgo(new Date(it.createdAt))}
                          </span>
                        </span>

                        {!it.isRead && (
                          <span aria-label="Chưa đọc" className="mt-1.5 size-2 shrink-0 rounded-[3px] bg-primary" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        <Link
          href="/thong-bao"
          onClick={() => setOpen(false)}
          className="flex h-11 items-center justify-center border-t border-border/60 text-[0.8125rem] font-medium text-foreground/80 transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
        >
          Xem tất cả thông báo
        </Link>
      </PopoverContent>
    </Popover>
  );
}
