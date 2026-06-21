// Gom các Listing có toạ độ (Spot, Eatery, Accommodation) của một Place về một
// mảng GeoPoint phẳng để chấm pin lên bản đồ. Place không có lat/lng riêng nên
// tâm bản đồ được suy ra bằng fitBounds ở client (xem destination-map-inner.tsx).
import { prisma } from "@/lib/prisma";

export type GeoType = "spot" | "eatery" | "accommodation";

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
