import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Ic } from "@/components/icon";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import {
  DestinationFilter,
  type DestItem,
  type ProvinceItem,
} from "@/components/site/destination-filter";
import { REGION_LABELS, regionOf } from "@/lib/regions";

export const metadata = {
  title: "Điểm đến · Halivivu",
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
    { icon: "compass", value: destinations.length, label: "điểm đến" },
    { icon: "map-pin", value: provinces.length, label: "tỉnh thành" },
    spotCount > 0 && { icon: "signpost", value: spotCount, label: "địa điểm" },
    eateryCount + activityCount > 0 && {
      icon: "sparkles",
      value: eateryCount + activityCount,
      label: "trải nghiệm",
    },
  ].filter(Boolean) as { icon: string; value: number; label: string }[];

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
        {/* Hero gọn — tiêu đề + thống kê inline (tiết kiệm diện tích) */}
        <section className="border-b border-border/60 bg-gradient-to-b from-accent/40 to-background">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-10">
            <div className="max-w-xl">
              <p className="flex items-center gap-2 font-script text-xl font-bold text-primary">
                <Ic icon="backpack" className="size-4" aria-hidden />
                Muôn nơi chờ bạn
              </p>
              <h1 className="mt-1 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
                Điểm đến khắp dải đất hình chữ S
              </h1>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                Chọn một nơi để bắt đầu — gợi ý nên ăn gì, chơi gì, ở đâu và đi
                lại thế nào cho từng vùng.
              </p>
              <Link
                href="/ban-do"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
              >
                <Ic icon="map-pin" className="size-4 text-primary" aria-hidden />
                Xem trên bản đồ
              </Link>
            </div>

            {!isEmpty && (
              <dl className="flex flex-wrap gap-x-6 gap-y-3 sm:shrink-0 sm:justify-end sm:gap-x-8">
                {stats.map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <Ic
                      icon={s.icon}
                      className="size-5 shrink-0 text-primary"
                      aria-hidden
                    />
                    <div>
                      <dd className="text-xl font-bold leading-none tracking-tight tabular-nums">
                        {s.value.toLocaleString("vi-VN")}
                      </dd>
                      <dt className="mt-0.5 text-xs text-muted-foreground">
                        {s.label}
                      </dt>
                    </div>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>

        {isEmpty ? (
          <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6">
            <Ic
              icon="map-pin"
              className="mx-auto size-12 text-muted-foreground"
              aria-hidden
            />
            <p className="mt-4 text-muted-foreground">
              Chưa có điểm đến nào được xuất bản.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-10">
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


