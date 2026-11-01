"use server";

import { prisma } from "@/lib/prisma";

export type LoginPhoto = { url: string; label: string };

/**
 * Ảnh cho khảm ở hộp đăng nhập: CHỈ ảnh thật (ảnh bìa gallery) của điểm đến / địa điểm đã xuất bản, mỗi nơi một tấm, ưu
 * tiên mỗi ĐIỂM ĐẾN một tấm cho khảm đa dạng. Không bao giờ ảnh stock.
 */
export async function getLoginPhotos(limit = 5): Promise<LoginPhoto[]> {
  const [places, spots] = await Promise.all([
    prisma.image.findMany({
      where: { kind: "gallery", isCover: true, place: { status: "published" } },
      orderBy: [{ place: { isFeatured: "desc" } }, { place: { order: "asc" } }],
      take: limit,
      select: { url: true, place: { select: { name: true } } },
    }),
    prisma.image.findMany({
      where: { kind: "gallery", isCover: true, spot: { status: "published" } },
      orderBy: [{ spot: { isFeatured: "desc" } }, { spot: { order: "asc" } }],
      take: 40,
      select: { url: true, spot: { select: { name: true, placeId: true } } },
    }),
  ]);

  const out: LoginPhoto[] = places.map((p) => ({ url: p.url, label: p.place!.name }));
  // Địa điểm: lượt đầu mỗi điểm đến một tấm, thiếu thì lượt hai lấy thêm.
  const seenPlace = new Set<string>();
  const rest: LoginPhoto[] = [];
  for (const s of spots) {
    const photo = { url: s.url, label: s.spot!.name };
    if (s.spot!.placeId && !seenPlace.has(s.spot!.placeId)) {
      seenPlace.add(s.spot!.placeId);
      out.push(photo);
    } else rest.push(photo);
  }
  return [...out, ...rest].filter((p, i, a) => a.findIndex((x) => x.url === p.url) === i).slice(0, limit);
}
