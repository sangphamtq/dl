import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, ExternalLink, MapPin, Phone } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SALE_STATUS_LABELS, saleServiceLabel } from "@/lib/sale";
import { SaleRowActions } from "./row-actions";
import type { SaleStatus } from "@/generated/prisma/enums";

type SearchParams = { status?: string };

const STATUS_TABS = [
  { value: "pending", label: "Chờ duyệt" },
  { value: "approved", label: "Đã duyệt" },
  { value: "rejected", label: "Bị từ chối" },
  { value: "all", label: "Tất cả" },
] as const;

function isStatus(v: string | undefined): v is SaleStatus {
  return v === "pending" || v === "approved" || v === "rejected";
}

export default async function CmsSalesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const active = isStatus(sp.status) ? sp.status : sp.status === "all" ? "all" : "pending";

  const [rows, counts] = await Promise.all([
    prisma.saleProfile.findMany({
      where: active === "all" ? {} : { status: active },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        slug: true,
        displayName: true,
        bio: true,
        services: true,
        zalo: true,
        phone: true,
        facebookUrl: true,
        website: true,
        avatarUrl: true,
        evidenceUrls: true,
        verifiedNote: true,
        rejectReason: true,
        status: true,
        createdAt: true,
        user: { select: { email: true, name: true, image: true } },
        areas: { select: { name: true } },
      },
    }),
    prisma.saleProfile.groupBy({ by: ["status"], _count: true }),
  ]);

  const countOf = (s: string) =>
    counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div className="p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          CTV / Người bán
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Duyệt hồ sơ cộng tác viên đăng ký. Xác minh uy tín trước khi cấp huy
          hiệu (xem SOP: MST/GPKD, kiểm soát page, gọi/gặp).
        </p>
      </div>

      {/* Tabs trạng thái */}
      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <Link
            key={t.value}
            href={`/cms/sales?status=${t.value}`}
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
          Không có hồ sơ nào ở trạng thái này.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-muted">
                    {(r.avatarUrl || r.user.image) && (
                      <Image
                        src={r.avatarUrl ?? r.user.image ?? ""}
                        alt={r.displayName}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold tracking-tight">
                        {r.displayName}
                      </h3>
                      {r.status === "approved" && (
                        <BadgeCheck className="size-4 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.user.email}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    r.status === "approved"
                      ? "default"
                      : r.status === "rejected"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {SALE_STATUS_LABELS[r.status]}
                </Badge>
              </div>

              {r.bio && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {r.bio}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.services.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-muted px-2.5 py-0.5 text-xs"
                  >
                    {saleServiceLabel(s)}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                {r.areas.length > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {r.areas.map((a) => a.name).join(", ")}
                  </span>
                )}
                {r.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-3.5" />
                    {r.phone}
                  </span>
                )}
                {r.zalo && <span>Zalo: {r.zalo}</span>}
                {r.facebookUrl && (
                  <a
                    href={r.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Facebook <ExternalLink className="size-3" />
                  </a>
                )}
              </div>

              {/* Bằng chứng nội bộ */}
              {r.evidenceUrls.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Ảnh xác minh (nội bộ)
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
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
                </div>
              )}

              {r.status === "rejected" && r.rejectReason && (
                <p className="mt-3 text-sm text-destructive">
                  Lý do từ chối: {r.rejectReason}
                </p>
              )}

              <div className="mt-4 flex items-end justify-between gap-3">
                <SaleRowActions id={r.id} status={r.status} />
                {r.status === "approved" && (
                  <Link
                    href={`/sale/${r.slug}`}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Trang cá nhân <ExternalLink className="size-3.5" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
