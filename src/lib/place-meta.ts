import { Eye, type LucideIcon } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { summarizeReviews } from "@/lib/review-meta";
import { coverUrl } from "@/lib/place-image";
import { getTikTokInfo } from "@/lib/tiktok";
import { type HeroImage } from "@/components/site/place-hero-stack";
import { type PlaceVideo } from "@/components/site/tiktok-videos";

const pub = { status: "published" as const };

// ── Hero dùng chung: GIỮ NGUYÊN trên mọi tab của trang điểm đến ──────────────
// Gộp ảnh điểm đến + ảnh bìa "địa điểm con" (điểm đến con + spot), khử trùng URL.
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

// Lấy thumbnail TikTok thật (oEmbed, dedupe, cache trong helper).
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

// Header + hero (ảnh gộp + video) đồng nhất cho trang danh sách listing.
export async function getPlaceHero(placeSlug: string) {
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
      videos: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { videoId: true, caption: true },
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
  const videos = await resolveVideos(place.videos);
  return { place, heroImages, videos };
}

export type PlaceCounts = {
  activity: number;
  spot: number;
  specialty: number;
  eatery: number;
  accommodation: number;
  transport: number;
};


// Dữ liệu header dùng chung cho trang Place & trang danh sách listing.
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

export async function getPlaceCounts(placeId: string): Promise<PlaceCounts> {
  const [activity, spot, specialty, eatery, accommodation, transport] =
    await Promise.all([
      prisma.activity.count({ where: { placeId, ...pub } }),
      prisma.spot.count({ where: { placeId, ...pub } }),
      prisma.specialty.count({ where: { placeId, ...pub } }),
      prisma.eatery.count({ where: { placeId, ...pub } }),
      prisma.accommodation.count({ where: { placeId, ...pub } }),
      prisma.transport.count({ where: { placeId, ...pub } }),
    ]);
  return { activity, spot, specialty, eatery, accommodation, transport };
}

export type PlaceTab = {
  href: string;
  label: string;
  icon?: "overview" | "map" | "community"; // tab đặc biệt (Tổng quan / Bản đồ / Cộng đồng)
};

// Tabs sticky: "Tổng quan" về trang Place + mỗi loại listing có dữ liệu → trang "xem tất cả".
// Đặc sản + Quán ăn gộp chung thành một tab "Ẩm thực" (trang /am-thuc hiển thị cả hai).
export function buildPlaceTabs(placeSlug: string, counts: PlaceCounts): PlaceTab[] {
  const base = `/diem-den/${placeSlug}`;
  // Mục đầu = "Tổng quan" dạng icon (gọn); chỉ hiện khi có ≥1 loại listing.
  const tabs: PlaceTab[] = [{ href: base, label: "Tổng quan", icon: "overview" }];
  const add = (loai: string, label: string) =>
    tabs.push({ href: `${base}/${loai}`, label });

  if (counts.spot > 0) add("dia-diem", "Địa điểm");
  if (counts.activity > 0) add("hoat-dong", "Trải nghiệm");
  if (counts.specialty + counts.eatery > 0) add("am-thuc", "Ẩm thực");
  if (counts.accommodation > 0) add("luu-tru", "Nơi lưu trú");
  // Di chuyển: màn hình riêng trong route động [loai] (không có trang chi tiết per-item).
  if (counts.transport > 0) add("di-chuyen", "Di chuyển");

  // Cộng đồng: luôn hiện, render riêng bên phải thanh tab (như Bản đồ).
  tabs.push({ href: `${base}/cong-dong`, label: "Cộng đồng", icon: "community" });

  // Bản đồ: dạng icon, hiện khi có loại có toạ độ (Spot/Eatery/Accommodation).
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

// "Vivu-er đã đến" cho hero: tổng số check-in + N người mới nhất (avatar stack).
// Dùng cho cả điểm đến (place) và địa điểm (spot).
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
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            // Cảm nhận của họ cho chính nơi này (nếu có review công khai).
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
    })),
  };
}

// Tổng hợp đánh giá (stars/total…) cho hero — chỉ review công khai của tác giả
// HIỆN còn đánh dấu đã đến. Dùng chung mọi trang có hero (tab tổng quan & tab khác).
export async function getReviewSummary(kind: "place" | "spot", id: string) {
  const target = kind === "place" ? { placeId: id } : { spotId: id };
  const rows = await prisma.review.findMany({
    where: { ...target, isHidden: false, author: { checkIns: { some: target } } },
    select: { stance: true, highlights: true, caveats: true },
  });
  return summarizeReviews(rows);
}

// Tổng hợp đánh giá cho NHIỀU spot cùng lúc (danh sách địa điểm) — 1 truy vấn,
// cùng bộ lọc "tác giả HIỆN còn đánh dấu đã đến chính spot đó".
export async function getSpotReviewSummaries(
  spotIds: string[],
): Promise<Map<string, { stars: number; total: number }>> {
  const out = new Map<string, { stars: number; total: number }>();
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
    // Chỉ tính review khi tác giả còn đánh dấu đã đến chính spot này.
    if (!r.author.checkIns.some((c) => c.spotId === r.spotId)) continue;
    const arr = bySpot.get(r.spotId) ?? [];
    arr.push({ stance: r.stance, highlights: r.highlights, caveats: r.caveats });
    bySpot.set(r.spotId, arr);
  }
  for (const [sid, rws] of bySpot) {
    const s = summarizeReviews(rws);
    if (s.total > 0) out.set(sid, { stars: s.stars, total: s.total });
  }
  return out;
}
