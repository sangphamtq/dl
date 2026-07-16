"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Ic } from "@/components/icon";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";

export type SpotItem = {
  slug: string;
  name: string;
  tagline: string | null;
  categoryValue: string | null;
  categoryLabel: string | null;
  placeName: string | null;
  isFeatured: boolean;
  popularity: number;
  tags: string[];
  images: { url: string; isCover: boolean }[];
};

type SortKey = "featured" | "popular" | "az";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Nổi bật" },
  { key: "popular", label: "Phổ biến" },
  { key: "az", label: "A → Z" },
];

// Bỏ dấu để tìm kiếm không phân biệt dấu/hoa thường.
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .trim();
}

// Danh sách địa điểm toàn quốc — lọc theo LOẠI HÌNH (category), tìm theo tên/nơi
// chốn/tag, sắp xếp. Cắt ngang tỉnh (bổ sung cho lối duyệt theo địa lý ở /diem-den).
export function SpotFilter({
  items,
  categories,
}: {
  items: SpotItem[];
  categories: { value: string; label: string; count: number }[];
}) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("featured");

  const q = norm(query);
  const filtered = useMemo(() => {
    const byName = (a: SpotItem, b: SpotItem) =>
      a.name.localeCompare(b.name, "vi");
    return items
      .filter((s) => {
        if (cat && s.categoryValue !== cat) return false;
        if (!q) return true;
        return (
          norm(s.name).includes(q) ||
          (s.placeName ? norm(s.placeName).includes(q) : false) ||
          s.tags.some((t) => norm(t).includes(q))
        );
      })
      .sort((a, b) => {
        if (sort === "az") return byName(a, b);
        if (sort === "popular") return b.popularity - a.popularity || byName(a, b);
        return (
          Number(b.isFeatured) - Number(a.isFeatured) ||
          b.popularity - a.popularity ||
          byName(a, b)
        );
      });
  }, [items, cat, q, sort]);

  return (
    <div>
      {/* Toolbar sticky: tìm kiếm + sắp xếp */}
      <div className="sticky top-16 z-30 -mx-4 border-b border-border/60 bg-background/85 backdrop-blur sm:-mx-6">
        <div className="flex items-center gap-3 overflow-x-auto px-4 py-3 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="relative w-44 shrink-0 sm:w-60">
            <Ic
              icon="search"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm địa điểm, nơi chốn…"
              aria-label="Tìm địa điểm"
              className="h-10 w-full rounded-full border border-transparent bg-muted pl-10 pr-9 text-sm outline-none transition-colors focus:border-primary/40 focus:bg-background focus:ring-2 focus:ring-primary/20 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Xóa tìm kiếm"
                className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:text-foreground"
              >
                <Ic icon="x" className="size-4" aria-hidden />
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Sắp xếp"
            className="ml-auto flex h-10 w-fit shrink-0 items-center rounded-full bg-muted p-1"
          >
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSort(s.key)}
                aria-pressed={sort === s.key}
                className={cn(
                  "inline-flex h-full items-center whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition-colors",
                  sort === s.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lọc theo loại hình */}
      {categories.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <CatChip active={cat === null} onClick={() => setCat(null)} count={items.length}>
            Tất cả
          </CatChip>
          {categories.map((c) => (
            <CatChip
              key={c.value}
              active={cat === c.value}
              onClick={() => setCat(c.value)}
              count={c.count}
            >
              {c.label}
            </CatChip>
          ))}
        </div>
      )}

      <p className="mt-6 text-sm tabular-nums text-muted-foreground">
        {filtered.length} địa điểm
      </p>

      {filtered.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          Không tìm thấy địa điểm phù hợp.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((s) => (
            <SpotCard key={s.slug} s={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function CatChip({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary",
      )}
    >
      {children}
      <span
        className={cn(
          "grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
          active ? "bg-white/20 text-primary-foreground" : "bg-foreground/10",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function SpotCard({ s }: { s: SpotItem }) {
  return (
    <Link
      href={`/dia-diem/${s.slug}`}
      className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-muted ring-1 ring-inset ring-white/10"
    >
      <Image
        src={coverUrl(s.images, s.slug, 640, 800)}
        alt={s.name}
        fill
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
      <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />

      {s.categoryLabel && (
        <span className="absolute left-3 top-3 rounded-full bg-white/15 px-2.5 py-1 text-[0.7rem] font-semibold text-white backdrop-blur">
          {s.categoryLabel}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 p-4">
        {s.placeName && (
          <p className="flex items-center gap-1 truncate text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-white/75">
            <Ic icon="map-pin" className="size-3 shrink-0" aria-hidden />
            {s.placeName}
          </p>
        )}
        <h3 className="mt-1 text-balance text-lg font-bold leading-snug tracking-tight text-white drop-shadow-sm">
          {s.name}
        </h3>
        {s.tagline && (
          <p className="mt-1 line-clamp-1 text-[13px] leading-relaxed text-white/65">
            {s.tagline}
          </p>
        )}
      </div>
    </Link>
  );
}
