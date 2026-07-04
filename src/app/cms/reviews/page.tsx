import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { stanceMeta, labelsFor } from "@/lib/review-meta";
import { ReviewRowActions } from "./row-actions";

type SearchParams = { view?: string };

const TABS = [
  { value: "all", label: "Tất cả" },
  { value: "visible", label: "Đang hiện" },
  { value: "hidden", label: "Đã ẩn" },
] as const;

export default async function CmsReviewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const view =
    sp.view === "hidden" || sp.view === "visible" ? sp.view : "all";

  const where =
    view === "hidden"
      ? { isHidden: true }
      : view === "visible"
        ? { isHidden: false }
        : {};

  const [rows, total, hiddenCount] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        stance: true,
        highlights: true,
        caveats: true,
        content: true,
        createdAt: true,
        isHidden: true,
        author: { select: { name: true } },
        place: { select: { name: true, slug: true } },
        spot: { select: { name: true, slug: true } },
      },
    }),
    prisma.review.count(),
    prisma.review.count({ where: { isHidden: true } }),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Đánh giá</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kiểm duyệt đánh giá điểm đến của Vivu-er. Review <b>ẩn</b> không hiện
          công khai và không tính vào tổng hợp.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tổng: <b>{total}</b> · Đã ẩn: <b>{hiddenCount}</b>
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/cms/reviews?view=${t.value}`}
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
        <p className="mt-10 text-sm text-muted-foreground">Chưa có đánh giá nào.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map((r) => {
            const meta = stanceMeta(r.stance);
            const target = r.place
              ? { href: `/diem-den/${r.place.slug}`, name: r.place.name, kind: "Điểm đến" }
              : r.spot
                ? { href: `/dia-diem/${r.spot.slug}`, name: r.spot.name, kind: "Địa điểm" }
                : { href: "#", name: "—", kind: "" };
            return (
              <li
                key={r.id}
                className={cn(
                  "rounded-xl border p-4",
                  r.isHidden ? "border-border/60 bg-muted/40 opacity-70" : "border-border/60",
                )}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  {target.kind && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {target.kind}
                    </span>
                  )}
                  <Link
                    href={target.href}
                    className="font-semibold text-primary hover:underline"
                  >
                    {target.name}
                  </Link>
                  <span className="text-muted-foreground">
                    · {r.author.name ?? "Ẩn danh"}
                  </span>
                  <span className="text-muted-foreground">
                    · {r.createdAt.toLocaleDateString("vi-VN")}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {meta.label}
                  </span>
                  {r.isHidden && (
                    <span className="rounded-full bg-warm/10 px-2 py-0.5 text-xs font-medium text-warm">
                      Đã ẩn
                    </span>
                  )}
                </div>

                {(r.highlights.length > 0 || r.caveats.length > 0) && (
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    {labelsFor("highlights", r.highlights).map((o) => (
                      <span key={o.value}>+ {o.label}</span>
                    ))}
                    {labelsFor("caveats", r.caveats).map((o) => (
                      <span key={o.value}>! {o.label}</span>
                    ))}
                  </div>
                )}

                {r.content && (
                  <p className="mt-2 whitespace-pre-line text-sm text-foreground/90">
                    {r.content}
                  </p>
                )}

                <div className="mt-3">
                  <ReviewRowActions id={r.id} isHidden={r.isHidden} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
