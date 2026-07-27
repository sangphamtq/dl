import { prisma } from "@/lib/prisma";
import { Ic } from "@/components/icon";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import {
  DestinationFilter,
  type DestItem,
  type ProvinceItem,
} from "@/components/site/destination-filter";
import {
  PlaceIndexHero,
  type HeroDest,
} from "@/components/site/place-index-hero";
import { coverUrl } from "@/lib/place-image";
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

  // Điểm đến nổi bật (đã sắp featured → popular): [0] làm ảnh nền hero điện ảnh,
  // các mục sau làm chip gợi ý.
  const heroDests: HeroDest[] = destinations.slice(0, 5).map((d, i) => ({
    slug: d.slug,
    name: d.name,
    parentName: d.parent?.name ?? null,
    url: coverUrl(d.images, d.slug, i === 0 ? 1920 : 640, i === 0 ? 1080 : 640),
  }));

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
        <PlaceIndexHero dests={heroDests} stats={isEmpty ? [] : stats} />

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


