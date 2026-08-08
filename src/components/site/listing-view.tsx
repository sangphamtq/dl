"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  ArrowDownWideNarrow,
  ChevronDown,
  LayoutGrid,
  List,
  X,
} from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  category: string | null; // giá trị enum — dùng cho ?cat= (bền, không đổi theo nhãn)
  tag: string | null; // nhãn hiển thị của category
  tags: string[];
  meta: string[];
  facts: Fact[];
  activities: { slug: string; name: string }[];
  images: { url: string; isCover: boolean }[];
  isFeatured: boolean;
};
type Group = {
  title: string;
  prefix: string;
  unit: string; // đơn vị đếm ("địa điểm", "hoạt động") — thay cho "mục" chung chung
  items: Item[];
};

export type ListingViewMode = "grid" | "list";
type SortMode = "featured" | "rating" | "name";

const SORT_LABELS: Record<SortMode, string> = {
  featured: "Nổi bật",
  rating: "Đánh giá cao",
  name: "Tên A–Z",
};

// Sắp xếp client-side (dữ liệu đã tải sẵn). "featured" = giữ thứ tự từ DB
// (nổi bật → order → phổ biến → tên).
function sortItems(items: Item[], sort: SortMode): Item[] {
  if (sort === "featured") return items;
  const byName = (a: Item, b: Item) => a.name.localeCompare(b.name, "vi");
  const arr = [...items];
  if (sort === "rating") {
    // Chưa có đánh giá xuống cuối; cùng điểm thì nhiều lượt đánh giá hơn đứng
    // trước (10 người chấm 4.5 đáng tin hơn 1 người chấm 4.5).
    arr.sort(
      (a, b) =>
        (b.review?.stars ?? -1) - (a.review?.stars ?? -1) ||
        (b.review?.total ?? 0) - (a.review?.total ?? 0) ||
        byName(a, b),
    );
  } else if (sort === "name") {
    arr.sort(byName);
  }
  return arr;
}

// Trang danh sách listing (tab Địa điểm / Hoạt động của một điểm đến).
//
// Kiểu hiển thị Lưới ↔ Danh sách là SỞ THÍCH của người dùng nên giữ ở đây và lưu
// vào cookie (server đọc & render đúng view ngay từ đầu → không nhảy khi tải lại);
// còn lọc loại + sắp xếp thuộc về từng section nên nằm trong `ListingGroup`.
export function ListingView({
  groups,
  initialView = "grid",
}: {
  groups: Group[];
  initialView?: ListingViewMode;
}) {
  const [view, setView] = useState<ListingViewMode>(initialView);

  const choose = (v: ListingViewMode) => {
    setView(v);
    document.cookie = `listingView=${v};path=/;max-age=31536000;samesite=lax`;
  };

  return (
    <div className="space-y-14">
      {groups.map((g) => (
        <ListingGroup
          key={g.prefix}
          group={g}
          view={view}
          onView={choose}
          // Nhiều section trên cùng trang thì mỗi section một tham số riêng.
          param={groups.length > 1 ? `cat-${g.prefix}` : "cat"}
        />
      ))}
    </div>
  );
}

// Một section: tiêu đề + công cụ (sắp xếp · kiểu hiển thị) + hàng chip lọc loại
// + kết quả.
//
// PHÂN CẤP là điểm chính của bố cục này: lọc loại là thứ người ta chạm nhiều
// nhất và số lựa chọn thay đổi theo dữ liệu (Địa điểm có tới 11 loại) → hàng
// CHIP tràn được, kèm số đếm để biết bấm vào có gì. Sắp xếp & kiểu hiển thị chỉ
// là công cụ phụ → nép về mép phải hàng tiêu đề, sắp xếp thu thành một menu thả
// xuống. (Bản cũ để cả ba trong ba khối segmented xám cạnh nhau: ba việc khác
// hẳn cấp bậc mà cùng một trọng lượng, và danh sách loại thì bị nhốt trong hộp
// cuộn ngang không thấy hết.)
//
// Chip lọc dùng đúng ngôn ngữ của hai tab anh em (Ẩm thực, Lưu trú): viên tròn,
// đang chọn thì nền `foreground`.
function ListingGroup({
  group,
  view,
  onView,
  param,
}: {
  group: Group;
  view: ListingViewMode;
  onView: (v: ListingViewMode) => void;
  param: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [cat, setCat] = useState<string>(
    () => searchParams.get(param) ?? "all",
  );
  const [sort, setSort] = useState<SortMode>("featured");

  // Các loại có thật trong dữ liệu + số mục mỗi loại; nhiều mục nhất lên trước.
  const cats = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const it of group.items) {
      if (!it.category || !it.tag) continue;
      const cur = map.get(it.category);
      if (cur) cur.count += 1;
      else map.set(it.category, { label: it.tag, count: 1 });
    }
    return [...map.entries()]
      .map(([value, v]) => ({ value, ...v }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "vi"));
  }, [group.items]);

  // Chỉ mời sắp xếp theo đánh giá khi có đánh giá thật (Hoạt động không có).
  const sorts = useMemo<SortMode[]>(
    () =>
      group.items.some((it) => it.review)
        ? ["featured", "rating", "name"]
        : ["featured", "name"],
    [group.items],
  );

  const activeCat = cats.find((c) => c.value === cat);
  const items = useMemo(
    () =>
      sortItems(
        cat === "all"
          ? group.items
          : group.items.filter((it) => it.category === cat),
        sort,
      ),
    [group.items, cat, sort],
  );

  // Lưu loại đang lọc vào URL để giữ khi chia sẻ/quay lại. Dùng GIÁ TRỊ enum
  // (beach, temple…) chứ không phải nhãn tiếng Việt: URL sạch và không vỡ khi
  // đổi chữ hiển thị.
  const chooseCat = (v: string) => {
    setCat(v);
    const params = new URLSearchParams(searchParams.toString());
    if (v === "all") params.delete(param);
    else params.set(param, v);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <section>
      {/* Tiêu đề + số kết quả | công cụ phụ */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight">{group.title}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>
              <span className="font-semibold tabular-nums text-foreground">
                {items.length}
              </span>{" "}
              {group.unit}
            </span>
            {activeCat && (
              <button
                type="button"
                onClick={() => chooseCat("all")}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
              >
                {activeCat.label}
                <X className="size-3 opacity-60" aria-hidden />
                <span className="sr-only">— bỏ lọc</span>
              </button>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Sắp xếp: ${SORT_LABELS[sort]}`}
                className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <ArrowDownWideNarrow
                  className="size-4 text-muted-foreground"
                  aria-hidden
                />
                {SORT_LABELS[sort]}
                <ChevronDown
                  className="size-3.5 text-muted-foreground"
                  aria-hidden
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuRadioGroup
                value={sort}
                onValueChange={(v) => setSort(v as SortMode)}
              >
                {sorts.map((s) => (
                  <DropdownMenuRadioItem key={s} value={s}>
                    {SORT_LABELS[s]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Chỉ icon: đây là sở thích xem, không phải nội dung — đừng để chữ
              của nó nặng ngang tên section. */}
          <div
            role="group"
            aria-label="Kiểu hiển thị"
            className="flex h-10 shrink-0 items-center rounded-full bg-muted p-1"
          >
            <ViewBtn
              icon={LayoutGrid}
              active={view === "grid"}
              onClick={() => onView("grid")}
              label="Lưới"
            />
            <ViewBtn
              icon={List}
              active={view === "list"}
              onClick={() => onView("list")}
              label="Danh sách"
            />
          </div>
        </div>
      </div>

      {/* Lọc theo loại — tràn thì cuộn ngang ở khổ điện thoại, xuống dòng ở khổ rộng */}
      {cats.length > 1 && (
        <div className="-mx-4 mt-5 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-2 sm:flex-wrap">
            <CatChip
              active={cat === "all"}
              onClick={() => chooseCat("all")}
              count={group.items.length}
            >
              Tất cả
            </CatChip>
            {cats.map((c) => (
              <CatChip
                key={c.value}
                active={cat === c.value}
                onClick={() => chooseCat(c.value)}
                count={c.count}
              >
                {c.label}
              </CatChip>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">
            {activeCat
              ? `Chưa có ${group.unit} nào thuộc loại “${activeCat.label}”.`
              : "Chưa có nội dung trong mục này."}
          </p>
          {activeCat && (
            <button
              type="button"
              onClick={() => chooseCat("all")}
              className="mt-3 text-sm font-medium text-primary hover:underline"
            >
              Xem tất cả {group.unit}
            </button>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((it) => (
            <GridCard key={it.slug} item={it} prefix={group.prefix} />
          ))}
        </div>
      ) : (
        <ul className="mt-7 border-t border-border/60">
          {items.map((it) => (
            <li key={it.slug} className="border-b border-border/60">
              <ListRow item={it} prefix={group.prefix} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Chip lọc loại: nhãn + số mục. Con số là lý do dùng chip thay vì segmented —
// biết trước bấm vào còn bao nhiêu thì không ai phải thử từng loại.
function CatChip({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      {children}
      <span
        className={cn(
          "tabular-nums",
          active ? "text-background/60" : "text-muted-foreground/60",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function ViewBtn({
  icon: Icon,
  active,
  onClick,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-full w-10 place-items-center rounded-full transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
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
