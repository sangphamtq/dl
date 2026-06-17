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

// Map token [loai] đơn loại → model + tiêu đề + tiền tố URL chi tiết.
const LOAI = {
  "hoat-dong": { title: "Hoạt động & trải nghiệm", model: "activity" },
  "dia-diem": { title: "Địa điểm tham quan", model: "spot" },
  "dac-san": { title: "Đặc sản", model: "specialty" },
  "quan-an": { title: "Quán ăn", model: "eatery" },
  "luu-tru": { title: "Nơi lưu trú", model: "accommodation" },
} as const;

type Loai = keyof typeof LOAI;

// am-thuc = tab gộp: hiển thị Đặc sản + Quán ăn trên cùng một trang.
const AM_THUC = "am-thuc";

type ListingItem = {
  slug: string;
  name: string;
  description: string | null;
  images: { url: string; isCover: boolean }[];
};

type ListingModel = (typeof LOAI)[Loai]["model"];

// Truy vấn danh sách đã xuất bản của một model (tên trùng key delegate Prisma).
function fetchListing(model: ListingModel, placeId: string) {
  const delegate = prisma[model] as unknown as {
    findMany: (args: unknown) => Promise<ListingItem[]>;
  };
  return delegate.findMany({
    where: { placeId, status: "published" },
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
}

function pageTitle(loai: string): string | null {
  if (loai === AM_THUC) return "Ẩm thực";
  return LOAI[loai as Loai]?.title ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ placeSlug: string; loai: string }>;
}) {
  const { placeSlug, loai } = await params;
  const title = pageTitle(loai);
  if (!title) return {};
  const place = await prisma.place.findUnique({
    where: { slug: placeSlug },
    select: { name: true },
  });
  if (!place) return {};
  return { title: `${title} ở ${place.name}` };
}

export default async function PlaceListingPage({
  params,
}: {
  params: Promise<{ placeSlug: string; loai: string }>;
}) {
  const { placeSlug, loai } = await params;
  const isFood = loai === AM_THUC;
  const cfg = LOAI[loai as Loai];
  if (!isFood && !cfg) notFound();

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

  // Mỗi nhóm hiển thị: tiêu đề + danh sách (link chi tiết theo tiền tố riêng).
  const groups = isFood
    ? [
        { title: "Đặc sản", prefix: "dac-san", items: await fetchListing("specialty", place.id) },
        { title: "Quán ăn", prefix: "quan-an", items: await fetchListing("eatery", place.id) },
      ]
    : [
        {
          title: cfg.title,
          prefix: loai,
          items: await fetchListing(cfg.model, place.id),
        },
      ];

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <PlaceHero place={place} heroImages={heroImages} stats={stats} />

        {/* Thanh tab: Tổng quan + xem tất cả từng listing */}
        <PlaceTabs items={tabs} />

        <div className="mx-auto max-w-6xl space-y-16 px-4 py-14 sm:px-6 sm:py-20">
          {groups.map((g) => (
            <section key={g.prefix}>
              <div className="flex items-end justify-between gap-4">
                <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  {g.title}
                </h2>
                <p className="shrink-0 text-sm text-muted-foreground">
                  {g.items.length} mục
                </p>
              </div>

              {g.items.length > 0 ? (
                <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {g.items.map((it) => (
                    <CrossLinkCard
                      key={it.slug}
                      href={`/${g.prefix}/${it.slug}`}
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
            </section>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
