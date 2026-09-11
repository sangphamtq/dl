"use server";

import {
  searchAll,
  featuredDestinations,
  type SearchItem,
} from "@/lib/search";
import { coverUrl } from "@/lib/place-image";

const THUMB = 96;

export type SearchHit = {
  name: string;
  href: string;
  context?: string;
  image: string;
};

export type SearchGroup = {
  label: string;
  items: SearchHit[];
};

const MAX_ROWS = 9;
const PER_GROUP = 3;

export async function searchSite(q: string): Promise<SearchGroup[]> {
  if (!q.trim()) return [];
  const groups = await searchAll(q, PER_GROUP);

  const toHit = (prefix: string, it: SearchItem): SearchHit => {
    const province = prefix === "diem-den" && !!it.isProvince;
    return {
      name: it.name,
      href: `/${prefix}/${it.slug}`,
      context: it.context ?? (province ? "Tỉnh, thành phố" : undefined),
      image: it.image ?? coverUrl([], it.slug, THUMB, THUMB),
    };
  };

  const taken = groups.map(() => 0);
  let total = 0;
  for (const round of [1, PER_GROUP]) {
    for (const [i, g] of groups.entries()) {
      while (taken[i] < Math.min(round, g.items.length) && total < MAX_ROWS) {
        taken[i]++;
        total++;
      }
    }
  }

  return groups
    .map((g, i) => ({
      label: g.label,
      items: g.items.slice(0, taken[i]).map((it) => toHit(g.prefix, it)),
    }))
    .filter((g) => g.items.length > 0);
}

export async function getSuggestions(): Promise<SearchHit[]> {
  const items = await featuredDestinations(6);
  return items.map((it) => ({
    name: it.name,
    href: `/diem-den/${it.slug}`,
    context: it.context,
    image: it.image ?? coverUrl([], it.slug, THUMB, THUMB),
  }));
}
