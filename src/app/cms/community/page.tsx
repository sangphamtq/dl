import Link from "next/link";
import { Flag, Lock, Pin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { THREAD_TYPE_LABELS } from "@/lib/community";
import { ThreadRowActions } from "./row-actions";

type SearchParams = { view?: string };

const TABS = [
  { value: "all", label: "Tất cả" },
  { value: "visible", label: "Đang hiện" },
  { value: "hidden", label: "Đã ẩn" },
  { value: "reported", label: "Bị báo cáo" },
] as const;

function excerpt(html: string, n = 200): string {
  const t = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > n ? t.slice(0, n) + "…" : t || "(chỉ có ảnh)";
}

export default async function CmsCommunityPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const view = TABS.some((t) => t.value === sp.view) ? sp.view! : "all";

  const where =
    view === "hidden"
      ? { isHidden: true }
      : view === "visible"
        ? { isHidden: false }
        : view === "reported"
          ? { reports: { some: { status: "pending" as const } } }
          : {};

  const [rows, total, hiddenCount, pendingReports] = await Promise.all([
    prisma.thread.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        slug: true,
        body: true,
        type: true,
        isPinned: true,
        isLocked: true,
        isHidden: true,
        replyCount: true,
        createdAt: true,
        author: { select: { name: true } },
        place: { select: { name: true, slug: true } },
        _count: { select: { reports: { where: { status: "pending" } } } },
      },
    }),
    prisma.thread.count(),
    prisma.thread.count({ where: { isHidden: true } }),
    prisma.contentReport.count({ where: { status: "pending" } }),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cộng đồng</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kiểm duyệt bài đăng cộng đồng: ghim, khóa, ẩn hoặc xóa.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tổng: <b>{total}</b> · Đã ẩn: <b>{hiddenCount}</b>
          </p>
        </div>
        <Link
          href="/cms/community/reports"
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
            pendingReports > 0
              ? "border-transparent bg-warm/15 text-warm hover:bg-warm/25"
              : "border-border/60 hover:bg-muted",
          )}
        >
          <Flag className="size-4" />
          Báo cáo chờ xử lý
          <span className="rounded-full bg-background/60 px-1.5 text-xs font-semibold">
            {pendingReports}
          </span>
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/cms/community?view=${t.value}`}
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition-colors",
              view === t.value
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border/60 hover:bg-muted",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">Không có bài nào.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map((r) => (
            <li
              key={r.id}
              className={cn(
                "rounded-xl border p-4",
                r.isHidden
                  ? "border-border/60 bg-muted/40 opacity-70"
                  : "border-border/60",
              )}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {THREAD_TYPE_LABELS[r.type] ?? r.type}
                </span>
                <span className="text-muted-foreground">
                  {r.author.name ?? "Ẩn danh"}
                </span>
                <span className="text-muted-foreground">
                  · {r.createdAt.toLocaleDateString("vi-VN")}
                </span>
                {r.place && (
                  <Link
                    href={`/diem-den/${r.place.slug}`}
                    className="text-primary hover:underline"
                  >
                    {r.place.name}
                  </Link>
                )}
                <span className="text-muted-foreground">
                  · {r.replyCount} trả lời
                </span>
                {r.isPinned && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <Pin className="size-3" /> Ghim
                  </span>
                )}
                {r.isLocked && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    <Lock className="size-3" /> Khóa
                  </span>
                )}
                {r.isHidden && (
                  <span className="rounded-full bg-warm/10 px-2 py-0.5 text-xs font-medium text-warm">
                    Đã ẩn
                  </span>
                )}
                {r._count.reports > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    <Flag className="size-3" /> {r._count.reports} báo cáo
                  </span>
                )}
              </div>

              <Link
                href={`/cong-dong/${r.slug}`}
                className="mt-2 block text-sm text-foreground/90 hover:text-primary"
              >
                {excerpt(r.body)}
              </Link>

              <div className="mt-3">
                <ThreadRowActions
                  id={r.id}
                  isPinned={r.isPinned}
                  isLocked={r.isLocked}
                  isHidden={r.isHidden}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
