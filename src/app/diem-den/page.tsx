import Link from "next/link";
import { MapPinned, Star, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import {
  DestinationFilter,
  type DestItem,
} from "@/components/site/destination-filter";

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

// Nhóm 63 tỉnh theo miền (để danh sách có cấu trúc, gọn). slug theo seed.
const REGIONS = [
  {
    label: "Miền Bắc",
    slugs: [
      "ha-noi", "hai-phong", "bac-giang", "bac-kan", "bac-ninh", "cao-bang",
      "dien-bien", "ha-giang", "ha-nam", "hai-duong", "hoa-binh", "hung-yen",
      "lai-chau", "lang-son", "lao-cai", "nam-dinh", "ninh-binh", "phu-tho",
      "quang-ninh", "son-la", "thai-binh", "thai-nguyen", "tuyen-quang",
      "vinh-phuc", "yen-bai",
    ],
  },
  {
    label: "Miền Trung & Tây Nguyên",
    slugs: [
      "thanh-hoa", "nghe-an", "ha-tinh", "quang-binh", "quang-tri",
      "thua-thien-hue", "da-nang", "quang-nam", "quang-ngai", "binh-dinh",
      "phu-yen", "khanh-hoa", "ninh-thuan", "binh-thuan", "kon-tum", "gia-lai",
      "dak-lak", "dak-nong", "lam-dong",
    ],
  },
  {
    label: "Miền Nam",
    slugs: [
      "ho-chi-minh", "ba-ria-vung-tau", "binh-duong", "binh-phuoc", "dong-nai",
      "tay-ninh", "an-giang", "bac-lieu", "ben-tre", "ca-mau", "can-tho",
      "dong-thap", "hau-giang", "kien-giang", "long-an", "soc-trang",
      "tien-giang", "tra-vinh", "vinh-long",
    ],
  },
] as const;

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

  // Tính miền cho từng điểm đến (suy từ tỉnh cha) → dữ liệu cho filter client.
  const regionOf = (slug?: string | null): string => {
    if (!slug) return "Khác";
    const r = REGIONS.find((x) => (x.slugs as readonly string[]).includes(slug));
    return r ? r.label : "Khác";
  };
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
  const destRegions = [...REGIONS.map((r) => r.label), "Khác"].filter((label) =>
    destItems.some((d) => d.region === label),
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
          <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
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
          <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
            <MapPinned
              className="mx-auto size-10 text-muted-foreground"
              aria-hidden
            />
            <p className="mt-4 text-muted-foreground">
              Chưa có điểm đến nào được xuất bản.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-6xl space-y-16 px-4 py-12 sm:px-6 sm:py-16">
            {/* Điểm đến — gộp chung + filter chọn miền (H1 ở header đã giới thiệu) */}
            {destItems.length > 0 && (
              <section>
                <DestinationFilter items={destItems} regions={destRegions} />
              </section>
            )}

            {/* Tỉnh */}
            {provinces.length > 0 && (
              <section>
                <SectionHead
                  title="Khám phá theo tỉnh"
                  subtitle="Coi mỗi tỉnh như một điểm đến cực lớn."
                />
                <div className="mt-6 space-y-6">
                  {REGIONS.map((r) => {
                    const list = provinces.filter((p) =>
                      r.slugs.includes(p.slug as never),
                    );
                    if (list.length === 0) return null;
                    return (
                      <div key={r.label}>
                        <h3 className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold text-primary">
                            {r.label}
                          </span>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {list.length} tỉnh
                          </span>
                        </h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {list.map((p) => {
                            const c = p._count;
                            const hasContent =
                              c.children +
                                c.spots +
                                c.activities +
                                c.specialties +
                                c.eateries +
                                c.accommodations >
                              0;
                            if (!hasContent) {
                              return (
                                <span
                                  key={p.slug}
                                  aria-disabled="true"
                                  title="Đang cập nhật"
                                  className="inline-flex cursor-not-allowed items-center rounded-full border border-dashed border-border/50 px-3 py-1.5 text-sm text-muted-foreground/50"
                                >
                                  {p.name}
                                </span>
                              );
                            }
                            return (
                              <Link
                                key={p.slug}
                                href={`/diem-den/${p.slug}`}
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
                                  p.isFeatured && "font-medium",
                                )}
                              >
                                {p.isFeatured && (
                                  <Star
                                    className="size-3.5 text-warm/80"
                                    aria-hidden
                                  />
                                )}
                                {p.name}
                                {c.children >= 2 && (
                                  <span
                                    title={`${c.children} điểm đến`}
                                    aria-label={`${c.children} điểm đến`}
                                    className="grid h-4 min-w-4 place-items-center rounded-full bg-primary/10 px-1 text-[10px] font-semibold tabular-nums text-primary"
                                  >
                                    {c.children}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function SectionHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      <p className="text-muted-foreground">{subtitle}</p>
    </div>
  );
}

