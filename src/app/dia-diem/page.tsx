import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Ic } from "@/components/icon";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SPOT_CATEGORY_LABELS } from "@/lib/listing-labels";
import { SpotFilter, type SpotItem } from "@/components/site/spot-filter";

export const metadata = {
  title: "Địa điểm · Halivivu",
  description:
    "Duyệt mọi địa điểm tham quan trên khắp Việt Nam theo loại hình — biển, núi, thác, hang động, đền chùa…",
};

const pub = { status: "published" as const };

// Danh sách địa điểm (Spot) toàn quốc — lối duyệt theo CHỦ ĐỀ, cắt ngang tỉnh,
// bổ sung cho /diem-den (duyệt theo địa lý). Chi tiết tại /dia-diem/[slug].
export default async function DiaDiemPage() {
  const spots = await prisma.spot.findMany({
    where: pub,
    orderBy: [{ isFeatured: "desc" }, { popularity: "desc" }, { name: "asc" }],
    select: {
      slug: true,
      name: true,
      tagline: true,
      category: true,
      isFeatured: true,
      popularity: true,
      tags: true,
      images: {
        where: { isCover: true },
        take: 1,
        select: { url: true, isCover: true },
      },
      place: { select: { name: true } },
    },
  });

  const items: SpotItem[] = spots.map((s) => ({
    slug: s.slug,
    name: s.name,
    tagline: s.tagline,
    categoryValue: s.category,
    categoryLabel: s.category
      ? (SPOT_CATEGORY_LABELS[s.category] ?? s.category)
      : null,
    placeName: s.place?.name ?? null,
    isFeatured: s.isFeatured,
    popularity: s.popularity,
    tags: s.tags,
    images: s.images,
  }));

  // Loại hình có mặt + số lượng (cho chip lọc), nhiều → ít.
  const catCount = new Map<string, number>();
  for (const s of spots)
    if (s.category) catCount.set(s.category, (catCount.get(s.category) ?? 0) + 1);
  const categories = [...catCount.entries()]
    .map(([value, count]) => ({
      value,
      label: SPOT_CATEGORY_LABELS[value] ?? value,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "vi"));

  const isEmpty = items.length === 0;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-border/60 bg-gradient-to-b from-accent/40 to-background">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-10">
            <div className="max-w-xl">
              <p className="flex items-center gap-2 font-script text-xl font-bold text-primary">
                <Ic icon="mountain" className="size-4" aria-hidden />
                Đi khắp muôn nơi
              </p>
              <h1 className="mt-1 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
                Địa điểm tham quan
              </h1>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                Mọi điểm đáng ghé trên khắp Việt Nam — lọc theo loại hình, tìm
                theo tên hoặc nơi chốn.
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
                <Stat icon="map-pin" value={items.length} label="địa điểm" />
                <Stat icon="layers" value={categories.length} label="loại hình" />
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
              Chưa có địa điểm nào được xuất bản.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-10">
            <SpotFilter items={items} categories={categories} />
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: string;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Ic icon={icon} className="size-5 shrink-0 text-primary" aria-hidden />
      <div>
        <dd className="text-xl font-bold leading-none tracking-tight tabular-nums">
          {value.toLocaleString("vi-VN")}
        </dd>
        <dt className="mt-0.5 text-xs text-muted-foreground">{label}</dt>
      </div>
    </div>
  );
}
