import Image from "next/image";
import { ShieldCheck, Check } from "@/components/icons";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { TRUST_CHANNEL_LABELS } from "@/lib/trust";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { TrustChecker } from "./trust-checker";

export const metadata = {
  title: "Kiểm tra uy tín · Halivivu",
  description:
    "Tra cứu SĐT, Facebook, website, số tài khoản: đã xác minh hay bị báo cáo lừa đảo. Kèm danh sách cảnh báo đã xác nhận, dấu hiệu nhận biết và nguyên tắc an toàn.",
};

const pub = { status: "published" as const };

const VERDICTS = [
  {
    dot: "bg-primary",
    tone: "text-primary",
    title: "Đã xác minh",
    desc: "Thuộc một hồ sơ đã xác minh chính chủ — đáng tin hơn, nhưng vẫn nên đối chiếu.",
  },
  {
    dot: "bg-destructive",
    tone: "text-destructive",
    title: "Bị báo cáo",
    desc: "Cộng đồng đã báo cáo lừa đảo. Tuyệt đối thận trọng, không chuyển cọc.",
  },
  {
    dot: "bg-warm",
    tone: "text-warm",
    title: "Chưa có dữ liệu",
    desc: "Chưa nằm trong danh bạ lẫn danh sách báo cáo — KHÔNG phải bằng chứng an toàn.",
  },
];

const RED_FLAGS: string[] = [
  "Giục chuyển cọc gấp, tạo áp lực “nhiều người đang hỏi”.",
  "Yêu cầu chuyển vào tài khoản KHÔNG trùng tên chính chủ.",
  "Từ chối gọi video hoặc cho xem thêm ảnh, địa chỉ thật.",
  "Giá rẻ bất thường so với mặt bằng chung.",
  "Trang mới lập, ít tương tác, ảnh lấy lại từ nơi khác.",
  "Chỉ nhận chuyển khoản, né mọi kênh có bảo vệ người mua.",
];

const SAFE_RULES: string[] = [
  "Đối chiếu qua nhiều nguồn: bản đồ, đánh giá, số điện thoại công khai.",
  "Ưu tiên chỗ ở có huy hiệu “Đã xác minh chính chủ”.",
  "Chuyển khoản đúng tên chủ đã xác minh; nghi ngờ thì gọi video trước.",
  "Đặt cọc ít nhất có thể; giữ lại toàn bộ tin nhắn và biên lai.",
  "Gặp dấu hiệu lừa đảo → báo cáo để cảnh báo người đi sau.",
];

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default async function KiemTraPage() {
  const [session, verifiedCount, reportCount, reports] = await Promise.all([
    auth(),
    prisma.accommodation.count({ where: { ...pub, isVerified: true } }),
    prisma.scamReport.count({ where: { status: "confirmed" } }),
    prisma.scamReport.findMany({
      where: { status: "confirmed" },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        channel: true,
        valueRaw: true,
        reason: true,
        description: true,
        evidenceUrls: true,
        createdAt: true,
      },
    }),
  ]);
  const isAuthed = !!session?.user?.id;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* ─── HERO khối màu ───────────────────────────────── */}
        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto max-w-4xl px-4 pb-28 pt-14 sm:px-6 sm:pb-32 sm:pt-20">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
              <ShieldCheck className="size-3.5" aria-hidden />
              Công cụ miễn phí
            </span>
            <h1 className="mt-5 text-balance text-4xl font-extrabold leading-[1.03] tracking-tight sm:text-5xl lg:text-6xl">
              Trước khi chuyển cọc, hãy kiểm tra
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-primary-foreground/85">
              Dán số điện thoại, link Facebook, website hoặc số tài khoản — biết
              ngay kênh đó đã xác minh hay đã bị cộng đồng báo cáo lừa đảo.
            </p>
          </div>
        </section>

        {/* ─── Công cụ nổi (đè lên hero) ───────────────────── */}
        <div className="relative z-10 mx-auto -mt-20 max-w-4xl px-4 sm:px-6">
          <TrustChecker isAuthed={isAuthed} />

          {(verifiedCount > 0 || reportCount > 0) && (
            <div className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-4">
              {verifiedCount > 0 && (
                <div>
                  <div className="text-4xl font-extrabold tabular-nums tracking-tight text-primary">
                    {verifiedCount.toLocaleString("vi-VN")}
                  </div>
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    chỗ ở đã xác minh
                  </div>
                </div>
              )}
              {reportCount > 0 && (
                <div>
                  <div className="text-4xl font-extrabold tabular-nums tracking-tight text-destructive">
                    {reportCount.toLocaleString("vi-VN")}
                  </div>
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    cảnh báo đã xác nhận
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Cách đọc kết quả ────────────────────────────── */}
        <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-16">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Cách đọc kết quả
          </h2>
          <div className="mt-4 grid divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {VERDICTS.map((v) => (
              <div key={v.title} className="p-5">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn("size-2.5 shrink-0 rounded-full", v.dot)}
                    aria-hidden
                  />
                  <span className={cn("font-bold tracking-tight", v.tone)}>
                    {v.title}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Cảnh báo đã xác nhận ────────────────────────── */}
        {reports.length > 0 && (
          <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Cảnh báo đã xác nhận
              </h2>
              <span className="shrink-0 rounded-full bg-destructive/10 px-2.5 py-1 text-sm font-semibold tabular-nums text-destructive">
                {reportCount.toLocaleString("vi-VN")} kênh
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Đã bị cộng đồng báo cáo và kiểm duyệt xác nhận là lừa đảo — tuyệt
              đối không chuyển cọc.
            </p>

            <div className="mt-6 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60">
              {reports.map((r) => (
                <ReportRow key={r.id} r={r} />
              ))}
            </div>

            {reportCount > reports.length && (
              <p className="mt-4 text-sm text-muted-foreground">
                Hiển thị {reports.length} cảnh báo mới nhất trong tổng số{" "}
                {reportCount.toLocaleString("vi-VN")}.
              </p>
            )}
          </section>
        )}

        {/* ─── Cảnh giác & an toàn ─────────────────────────── */}
        <section className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto grid max-w-4xl gap-12 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Dấu hiệu lừa đảo
              </h2>
              <ol className="mt-5 space-y-4">
                {RED_FLAGS.map((f, i) => (
                  <li key={i} className="flex gap-3.5">
                    <span className="font-mono text-sm font-bold tabular-nums text-destructive">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[15px] leading-relaxed text-foreground/90">
                      {f}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Nguyên tắc an toàn
              </h2>
              <ul className="mt-5 space-y-3.5">
                {SAFE_RULES.map((r, i) => (
                  <li key={i} className="flex gap-3">
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span className="text-[15px] leading-relaxed text-foreground/90">
                      {r}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-l-2 border-warm/60 pl-4 text-sm leading-relaxed text-muted-foreground">
                Dữ liệu báo cáo đến từ cộng đồng và được kiểm duyệt trước khi công
                khai. “Chưa có dữ liệu” không đồng nghĩa an toàn.
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function ReportRow({
  r,
}: {
  r: {
    id: string;
    channel: string;
    valueRaw: string;
    reason: string | null;
    description: string | null;
    evidenceUrls: string[];
    createdAt: Date;
  };
}) {
  const label = TRUST_CHANNEL_LABELS[r.channel] ?? r.channel;
  const note = [r.reason, r.description].filter(Boolean).join(" — ");
  return (
    <div className="flex items-start gap-4 px-4 py-4 transition-colors hover:bg-muted/40">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <span className="font-semibold text-destructive">{label}</span>
          <span aria-hidden className="text-border">
            ·
          </span>
          <time className="text-muted-foreground">
            {dateFmt.format(r.createdAt)}
          </time>
        </div>
        <p className="mt-1 break-all font-mono text-[15px] font-semibold leading-snug">
          {r.valueRaw}
        </p>
        {note && (
          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
            {note}
          </p>
        )}
      </div>

      {r.evidenceUrls.length > 0 && (
        <div className="flex shrink-0 -space-x-2.5">
          {r.evidenceUrls.slice(0, 3).map((u) => (
            <div
              key={u}
              className="relative size-10 overflow-hidden rounded-md bg-muted ring-2 ring-card"
            >
              <Image
                src={u}
                alt="Ảnh bằng chứng"
                fill
                sizes="40px"
                className="object-cover"
              />
            </div>
          ))}
          {r.evidenceUrls.length > 3 && (
            <div className="grid size-10 place-items-center rounded-md bg-muted text-[0.7rem] font-semibold text-muted-foreground ring-2 ring-card">
              +{r.evidenceUrls.length - 3}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
