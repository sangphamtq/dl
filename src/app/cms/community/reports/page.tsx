import Link from "next/link";
import { ArrowLeft, Flag } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { ReportActions } from "./report-actions";

type SearchParams = { view?: string };

const TABS = [
  { value: "pending", label: "Chờ xử lý" },
  { value: "all", label: "Tất cả" },
] as const;

const REASON_LABELS: Record<string, string> = {
  spam: "Spam / quảng cáo",
  scam: "Lừa đảo / lừa cọc",
  offensive: "Xúc phạm / thù ghét",
  offtopic: "Lạc chủ đề",
  wrong_info: "Thông tin sai lệch",
  other: "Khác",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  actioned: "Đã xử lý",
  dismissed: "Đã bỏ qua",
};

function excerpt(s: string, n = 200): string {
  const t = s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > n ? t.slice(0, n) + "…" : t || "(chỉ có ảnh)";
}

export default async function CmsReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const view = sp.view === "all" ? "all" : "pending";

  const rows = await prisma.contentReport.findMany({
    where: view === "pending" ? { status: "pending" } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      reason: true,
      note: true,
      status: true,
      createdAt: true,
      reporter: { select: { name: true } },
      threadId: true,
      thread: {
        select: { slug: true, body: true, isHidden: true },
      },
      reply: {
        select: { content: true, thread: { select: { slug: true } } },
      },
    },
  });

  return (
    <div className="p-6 sm:p-8">
      <Link
        href="/cms/community"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Kiểm duyệt cộng đồng
      </Link>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Báo cáo nội dung
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Bài / bình luận bị người dùng báo cáo. Ẩn hoặc xóa nội dung vi phạm, hoặc
        bỏ qua nếu không vi phạm.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/cms/community/reports?view=${t.value}`}
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
        <p className="mt-10 text-sm text-muted-foreground">
          Không có báo cáo nào.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map((r) => {
            const isThread = !!r.threadId;
            const slug = isThread ? r.thread?.slug : r.reply?.thread.slug;
            const content = isThread ? r.thread?.body : r.reply?.content;
            return (
              <li key={r.id} className="rounded-xl border border-border/60 p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    <Flag className="size-3" />
                    {REASON_LABELS[r.reason] ?? r.reason}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {isThread ? "Bài đăng" : "Trả lời"}
                  </span>
                  <span className="text-muted-foreground">
                    báo bởi {r.reporter.name ?? "Ẩn danh"}
                  </span>
                  <span className="text-muted-foreground">
                    · {r.createdAt.toLocaleDateString("vi-VN")}
                  </span>
                  {r.status !== "pending" && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  )}
                  {isThread && r.thread?.isHidden && (
                    <span className="rounded-full bg-warm/10 px-2 py-0.5 text-xs font-medium text-warm">
                      Bài đang ẩn
                    </span>
                  )}
                </div>

                {r.note && (
                  <p className="mt-2 text-sm italic text-muted-foreground">
                    “{r.note}”
                  </p>
                )}

                {slug ? (
                  <Link
                    href={`/cong-dong/${slug}`}
                    className="mt-2 block rounded-lg bg-muted/40 px-3 py-2 text-sm text-foreground/90 hover:text-primary"
                  >
                    {excerpt(content ?? "")}
                  </Link>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    (Nội dung đã bị xóa)
                  </p>
                )}

                {r.status === "pending" && (
                  <div className="mt-3">
                    <ReportActions
                      id={r.id}
                      kind={isThread ? "thread" : "reply"}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
