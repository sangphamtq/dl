import { Eye, type LucideIcon } from "@/components/icons";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { summarizeReviews } from "@/lib/review-meta";
import { coverUrl } from "@/lib/place-image";
import { getTikTokInfo } from "@/lib/tiktok";
import { type HeroImage } from "@/components/site/place-hero-stack";
import { type PlaceVideo } from "@/components/site/tiktok-videos";

const pub = { status: "published" as const };

type HeroImgRow = { url: string; alt: string | null; caption: string | null };
type HeroCoverRow = { slug: string; name: string; images: { url: string }[] };

export function buildHeroImages(
  images: HeroImgRow[],
  children: HeroCoverRow[],
  spots: HeroCoverRow[],
  slug: string,
  name: string,
): HeroImage[] {
  const heroImages: HeroImage[] = images.map((i) => ({
    url: i.url,
    alt: i.alt,
    caption: i.caption,
  }));
  const childCovers: HeroImage[] = [
    ...children.map((c) => ({
      cover: c.images[0],
      name: c.name,
      href: `/diem-den/${c.slug}`,
    })),
    ...spots.map((s) => ({
      cover: s.images[0],
      name: s.name,
      href: `/dia-diem/${s.slug}`,
    })),
  ]
    .filter((c) => c.cover?.url)
    .map((c) => ({
      url: c.cover!.url,
      alt: c.name,
      caption: c.name,
      href: c.href,
    }));
  const seen = new Set(heroImages.map((i) => i.url));
  for (const c of childCovers) {
    if (!seen.has(c.url)) {
      heroImages.push(c);
      seen.add(c.url);
    }
  }
  if (heroImages.length === 0) {
    heroImages.push({ url: coverUrl([], slug, 1600, 1000), alt: name });
  }
  return heroImages;
}

export async function resolveVideos(
  rows: { videoId: string; caption: string | null }[],
): Promise<PlaceVideo[]> {
  const seed = rows.map((v) => ({ id: v.videoId, caption: v.caption ?? undefined }));
  const thumbById = new Map<string, string | null>();
  await Promise.all(
    [...new Set(seed.map((v) => v.id))].map(async (id) => {
      thumbById.set(id, (await getTikTokInfo(id)).thumbnail);
    }),
  );
  return seed.map((v) => ({ ...v, thumbnail: thumbById.get(v.id) ?? null }));
}

export const getPlaceHero = cache(async function getPlaceHero(
  placeSlug: string,
) {
  const cover = { where: { isCover: true }, take: 1, select: { url: true } };
  const place = await prisma.place.findUnique({
    where: { slug: placeSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
      status: true,
      tagline: true,
      provinceName: true,
      isFeatured: true,
      viewCount: true,
      parent: { select: { slug: true, name: true } },
      images: {
        orderBy: [{ isCover: "desc" }, { order: "asc" }],
        select: { url: true, alt: true, caption: true, isCover: true },
      },
      children: {
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
        select: { slug: true, name: true, images: cover },
      },
      spots: {
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
        take: 6,
        select: { slug: true, name: true, images: cover },
      },
    },
  });
  if (!place) return null;
  const heroImages = buildHeroImages(
    place.images,
    place.children,
    place.spots,
    place.slug,
    place.name,
  );
  return { place, heroImages };
});

// Bảng `Transport` + CMS giữ nguyên, chỉ tắt hiển thị công khai: dữ liệu tuyến
// khó thu thập cho đủ. Khi tắt, mục "Di chuyển" của điểm đến là MỘT BÀI BLOG
// (category `di-chuyen`, gắn PostRef tới Place). Khai `boolean` để TS không
// coi nhánh bật là không chạm tới được.
export const TRANSPORT_ENABLED: boolean = false;
export const TRANSPORT_POST_CATEGORY = "di-chuyen";

export const getTransportPost = cache(async function getTransportPost(placeId: string) {
  return prisma.post.findFirst({
    where: {
      ...pub,
      category: TRANSPORT_POST_CATEGORY,
      refs: { some: { placeId } },
    },
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    select: {
      slug: true,
      title: true,
      excerpt: true,
      images: { where: { isCover: true }, take: 1, select: { url: true, isCover: true } },
    },
  });
});

// Bản đầy đủ (kèm thân bài) cho tab Di chuyển và mục xem trước ở tab tổng quan.
// Tách khỏi `getTransportPost` vì hàm đó chạy trong layout ở MỌI tab.
export const getTransportArticle = cache(async function getTransportArticle(placeId: string) {
  return prisma.post.findFirst({
    where: {
      ...pub,
      category: TRANSPORT_POST_CATEGORY,
      refs: { some: { placeId } },
    },
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    select: {
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      updatedAt: true,
      images: { where: { isCover: true }, take: 1, select: { url: true } },
    },
  });
});

export type PlaceCounts = {
  activity: number;
  spot: number;
  eatery: number;
  accommodation: number;
  transport: number;
  transportPost: boolean;
};


export async function getPlaceHeader(placeSlug: string) {
  return prisma.place.findUnique({
    where: { slug: placeSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
      status: true,
      tagline: true,
      provinceName: true,
      isFeatured: true,
      viewCount: true,
      parent: { select: { slug: true, name: true } },
      images: {
        orderBy: [{ isCover: "desc" }, { order: "asc" }],
        select: { url: true, alt: true, caption: true, isCover: true },
      },
    },
  });
}

export const getPlaceCounts = cache(async function getPlaceCounts(placeId: string): Promise<PlaceCounts> {
  const [activity, spot, eatery, accommodation, transport, post] =
    await Promise.all([
      prisma.activity.count({ where: { placeId, ...pub } }),
      prisma.spot.count({ where: { placeId, ...pub } }),
      prisma.eatery.count({ where: { placeId, ...pub } }),
      prisma.accommodation.count({ where: { placeId, ...pub } }),
      TRANSPORT_ENABLED ? prisma.transport.count({ where: { placeId, ...pub } }) : 0,
      TRANSPORT_ENABLED ? null : getTransportPost(placeId),
    ]);
  return { activity, spot, eatery, accommodation, transport, transportPost: !!post };
});

export type PlaceTab = {
  href: string;
  label: string;
  icon?: "overview" | "map" | "community";
};

export function buildPlaceTabs(placeSlug: string, counts: PlaceCounts): PlaceTab[] {
  const base = `/diem-den/${placeSlug}`;
  const tabs: PlaceTab[] = [{ href: base, label: "Tổng quan", icon: "overview" }];
  // `counts` chỉ để QUYẾT ĐỊNH có tab hay không — thanh chỉ liệt kê loại NÀO
  // CÓ dữ liệu, nên không bao giờ có tab rỗng dẫn tới trang trống. Con số
  // KHÔNG đi kèm vào tab nữa (thanh đã bỏ phần hiển thị số lượng).
  const add = (loai: string, label: string) =>
    tabs.push({ href: `${base}/${loai}`, label });

  if (counts.spot > 0) add("dia-diem", "Địa điểm");
  if (counts.activity > 0) add("hoat-dong", "Trải nghiệm");
  if (counts.eatery > 0) add("am-thuc", "Ẩm thực");
  if (counts.accommodation > 0) add("luu-tru", "Nơi lưu trú");
  // Khi tắt Transport, tab vẫn trỏ `/di-chuyen` — route đó chuyển tiếp sang bài
  // blog, nhờ vậy link đã chia sẻ không chết khi bật lại.
  if (counts.transport > 0 || counts.transportPost) add("di-chuyen", "Di chuyển");

  if (counts.spot + counts.eatery + counts.accommodation > 0)
    tabs.push({ href: `${base}/ban-do`, label: "Bản đồ", icon: "map" });

  return tabs;
}

export type PlaceStat = { icon: LucideIcon; value: number; label: string };

// Check-in ("Vivu-er đã đến") KHÔNG còn ở đây — hiển thị bằng avatar stack + danh
// sách người (xem CheckInFaces trên hero trang tổng quan).
export function buildPlaceStats(viewCount: number): PlaceStat[] {
  return [{ icon: Eye, value: viewCount, label: "lượt xem" }];
}

export async function getVisitors(
  kind: "place" | "spot",
  id: string,
  take = 60,
) {
  const where = kind === "place" ? { placeId: id } : { spotId: id };
  const [total, faces] = await Promise.all([
    prisma.checkIn.count({ where }),
    prisma.checkIn.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      select: {
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            reviews: {
              where: { ...where, isHidden: false },
              select: { stance: true },
              take: 1,
            },
          },
        },
      },
    }),
  ]);
  return {
    total,
    people: faces.map((c) => ({
      id: c.user.id,
      name: c.user.name,
      image: c.user.image,
      stance: c.user.reviews[0]?.stance ?? null,
      checkedAt: c.createdAt.toISOString(),
    })),
  };
}

export async function getReviewSummary(kind: "place" | "spot", id: string) {
  const target = kind === "place" ? { placeId: id } : { spotId: id };
  const rows = await prisma.review.findMany({
    where: { ...target, isHidden: false, author: { checkIns: { some: target } } },
    select: { stance: true, highlights: true, caveats: true },
  });
  return summarizeReviews(rows);
}

export async function getSpotReviewSummaries(
  spotIds: string[],
): Promise<Map<string, { stars: number; total: number; worthGoing: number }>> {
  const out = new Map<
    string,
    { stars: number; total: number; worthGoing: number }
  >();
  if (spotIds.length === 0) return out;
  const rows = await prisma.review.findMany({
    where: { spotId: { in: spotIds }, isHidden: false },
    select: {
      spotId: true,
      stance: true,
      highlights: true,
      caveats: true,
      author: {
        select: {
          checkIns: {
            where: { spotId: { in: spotIds } },
            select: { spotId: true },
          },
        },
      },
    },
  });
  const bySpot = new Map<
    string,
    { stance: (typeof rows)[number]["stance"]; highlights: string[]; caveats: string[] }[]
  >();
  for (const r of rows) {
    if (!r.spotId) continue;
    if (!r.author.checkIns.some((c) => c.spotId === r.spotId)) continue;
    const arr = bySpot.get(r.spotId) ?? [];
    arr.push({ stance: r.stance, highlights: r.highlights, caveats: r.caveats });
    bySpot.set(r.spotId, arr);
  }
  for (const [sid, rws] of bySpot) {
    const s = summarizeReviews(rws);
    if (s.total > 0)
      out.set(sid, {
        stars: s.stars,
        total: s.total,
        worthGoing: Math.round((s.worthGoingPct / 100) * s.total),
      });
  }
  return out;
}
