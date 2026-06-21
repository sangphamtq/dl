import { prisma } from "@/lib/prisma";

export type SearchItem = { name: string; slug: string };
export type SearchGroup = { label: string; prefix: string; items: SearchItem[] };

// Bảng + cột tên + nhãn + tiền tố URL. (table/col là hằng — an toàn để nội suy.)
const TABLES = [
  { table: "Place", col: "name", label: "Điểm đến", prefix: "diem-den" },
  { table: "Activity", col: "name", label: "Hoạt động", prefix: "hoat-dong" },
  { table: "Spot", col: "name", label: "Địa điểm", prefix: "dia-diem" },
  { table: "Accommodation", col: "name", label: "Lưu trú", prefix: "luu-tru" },
  { table: "Post", col: "title", label: "Bài viết", prefix: "blog" },
] as const;

async function searchTable(
  table: string,
  col: string,
  term: string,
  limit: number,
): Promise<SearchItem[]> {
  const like = `%${term}%`;
  // unaccent + ILIKE → tìm không dấu, không phân biệt hoa thường (DB-side).
  return prisma.$queryRawUnsafe<SearchItem[]>(
    `SELECT ${col} AS name, slug FROM "${table}"
     WHERE status::text = 'published'
       AND unaccent(${col}) ILIKE unaccent($1)
     ORDER BY "isFeatured" DESC, "popularity" DESC, ${col} ASC
     LIMIT $2`,
    like,
    limit,
  );
}

// Tìm trên mọi loại; trả nhóm có kết quả.
export async function searchAll(q: string, limit = 20): Promise<SearchGroup[]> {
  const term = q.trim();
  if (!term) return [];
  const results = await Promise.all(
    TABLES.map((t) => searchTable(t.table, t.col, term, limit)),
  );
  return TABLES.map((t, i) => ({
    label: t.label,
    prefix: t.prefix,
    items: results[i],
  })).filter((g) => g.items.length > 0);
}
