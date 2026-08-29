import { prisma } from "@/lib/prisma";
import { Ic } from "@/components/icon";
import {
  DestinationFilter,
  type DestItem,
  type ProvinceItem,
} from "@/components/site/destination-filter";
import { HeroLink } from "@/components/site/hero-link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Curtain, Rise } from "@/components/site/reveal";
import { Playfair_Display } from "next/font/google";
import { REGION_LABELS, regionOf } from "@/lib/regions";

// ISR: HTML của trang được dựng một lần rồi phục vụ từ cache; hết hạn thì Next
// dựng lại Ở NỀN (người truy cập lúc đó vẫn nhận bản cũ ngay, không ai phải
// chờ). Trang chạy 4 truy vấn mà nội dung chỉ đổi khi biên tập sửa, nên chạy
// lại chúng cho từng lượt xem là công vô ích.
//
// MỘT NGÀY, không phải vài phút. Con số này KHÔNG phải "bao lâu thì nội dung
// mới hiện" — mọi đường sửa nội dung đi qua CMS đều tự xoá cache ngay lập tức:
// `revalidatePublic()` ở `cms/places/actions.ts` và `revalidateListingPages()`
// ở bốn module listing. Nó chỉ là lưới an toàn cho những thay đổi KHÔNG đi qua
// CMS — chạy seed, sửa thẳng trong Prisma Studio, đổi dữ liệu bằng script. Với
// việc đó thì một ngày là đủ, mà đặt 5 phút thì mỗi ngày trang phải dựng lại
// gần 300 lần chẳng vì lý do gì.
export const revalidate = 86400;

export const metadata = {
  title: "Điểm đến · Halivivu",
  description: "Khám phá các điểm đến nổi bật và tỉnh thành khắp Việt Nam.",
};

const serif = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin", "vietnamese"],
  weight: ["400"],
  display: "swap",
});

const pub = { status: "published" as const };

const cover = {
  where: { isCover: true },
  take: 1,
  select: { url: true, isCover: true },
} as const;

export default async function DiemDenPage() {
  const [destinations, provinces, provinceCards, spotCount] =
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
        _count: {
          select: {
            spots: { where: pub },
            eateries: { where: pub },
            accommodations: { where: pub },
            activities: { where: pub },
          },
        },
      },
    }),
    prisma.place.findMany({
      where: { kind: "province", ...pub },
      orderBy: [{ name: "asc" }],
      select: {
        slug: true,
        name: true,
        isFeatured: true,
        treatAsDestination: true,
        _count: {
          select: {
            children: { where: pub },
            spots: { where: pub },
            activities: { where: pub },
            eateries: { where: pub },
            accommodations: { where: pub },
          },
        },
      },
    }),
    // Phần nặng của một tỉnh — ảnh bìa, tagline, tên các nơi bên trong — chỉ
    // cần cho tỉnh LÊN DẢI THẺ, mà số đó thường là 0–3 trong tổng 63. Gộp chung
    // vào truy vấn trên là kéo về 63 ảnh bìa và 126 lượt join lấy tên chỉ để
    // vứt đi gần hết.
    prisma.place.findMany({
      where: { kind: "province", treatAsDestination: true, ...pub },
      select: {
        slug: true,
        tagline: true,
        viewCount: true,
        images: cover,
        children: {
          where: pub,
          orderBy: [
            { isFeatured: "desc" },
            { popularity: "desc" },
            { name: "asc" },
          ],
          select: { name: true },
          take: 5,
        },
        spots: {
          where: pub,
          orderBy: [
            { isFeatured: "desc" },
            { popularity: "desc" },
            { name: "asc" },
          ],
          select: { name: true },
          take: 5,
        },
      },
    }),
    prisma.spot.count({ where: pub }),
  ]);

  const isEmpty = provinces.length === 0 && destinations.length === 0;

  const destItems: DestItem[] = destinations.map((d) => ({
    slug: d.slug,
    name: d.name,
    tagline: d.tagline,
    isFeatured: d.isFeatured,
    viewCount: d.viewCount,
    images: d.images,
    parentName: d.parent?.name ?? null,
    region: regionOf(d.parent?.slug),
    counts: {
      spot: d._count.spots,
      eatery: d._count.eateries,
      stay: d._count.accommodations,
      activity: d._count.activities,
    },
  }));
  const cardBySlug = new Map(provinceCards.map((p) => [p.slug, p] as const));

  const provinceItems: ProvinceItem[] = provinces.map((p) => {
    const c = p._count;
    const card = cardBySlug.get(p.slug);
    return {
      slug: p.slug,
      name: p.name,
      region: regionOf(p.slug),
      isFeatured: p.isFeatured,
      treatAsDestination: p.treatAsDestination,
      childCount: c.children,
      childNames: card
        ? [...card.children.map((k) => k.name), ...card.spots.map((k) => k.name)]
        : [],
      childTotal: c.children + c.spots,
      tagline: card?.tagline ?? null,
      viewCount: card?.viewCount ?? 0,
      images: card?.images ?? [],
      counts: {
        spot: c.spots,
        eatery: c.eateries,
        stay: c.accommodations,
        activity: c.activities,
      },
      hasContent:
        c.children +
          c.spots +
          c.activities +
          c.eateries +
          c.accommodations >
        0,
    };
  });
  const allRegions = REGION_LABELS.filter(
    (label) =>
      destItems.some((d) => d.region === label) ||
      provinceItems.some((p) => p.region === label),
  );

  return (
    <div className={cn("flex flex-1 flex-col", serif.variable)}>

      <main className="flex-1 overflow-x-clip">
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
          <>
            <section className="relative isolate overflow-hidden">
              <Image
                src="/du-lich-viet-nam-2020-1.jpg"
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover object-[50%_70%]"
              />
              <span
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(ellipse_84%_92%_at_50%_50%,rgba(8,22,15,0.5)_0%,rgba(8,22,15,0.4)_46%,rgba(8,22,15,0.2)_76%,rgba(8,22,15,0.05)_100%)]"
              />

              <div className="relative mx-auto flex min-h-[clamp(15rem,22vw,18.5rem)] max-w-7xl flex-col items-center justify-center px-4 py-12 text-center sm:px-6 lg:min-h-[clamp(19rem,26vw,22.5rem)] lg:pb-12 lg:pt-[7rem]">
                <Curtain>
                <h1
                  className={`font-[family-name:var(--font-serif)] text-[clamp(2.5rem,7.5vw,5.5rem)] font-normal uppercase leading-[1.15] tracking-[0.12em] text-white [text-shadow:0_2px_40px_rgba(0,0,0,0.62)] sm:tracking-[0.18em]`}
                >
                  Việt Nam
                </h1>
                </Curtain>
                <Rise delay={0.18} className="mt-5 sm:mt-6">
                <p className="max-w-[40rem] text-[clamp(1.0625rem,2vw,1.5rem)] font-normal leading-snug text-white/90 [text-shadow:0_2px_20px_rgba(0,0,0,0.72)]">
                  Mỗi vùng đất, một hành trình để nhớ.
                </p>
                </Rise>
                <Rise delay={0.32} className="mt-8 sm:mt-10">
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                  <HeroLink href="/dia-diem" label={`Xem ${spotCount} địa điểm`} />
                  <HeroLink href="/ban-do" label="Mở bản đồ du lịch" />
                </div>
                </Rise>
              </div>
            </section>

            <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pb-24">
              <DestinationFilter
                items={destItems}
                provinces={provinceItems}
                regions={allRegions}
              />
            </div>
          </>
        )}
      </main>

    </div>
  );
}

