"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Ic } from "@/components/icon";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { Rail } from "@/components/site/rail";
import { SectionTabs } from "@/components/site/section-tabs";

export type SpotItem = {
  slug: string;
  name: string;
  tagline: string | null;
  categoryValue: string | null;
  categoryLabel: string | null;
  placeName: string | null;
  placeSlug: string | null;
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

const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";
const GLASS = "rounded-full bg-black/35 text-white backdrop-blur-md";

// Bỏ dấu để tìm kiếm không phân biệt dấu/hoa thường.
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .trim();
}

// Danh sách địa điểm toàn quốc.
//
// DỰNG THEO KHUÔN /diem-den (xem `destination-filter.tsx`): thanh dính
// tìm-kiếm · chuyển-nhanh · sắp-xếp, rồi thân trang chia thành SECTION có tiêu
// đề cỡ lớn + rail thẻ ảnh. Bản trước là một LƯỚI PHẲNG 18 thẻ đổ liền một mạch
// — không có mốc nào để mắt bám, và một bãi biển Phan Thiết nằm ngay cạnh một
// mỏm núi Tà Xùa mà không có gì nói rằng chúng ở hai đầu đất nước.
//
// TRỤC NHÓM LÀ ĐIỂM ĐẾN, KHÔNG PHẢI LOẠI HÌNH — và đây là chỗ dễ làm ngược.
// Trang này vốn tồn tại để duyệt theo CHỦ ĐỀ (cắt ngang tỉnh), nên nhóm theo
// loại hình nghe hợp lý hơn. Nhưng đếm thử trên dữ liệu thật: 18 địa điểm rải ra
// 10 loại hình với phân bố 4·3·2·2·2·1·1·1·1·1 — một nửa số nhóm chỉ có ĐÚNG MỘT
// mục, tức là mười tiêu đề cỡ lớn cho mười cái rail gần như rỗng. Nhóm theo điểm
// đến thì ra 9·8·1, đúng dáng ba miền của /diem-den (12·14·5).
// Chủ đề vẫn là trục chính của trang, nhưng nó sống ở BỘ LỌC (hàng chip loại
// hình) — chỗ nó không cần dữ liệu dày mới dùng được.
export function SpotFilter({
  items,
  categories,
  places,
}: {
  items: SpotItem[];
  categories: { value: string; label: string; count: number }[];
  /** Điểm đến có địa điểm, theo thứ tự muốn hiện. */
  places: { slug: string; name: string }[];
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
        if (sort === "popular")
          return b.popularity - a.popularity || byName(a, b);
        return (
          Number(b.isFeatured) - Number(a.isFeatured) ||
          b.popularity - a.popularity ||
          byName(a, b)
        );
      });
  }, [items, cat, q, sort]);

  // Section theo điểm đến; địa điểm chưa gắn nơi nào dồn về nhóm cuối.
  const sections = useMemo(() => {
    const groups = places.map((p) => ({
      slug: p.slug,
      label: p.name,
      spots: filtered.filter((s) => s.placeSlug === p.slug),
    }));
    const orphan = filtered.filter(
      (s) => !s.placeSlug || !places.some((p) => p.slug === s.placeSlug),
    );
    if (orphan.length > 0)
      groups.push({ slug: "khac", label: "Nơi khác", spots: orphan });
    return groups.filter((g) => g.spots.length > 0);
  }, [filtered, places]);

  return (
    <div>
      {/* Thanh điều khiển dính — cùng ba nhóm, cùng hai hình dạng với /diem-den:
          chuyển nhanh = TAB viên sáng trượt (nói "bạn đang ở đâu"), sắp xếp =
          segmented viên nổi (một lựa chọn, giữ nguyên tới khi đổi). */}
      <div className="sticky top-0 z-30 -mx-4 border-b border-border/60 bg-background/85 backdrop-blur sm:-mx-6 lg:top-16">
        {/* HAI HÀNG dưới sm, MỘT hàng từ sm: nhồi cả ba nhóm vào một hàng ở khổ
            320–390px thì nhóm sắp xếp bị đẩy hẳn ra ngoài mép phải. */}
        <div className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
          <div className="relative sm:w-56 sm:shrink-0">
            <Ic
              icon="search"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm địa điểm…"
              aria-label="Tìm địa điểm"
              className="h-9 w-full rounded-full border border-border bg-card pl-9 pr-8 text-sm outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-primary/50 focus:ring-2 focus:ring-primary/15 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Xóa tìm kiếm"
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Ic icon="x" className="size-3.5" aria-hidden />
              </button>
            )}
          </div>

          {/* `md:contents` chứ không `sm:contents`: ở dải 640–767px ba nhóm cộng
              lại vẫn rộng hơn cột nội dung, mà `contents` thì bọc ngoài biến mất
              nên không còn ai cuộn được. */}
          <div className="flex items-center gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:min-w-0 sm:flex-1 md:contents [&::-webkit-scrollbar]:hidden">
            <SectionTabs
              labels={sections.map((g) => g.label)}
              idPrefix="noi"
              ariaLabel="Chuyển nhanh theo điểm đến"
              resetKey={`${query}|${cat ?? ""}|${sort}`}
            />

            <div
              role="group"
              aria-label="Sắp xếp"
              className="ml-auto flex h-9 w-fit shrink-0 items-center rounded-full bg-muted p-0.5 sm:gap-0.5 sm:p-1"
            >
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSort(s.key)}
                  aria-pressed={sort === s.key}
                  className={cn(
                    "inline-flex h-full items-center whitespace-nowrap rounded-full px-2.5 text-sm font-medium transition-colors sm:px-3.5",
                    sort === s.key
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lọc theo LOẠI HÌNH — trục chủ đề của trang. Đứng thành hàng riêng dưới
          thanh dính chứ không nhét vào trong: thanh đã có ba nhóm, thêm mười
          chip nữa thì nó thành một khối điều khiển cao hơn cả thẻ đầu tiên.
          /diem-den không có hàng này vì miền vừa là bộ lọc vừa là trục nhóm. */}
      {categories.length > 0 && (
        <div className="mt-7 flex flex-wrap gap-2">
          <CatChip
            active={cat === null}
            onClick={() => setCat(null)}
            count={items.length}
          >
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

      {sections.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <Ic icon="search" className="size-5" aria-hidden />
          </span>
          <p className="mt-4 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
            Không tìm thấy địa điểm nào
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Thử một tên khác, hoặc tên nơi chứa địa điểm đó.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCat(null);
            }}
            className="mt-5 inline-flex h-9 items-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <div className="mt-10 space-y-16 sm:space-y-20">
          {sections.map((g, i) => (
            <section
              key={g.slug}
              id={`noi-${i}`}
              // scroll-mt = chiều cao thanh dính (2 hàng dưới sm, 1 hàng từ sm)
              // cộng header 4rem từ lg.
              className="scroll-mt-28 sm:scroll-mt-20 lg:scroll-mt-32"
            >
              <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h2 className="min-w-0 font-[family-name:var(--font-display)] text-[clamp(1.75rem,3.4vw,2.75rem)] font-bold leading-[1.1] tracking-[-0.035em]">
                  {g.label}
                </h2>
                <p className="text-sm tabular-nums text-muted-foreground">
                  {g.spots.length} địa điểm
                </p>
                {/* Lối sang trang điểm đến của chính nơi này — thứ /diem-den
                    không có tương đương, nhưng ở đây thì có và nó đáng giá:
                    người đang xem địa điểm ở Tà Xùa gần như chắc chắn muốn xem
                    nốt chỗ ăn và chỗ ở của Tà Xùa. */}
                {g.slug !== "khac" && (
                  <Link
                    href={`/diem-den/${g.slug}`}
                    className="ml-auto inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    Trang {g.label}
                    <Ic icon="arrow-right" className="size-4" aria-hidden />
                  </Link>
                )}
              </header>

              <Rail
                itemClassName="basis-[78%] sm:basis-[46%] lg:basis-[32%] xl:basis-[24%]"
                // Thẻ ở đây là một khối ảnh đặc nên tâm của nó là 50%, khác mặc
                // định `top-[36%]` của Rail (canh cho thẻ có chữ ngoài khung ảnh).
                arrowClassName="top-1/2 -translate-y-1/2"
              >
                {g.spots.map((s) => (
                  <SpotCard key={s.slug} s={s} />
                ))}
              </Rail>
            </section>
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
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
      <span
        className={cn(
          "tabular-nums text-xs",
          active ? "text-primary/70" : "text-muted-foreground/70",
        )}
      >
        {count}
      </span>
    </button>
  );
}

// Thẻ địa điểm — CÙNG KHUÔN với DestCard ở /diem-den: khối ảnh đặc 4/5, chữ đặt
// trên ảnh dưới một lớp scrim dựng đứng, viền trong mảnh để thẻ tách khỏi nền
// sáng. Bản trước là ảnh 4/3 + huy hiệu loại hình nền trắng ở góc trên trái;
// thẻ thấp hơn nên phần chữ chiếm gần nửa thẻ và ảnh thôi làm chủ.
//
// Khác DestCard đúng MỘT chỗ: huy hiệu góc trên trái là LOẠI HÌNH chứ không phải
// "Nổi bật". Ở /diem-den, "nổi bật" phân biệt được vì chỉ ~1/3 số điểm đến có;
// còn ở đây loại hình là trục chính của trang, và nó khác nhau ở gần như mọi
// thẻ — tức là nó mang tin, trong khi một huy hiệu "Nổi bật" thì không.
function SpotCard({ s }: { s: SpotItem }) {
  return (
    <Link
      href={`/dia-diem/${s.slug}`}
      className="group relative block aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-muted"
    >
      <Image
        src={coverUrl(s.images, s.slug, 720, 900)}
        alt=""
        fill
        sizes="(min-width: 1280px) 24vw, (min-width: 1024px) 32vw, (min-width: 640px) 46vw, 78vw"
        className="object-cover"
      />

      <span
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.74)_16%,rgba(0,0,0,0.42)_36%,rgba(0,0,0,0.14)_55%,rgba(0,0,0,0)_72%)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-white/15"
      />

      {s.categoryLabel && (
        <span
          className={cn(
            GLASS,
            "absolute left-3 top-3 inline-flex items-center px-2.5 py-0.5 text-[0.65rem] font-semibold",
          )}
        >
          {s.categoryLabel}
        </span>
      )}

      <span className="absolute inset-x-0 bottom-0 flex flex-col p-4 sm:p-5">
        {/* Nơi chốn đứng TRÊN tên — mắt đọc "ở đâu → chỗ nào", đúng thứ tự người
            ta hỏi. `warm-bright` chứ không `warm`: đây là chữ nằm trên ảnh tối,
            và đó đúng là việc của biến này (xem globals.css). */}
        {s.placeName && (
          <span
            className={cn(
              MICRO,
              "flex items-center gap-1 text-warm-bright [text-shadow:0_1px_6px_rgba(0,0,0,0.7)]",
            )}
          >
            <Ic icon="map-pin" className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{s.placeName}</span>
          </span>
        )}

        <span className="mt-1.5 flex items-start gap-1.5">
          <span className="line-clamp-2 min-w-0 font-[family-name:var(--font-display)] text-lg font-bold leading-snug tracking-tight text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.6)] sm:text-xl">
            {s.name}
          </span>
          <Ic
            icon="arrow-up-right"
            className="mt-1 size-4 shrink-0 -translate-x-1 text-white opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none"
            aria-hidden
          />
        </span>

        {s.tagline && (
          <span className="mt-1 line-clamp-2 text-sm leading-relaxed text-white/80 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">
            {s.tagline}
          </span>
        )}
      </span>
    </Link>
  );
}
