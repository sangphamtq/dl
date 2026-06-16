import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// Tìm id khớp q trên các cột text, KHÔNG dấu & KHÔNG phân biệt hoa thường
// (unaccent + ILIKE ở DB) — đồng bộ với tìm kiếm public. table/columns là hằng
// do code truyền (whitelist), q đi qua tham số nên an toàn injection.
export async function searchIds(
  table: string,
  columns: string[],
  q: string,
): Promise<string[]> {
  const term = `%${q}%`;
  const conds = columns.map(
    (c) =>
      Prisma.sql`unaccent(coalesce(${Prisma.raw(`"${c}"`)}, '')) ILIKE unaccent(${term})`,
  );
  const rows = await prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT id FROM ${Prisma.raw(`"${table}"`)} WHERE ${Prisma.join(conds, " OR ")}`,
  );
  return rows.map((r) => r.id);
}
