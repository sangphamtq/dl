import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TRUST_CHANNEL_LABELS } from "@/lib/trust";
import { ScamRowActions } from "./row-actions";
import type { ScamReportStatus } from "@/generated/prisma/enums";

type SearchParams = { status?: string };

const TABS = [
  { value: "pending", label: "Chờ duyệt" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "rejected", label: "Đã bác bỏ" },
  { value: "all", label: "Tất cả" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ duyệt",
  confirmed: "Đã xác nhận",
  rejected: "Đã bác bỏ",
};

function isStatus(v: string | undefined): v is ScamReportStatus {
  return v === "pending" || v === "confirmed" || v === "rejected";
}

export default async function ScamReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const active = isStatus(sp.status)
    ? sp.status
    : sp.status === "all"
      ? "all"
      : "pending";

  const [rows, counts] = await Promise.all([
    prisma.scamReport.findMany({
      where: active === "all" ? {} : { status: active },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.scamReport.groupBy({ by: ["status"], _count: true }),
  ]);
  const countOf = (s: string) =>
    counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div className="p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Báo cáo lừa đảo
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kiểm duyệt báo cáo từ cộng đồng. Chỉ báo cáo <b>đã xác nhận</b> mới
          hiện trong công cụ kiểm tra. Cần bằng chứng rõ trước khi xác nhận
          (tránh vu khống).
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/cms/scam-reports?status=${t.value}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
              active === t.value
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border/60 text-muted-foreground hover:bg-muted",
            )}
          >
            {t.label}
            {t.value !== "all" && (
              <span className="tabular-nums opacity-70">
                {countOf(t.value)}
              </span>
            )}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          Không có báo cáo nào ở trạng thái này.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {TRUST_CHANNEL_LABELS[r.channel] ?? r.channel}
                    </Badge>
                    <span className="font-mono text-sm font-medium">
                      {r.valueRaw}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    chuẩn hoá: {r.valueNorm}
                  </p>
                </div>
                <Badge
                  variant={
                    r.status === "confirmed"
                      ? "destructive"
                      : r.status === "rejected"
                        ? "secondary"
                        : "default"
                  }
                >
                  {STATUS_LABEL[r.status]}
                </Badge>
              </div>

              {r.reason && (
                <p className="mt-3 text-sm font-medium">{r.reason}</p>
              )}
              {r.description && (
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {r.description}
                </p>
              )}
              {r.reporterContact && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Liên hệ người báo: {r.reporterContact}
                </p>
              )}

              {r.evidenceUrls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.evidenceUrls.map((u) => (
                    <a
                      key={u}
                      href={u}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative size-16 overflow-hidden rounded-lg bg-muted"
                    >
                      <Image
                        src={u}
                        alt="Bằng chứng"
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <ScamRowActions id={r.id} status={r.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
