"use server";

import { searchAll } from "@/lib/search";

export type SearchHit = { label: string; name: string; href: string };

// Gợi ý live ở header — tối đa 8 kết quả (dùng unaccent full-text qua searchAll).
export async function searchSite(q: string): Promise<SearchHit[]> {
  if (!q.trim()) return [];
  const groups = await searchAll(q, 5);
  const out: SearchHit[] = [];
  for (const g of groups) {
    for (const it of g.items) {
      out.push({ label: g.label, name: it.name, href: `/${g.prefix}/${it.slug}` });
      if (out.length >= 8) return out;
    }
  }
  return out;
}
