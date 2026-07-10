import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, MapPin, UserPlus } from "@/components/icons";
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

  // Các khu vực có CTV đã duyệt (để dựng bộ lọc).
  const areaPlaces = await prisma.place.findMany({
    where: { saleProfiles: { some: { status: "approved" } } },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    select: { slug: true, name: true },
  });
  const area = sp.area && areaPlaces.some((a) => a.slug === sp.area) ? sp.area : null;

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
      user: { select: { image: true } },
      areas: { select: { name: true } },
    },
  });

  const buildHref = (patch: { service?: string | null; area?: string | null }) => {
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
        {/* Header */}
        <section className="bg-sky-50/60">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-10">
            <div className="max-w-xl">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Cộng tác viên đã xác minh
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Người bán tour, phòng, vé… đã được kiểm chứng uy tín — liên hệ
                trực tiếp, tránh page nhái & lừa cọc.
              </p>
            </div>
            <Link
              href="/sale/dang-ky"
              className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
            >
              <UserPlus className="size-4" />
              Đăng ký làm CTV
            </Link>
          </div>
        </section>

        <div className="mx-auto max-w-6xl space-y-3 px-4 py-8 sm:px-6">
          {/* Lọc theo dịch vụ */}
          <div className="flex flex-wrap gap-2">
            <FilterChip
              href={buildHref({ service: null })}
              active={!service}
              label="Mọi dịch vụ"
            />
            {SALE_SERVICES.map((s) => (
              <FilterChip
                key={s.value}
                href={buildHref({ service: s.value })}
                active={service === s.value}
                label={s.label}
              />
            ))}
          </div>

          {/* Lọc theo khu vực */}
          {areaPlaces.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <FilterChip
                href={buildHref({ area: null })}
                active={!area}
                label="Mọi khu vực"
              />
              {areaPlaces.map((a) => (
                <FilterChip
                  key={a.slug}
                  href={buildHref({ area: a.slug })}
                  active={area === a.slug}
                  label={a.name}
                />
              ))}
            </div>
          )}

          {profiles.length === 0 ? (
            <p className="pt-6 text-sm text-muted-foreground">
              Chưa có cộng tác viên nào phù hợp bộ lọc.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-3">
              {profiles.map((p) => {
                const avatar = p.avatarUrl ?? p.user.image;
                return (
                  <Link
                    key={p.slug}
                    href={`/sale/${p.slug}`}
                    className="group flex flex-col rounded-2xl border border-border/60 bg-card p-4 transition-all hover:shadow-lg hover:shadow-black/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-muted">
                        {avatar && (
                          <Image
                            src={avatar}
                            alt={p.displayName}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="truncate font-semibold tracking-tight">
                            {p.displayName}
                          </h3>
                          <BadgeCheck className="size-4 shrink-0 text-primary" />
                        </div>
                        {p.areas.length > 0 && (
                          <p className="mt-0.5 inline-flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <MapPin className="size-3 shrink-0" />
                            {p.areas.map((a) => a.name).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>

                    {p.bio && (
                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {p.bio}
                      </p>
                    )}

                    {p.services.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {p.services.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-muted px-2.5 py-0.5 text-xs"
                          >
                            {saleServiceLabel(s)}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
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
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary/10 font-medium text-primary"
          : "border-border/60 text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </Link>
  );
}
