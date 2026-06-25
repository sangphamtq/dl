"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  ChevronRight,
  Clock,
  Compass,
  LayoutGrid,
  List,
  MapPin,
  Ticket,
} from "lucide-react";
import { coverUrl } from "@/lib/place-image";
import { cn } from "@/lib/utils";
import { ListingCard } from "@/components/site/listing-card";

type Fact = { kind: "location" | "price" | "time"; text: string };
type Item = {
  slug: string;
  name: string;
  description: string | null;
  tag: string | null;
  tags: string[];
  meta: string[];
  facts: Fact[];
  activities: { slug: string; name: string }[];
  images: { url: string; isCover: boolean }[];
  isFeatured: boolean;
};
type Group = { title: string; prefix: string; items: Item[] };

export type ListingViewMode = "grid" | "list";

// Trang danh sách listing: chuyển Lưới ↔ Danh sách. Lựa chọn lưu vào cookie
// (server đọc & render đúng view ngay từ đầu → không nhảy khi load lại).
export function ListingView({
  groups,
  initialView = "grid",
}: {
  groups: Group[];
  initialView?: ListingViewMode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState<ListingViewMode>(initialView);
  const [filter, setFilter] = useState<string>(
    () => searchParams.get("cat") ?? "all",
  );

  const choose = (v: ListingViewMode) => {
    setView(v);
    document.cookie = `listingView=${v};path=/;max-age=31536000;samesite=lax`;
  };

  // Lưu loại đang lọc vào URL (?cat=) để giữ khi chia sẻ/quay lại.
  const chooseFilter = (f: string) => {
    setFilter(f);
    const params = new URLSearchParams(searchParams.toString());
    if (f === "all") params.delete("cat");
    else params.set("cat", f);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Các loại (tag) có trong dữ liệu — để dựng bộ lọc.
  const allTags = Array.from(
    new Set(groups.flatMap((g) => g.items.map((it) => it.tag).filter(Boolean))),
  ) as string[];

  return (
    <div className="space-y-14">
      {/* Toolbar: lọc theo loại + chuyển Lưới/Danh sách */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {allTags.length > 1 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip active={filter === "all"} onClick={() => chooseFilter("all")}>
              Tất cả
            </FilterChip>
            {allTags.map((t) => (
              <FilterChip
                key={t}
                active={filter === t}
                onClick={() => chooseFilter(t)}
              >
                {t}
              </FilterChip>
            ))}
          </div>
        ) : (
          <span />
        )}
        <div className="flex h-10 shrink-0 items-center self-end rounded-full bg-muted p-1 sm:self-auto">
          <ToggleBtn
            active={view === "grid"}
            onClick={() => choose("grid")}
            icon={LayoutGrid}
            label="Lưới"
          />
          <ToggleBtn
            active={view === "list"}
            onClick={() => choose("list")}
            icon={List}
            label="Danh sách"
          />
        </div>
      </div>

      {groups.map((g) => {
        const items =
          filter === "all" ? g.items : g.items.filter((it) => it.tag === filter);
        if (filter !== "all" && items.length === 0) return null;
        // List: nếu mục đầu nổi bật → tách làm card "lead" lớn, còn lại là rows.
        const lead = view === "list" && items[0]?.isFeatured ? items[0] : null;
        const rows = lead ? items.slice(1) : items;
        return (
        <section key={g.prefix}>
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold tracking-tight">{g.title}</h2>
            <p className="shrink-0 text-sm text-muted-foreground">
              {items.length} mục
            </p>
          </div>

          {items.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">
              Chưa có nội dung trong mục này.
            </p>
          ) : view === "grid" ? (
            <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((it) => (
                <GridCard key={it.slug} item={it} prefix={g.prefix} />
              ))}
            </div>
          ) : (
            <div className="mt-7 space-y-7">
              {lead && (
                <ListingCard
                  featured
                  href={`/${g.prefix}/${lead.slug}`}
                  name={lead.name}
                  slug={lead.slug}
                  images={lead.images}
                  subtitle={lead.description}
                  tag={lead.tag}
                  meta={lead.meta}
                />
              )}
              {rows.length > 0 && (
                <ul className="border-t border-border/60">
                  {rows.map((it) => (
                    <li key={it.slug} className="border-b border-border/60">
                      <Link
                        href={`/${g.prefix}/${it.slug}`}
                        className="group flex items-center gap-4 py-4 sm:gap-6"
                      >
                        <div className="relative aspect-[4/3] w-36 shrink-0 overflow-hidden rounded-xl bg-muted sm:w-56">
                          <Image
                            src={coverUrl(it.images, it.slug, 480, 360)}
                            alt={it.name}
                            fill
                            sizes="(min-width: 640px) 224px, 144px"
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                          />
                          {it.tag && (
                            <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur">
                              {it.tag}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold tracking-tight transition-colors group-hover:text-primary sm:text-lg">
                            {it.name}
                          </h3>
                          {it.description && (
                            <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                              {it.description}
                            </p>
                          )}

                          <FactsRow facts={it.facts} stacked />
                          <CardMeta meta={it.meta} tags={it.tags} />
                          {it.activities.length > 0 && (
                            <p className="mt-2.5 flex items-start gap-1.5 text-sm leading-relaxed text-muted-foreground">
                              <Compass
                                className="mt-0.5 size-4 shrink-0 text-primary"
                                aria-hidden
                              />
                              <span>
                                <span className="font-medium text-foreground/80">
                                  Trải nghiệm:{" "}
                                </span>
                                {it.activities.map((a) => a.name).join(", ")}
                              </span>
                            </p>
                          )}
                        </div>
                        <ChevronRight
                          className="hidden size-5 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary sm:block"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
        );
      })}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1 text-sm font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

const FACT_ICON = { location: MapPin, price: Ticket, time: Clock } as const;

// Facts có icon: vị trí · giá vé · mùa (Địa điểm).
// stacked = xếp dọc (list, rõ ràng hơn); ngược lại inline gọn (grid).
function FactsRow({ facts, stacked = false }: { facts: Fact[]; stacked?: boolean }) {
  if (facts.length === 0) return null;
  return (
    <div
      className={cn(
        "text-muted-foreground",
        stacked
          ? "mt-2.5 flex flex-col gap-1.5 text-sm"
          : "mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs",
      )}
    >
      {facts.map((f, i) => {
        const Icon = FACT_ICON[f.kind];
        const free = f.kind === "price" && /miễn phí/i.test(f.text);
        return (
          <span
            key={i}
            className={cn(
              "inline-flex items-center gap-1.5",
              free && "font-semibold text-primary",
            )}
          >
            <Icon
              className={cn(
                "shrink-0",
                stacked ? "size-4" : "size-3.5",
                free ? "text-primary" : "text-muted-foreground/70",
              )}
              aria-hidden
            />
            {f.text}
          </span>
        );
      })}
    </div>
  );
}

// Meta (fact: loại, giá, giờ…) + tags — dùng chung grid & list.
// Meta = pill bo nhẹ, đậm hơn (thông tin chính); tags = pill bo tròn, nhạt.
function CardMeta({ meta, tags }: { meta: string[]; tags: string[] }) {
  if (meta.length === 0 && tags.length === 0) return null;
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      {meta.map((m, i) => (
        <span
          key={i}
          className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground/70"
        >
          {m}
        </span>
      ))}
      {tags.slice(0, 3).map((t) => (
        <span
          key={t}
          className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function GridCard({ item: it, prefix }: { item: Item; prefix: string }) {
  return (
    <Link href={`/${prefix}/${it.slug}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        <Image
          src={coverUrl(it.images, it.slug)}
          alt={it.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {it.tag && (
          <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur">
            {it.tag}
          </span>
        )}
      </div>
      <h3 className="mt-3 font-semibold tracking-tight line-clamp-1 transition-colors group-hover:text-primary">
        {it.name}
      </h3>
      {it.description && (
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {it.description}
        </p>
      )}
      <FactsRow facts={it.facts} />
      {it.meta.length > 0 && <CardMeta meta={it.meta} tags={[]} />}
      {it.activities.length > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Compass className="size-3.5 shrink-0 text-primary/80" aria-hidden />
          <span className="truncate">
            {it.activities.map((a) => a.name).join(" · ")}
          </span>
        </p>
      )}
    </Link>
  );
}

function ToggleBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof LayoutGrid;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-full items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
