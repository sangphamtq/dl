"use server";

import { searchAll, featuredDestinations } from "@/lib/search";

export type SearchHit = {
  label: string; // nhãn loại: "Điểm đến" | "Tỉnh/Thành phố" | "Bài viết"…
  name: string;
  href: string;
  context?: string; // dòng phụ: tỉnh cha / nơi chứa / trích đoạn
  province?: boolean; // Place là tỉnh
  image?: string; // ảnh bìa (gợi ý)
};

export type SearchResults = {
  places: SearchHit[]; // tỉnh + điểm đến + địa điểm (nhóm chính, có ảnh)
  others: SearchHit[]; // hoạt động / lưu trú / bài viết (nhóm phụ)
};

// Kết quả cho Command palette: gộp Place + Spot thành nhóm "Địa điểm" (nổi bật),
// còn lại vào nhóm phụ.
export async function searchSite(q: string): Promise<SearchResults> {
  if (!q.trim()) return { places: [], others: [] };
  const groups = await searchAll(q, 6);
  const places: SearchHit[] = [];
  const others: SearchHit[] = [];
  for (const g of groups) {
    const isPlace = g.prefix === "diem-den" || g.prefix === "dia-diem";
    for (const it of g.items) {
      const province = g.prefix === "diem-den" && !!it.isProvince;
      const hit: SearchHit = {
        label: province ? "Tỉnh/Thành phố" : g.label,
        name: it.name,
        href: `/${g.prefix}/${it.slug}`,
        context: it.context,
        province,
        image: it.image,
      };
      if (isPlace) {
        if (places.length < 6) places.push(hit);
      } else if (others.length < 4) {
        others.push(hit);
      }
    }
  }
  return { places, others };
}

// Gợi ý khi mới mở ô tìm kiếm (chưa gõ): điểm đến nổi bật (không lấy tỉnh).
export async function getSuggestions(): Promise<SearchHit[]> {
  const items = await featuredDestinations(6);
  return items.map((it) => ({
    label: "Điểm đến",
    name: it.name,
    href: `/diem-den/${it.slug}`,
    context: it.context,
    image: it.image,
  }));
}
