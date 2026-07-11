// Gom các Listing có toạ độ (Spot, Eatery, Accommodation) của một Place về một
// mảng GeoPoint phẳng để chấm pin lên bản đồ. Place không có lat/lng riêng nên
// tâm bản đồ được suy ra bằng fitBounds ở client (xem destination-map-inner.tsx).
import { prisma } from "@/lib/prisma";
import { regionOf } from "@/lib/regions";
import { PLACE_COORDS } from "@/lib/place-coords";

export type GeoType = "spot" | "eatery" | "accommodation";

// Một điểm đến (Place) trên bản đồ toàn quốc. Toạ độ suy ra bằng TRỌNG TÂM các
// listing (spot/quán/lưu trú) CÓ toạ độ gắn TRỰC TIẾP vào place đó — vì Place
// không có lat/lng riêng. Place chưa có listing toạ độ nào sẽ không xuất hiện.
export type MapPlacePoint = {
  slug: string;
  name: string;
  kind: "province" | "destination";
  region: string;
  provinceName: string | null;
  tagline: string | null;
  isFeatured: boolean;
  lat: number;
  lng: number;
  coverUrl: string | null;
  spotCount: number;
  eateryCount: number;
  stayCount: number;
};

// Một listing (địa điểm/quán/lưu trú) có toạ độ — lớp chi tiết trên bản đồ.
export type ListingGeoPoint = {
  id: string;
  type: GeoType;
  name: string;
  lat: number;
  lng: number;
  href: string;
  category: string | null;
  placeSlug: string | null;
};

export async function getDestinationMapPoints(): Promise<MapPlacePoint[]> {
  const geoScope = { ...pub, lat: { not: null } } as const;

  const [places, spots, eateries, accommodations] = await Promise.all([
    prisma.place.findMany({
      where: pub,
      select: {
        id: true,
        slug: true,
        name: true,
        kind: true,
        tagline: true,
        isFeatured: true,
        provinceName: true,
        parent: { select: { slug: true } },
        images: { where: { isCover: true }, take: 1, select: { url: true } },
        _count: {
          select: {
            spots: { where: pub },
            eateries: { where: pub },
            accommodations: { where: pub },
          },
        },
      },
    }),
    prisma.spot.findMany({ where: geoScope, select: { placeId: true, lat: true, lng: true } }),
    prisma.eatery.findMany({ where: geoScope, select: { placeId: true, lat: true, lng: true } }),
    prisma.accommodation.findMany({ where: geoScope, select: { placeId: true, lat: true, lng: true } }),
  ]);

  // placeId → tích luỹ toạ độ để tính trọng tâm
  const acc = new Map<string, { lat: number; lng: number; n: number }>();
  for (const g of [...spots, ...eateries, ...accommodations]) {
    if (g.lat == null || g.lng == null) continue;
    const cur = acc.get(g.placeId) ?? { lat: 0, lng: 0, n: 0 };
    cur.lat += g.lat;
    cur.lng += g.lng;
    cur.n += 1;
    acc.set(g.placeId, cur);
  }

  const points: MapPlacePoint[] = [];
  for (const pl of places) {
    const a = acc.get(pl.id);
    const fixed = PLACE_COORDS[pl.slug];
    // Ưu tiên toạ độ tra cứu (tâm nơi đó); nếu không có thì suy trọng tâm listing.
    let lat: number;
    let lng: number;
    if (fixed) {
      [lat, lng] = fixed;
    } else if (a && a.n > 0) {
      lat = a.lat / a.n;
      lng = a.lng / a.n;
    } else {
      continue; // chưa xác định được vị trí → bỏ qua
    }
    const provinceSlug =
      pl.kind === "province" ? pl.slug : (pl.parent?.slug ?? pl.slug);
    points.push({
      slug: pl.slug,
      name: pl.name,
      kind: pl.kind,
      region: regionOf(provinceSlug),
      provinceName: pl.provinceName,
      tagline: pl.tagline,
      isFeatured: pl.isFeatured,
      lat,
      lng,
      coverUrl: pl.images[0]?.url ?? null,
      spotCount: pl._count.spots,
      eateryCount: pl._count.eateries,
      stayCount: pl._count.accommodations,
    });
  }
  const total = (p: MapPlacePoint) => p.spotCount + p.eateryCount + p.stayCount;
  // Nổi bật trước → nhiều nội dung → theo tên.
  points.sort(
    (x, y) =>
      Number(y.isFeatured) - Number(x.isFeatured) ||
      total(y) - total(x) ||
      x.name.localeCompare(y.name, "vi"),
  );
  return points;
}

// Địa điểm (Spot) có toạ độ trên toàn quốc — lớp "địa điểm chi tiết" của bản đồ.
// Chỉ Spot: KHÔNG hiện quán ăn / lưu trú ở lớp này.
export async function getAllGeoListingPoints(): Promise<ListingGeoPoint[]> {
  const spots = await prisma.spot.findMany({
    where: { ...pub, lat: { not: null } },
    select: {
      id: true,
      name: true,
      slug: true,
      lat: true,
      lng: true,
      category: true,
      place: { select: { slug: true } },
    },
  });
  const out: ListingGeoPoint[] = [];
  for (const r of spots) {
    if (r.lat == null || r.lng == null) continue;
    out.push({
      id: r.id,
      type: "spot",
      name: r.name,
      lat: r.lat,
      lng: r.lng,
      href: `/dia-diem/${r.slug}`,
      category: r.category,
      placeSlug: r.place?.slug ?? null,
    });
  }
  return out;
}

export type GeoPoint = {
  id: string;
  type: GeoType;
  name: string;
  slug: string;
  lat: number;
  lng: number;
  category: string | null;
  description: string | null;
  address: string | null;
  openingHours: string | null;
  phone: string | null;
  tags: string[];
  coverUrl: string | null;
  coverAlt: string | null;
  priceRange: string | null;
  href: string;
};

const pub = { status: "published" as const };
const cover = {
  where: { isCover: true },
  take: 1,
  select: { url: true, alt: true },
} as const;

// Lấy mọi điểm có toạ độ của một Place. Nếu là tỉnh (province), gom thêm điểm
// của các điểm đến con (destination thuộc tỉnh). Lọc sẵn published + lat/lng ≠ null.
export async function getPlaceGeoPoints(placeId: string): Promise<GeoPoint[]> {
  // id của Place gốc + mọi con đã xuất bản (rỗng với destination).
  const children = await prisma.place.findMany({
    where: { parentId: placeId, ...pub },
    select: { id: true },
  });
  const placeIds = [placeId, ...children.map((c) => c.id)];
  const scope = { placeId: { in: placeIds }, lat: { not: null }, ...pub };

  const [spots, eateries, accommodations] = await Promise.all([
    prisma.spot.findMany({
      where: scope,
      select: {
        id: true, name: true, slug: true, lat: true, lng: true,
        category: true, description: true, address: true, openingHours: true,
        phone: true, tags: true, priceRange: true, images: cover,
      },
    }),
    prisma.eatery.findMany({
      where: scope,
      select: {
        id: true, name: true, slug: true, lat: true, lng: true,
        category: true, description: true, address: true, openingHours: true,
        phone: true, tags: true, images: cover,
      },
    }),
    prisma.accommodation.findMany({
      where: scope,
      select: {
        id: true, name: true, slug: true, lat: true, lng: true,
        category: true, description: true, address: true, openingHours: true,
        phone: true, tags: true, images: cover,
      },
    }),
  ]);

  const points: GeoPoint[] = [];
  const push = (
    type: GeoType,
    prefix: string,
    rows: {
      id: string; name: string; slug: string;
      lat: number | null; lng: number | null;
      category: string | null; description?: string | null; address?: string | null;
      openingHours?: string | null; phone?: string | null; tags?: string[];
      priceRange?: string | null;
      images: { url: string; alt: string | null }[];
    }[],
  ) => {
    for (const r of rows) {
      // lat đã lọc not null; lng có thể null trên dữ liệu cũ → bỏ qua.
      if (r.lat == null || r.lng == null) continue;
      points.push({
        id: r.id,
        type,
        name: r.name,
        slug: r.slug,
        lat: r.lat,
        lng: r.lng,
        category: r.category ?? null,
        description: r.description ?? null,
        address: r.address ?? null,
        openingHours: r.openingHours ?? null,
        phone: r.phone ?? null,
        tags: r.tags ?? [],
        coverUrl: r.images[0]?.url ?? null,
        coverAlt: r.images[0]?.alt ?? r.name,
        priceRange: r.priceRange ?? null,
        href: `/${prefix}/${r.slug}`,
      });
    }
  };

  push("spot", "dia-diem", spots);
  push("eatery", "quan-an", eateries);
  push("accommodation", "luu-tru", accommodations);
  return points;
}
