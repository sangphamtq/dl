"use server";

import { prisma } from "@/lib/prisma";
import { removeDiacritics } from "@/lib/slug";

export type SearchHit = { label: string; name: string; href: string };

const pub = { status: "published" as const };
const sel = { where: pub, take: 300, select: { name: true, slug: true } };

// Tìm nhanh (không dấu) cho gợi ý live ở header. Trả tối đa 8 kết quả.
export async function searchSite(q: string): Promise<SearchHit[]> {
  const norm = removeDiacritics(q.trim());
  if (!norm) return [];

  const [places, eateries, specialties, spots, activities, accommodations, posts] =
    await Promise.all([
      prisma.place.findMany(sel),
      prisma.eatery.findMany(sel),
      prisma.specialty.findMany(sel),
      prisma.spot.findMany(sel),
      prisma.activity.findMany(sel),
      prisma.accommodation.findMany(sel),
      prisma.post.findMany({ where: pub, take: 300, select: { title: true, slug: true } }),
    ]);

  const hit = (name: string) => removeDiacritics(name).includes(norm);

  const groups: { label: string; prefix: string; rows: { name: string; slug: string }[] }[] = [
    { label: "Điểm đến", prefix: "diem-den", rows: places },
    { label: "Quán ăn", prefix: "quan-an", rows: eateries },
    { label: "Đặc sản", prefix: "dac-san", rows: specialties },
    { label: "Địa điểm", prefix: "dia-diem", rows: spots },
    { label: "Hoạt động", prefix: "hoat-dong", rows: activities },
    { label: "Lưu trú", prefix: "luu-tru", rows: accommodations },
    {
      label: "Bài viết",
      prefix: "blog",
      rows: posts.map((p) => ({ name: p.title, slug: p.slug })),
    },
  ];

  const out: SearchHit[] = [];
  for (const g of groups) {
    for (const r of g.rows) {
      if (hit(r.name)) {
        out.push({ label: g.label, name: r.name, href: `/${g.prefix}/${r.slug}` });
        if (out.length >= 8) return out;
      }
    }
  }
  return out;
}
