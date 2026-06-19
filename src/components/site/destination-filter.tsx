"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { MapPin, ChevronDown, Search, X, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";

// Số card hiện ban đầu (3 hàng x 3 cột ở desktop) — phần dư ẩn sau "Xem thêm".
const LIMIT = 9;

export type DestItem = {
  slug: string;
  name: string;
  tagline: string | null;
  isFeatured: boolean;
  viewCount: number;
  images: { url: string; isCover: boolean }[];
  parentName: string | null;
  region: string;
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

// Nhãn miền rút gọn cho segmented (lọc vẫn theo nhãn đầy đủ).
function shortRegion(label: string): string {
  if (label === "Miền Trung & Tây Nguyên") return "Trung";
  return label.replace(/^Miền\s+/, "");
}

function sortItems(items: DestItem[], key: SortKey): DestItem[] {
  const byName = (a: DestItem, b: DestItem) => a.name.localeCompare(b.name, "vi");
  return [...items].sort((a, b) => {
    if (key === "az") return byName(a, b);
    if (key === "popular") return b.viewCount - a.viewCount || byName(a, b);
    // featured
    return (
      Number(b.isFeatured) - Number(a.isFeatured) ||
      b.viewCount - a.viewCount ||
      byName(a, b)
    );
  });
}

// Lưới điểm đến gộp chung + filter chọn miền (chip). region đã tính sẵn ở server.
export function DestinationFilter({
  items,
  regions,
}: {
  items: DestItem[];
  regions: string[];
}) {
  const [region, setRegion] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");
  const [expanded, setExpanded] = useState(false);

  const q = norm(query);
  const list = sortItems(
    items.filter(
      (d) =>
        (!region || d.region === region) &&
        (!q ||
          norm(d.name).includes(q) ||
          (d.parentName ? norm(d.parentName).includes(q) : false)),
    ),
    sort,
  );
  const visible = expanded ? list : list.slice(0, LIMIT);

  const filters = [
    { label: "Tất cả", value: null as string | null, count: items.length },
    ...regions.map((r) => ({
      label: r,
      value: r,
      count: items.filter((d) => d.region === r).length,
    })),
  ];

  return (
    <div>
      {/* Bộ lọc — search trên; (miền | sắp xếp) dưới, cùng họ pill h-10 */}
      <div className="flex flex-col gap-4">
        {/* Tìm kiếm */}
        <div className="relative sm:w-80">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setExpanded(false);
            }}
            placeholder="Tìm điểm đến…"
            aria-label="Tìm điểm đến"
            className="h-10 w-full rounded-full border border-border/60 bg-card pl-10 pr-9 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/15 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Xóa tìm kiếm"
              className="absolute right-3 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </div>

        {/* Miền (trái) + Sắp xếp (phải) */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Miền
            </span>
            <div className="min-w-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Segmented label="Miền">
                {filters.map((f) => (
                  <SegButton
                    key={f.label}
                    active={region === f.value}
                    onClick={() => {
                      setRegion(f.value);
                      setExpanded(false);
                    }}
                  >
                    {f.value ? shortRegion(f.label) : f.label}
                    <span
                      className={cn(
                        "ml-1.5 text-xs tabular-nums",
                        region === f.value
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground",
                      )}
                    >
                      {f.count}
                    </span>
                  </SegButton>
                ))}
              </Segmented>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sắp xếp
            </span>
            <Segmented label="Sắp xếp">
              {SORTS.map((s) => (
                <SegButton
                  key={s.key}
                  active={sort === s.key}
                  onClick={() => setSort(s.key)}
                >
                  {s.label}
                </SegButton>
              ))}
            </Segmented>
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Không tìm thấy điểm đến phù hợp.
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((d) => (
              <DestCard key={d.slug} d={d} />
            ))}
          </div>

          {list.length > LIMIT && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
              >
                {expanded
                  ? "Thu gọn"
                  : `Xem thêm ${list.length - LIMIT} điểm đến`}
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    expanded && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Track segmented dùng chung cho Sắp xếp & Miền.
function Segmented({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex h-10 w-fit shrink-0 items-center rounded-full border border-border/60 bg-card p-1"
    >
      {children}
    </div>
  );
}

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-full items-center whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function DestCard({ d }: { d: DestItem }) {
  return (
    <Link
      href={`/diem-den/${d.slug}`}
      className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-muted shadow-sm shadow-black/5"
    >
      <Image
        src={coverUrl(d.images, d.slug)}
        alt={d.name}
        fill
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-4">
        {d.parentName && (
          <p className="flex items-center gap-1 text-xs font-medium text-white/80">
            <MapPin className="size-3" aria-hidden />
            {d.parentName}
          </p>
        )}
        <h3 className="mt-1 flex items-center gap-1.5 text-xl font-bold leading-tight tracking-tight text-white">
          {d.isFeatured && (
            <Star
              className="size-4 shrink-0 fill-current text-warm"
              aria-label="Nổi bật"
            />
          )}
          {d.name}
        </h3>
        {d.tagline && (
          <p className="mt-1 line-clamp-1 text-sm text-white/80">{d.tagline}</p>
        )}
      </div>
    </Link>
  );
}
