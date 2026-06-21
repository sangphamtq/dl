import { MapPinned, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import {
  DestinationFilter,
  type DestItem,
  type ProvinceItem,
} from "@/components/site/destination-filter";
import { REGION_LABELS, regionOf } from "@/lib/regions";

export const metadata = {
  title: "Điểm đến · Hành Trình Việt",
  description: "Khám phá các điểm đến nổi bật và tỉnh thành khắp Việt Nam.",
};

const pub = { status: "published" as const };

const cover = {
  where: { isCover: true },
  take: 1,
  select: { url: true, isCover: true },
} as const;

export default async function DiemDenPage() {
  const [destinations, provinces, spotCount, eateryCount, activityCount] =
    await Promise.all([
      prisma.place.findMany({
        where: { kind: "destination", ...pub },
        orderBy: [{ isFeatured: "desc" }, { popularity: "desc" }, { name: "asc" }],
        select: {
          slug: true,
          name: true,
          tagline: true,
          isFeatured: true,
          viewCount: true,
          images: cover,
          parent: { select: { name: true, slug: true } },
        },
      }),
      prisma.place.findMany({
        where: { kind: "province", ...pub },
        orderBy: [{ name: "asc" }],
        select: {
          slug: true,
          name: true,
          isFeatured: true,
          _count: {
            select: {
              children: { where: pub },
              spots: { where: pub },
              activities: { where: pub },
              specialties: { where: pub },
              eateries: { where: pub },
              accommodations: { where: pub },
            },
          },
        },
      }),
      prisma.spot.count({ where: pub }),
      prisma.eatery.count({ where: pub }),
      prisma.activity.count({ where: pub }),
    ]);

  const isEmpty = provinces.length === 0 && destinations.length === 0;

  const stats = [
    { value: destinations.length, label: "điểm đến" },
    { value: provinces.length, label: "tỉnh thành" },
    spotCount > 0 && { value: spotCount, label: "địa điểm" },
    eateryCount + activityCount > 0 && {
      value: eateryCount + activityCount,
      label: "trải nghiệm",
    },
  ].filter(Boolean) as { value: number; label: string }[];

  const destItems: DestItem[] = destinations.map((d) => ({
    slug: d.slug,
    name: d.name,
    tagline: d.tagline,
    isFeatured: d.isFeatured,
    viewCount: d.viewCount,
    images: d.images,
    parentName: d.parent?.name ?? null,
    region: regionOf(d.parent?.slug),
  }));
  const provinceItems: ProvinceItem[] = provinces.map((p) => {
    const c = p._count;
    return {
      slug: p.slug,
      name: p.name,
      region: regionOf(p.slug),
      isFeatured: p.isFeatured,
      childCount: c.children,
      hasContent:
        c.children +
          c.spots +
          c.activities +
          c.specialties +
          c.eateries +
          c.accommodations >
        0,
    };
  });
  // Miền có điểm đến hoặc tỉnh (giữ thứ tự Bắc → Trung → Nam → Khác).
  const allRegions = REGION_LABELS.filter(
    (label) =>
      destItems.some((d) => d.region === label) ||
      provinceItems.some((p) => p.region === label),
  );

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero — typography, không ảnh: headline gradient + số liệu nổi */}
        <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-primary/[0.07] via-background to-background">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-28 size-[28rem] rounded-full bg-primary/10 blur-3xl"
          />
          <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <Sparkles className="size-3.5 text-primary" aria-hidden />
                Khám phá Việt Nam
              </span>
              <h1 className="mt-3 max-w-2xl text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                Khám phá điểm đến khắp Việt Nam
              </h1>
            </div>

            {!isEmpty && (
              <dl className="flex shrink-0 gap-8 lg:gap-10">
                {stats.map((s) => (
                  <div key={s.label}>
                    <dd className="text-3xl font-bold leading-none tracking-tight tabular-nums sm:text-4xl">
                      {s.value.toLocaleString("vi-VN")}
                    </dd>
                    <dt className="mt-2 whitespace-nowrap text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {s.label}
                    </dt>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>

        {isEmpty ? (
          <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6">
            <MapPinned
              className="mx-auto size-10 text-muted-foreground"
              aria-hidden
            />
            <p className="mt-4 text-muted-foreground">
              Chưa có điểm đến nào được xuất bản.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
            <DestinationFilter
              items={destItems}
              provinces={provinceItems}
              regions={allRegions}
            />
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}


