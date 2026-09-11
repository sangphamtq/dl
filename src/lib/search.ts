import { prisma } from "@/lib/prisma";

export type SearchItem = {
  name: string;
  slug: string;
  context?: string;
  isProvince?: boolean;
  image?: string;
};
export type SearchGroup = { label: string; prefix: string; items: SearchItem[] };

type PlaceRow = {
  name: string;
  slug: string;
  kind: string;
  parentName: string | null;
  image?: string | null;
};
const mapPlace = (r: PlaceRow): SearchItem => ({
  name: r.name,
  slug: r.slug,
  isProvince: r.kind === "province",
  context: r.kind === "destination" && r.parentName ? r.parentName : undefined,
  image: r.image ?? undefined,
});

async function searchPlaces(like: string, limit: number): Promise<SearchItem[]> {
  const rows = await prisma.$queryRawUnsafe<PlaceRow[]>(
    `SELECT p.name, p.slug, p.kind::text AS kind, parent.name AS "parentName",
            (SELECT i.url FROM "Image" i
             WHERE i."placeId" = p.id
             ORDER BY i."isCover" DESC, i."order" ASC LIMIT 1) AS image
     FROM "Place" p
     LEFT JOIN "Place" parent ON p."parentId" = parent.id
     WHERE p.status::text = 'published' AND unaccent(p.name) ILIKE unaccent($1)
     ORDER BY p."isFeatured" DESC, p."popularity" DESC, p.name ASC
     LIMIT $2`,
    like,
    limit,
  );
  return rows.map(mapPlace);
}

export async function featuredDestinations(limit = 6): Promise<SearchItem[]> {
  const rows = await prisma.$queryRawUnsafe<PlaceRow[]>(
    `SELECT p.name, p.slug, p.kind::text AS kind, parent.name AS "parentName",
            (SELECT i.url FROM "Image" i
             WHERE i."placeId" = p.id
             ORDER BY i."isCover" DESC, i."order" ASC LIMIT 1) AS image
     FROM "Place" p
     LEFT JOIN "Place" parent ON p."parentId" = parent.id
     WHERE p.status::text = 'published' AND p.kind::text = 'destination'
     ORDER BY p."isFeatured" DESC, p."popularity" DESC, p."createdAt" DESC
     LIMIT $1`,
    limit,
  );
  return rows.map(mapPlace);
}

async function searchListing(
  table: "Activity" | "Spot" | "Accommodation",
  like: string,
  limit: number,
): Promise<SearchItem[]> {
  const fk = `${table[0].toLowerCase()}${table.slice(1)}Id`;
  const rows = await prisma.$queryRawUnsafe<
    {
      name: string;
      slug: string;
      placeName: string;
      placeKind: string;
      provName: string | null;
      image: string | null;
    }[]
  >(
    `SELECT x.name, x.slug, pl.name AS "placeName", pl.kind::text AS "placeKind",
            prov.name AS "provName",
            (SELECT i.url FROM "Image" i
             WHERE i."${fk}" = x.id
             ORDER BY i."isCover" DESC, i."order" ASC LIMIT 1) AS image
     FROM "${table}" x
     JOIN "Place" pl ON x."placeId" = pl.id
     LEFT JOIN "Place" prov ON pl."parentId" = prov.id
     WHERE x.status::text = 'published' AND unaccent(x.name) ILIKE unaccent($1)
     ORDER BY x."isFeatured" DESC, x."popularity" DESC, x.name ASC
     LIMIT $2`,
    like,
    limit,
  );
  return rows.map((r) => ({
    name: r.name,
    slug: r.slug,
    image: r.image ?? undefined,
    context:
      r.placeKind === "destination" && r.provName
        ? `${r.placeName}, ${r.provName}`
        : r.placeName,
  }));
}

async function searchPosts(like: string, limit: number): Promise<SearchItem[]> {
  const rows = await prisma.$queryRawUnsafe<
    { name: string; slug: string; excerpt: string | null }[]
  >(
    `SELECT title AS name, slug, excerpt FROM "Post"
     WHERE status::text = 'published' AND unaccent(title) ILIKE unaccent($1)
     ORDER BY "isFeatured" DESC, "popularity" DESC, title ASC
     LIMIT $2`,
    like,
    limit,
  );
  return rows.map((r) => ({
    name: r.name,
    slug: r.slug,
    context: r.excerpt ?? undefined,
  }));
}

export async function searchAll(q: string, limit = 20): Promise<SearchGroup[]> {
  const term = q.trim();
  if (!term) return [];
  const like = `%${term}%`;
  const secondary = Math.max(3, Math.floor(limit / 2));
  const [places, spots, activities, accommodations, posts] = await Promise.all([
    searchPlaces(like, limit),
    searchListing("Spot", like, limit),
    searchListing("Activity", like, secondary),
    searchListing("Accommodation", like, secondary),
    searchPosts(like, secondary),
  ]);
  const groups: SearchGroup[] = [
    { label: "Điểm đến", prefix: "diem-den", items: places },
    { label: "Địa điểm", prefix: "dia-diem", items: spots },
    { label: "Hoạt động", prefix: "hoat-dong", items: activities },
    { label: "Lưu trú", prefix: "luu-tru", items: accommodations },
    { label: "Bài viết", prefix: "blog", items: posts },
  ];
  return groups.filter((g) => g.items.length > 0);
}
