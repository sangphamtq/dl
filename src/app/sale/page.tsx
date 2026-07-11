import Link from "next/link";
import Image from "next/image";
import {
  BadgeCheck,
  MapPin,
  UserPlus,
  Phone,
  MessageCircle,
  MessageSquare,
  Globe,
  ArrowRight,
} from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { SALE_SERVICES, saleServiceLabel, isSaleService } from "@/lib/sale";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata = {
  title: "Cộng tác viên du lịch đã xác minh · Halivivu",
  description:
    "Danh bạ cộng tác viên bán tour, phòng, vé… đã được xác minh uy tín.",
};

type SearchParams = { service?: string; area?: string };

export default async function SaleDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const service = sp.service && isSaleService(sp.service) ? sp.service : null;

  const [areaPlaces, totalCount] = await Promise.all([
    prisma.place.findMany({
      where: { saleProfiles: { some: { status: "approved" } } },
      orderBy: [{ kind: "asc" }, { name: "asc" }],
      select: { slug: true, name: true },
    }),
    prisma.saleProfile.count({ where: { status: "approved" } }),
  ]);
  const area =
    sp.area && areaPlaces.some((a) => a.slug === sp.area) ? sp.area : null;

  const profiles = await prisma.saleProfile.findMany({
    where: {
      status: "approved",
      ...(service ? { services: { has: service } } : {}),
      ...(area ? { areas: { some: { slug: area } } } : {}),
    },
    orderBy: [{ verifiedAt: "desc" }],
    select: {
      slug: true,
      displayName: true,
      bio: true,
      services: true,
      avatarUrl: true,
      zalo: true,
      phone: true,
      facebookUrl: true,
      website: true,
      user: { select: { image: true } },
      areas: { select: { name: true } },
    },
  });

  const buildHref = (patch: {
    service?: string | null;
    area?: string | null;
  }) => {
    const s = patch.service !== undefined ? patch.service : service;
    const a = patch.area !== undefined ? patch.area : area;
    const params = new URLSearchParams();
    if (s) params.set("service", s);
    if (a) params.set("area", a);
    const qs = params.toString();
    return `/sale${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* ─── Header ──────────────────────────────────────── */}
        <section className="border-b border-border/60 bg-gradient-to-b from-accent/40 to-background">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <BadgeCheck className="size-5" aria-hidden />
              Danh bạ đã xác minh
            </p>
            <div className="mt-2 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Cộng tác viên du lịch
                </h1>
                <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
                  Người bán tour, phòng, vé… đã được kiểm chứng uy tín — liên hệ
                  trực tiếp, tránh page nhái &amp; lừa cọc.
                </p>
                {totalCount > 0 && (
                  <p className="mt-5 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold tabular-nums tracking-tight text-primary">
                      {totalCount.toLocaleString("vi-VN")}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      cộng tác viên đã xác minh
                    </span>
                  </p>
                )}
              </div>
              <Link
                href="/sale/dang-ky"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "shrink-0 rounded-full",
                )}
              >
                <UserPlus className="size-4" aria-hidden />
                Đăng ký làm CTV
              </Link>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          {/* ─── Bộ lọc ────────────────────────────────────── */}
          <div className="space-y-4">
            <FilterRow label="Dịch vụ">
              <FilterChip
                href={buildHref({ service: null })}
                active={!service}
                label="Tất cả"
              />
              {SALE_SERVICES.map((s) => (
                <FilterChip
                  key={s.value}
                  href={buildHref({ service: s.value })}
                  active={service === s.value}
                  label={s.label}
                />
              ))}
            </FilterRow>

            {areaPlaces.length > 0 && (
              <FilterRow label="Khu vực">
                <FilterChip
                  href={buildHref({ area: null })}
                  active={!area}
                  label="Toàn quốc"
                />
                {areaPlaces.map((a) => (
                  <FilterChip
                    key={a.slug}
                    href={buildHref({ area: a.slug })}
                    active={area === a.slug}
                    label={a.name}
                  />
                ))}
              </FilterRow>
            )}
          </div>

          {/* ─── Danh sách ─────────────────────────────────── */}
          {profiles.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-border/70 px-6 py-16 text-center">
              <BadgeCheck
                className="mx-auto size-9 text-muted-foreground/50"
                aria-hidden
              />
              <p className="mt-3 font-medium">Chưa có cộng tác viên phù hợp</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Thử bỏ bớt bộ lọc, hoặc quay lại sau.
              </p>
            </div>
          ) : (
            <>
              <p className="mt-8 text-sm text-muted-foreground">
                <span className="font-semibold tabular-nums text-foreground">
                  {profiles.length}
                </span>{" "}
                kết quả
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {profiles.map((p) => (
                  <ProfileCard key={p.slug} p={p} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────── */

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
      <span className="shrink-0 pt-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:w-20">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm transition-colors",
        active
          ? "bg-primary font-medium text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

type ProfileData = {
  slug: string;
  displayName: string;
  bio: string | null;
  services: string[];
  avatarUrl: string | null;
  zalo: string | null;
  phone: string | null;
  facebookUrl: string | null;
  website: string | null;
  user: { image: string | null };
  areas: { name: string }[];
};

function ProfileCard({ p }: { p: ProfileData }) {
  const avatar = p.avatarUrl ?? p.user.image;
  const channels = [
    p.zalo && { icon: MessageCircle, label: "Zalo" },
    p.phone && { icon: Phone, label: "Điện thoại" },
    p.facebookUrl && { icon: MessageSquare, label: "Facebook" },
    p.website && { icon: Globe, label: "Website" },
  ].filter(Boolean) as { icon: typeof Phone; label: string }[];

  return (
    <Link
      href={`/sale/${p.slug}`}
      className="group flex gap-4 rounded-2xl border border-border/60 bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-black/5 sm:gap-5 sm:p-5"
    >
      {/* Avatar vuông bo góc */}
      <div className="relative size-16 shrink-0 self-start overflow-hidden rounded-2xl bg-muted sm:size-[4.75rem]">
        {avatar ? (
          <Image
            src={avatar}
            alt={p.displayName}
            fill
            sizes="76px"
            className="object-cover"
          />
        ) : (
          <span className="grid size-full place-items-center text-2xl font-bold text-muted-foreground">
            {p.displayName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Nội dung */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-bold tracking-tight transition-colors group-hover:text-primary">
              {p.displayName}
            </h3>
            {p.areas.length > 0 && (
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" aria-hidden />
                <span className="truncate">
                  {p.areas.map((a) => a.name).join(", ")}
                </span>
              </p>
            )}
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[0.7rem] font-semibold text-primary">
            <BadgeCheck className="size-3.5" aria-hidden />
            Đã xác minh
          </span>
        </div>

        {p.bio && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {p.bio}
          </p>
        )}

        {p.services.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.services.slice(0, 3).map((s) => (
              <span
                key={s}
                className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground"
              >
                {saleServiceLabel(s)}
              </span>
            ))}
            {p.services.length > 3 && (
              <span className="py-0.5 text-xs text-muted-foreground">
                +{p.services.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
          {channels.length > 0 ? (
            <div className="flex items-center gap-2.5 text-muted-foreground">
              {channels.map((c) => (
                <span key={c.label} title={c.label}>
                  <c.icon className="size-4" aria-hidden />
                  <span className="sr-only">{c.label}</span>
                </span>
              ))}
            </div>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
            Xem hồ sơ
            <ArrowRight
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </div>
      </div>
    </Link>
  );
}
