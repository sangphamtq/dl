import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hanhtrinhviet.vn";

const pub = { status: "published" as const };
const sel = { where: pub, select: { slug: true, updatedAt: true } };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [places, activities, spots, accommodations, posts, templates] =
    await Promise.all([
      prisma.place.findMany(sel),
      prisma.activity.findMany(sel),
      prisma.spot.findMany(sel),
      prisma.accommodation.findMany(sel),
      prisma.post.findMany(sel),
      // Lịch trình MẪU thôi — lịch trình cá nhân và bản chia sẻ đều noindex.
      prisma.trip.findMany({
        where: { ...pub, isTemplate: true, slug: { not: null } },
        select: { slug: true, updatedAt: true },
      }),
    ]);

  const entries = (
    rows: { slug: string; updatedAt: Date }[],
    prefix: string,
  ): MetadataRoute.Sitemap =>
    rows.map((r) => ({
      url: `${BASE}/${prefix}/${r.slug}`,
      lastModified: r.updatedAt,
    }));

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date() },
    { url: `${BASE}/diem-den`, lastModified: new Date() },
    { url: `${BASE}/blog`, lastModified: new Date() },
  ];

  return [
    ...staticPages,
    ...entries(places, "diem-den"),
    ...entries(activities, "hoat-dong"),
    ...entries(spots, "dia-diem"),
    ...entries(accommodations, "luu-tru"),
    ...entries(posts, "blog"),
    ...entries(
      templates.filter((t): t is { slug: string; updatedAt: Date } => t.slug !== null),
      "lich-trinh/mau",
    ),
  ];
}
