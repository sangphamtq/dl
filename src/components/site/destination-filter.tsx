"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Search, X, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { Rail } from "@/components/site/rail";

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

export type ProvinceItem = {
  slug: string;
  name: string;
  region: string;
  isFeatured: boolean;
  childCount: number;
  hasContent: boolean;
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

// Nhãn miền rút gọn cho nav.
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

// Điểm đến trình bày theo MIỀN, mỗi miền một rail cuộn ngang (kiểu app du lịch).
// region đã tính sẵn ở server; còn tìm kiếm + sắp xếp.
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
  // -1 = chưa xác định (không tô miền nào) → tránh nháy về miền đầu trước khi
  // biết vị trí cuộn thật khi tải lại trang.
  const [activeRegion, setActiveRegion] = useState(-1);
  // Khi bấm chọn miền, scroll mượt đi ngang qua các miền giữa → khóa scroll-spy
  // vào miền đích để nav không nhấp nháy qua miền trung gian.
  const lockedRegion = useRef<number | null>(null);

  const q = norm(query);
  const matches = (d: DestItem) =>
    !q ||
    norm(d.name).includes(q) ||
    (d.parentName ? norm(d.parentName).includes(q) : false);

  // Mỗi miền: rail điểm đến + danh sách tỉnh (ẩn tỉnh khi đang tìm kiếm).
  const sections = regions
    .map((r) => ({
      label: r,
      dests: sortItems(
        items.filter((d) => d.region === r && matches(d)),
        sort,
      ),
      provs: q ? [] : provinces.filter((p) => p.region === r),
    }))
    .filter((g) => g.dests.length > 0 || g.provs.length > 0);

  // Scroll-spy: tô đậm miền đang xem trên nav.
  useEffect(() => {
    const els = sections
      .map((_, i) => document.getElementById(`mien-${i}`))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    // Tìm miền đang ở mốc ~30% chiều cao viewport.
    const measure = () => {
      const line = window.innerHeight * 0.3;
      let active = 0;
      els.forEach((el) => {
        if (el.getBoundingClientRect().top <= line)
          active = Number(el.id.split("-")[1]);
      });
      return active;
    };

    // Hoãn lần đo đầu sang frame kế (sau khi trình duyệt khôi phục vị trí cuộn)
    // và chặn observer tới khi đo xong → không nháy về miền đầu khi tải lại trang.
    let ready = false;
    const raf = requestAnimationFrame(() => {
      setActiveRegion(measure());
      ready = true;
    });

    const obs = new IntersectionObserver(
      (entries) => {
        if (!ready) return;
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          );
        if (!vis[0]) return;
        const top = Number(vis[0].target.id.split("-")[1]);
        // Đang cuộn theo lệnh click: bỏ qua miền giữa, chỉ nhả khóa khi tới đích.
        if (lockedRegion.current !== null) {
          if (top === lockedRegion.current) lockedRegion.current = null;
          else return;
        }
        setActiveRegion(top);
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    els.forEach((el) => obs.observe(el));
    // Nhả khóa khi cuộn mượt kết thúc (phòng khi không tới được đúng đỉnh đích).
    const onScrollEnd = () => {
      lockedRegion.current = null;
    };
    window.addEventListener("scrollend", onScrollEnd);
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
      window.removeEventListener("scrollend", onScrollEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, sort, sections.length]);

  return (
    <div>
      {/* Toolbar sticky: tìm kiếm + nav miền + sắp xếp — cùng một hàng */}
      <div className="sticky top-16 z-30 -mx-4 border-b border-border/60 bg-background/85 backdrop-blur sm:-mx-6">
        <div className="flex items-center gap-3 overflow-x-auto px-4 py-3 sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Tìm kiếm */}
          <div className="relative w-44 shrink-0 sm:w-60">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm điểm đến…"
              aria-label="Tìm điểm đến"
              className="h-10 w-full rounded-md border border-transparent bg-muted pl-10 pr-9 text-sm outline-none transition-colors focus:border-primary/40 focus:bg-background [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Xóa tìm kiếm"
                className="absolute right-3 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </div>

          {/* Nav miền */}
          {sections.length > 1 && (
            <Segmented label="Chuyển nhanh theo miền">
              {sections.map((g, i) => (
                <SegButton
                  key={g.label}
                  active={activeRegion === i}
                  onClick={() => {
                    setActiveRegion(i);
                    lockedRegion.current = i;
                    document
                      .getElementById(`mien-${i}`)
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  {shortRegion(g.label)}
                </SegButton>
              ))}
            </Segmented>
          )}

          {/* Sắp xếp */}
          <Segmented label="Sắp xếp" className="ml-auto">
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

      {sections.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          Không tìm thấy điểm đến phù hợp.
        </p>
      ) : (
        <div className="mt-8 space-y-14">
          {sections.map((g, i) => (
            <section key={g.label} id={`mien-${i}`} className="scroll-mt-36">
              <div className="flex items-baseline gap-3">
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                  {g.label}
                </h2>
                {g.dests.length > 0 && (
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {g.dests.length} điểm đến
                  </span>
                )}
              </div>

              {g.dests.length > 0 && (
                <Rail
                  itemClassName="basis-[68%] sm:basis-[42%] lg:basis-[29%] xl:basis-[23%]"
                  arrowClassName="top-1/2 -translate-y-1/2"
                >
                  {g.dests.map((d) => (
                    <DestCard key={d.slug} d={d} />
                  ))}
                </Rail>
              )}

              {g.provs.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Tỉnh thành
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {g.provs.map((p) => (
                      <ProvinceChip key={p.slug} p={p} />
                    ))}
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// Track segmented dùng chung cho Sắp xếp & Miền.
function Segmented({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex h-10 w-fit shrink-0 items-center rounded-lg bg-muted p-1",
        className,
      )}
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
        "inline-flex h-full items-center whitespace-nowrap rounded-md px-3.5 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ProvinceChip({ p }: { p: ProvinceItem }) {
  if (!p.hasContent) {
    return (
      <span
        aria-disabled="true"
        title="Đang cập nhật"
        className="inline-flex cursor-not-allowed items-center rounded-md border border-dashed border-border/50 px-3 py-1.5 text-sm text-muted-foreground/50"
      >
        {p.name}
      </span>
    );
  }
  return (
    <Link
      href={`/diem-den/${p.slug}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-sm transition-colors hover:bg-primary/10 hover:text-primary",
        p.isFeatured && "font-medium",
      )}
    >
      {p.isFeatured && (
        <Star className="size-3.5 text-warm/80" aria-hidden />
      )}
      {p.name}
      {p.childCount >= 2 && (
        <span
          title={`${p.childCount} điểm đến`}
          aria-label={`${p.childCount} điểm đến`}
          className="grid h-4 min-w-4 place-items-center rounded-sm bg-primary/10 px-1 text-[10px] font-semibold tabular-nums text-primary"
        >
          {p.childCount}
        </span>
      )}
    </Link>
  );
}

function DestCard({ d }: { d: DestItem }) {
  return (
    <Link href={`/diem-den/${d.slug}`} className="block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
        <Image
          src={coverUrl(d.images, d.slug, 600, 800)}
          alt={d.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-white/80">
            {d.isFeatured && (
              <Star
                className="size-3.5 shrink-0 fill-current text-warm"
                aria-label="Nổi bật"
              />
            )}
            {d.parentName && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" aria-hidden />
                {d.parentName}
              </span>
            )}
          </div>
          <h3 className="mt-1 text-balance text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl">
            {d.name}
          </h3>
          {d.tagline && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-white/80">
              {d.tagline}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
