"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { LayoutGrid, List } from "lucide-react";
import { coverUrl } from "@/lib/place-image";
import { cn } from "@/lib/utils";
import { StarRating } from "@/components/site/star-rating";

type Fact = { kind: "location" | "price" | "time"; text: string };
type Item = {
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  review: { stars: number; total: number } | null;
  price: string | null;
  highlights: string[];
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
type SortMode = "featured" | "rating" | "name";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "featured", label: "Nổi bật" },
  { value: "rating", label: "Đánh giá cao" },
  { value: "name", label: "Tên A–Z" },
];

// Sắp xếp client-side (dữ liệu đã tải sẵn). "featured" = giữ thứ tự từ DB
// (nổi bật → order → phổ biến → tên).
function sortItems(items: Item[], sort: SortMode): Item[] {
  if (sort === "featured") return items;
  const arr = [...items];
  if (sort === "rating") {
    arr.sort((a, b) => (b.review?.stars ?? -1) - (a.review?.stars ?? -1));
  } else if (sort === "name") {
    arr.sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }
  return arr;
}

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
  const [sort, setSort] = useState<SortMode>("featured");

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
    <div className="space-y-8">
      {/* Toolbar: lọc loại · sắp xếp · Lưới/Danh sách — segmented như trang danh sách điểm đến */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {allTags.length > 1 ? (
          <div className="max-w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Segmented label="Lọc loại">
              <SegButton
                active={filter === "all"}
                onClick={() => chooseFilter("all")}
              >
                Tất cả
              </SegButton>
              {allTags.map((t) => (
                <SegButton
                  key={t}
                  active={filter === t}
                  onClick={() => chooseFilter(t)}
                >
                  {t}
                </SegButton>
              ))}
            </Segmented>
          </div>
        ) : (
          <span />
        )}
        <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
          <Segmented label="Sắp xếp">
            {SORT_OPTIONS.map((o) => (
              <SegButton
                key={o.value}
                active={sort === o.value}
                onClick={() => setSort(o.value)}
              >
                {o.label}
              </SegButton>
            ))}
          </Segmented>
          <Segmented label="Kiểu hiển thị">
            <SegButton active={view === "grid"} onClick={() => choose("grid")}>
              <LayoutGrid className="size-4" aria-hidden />
              <span className="hidden sm:inline">Lưới</span>
            </SegButton>
            <SegButton active={view === "list"} onClick={() => choose("list")}>
              <List className="size-4" aria-hidden />
              <span className="hidden sm:inline">Danh sách</span>
            </SegButton>
          </Segmented>
        </div>
      </div>

      {groups.map((g) => {
        const filtered =
          filter === "all" ? g.items : g.items.filter((it) => it.tag === filter);
        if (filter !== "all" && filtered.length === 0) return null;
        const items = sortItems(filtered, sort);
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
              <ul className="mt-7 border-t border-border/60">
                {items.map((it) => (
                  <li key={it.slug} className="border-b border-border/60">
                    <ListRow item={it} prefix={g.prefix} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

// Segmented control dùng chung (Lọc loại · Sắp xếp · Kiểu hiển thị) — giống
// trang danh sách điểm đến: track bo góc nền muted, nút active nền nổi + bóng.
function Segmented({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex h-10 w-fit shrink-0 items-center rounded-lg bg-muted p-1"
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
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-full items-center gap-1.5 whitespace-nowrap rounded-md px-3.5 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

// Đánh giá sao (chỉ Địa điểm có review) — 5 sao, fill theo điểm.
function Rating({ stars, total }: { stars: number; total: number }) {
  return (
    <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <StarRating value={stars} showValue />
      <span className="text-muted-foreground">· {total} đánh giá</span>
    </span>
  );
}

// Card lưới — ảnh + loại (kicker) + tên + subline. Gọn, không badge/pill.
function GridCard({ item: it, prefix }: { item: Item; prefix: string }) {
  const subline = it.tagline ?? it.description;
  return (
    <Link href={`/${prefix}/${it.slug}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        <Image
          src={coverUrl(it.images, it.slug)}
          alt={it.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      {it.tag && (
        <p className="mt-3 text-xs font-medium text-muted-foreground">{it.tag}</p>
      )}
      <h3
        className={cn(
          "line-clamp-1 font-semibold tracking-tight transition-colors group-hover:text-primary",
          it.tag ? "mt-0.5" : "mt-3",
        )}
      >
        {it.name}
      </h3>
      {it.review && <Rating stars={it.review.stars} total={it.review.total} />}
      {subline && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {subline}
        </p>
      )}
      {it.price && (
        <p className="mt-2 text-sm font-semibold text-primary">{it.price}</p>
      )}
    </Link>
  );
}

// Hàng danh sách — ảnh trái · nội dung giữa · cột phải (đánh giá + giá).
function ListRow({ item: it, prefix }: { item: Item; prefix: string }) {
  const subline = it.tagline ?? it.description;
  return (
    <Link
      href={`/${prefix}/${it.slug}`}
      className="group flex items-stretch gap-5 py-5 sm:gap-6"
    >
      <div className="relative aspect-[4/3] w-36 shrink-0 self-center overflow-hidden rounded-xl bg-muted sm:w-52">
        <Image
          src={coverUrl(it.images, it.slug, 480, 360)}
          alt={it.name}
          fill
          sizes="(min-width: 640px) 208px, 144px"
          className="object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        {/* Giữa */}
        <div className="min-w-0">
          {it.tag && (
            <p className="text-xs font-medium text-muted-foreground">{it.tag}</p>
          )}
          <h3 className="mt-0.5 text-lg font-semibold tracking-tight transition-colors group-hover:text-primary sm:text-xl">
            {it.name}
          </h3>
          {subline && (
            <p className="mt-2 line-clamp-2 leading-relaxed text-muted-foreground">
              {subline}
            </p>
          )}
          {it.highlights.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {it.highlights.map((h, i) => (
                <span
                  key={i}
                  className="rounded-md border border-border/70 px-2 py-0.5 text-xs font-medium text-muted-foreground"
                >
                  {h}
                </span>
              ))}
            </div>
          )}
          {it.meta.length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground/80">
              {it.meta.join("  ·  ")}
            </p>
          )}
        </div>

        {/* Phải: đánh giá + giá (thông tin quyết định) */}
        {(it.review || it.price) && (
          <div className="flex shrink-0 items-center gap-6 sm:w-44 sm:flex-col sm:items-end sm:gap-2.5 sm:self-center sm:border-l sm:border-border/60 sm:pl-6 sm:text-right">
            {it.review && (
              <div>
                <StarRating value={it.review.stars} showValue />
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {it.review.total} đánh giá
                </p>
              </div>
            )}
            {it.price && (
              <p className="text-base font-semibold text-primary">{it.price}</p>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

