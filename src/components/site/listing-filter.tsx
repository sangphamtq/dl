"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Glyph, type GlyphName } from "@/components/site/glyphs";
import { R_CARD, R_CTRL } from "@/lib/radius";
import { cn } from "@/lib/utils";

export type Categorized = {
  category: string | null;
  categoryLabel: string | null;
};

export type ListViewMode = "grid" | "list";

export function useCatFilter<T extends Categorized>(items: T[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [cat, setCat] = useState<string>(() => searchParams.get("cat") ?? "all");

  const cats = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const it of items) {
      if (!it.category || !it.categoryLabel) continue;
      const cur = map.get(it.category);
      if (cur) cur.count += 1;
      else map.set(it.category, { label: it.categoryLabel, count: 1 });
    }
    return [...map.entries()]
      .map(([value, v]) => ({ value, ...v }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "vi"));
  }, [items]);

  // `?cat=` lạ (link cũ, gõ tay, loại đã bị gỡ khỏi dữ liệu) thì coi như KHÔNG
  // lọc, thay vì hiện một trang trống có tên loại bỏ ngỏ trong ngoặc kép.
  const activeCat = cats.find((c) => c.value === cat);
  const effective = activeCat ? cat : "all";

  const filtered = useMemo(
    () =>
      effective === "all"
        ? items
        : items.filter((it) => it.category === effective),
    [items, effective],
  );

  const chooseCat = (v: string) => {
    setCat(v);
    const params = new URLSearchParams(searchParams.toString());
    if (v === "all") params.delete("cat");
    else params.set("cat", v);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return { cats, activeCat, effective, filtered, chooseCat };
}

export function useListView(initial: ListViewMode = "grid") {
  const [view, setView] = useState<ListViewMode>(initial);
  const choose = (v: ListViewMode) => {
    setView(v);
    document.cookie = `listingView=${v};path=/;max-age=31536000;samesite=lax`;
  };
  return [view, choose] as const;
}

export function CatChipRow({
  cats,
  effective,
  total,
  onChoose,
}: {
  cats: { value: string; label: string; count: number }[];
  effective: string;
  total: number;
  onChoose: (v: string) => void;
}) {
  if (cats.length <= 1) return null;
  return (
    <div className="hide-scrollbar -mx-4 mt-7 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
      <div className="flex items-center gap-2 sm:flex-wrap">
        <FilterChip
          active={effective === "all"}
          onClick={() => onChoose("all")}
          count={total}
        >
          Tất cả
        </FilterChip>
        {cats.map((c) => (
          <FilterChip
            key={c.value}
            active={effective === c.value}
            onClick={() => onChoose(c.value)}
            count={c.count}
          >
            {c.label}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}

export function FilterChip({
  active,
  onClick,
  count,
  glyph,
  small = false,
  tone = "plain",
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number | null;
  glyph?: GlyphName;
  small?: boolean;
  tone?: "plain" | "live";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        R_CTRL,
        "inline-flex shrink-0 items-center gap-1.5 border font-medium transition-colors",
        small ? "h-8 px-3 text-xs" : "h-9 px-3.5 text-[0.8125rem]",
        active
          ? "border-foreground bg-foreground text-background"
          : tone === "live"
            ? "border-primary/40 text-primary hover:border-primary"
            : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
      )}
    >
      {glyph && (
        <Glyph name={glyph} className={small ? "size-3.5" : "size-4"} />
      )}
      {children}
      {count != null && (
        <span
          className={cn("tabular-nums", active ? "opacity-60" : "opacity-50")}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function ViewToggle({
  view,
  onChange,
}: {
  view: ListViewMode;
  onChange: (v: ListViewMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Kiểu hiển thị"
      className={cn(
        R_CTRL,
        "flex shrink-0 items-center overflow-hidden border border-border",
      )}
    >
      <ViewBtn
        glyph="grid"
        label="Lưới ảnh"
        active={view === "grid"}
        onClick={() => onChange("grid")}
      />
      <ViewBtn
        glyph="rows"
        label="Danh sách"
        active={view === "list"}
        onClick={() => onChange("list")}
      />
    </div>
  );
}

function ViewBtn({
  glyph,
  active,
  onClick,
  label,
}: {
  glyph: "grid" | "rows";
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
        "grid h-9 w-10 place-items-center transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Glyph name={glyph} className="size-4" />
    </button>
  );
}

export function EmptyFilter({
  categoryLabel,
  unit,
  onReset,
}: {
  categoryLabel?: string;
  unit: string;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <span
        aria-hidden
        className={cn(
          R_CARD,
          "grid size-12 place-items-center bg-muted text-muted-foreground",
        )}
      >
        <Glyph name="search" className="size-5" />
      </span>
      <p className="mt-4 text-lg font-semibold tracking-tight">
        {categoryLabel
          ? `Chưa có ${unit} nào thuộc loại “${categoryLabel}”`
          : `Chưa có ${unit} nào ở đây`}
      </p>
      <button
        type="button"
        onClick={onReset}
        className={cn(
          R_CTRL,
          "mt-5 inline-flex h-9 items-center border border-border px-4 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary",
        )}
      >
        Xem tất cả {unit}
      </button>
    </div>
  );
}
