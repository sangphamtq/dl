import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { coverUrl } from "@/lib/place-image";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { CrossLinkCard } from "@/components/site/cross-link-card";
import { PlaceHero } from "@/components/site/place-hero";
import { PlaceTabs } from "@/components/site/place-tabs";
import { type HeroImage } from "@/components/site/place-hero-stack";
import {
  getPlaceHeader,
  getPlaceCounts,
  buildPlaceTabs,
  buildPlaceStats,
} from "@/lib/place-meta";

// Map token [loai] → model + tiêu đề + tiền tố URL chi tiết.
const LOAI = {
  "hoat-dong": { title: "Hoạt động & trải nghiệm", model: "activity" },
  "dia-diem": { title: "Địa điểm tham quan", model: "spot" },
  "dac-san": { title: "Đặc sản", model: "specialty" },
  "quan-an": { title: "Quán ăn", model: "eatery" },
  "luu-tru": { title: "Nơi lưu trú", model: "accommodation" },
} as const;

type Loai = keyof typeof LOAI;

type ListingItem = {
  slug: string;
  name: string;
  description: string | null;
  images: { url: string; isCover: boolean }[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ placeSlug: string; loai: string }>;
}) {
  const { placeSlug, loai } = await params;
  const cfg = LOAI[loai as Loai];
  if (!cfg) return {};
  const place = await prisma.place.findUnique({
    where: { slug: placeSlug },
    select: { name: true },
  });
  if (!place) return {};
  return { title: `${cfg.title} ở ${place.name}` };
}

export default async function PlaceListingPage({
  params,
}: {
  params: Promise<{ placeSlug: string; loai: string }>;
}) {
  const { placeSlug, loai } = await params;
  const cfg = LOAI[loai as Loai];
  if (!cfg) notFound();

  const place = await getPlaceHeader(placeSlug);
  if (!place || place.status !== "published") notFound();

  const counts = await getPlaceCounts(place.id);
  const stats = buildPlaceStats(place.viewCount, counts);
  const tabs = buildPlaceTabs(place.slug, counts);

  const heroImages: HeroImage[] = place.images.map((i) => ({
    url: i.url,
    alt: i.alt,
    caption: i.caption,
  }));
  if (heroImages.length === 0) {
    heroImages.push({ url: coverUrl([], place.slug, 1600, 1000), alt: place.name });
  }

  // Truy vấn động theo model (tên trùng key model).
  const delegate = prisma[cfg.model] as unknown as {
    findMany: (args: unknown) => Promise<ListingItem[]>;
  };
  const items = await delegate.findMany({
    where: { placeId: place.id, status: "published" },
    orderBy: [
      { isFeatured: "desc" },
      { order: "asc" },
      { popularity: "desc" },
      { name: "asc" },
    ],
    select: {
      slug: true,
      name: true,
      description: true,
      images: {
        where: { isCover: true },
        take: 1,
        select: { url: true, isCover: true },
      },
    },
  });

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <PlaceHero place={place} heroImages={heroImages} stats={stats} />

        {/* Thanh tab: Tổng quan + xem tất cả từng listing */}
        <PlaceTabs items={tabs} />

        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {cfg.title}
            </h2>
            <p className="shrink-0 text-sm text-muted-foreground">
              {items.length} mục
            </p>
          </div>

          {items.length > 0 ? (
            <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((it) => (
                <CrossLinkCard
                  key={it.slug}
                  href={`/${loai}/${it.slug}`}
                  name={it.name}
                  slug={it.slug}
                  images={it.images}
                  subtitle={it.description}
                />
              ))}
            </div>
          ) : (
            <p className="py-16 text-center text-muted-foreground">
              Chưa có nội dung trong mục này.
            </p>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
