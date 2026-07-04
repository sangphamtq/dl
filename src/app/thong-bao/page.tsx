import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { auth } from "@/auth";
import { getRecentNotifications } from "@/lib/notifications";
import { initials, timeAgo } from "@/lib/format";
import { notifMessage } from "@/lib/notification-labels";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { markAllNotificationsRead } from "./actions";

export const metadata = { title: "Thông báo · Halivivu" };

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/thong-bao");

  const items = await getRecentNotifications(session.user.id, 50);
  const hasUnread = items.some((i) => !i.isRead);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex items-center justify-between gap-3">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Bell className="size-6 text-primary" aria-hidden />
              Thông báo
            </h1>
            {hasUnread && (
              <form
                action={async () => {
                  "use server";
                  await markAllNotificationsRead();
                }}
              >
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <CheckCheck className="size-4" aria-hidden />
                  Đánh dấu tất cả đã đọc
                </button>
              </form>
            )}
          </div>

          {items.length > 0 ? (
            <ul className="mt-6 divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card">
              {items.map((it) => (
                <li key={it.id}>
                  <Link
                    href={it.url}
                    className={cn(
                      "flex gap-3 px-4 py-3.5 transition-colors hover:bg-muted/60",
                      !it.isRead && "bg-primary/5",
                    )}
                  >
                    <span
                      aria-hidden
                      className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                    >
                      {initials(it.actor.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">
                        <span className="font-medium">
                          {it.actor.name ?? "Ai đó"}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {notifMessage(it.type)}
                        </span>
                      </p>
                      {it.excerpt && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          “{it.excerpt}”
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground/80">
                        {timeAgo(it.createdAt)}
                      </p>
                    </div>
                    {!it.isRead && (
                      <span
                        aria-hidden
                        className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                      />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-10 flex flex-col items-center justify-center py-16 text-center">
              <Bell className="size-10 text-muted-foreground" aria-hidden />
              <p className="mt-4 text-muted-foreground">
                Chưa có thông báo nào.
              </p>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
