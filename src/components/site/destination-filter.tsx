"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Search, Star, X } from "@/components/icons";
import { cn } from "@/lib/utils";
import { SectionTabs } from "@/components/site/section-tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { coverUrl } from "@/lib/place-image";
import { Rail } from "@/components/site/rail";
import { RiseInView } from "@/components/site/reveal";

export type DestItem = {
  slug: string;
  name: string;
  tagline: string | null;
  isFeatured: boolean;
  viewCount: number;
  images: { url: string; isCover: boolean }[];
  parentName: string | null;
  region: string;
  counts: { spot: number; eatery: number; stay: number; activity: number };
  isProvince?: boolean;
  childCount?: number;
  childNames?: string[];
  childTotal?: number;
};

export type ProvinceItem = {
  slug: string;
  name: string;
  region: string;
  isFeatured: boolean;
  treatAsDestination: boolean;
  childCount: number;
  childNames: string[];
  childTotal: number;
  hasContent: boolean;
  tagline: string | null;
  viewCount: number;
  images: { url: string; isCover: boolean }[];
  counts: { spot: number; eatery: number; stay: number; activity: number };
};

function provinceAsCard(p: ProvinceItem): DestItem {
  return {
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    isFeatured: p.isFeatured,
    viewCount: p.viewCount,
    images: p.images,
    parentName: null,
    region: p.region,
    counts: p.counts,
    isProvince: true,
    childCount: p.childCount,
    childNames: p.childNames,
    childTotal: p.childTotal,
  };
}

type SortKey = "featured" | "popular" | "az";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Nổi bật" },
  { key: "popular", label: "Phổ biến" },
  { key: "az", label: "A → Z" },
];

const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .trim();
}

function shortRegion(label: string): string {
  if (label === "Miền Trung & Tây Nguyên") return "Trung";
  return label.replace(/^Miền\s+/, "");
}

function sortItems(items: DestItem[], key: SortKey): DestItem[] {
  const byName = (a: DestItem, b: DestItem) => a.name.localeCompare(b.name, "vi");
  return [...items].sort((a, b) => {
    if (key === "az") return byName(a, b);
    if (key === "popular") return b.viewCount - a.viewCount || byName(a, b);
    return (
      Number(b.isFeatured) - Number(a.isFeatured) ||
      b.viewCount - a.viewCount ||
      byName(a, b)
    );
  });
}

export function DestinationFilter({
  items,
  provinces,
  regions,
}: {
  items: DestItem[];
  provinces: ProvinceItem[];
  regions: string[];
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");

  const q = norm(query);
  const matches = (d: DestItem) =>
    !q ||
    norm(d.name).includes(q) ||
    (d.parentName ? norm(d.parentName).includes(q) : false);

  const sections = regions
    .map((r) => {
      const provs = q ? [] : provinces.filter((p) => p.region === r);
      const provCards = provinces
        .filter((p) => p.region === r && p.treatAsDestination)
        .map(provinceAsCard)
        .filter(matches);
      return {
        label: r,
        dests: sortItems(
          [...items.filter((d) => d.region === r && matches(d)), ...provCards],
          sort,
        ),
        provsOpen: provs.filter((p) => p.hasContent),
        provsSoon: provs.filter((p) => !p.hasContent),
        provCount: provs.length,
      };
    })
    .filter((g) => g.dests.length > 0 || g.provCount > 0);

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 border-b border-border/40 bg-background/90 backdrop-blur sm:-mx-6 lg:top-16">
        <div className="flex flex-col gap-1.5 px-4 py-2 sm:flex-row sm:items-center sm:gap-8 sm:px-6">
          <div className="-mx-1 flex items-center overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:shrink-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            <SectionTabs
              labels={sections.map((g) => shortRegion(g.label))}
              idPrefix="mien"
              ariaLabel="Chuyển nhanh theo miền"
              resetKey={`${query}|${sort}`}
              indicator="solid"
              shapeClassName="rounded-none"
              tabClassName={cn(MICRO, "h-9 px-4 sm:px-5")}
            />
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-4 sm:gap-6">
            <div className="group relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm điểm đến…"
                aria-label="Tìm điểm đến"
                className="h-9 w-full border border-border bg-transparent pl-8 pr-8 text-[0.8125rem] outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-foreground [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Xóa tìm kiếm"
                  className="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Sắp xếp: ${SORTS.find((x) => x.key === sort)?.label}`}
                  className="inline-flex h-9 shrink-0 items-center gap-2 border border-border bg-transparent px-3 text-[0.8125rem] font-medium transition-colors hover:border-foreground focus-visible:border-foreground focus-visible:outline-none"
                >
                  {SORTS.find((x) => x.key === sort)?.label}
                  <ChevronDown
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[9rem]">
                <DropdownMenuRadioGroup
                  value={sort}
                  onValueChange={(v) => setSort(v as SortKey)}
                >
                  {SORTS.map((s) => (
                    <DropdownMenuRadioItem
                      key={s.key}
                      value={s.key}
                      className={cn(
                        "pl-2 [&>span:first-child]:hidden",
                        sort === s.key
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {s.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <span
            aria-hidden
            className="grid size-12 place-items-center rounded-[3px] bg-muted text-muted-foreground"
          >
            <Search className="size-5" />
          </span>
          <p className="mt-4 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
            Không tìm thấy điểm đến nào
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Thử một tên khác, hoặc tên tỉnh chứa điểm đến đó.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-5 inline-flex h-9 items-center rounded-[3px] border border-border px-4 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
          >
            Xóa tìm kiếm
          </button>
        </div>
      ) : (
        <div className="mt-10 space-y-16 sm:space-y-20">
          {sections.map((g, i) => {
            const heading = (
              <RiseInView distance={14}>
              <h2 className="font-[family-name:var(--font-serif)] text-[clamp(1.25rem,2.8vw,2rem)] font-normal uppercase leading-[1.2] tracking-[0.1em] sm:tracking-[0.14em]">
                {g.label}
              </h2>
              </RiseInView>
            );
            return (
            <section
              key={g.label}
              id={`mien-${i}`}
              className="group/mien scroll-mt-28 sm:scroll-mt-20 lg:scroll-mt-32"
            >
              {g.dests.length > 0 ? (
                <div
                  style={
                    {
                      "--bleed":
                        "max(0px, min(calc(50vw - 45rem - 0.5rem), calc((var(--items) * 27rem - 90rem) / 2)))",
                      "--items": String(g.dests.length),
                    } as React.CSSProperties
                  }
                  className="group/bleed xl:mx-[calc(-1*var(--bleed))]"
                >
                <Rail
                  heading={heading}
                  meta={
                    <span className={cn(MICRO, "text-muted-foreground")}>
                      <span className="text-foreground tabular-nums">
                        {g.dests.length}
                      </span>{" "}
                      điểm đến
                    </span>
                  }
                  headingClassName="xl:px-[var(--bleed)]"
                  contentClassName="xl:pl-[var(--bleed)]"
                  viewportClassName="transition-[clip-path,translate] duration-500 ease-out motion-reduce:transition-none xl:mr-[calc(-1*var(--bleed))] xl:[clip-path:inset(0_calc(2*var(--bleed))_0_var(--bleed))] xl:group-hover/mien:-translate-x-[var(--bleed)] xl:group-hover/mien:[clip-path:inset(0_0_0_var(--bleed))]"
                  itemClassName="basis-[86%] sm:basis-[60%] lg:basis-[44%] xl:basis-[27rem]"
                  progress
                >
                  {g.dests.map((d, di) => (
                    <RiseInView key={d.slug} delay={Math.min(di, 3) * 0.07}>
                      <DestCard d={d} />
                    </RiseInView>
                  ))}
                </Rail>
                </div>
              ) : (
                heading
              )}

              {g.provCount > 0 && (
                <div className="mt-8">
                  <p className={cn(MICRO, "text-muted-foreground")}>
                    Tỉnh thành
                  </p>

                  {g.provsOpen.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {g.provsOpen.map((p) => (
                        <ProvinceChip key={p.slug} p={p} />
                      ))}
                    </div>
                  )}

                  {g.provsSoon.length > 0 && (
                    <p className="mt-3.5 text-xs leading-relaxed text-muted-foreground/70">
                      <span
                        className={cn(MICRO, "mr-2 text-muted-foreground/60")}
                      >
                        Đang cập nhật
                      </span>
                      {g.provsSoon.map((p) => p.name).join(", ")}
                    </p>
                  )}
                </div>
              )}
            </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProvinceChip({ p }: { p: ProvinceItem }) {
  return (
    <Link
      href={`/diem-den/${p.slug}`}
      className="inline-flex items-center gap-1.5 rounded-[3px] border border-border bg-card py-1.5 pl-3.5 pr-3 text-sm font-medium text-foreground/85 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
    >
      {p.isFeatured && (
        <Star className="size-3.5 shrink-0 text-warm" aria-hidden />
      )}
      {p.name}
      {p.childCount >= 2 ? (
        <span
          aria-label={`${p.childCount} điểm đến`}
          className="grid h-4 min-w-4 place-items-center rounded-[2px] bg-primary/10 px-1 text-[10px] font-semibold tabular-nums text-primary"
        >
          {p.childCount}
        </span>
      ) : (
        <span aria-hidden className="w-0.5" />
      )}
    </Link>
  );
}

const FACTS: { key: keyof DestItem["counts"]; label: string }[] = [
  { key: "spot", label: "địa điểm" },
  { key: "eatery", label: "quán ăn" },
  { key: "stay", label: "chỗ ở" },
  { key: "activity", label: "trải nghiệm" },
];

function DestCard({ d }: { d: DestItem }) {
  const facts = FACTS.filter((f) => d.counts[f.key] > 0);
  const names = d.isProvince ? (d.childNames ?? []) : [];
  const total = d.childTotal ?? d.childCount ?? 0;
  const SLOTS = FACTS.length; 

  const CHIP_SLOTS = 3;
  const chips =
    total > CHIP_SLOTS
      ? [
          ...names.slice(0, CHIP_SLOTS - 1),
          `+${total - (CHIP_SLOTS - 1)} nơi`,
        ]
      : names.slice(0, CHIP_SLOTS);

  const rows: { key: string; text: React.ReactNode }[] =
    names.length > 0
      ? 
        (total > SLOTS
          ? [
              ...names.slice(0, SLOTS - 1),
              `+${total - (SLOTS - 1)} nơi khác`,
            ]
          : names.slice(0, SLOTS)
        ).map((n, i) => ({
          key: `${i}-${n}`,
          text:
            total > SLOTS && i === SLOTS - 1 ? (
              <span className="text-white/60">{n}</span>
            ) : (
              <span className="font-medium text-white">{n}</span>
            ),
        }))
      : [
          ...(d.isProvince && total
            ? [
                {
                  key: "child",
                  text: (
                    <>
                      <span className="font-semibold tabular-nums text-white">
                        {total}
                      </span>{" "}
                      điểm đến
                    </>
                  ),
                },
              ]
            : []),
          ...facts.map((f) => ({
            key: f.key,
            text: (
              <>
                <span className="font-semibold tabular-nums text-white">
                  {d.counts[f.key]}
                </span>{" "}
                {f.label}
              </>
            ),
          })),
        ].slice(0, SLOTS);

  const blanks = SLOTS - rows.length;

  return (
    <Link
      href={`/diem-den/${d.slug}`}
      className="group relative block aspect-[3/2] overflow-hidden bg-muted"
    >
      <Image
        src={coverUrl(d.images, d.slug, 900, 600)}
        alt=""
        fill
        sizes="(min-width: 1280px) 31vw, (min-width: 1024px) 44vw, (min-width: 640px) 60vw, 86vw"
        className="object-cover"
      />

      <span
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.84)_0%,rgba(0,0,0,0.7)_22%,rgba(0,0,0,0.54)_44%,rgba(0,0,0,0.32)_64%,rgba(0,0,0,0.1)_84%,rgba(0,0,0,0.04)_100%)] opacity-80 transition-opacity duration-300 group-hover:opacity-[0.92] motion-reduce:transition-none"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/12 transition-[box-shadow] duration-300 group-hover:ring-white/55 motion-reduce:transition-none"
      />

      {d.isFeatured && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 bg-white/95 py-1 pl-2 pr-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-neutral-900 shadow-sm backdrop-blur-sm">
          <Star className="size-3 shrink-0 text-[#a34c00]" aria-hidden />
          Nổi bật
        </span>
      )}

      <span className="absolute inset-0 flex flex-col p-4 sm:p-5">
        <span className="flex flex-1 flex-col items-center justify-center px-2 pt-6 text-center">
          {(d.parentName ?? d.isProvince) && (
            <span className="max-w-full truncate font-[family-name:var(--font-rounded)] text-[0.8125rem] italic text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
              {d.parentName ?? "Tỉnh"}
            </span>
          )}

          <span className="mt-1 line-clamp-2 font-[family-name:var(--font-display)] text-[1.35rem] font-normal leading-[1.18] tracking-[-0.015em] text-white underline-offset-[6px] [text-shadow:0_1px_3px_rgba(0,0,0,0.45)] sm:text-[1.5rem] lg:text-[2rem]">
            {d.name}
          </span>

          {d.tagline && (
            <span className="mt-2 line-clamp-2 max-w-[94%] text-[0.9375rem] leading-snug text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] max-sm:hidden">
              {d.tagline}
            </span>
          )}
        </span>

        {names.length > 0 ? (
          <span className="grid min-h-[3.5rem] grid-cols-3 content-start gap-x-3 sm:gap-x-4">
            {chips.map((n, i) => (
              <span
                key={`${i}-${n}`}
                className={cn(
                  "mt-2 truncate border-t border-white/30 pt-1.5 text-[0.75rem] leading-tight [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]",
                  total > CHIP_SLOTS && i === chips.length - 1
                    ? "text-white/60"
                    : "font-medium text-white",
                )}
              >
                {n}
              </span>
            ))}
          </span>
        ) : (
          <span className="grid grid-cols-2 gap-x-5 sm:gap-x-8">
            {rows.map((r) => (
              <span
                key={r.key}
                className="mt-2 truncate border-t border-white/30 pt-1.5 text-[0.75rem] leading-tight text-white/75 [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]"
              >
                {r.text}
              </span>
            ))}
            {Array.from({ length: blanks }, (_, i) => (
              <span
                key={`blank-${i}`}
                aria-hidden
                className="invisible mt-2 pt-1.5 text-[0.75rem] leading-tight"
              >
                &nbsp;
              </span>
            ))}
          </span>
        )}
      </span>
    </Link>
  );
}
