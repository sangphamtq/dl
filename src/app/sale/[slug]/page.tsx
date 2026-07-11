import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Globe,
  Link2,
  MapPin,
  MessageCircle,
  Phone,
  ShieldAlert,
  ArrowLeft,
  MessagesSquare,
} from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { isStaffViewer } from "@/lib/preview";
import { saleServiceLabel, SALE_LEVEL_LABELS } from "@/lib/sale";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { StayShare } from "@/components/site/stay-share";

// Zalo có thể là SĐT hoặc link — chuẩn hoá thành URL chat zalo.me.
function zaloHref(v: string): string {
  if (/^https?:\/\//i.test(v)) return v;
  const digits = v.replace(/[^\d]/g, "");
  return digits ? `https://zalo.me/${digits}` : v;
}

const textPreview = (html: string, n = 200) => {
  const t = html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await prisma.saleProfile.findUnique({
    where: { slug },
    select: { displayName: true, bio: true, status: true },
  });
  if (!p || p.status !== "approved") return {};
  return { title: `${p.displayName} · CTV du lịch`, description: p.bio ?? undefined };
}

export default async function SaleProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const staff = await isStaffViewer();

  const p = await prisma.saleProfile.findUnique({
    where: { slug },
    select: {
      userId: true,
      displayName: true,
      bio: true,
      services: true,
      zalo: true,
      phone: true,
      facebookUrl: true,
      website: true,
      avatarUrl: true,
      notice: true,
      status: true,
      verifiedAt: true,
      verificationLevel: true,
      user: { select: { image: true } },
      areas: { select: { slug: true, name: true } },
    },
  });

  if (!p || (p.status !== "approved" && !staff)) notFound();

  const threads = await prisma.thread.findMany({
    where: { authorId: p.userId, type: "sale", isHidden: false },
    orderBy: [{ lastActivityAt: "desc" }],
    take: 20,
    select: {
      slug: true,
      body: true,
      replyCount: true,
      createdAt: true,
      place: { select: { name: true } },
    },
  });

  const avatar = p.avatarUrl ?? p.user.image;
  const verified = p.status === "approved";
  const contacts = [
    p.zalo && {
      icon: MessageCircle,
      label: "Zalo",
      href: zaloHref(p.zalo),
      text: p.zalo,
    },
    p.phone && {
      icon: Phone,
      label: "Điện thoại",
      href: `tel:${p.phone.replace(/\s/g, "")}`,
      text: p.phone,
    },
    p.facebookUrl && {
      icon: Link2,
      label: "Facebook",
      href: p.facebookUrl,
      text: "Trang Facebook",
    },
    p.website && { icon: Globe, label: "Website", href: p.website, text: p.website },
  ].filter(Boolean) as {
    icon: React.ElementType;
    label: string;
    href: string;
    text: string;
  }[];

  const notice =
    p.notice ??
    "Chỉ liên hệ & chuyển khoản qua đúng kênh hiển thị tại đây. Luôn đối chiếu thông tin trước khi đặt cọc.";

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/sale"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Cộng tác viên
        </Link>

        {!verified && (
          <p className="mt-4 rounded-xl border border-warm/30 bg-warm/5 px-4 py-2 text-sm text-warm">
            Bản xem trước (chưa duyệt) — chỉ staff thấy.
          </p>
        )}

        {/* ─── Hero hồ sơ ─────────────────────────────────── */}
        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative shrink-0 self-start sm:self-auto">
            <div className="relative size-24 overflow-hidden rounded-3xl bg-muted">
              {avatar ? (
                <Image
                  src={avatar}
                  alt={p.displayName}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                <span className="grid size-full place-items-center text-3xl font-bold text-muted-foreground">
                  {p.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {verified && (
              <span className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground ring-4 ring-background">
                <BadgeCheck className="size-5" aria-hidden />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {p.displayName}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {verified && (
                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                  <BadgeCheck className="size-4" aria-hidden />
                  Đã xác minh
                  {p.verificationLevel && SALE_LEVEL_LABELS[p.verificationLevel]
                    ? ` · ${SALE_LEVEL_LABELS[p.verificationLevel]}`
                    : ""}
                </span>
              )}
              {p.areas.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  {p.areas.map((a) => a.name).join(", ")}
                </span>
              )}
            </div>
            {p.services.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.services.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground"
                  >
                    {saleServiceLabel(s)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {verified && (
            <StayShare title={p.displayName} className="self-start sm:self-auto" />
          )}
        </div>

        {/* ─── 2 cột: nội dung | liên hệ ──────────────────── */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
          {/* Sidebar liên hệ (mobile hiện trước) */}
          <aside className="space-y-4 lg:order-2 lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm shadow-black/5">
              <h2 className="font-bold tracking-tight">Liên hệ trực tiếp</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Kênh chính chủ đã xác minh
              </p>
              {contacts.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {contacts.map((c) => (
                    <a
                      key={c.label}
                      href={c.href}
                      target={c.href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-border/60 px-3.5 py-2.5 transition-colors hover:border-primary/40 hover:bg-muted/50"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <c.icon className="size-5" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs text-muted-foreground">
                          {c.label}
                        </span>
                        <span className="block truncate text-sm font-medium">
                          {c.text}
                        </span>
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Chưa công khai kênh liên hệ.
                </p>
              )}
            </div>

            {/* Cảnh báo an toàn */}
            <div className="rounded-2xl border border-warm/30 bg-warm/5 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-warm">
                <ShieldAlert className="size-4 shrink-0" aria-hidden />
                An toàn giao dịch
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {notice}
              </p>
            </div>
          </aside>

          {/* Nội dung chính */}
          <div className="min-w-0 space-y-10 lg:order-1">
            {p.bio && (
              <section>
                <h2 className="text-lg font-bold tracking-tight">Giới thiệu</h2>
                <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">
                  {p.bio}
                </p>
              </section>
            )}

            {threads.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                  Tin rao dịch vụ
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                    {threads.length}
                  </span>
                </h2>
                <div className="mt-4 space-y-3">
                  {threads.map((t) => (
                    <Link
                      key={t.slug}
                      href={`/cong-dong/${t.slug}`}
                      className="group block rounded-2xl border border-border/60 bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/5"
                    >
                      <p className="text-sm leading-relaxed text-foreground/90">
                        {textPreview(t.body)}
                      </p>
                      <p className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        {t.place && (
                          <>
                            <MapPin className="size-3 shrink-0" aria-hidden />
                            {t.place.name}
                            <span aria-hidden>·</span>
                          </>
                        )}
                        <MessagesSquare className="size-3 shrink-0" aria-hidden />
                        {t.replyCount} phản hồi
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {!p.bio && threads.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Cộng tác viên chưa cập nhật giới thiệu hay tin rao nào.
              </p>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
