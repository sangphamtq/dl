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

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {!verified && (
          <p className="mb-4 rounded-xl border border-warm/30 bg-warm/5 px-4 py-2 text-sm text-warm">
            Bản xem trước (chưa duyệt) — chỉ staff thấy.
          </p>
        )}

        {/* Hồ sơ */}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-muted">
            {avatar && (
              <Image
                src={avatar}
                alt={p.displayName}
                fill
                sizes="80px"
                className="object-cover"
              />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {p.displayName}
              </h1>
              {verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  <BadgeCheck className="size-3.5" />
                  Đã xác minh
                  {p.verificationLevel && SALE_LEVEL_LABELS[p.verificationLevel]
                    ? ` · ${SALE_LEVEL_LABELS[p.verificationLevel]}`
                    : ""}
                </span>
              )}
            </div>
            {p.areas.length > 0 && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5" />
                {p.areas.map((a) => a.name).join(", ")}
              </p>
            )}
          </div>
          {verified && (
            <StayShare title={p.displayName} className="sm:ml-auto" />
          )}
        </div>

        {p.bio && (
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            {p.bio}
          </p>
        )}

        {p.services.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {p.services.map((s) => (
              <span
                key={s}
                className="rounded-full bg-muted px-3 py-1 text-sm text-foreground"
              >
                {saleServiceLabel(s)}
              </span>
            ))}
          </div>
        )}

        {/* Liên hệ */}
        {contacts.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {contacts.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 transition-colors hover:bg-muted"
              >
                <c.icon className="size-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="truncate text-sm font-medium">{c.text}</p>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Cảnh báo an toàn */}
        <div className="mt-6 flex items-start gap-2.5 rounded-2xl bg-muted/60 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            {p.notice ??
              "Chỉ liên hệ & chuyển khoản qua đúng kênh hiển thị tại đây. Luôn đối chiếu thông tin trước khi đặt cọc."}
          </span>
        </div>

        {/* Tin rao dịch vụ */}
        {threads.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-bold tracking-tight">Tin rao dịch vụ</h2>
            <div className="mt-4 space-y-3">
              {threads.map((t) => (
                <Link
                  key={t.slug}
                  href={`/cong-dong/${t.slug}`}
                  className="block rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:bg-muted/40"
                >
                  <p className="text-sm leading-relaxed">
                    {textPreview(t.body)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t.place ? `${t.place.name} · ` : ""}
                    {t.replyCount} phản hồi
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
