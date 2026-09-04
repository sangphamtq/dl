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
import { R_BADGE, R_CARD, R_CTRL } from "@/lib/radius";

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
              tabClassName={cn(MICRO, "h-9 px-4 sm:px-5")}
            />
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-4 sm:gap-6">
            <div className="group relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm điểm đến…"
                aria-label="Tìm điểm đến"
                className={cn(R_CTRL, "h-9 w-full border border-border bg-transparent pl-9 pr-9 text-[0.8125rem] outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-foreground [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none")}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Xóa tìm kiếm"
                  className={cn(R_BADGE, "absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground")}
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
                  className={cn(R_CTRL, "inline-flex h-9 shrink-0 items-center gap-2 border border-border bg-transparent pl-4 pr-3.5 text-[0.8125rem] font-medium transition-colors hover:border-foreground focus-visible:border-foreground focus-visible:outline-none")}
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
            className={cn(R_CARD, "grid size-12 place-items-center bg-muted text-muted-foreground")}
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
            className={cn(R_CTRL, "mt-5 inline-flex h-9 items-center border border-border px-4 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary")}
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
                  // Bo ở KHUNG bọc + cắt tràn, nút bên trong để vuông: nhờ
                  // vậy nền hover phủ kín ô rồi bị chính khung bo lại, thay
                  // vì là một mảng bo góc lửng lơ trong một cái khung vuông.
                  arrowWrapClassName={cn(R_CTRL, "overflow-hidden")}
                  arrowClassName="hover:bg-foreground/90"
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
      className={cn(R_CTRL, "inline-flex items-center gap-1.5 border border-border bg-card py-1.5 pl-3.5 pr-3 text-sm font-medium text-foreground/85 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary")}
    >
      {p.isFeatured && (
        <Star className="size-3.5 shrink-0 text-warm" aria-hidden />
      )}
      {p.name}
      {p.childCount >= 2 ? (
        <span
          aria-label={`${p.childCount} điểm đến`}
          className={cn(R_BADGE, "grid h-[1.125rem] min-w-[1.125rem] place-items-center bg-primary/10 px-1.5 text-[10px] font-semibold tabular-nums text-primary")}
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

function Num({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold tabular-nums text-white">{children}</span>;
}

function DestCard({ d }: { d: DestItem }) {
  const facts = FACTS.filter((f) => d.counts[f.key] > 0);
  const names = d.isProvince ? (d.childNames ?? []) : [];
  const total = d.childTotal ?? d.childCount ?? 0;

  // Dòng dữ kiện ở đáy thẻ: TÊN các nơi bên trong (với tỉnh) hoặc số lượng nội
  // dung (với điểm đến). MỘT hàng, ngăn nhau bằng KHOẢNG TRẮNG.
  //
  // Bản trước chia thành lưới 2–3 cột, mỗi ô một gạch ngang phía trên — nên mỗi
  // thẻ tự vẽ thêm một cái bảng con bên trong khung ảnh vốn đã là hình chữ
  // nhật, và phải độn thêm ô trống vô hình cho các cột thẳng hàng. Dấu chấm nói
  // đúng cùng một ý (đây là các mẩu rời) mà không kẻ thêm nét nào.
  const NAME_SLOTS = 3;
  const FACT_SLOTS = 4;
  const meta: { key: string; text: React.ReactNode; dim?: boolean }[] =
    names.length > 0
      ? (total > NAME_SLOTS
          ? [
              ...names.slice(0, NAME_SLOTS - 1),
              `+${total - (NAME_SLOTS - 1)} nơi`,
            ]
          : names.slice(0, NAME_SLOTS)
        ).map((n, i, arr) => ({
          key: `${i}-${n}`,
          text: n,
          dim: total > NAME_SLOTS && i === arr.length - 1,
        }))
      : [
          ...(d.isProvince && total
            ? [
                {
                  key: "child",
                  text: (
                    <>
                      <Num>{total}</Num> điểm đến
                    </>
                  ),
                },
              ]
            : []),
          ...facts.map((f) => ({
            key: f.key,
            text: (
              <>
                <Num>{d.counts[f.key]}</Num> {f.label}
              </>
            ),
          })),
        ].slice(0, FACT_SLOTS);

  return (
    <Link
      href={`/diem-den/${d.slug}`}
      className={cn(
        R_CARD,
        "group relative block aspect-[3/2] overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <Image
        src={coverUrl(d.images, d.slug, 900, 600)}
        alt=""
        fill
        sizes="(min-width: 1280px) 31vw, (min-width: 1024px) 44vw, (min-width: 640px) 60vw, 86vw"
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />

      <span
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.84)_0%,rgba(0,0,0,0.7)_22%,rgba(0,0,0,0.54)_44%,rgba(0,0,0,0.32)_64%,rgba(0,0,0,0.1)_84%,rgba(0,0,0,0.04)_100%)] opacity-80 transition-opacity duration-300 group-hover:opacity-[0.92] motion-reduce:transition-none"
      />

      {d.isFeatured && (
        <span className={cn(R_BADGE, "absolute right-3 top-3 inline-flex items-center gap-1.5 bg-white/95 py-1 pl-2.5 pr-3 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-neutral-900 shadow-sm backdrop-blur-sm")}>
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

        {meta.length > 0 && (
          <span className="flex min-h-[1.25rem] flex-wrap items-center justify-center gap-x-5 gap-y-0.5 text-[0.75rem] leading-tight text-white/75 [text-shadow:0_1px_6px_rgba(0,0,0,0.65)]">
            {meta.map((m) => (
              <span
                key={m.key}
                className={cn("max-w-[11rem] truncate", m.dim && "text-white/55")}
              >
                {m.text}
              </span>
            ))}
          </span>
        )}
      </span>
    </Link>
  );
}
