"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Glyph, type GlyphName } from "@/components/site/glyphs";
import { FilterChip } from "@/components/site/listing-filter";
import { compositionLine, countByLabel } from "@/lib/listing-summary";
import { coverUrl } from "@/lib/place-image";
import { R_BADGE, R_CARD, R_CTRL } from "@/lib/radius";
import {
  EATERY_CATEGORY_LABELS,
  MEAL_LABELS,
  VIEW_TYPE_LABELS,
  label,
} from "@/lib/listing-labels";
import {
  formatMinutes,
  hoursSpan,
  openingStatus,
  parseOpeningHours,
  vietnamMinutesNow,
  type OpeningStatus,
} from "@/lib/opening-hours";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import {
  EateryDetail,
  type EateryDetailData,
} from "@/components/site/eatery-detail";

export type FoodExperience = {
  slug: string;
  name: string;
  description: string | null;
  durationText: string | null;
  images: { url: string; isCover: boolean }[];
};

export function FoodSection({
  placeName,
  eateries,
  experiences,
}: {
  placeName: string;
  eateries: EateryDetailData[];
  experiences: FoodExperience[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [meal, setMeal] = useState(() => searchParams.get("meal") ?? "all");
  const [cat, setCat] = useState("all");
  const [viewOnly, setViewOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [selected, setSelected] = useState<{
    slug: string;
    tab: "anh" | "menu";
  } | null>(null);

  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(vietnamMinutesNow());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const hours = useMemo(
    () => new Map(eateries.map((e) => [e.slug, parseOpeningHours(e.openingHours)])),
    [eateries],
  );
  const statusOf = (slug: string): OpeningStatus | null =>
    now == null ? null : openingStatus(hours.get(slug) ?? null, now);

  const mealOptions = useMemo(() => {
    const present = new Set(eateries.flatMap((e) => e.meals));
    return Object.keys(MEAL_LABELS).filter((m) => present.has(m));
  }, [eateries]);

  const catOptions = useMemo(() => {
    const shownMeals = new Set(mealOptions.map((m) => label(MEAL_LABELS, m)));
    const present = new Set(eateries.map((e) => e.category).filter(Boolean));
    return Object.keys(EATERY_CATEGORY_LABELS).filter(
      (c) => present.has(c) && !shownMeals.has(label(EATERY_CATEGORY_LABELS, c)),
    );
  }, [eateries, mealOptions]);

  const withView = useMemo(
    () => eateries.filter((e) => e.viewType).length,
    [eateries],
  );
  const openCount = useMemo(() => {
    if (now == null) return null;
    return eateries.filter((e) => {
      const s = openingStatus(hours.get(e.slug) ?? null, now);
      return s?.kind === "open" || s?.kind === "closingSoon";
    }).length;
  }, [eateries, hours, now]);

  const composition = useMemo(
    () =>
      compositionLine(
        countByLabel(
          eateries.map((e) => label(EATERY_CATEGORY_LABELS, e.category)),
        ),
        eateries.length,
      ),
    [eateries],
  );
  const noticed = useMemo(
    () => eateries.filter((e) => e.notice).length,
    [eateries],
  );

  const span = useMemo(
    () => hoursSpan(eateries.map((e) => e.openingHours)),
    [eateries],
  );

  const list = eateries.filter((e) => {
    if (meal !== "all" && !e.meals.includes(meal)) return false;
    if (cat !== "all" && e.category !== cat) return false;
    if (viewOnly && !e.viewType) return false;
    if (openOnly) {
      const s = statusOf(e.slug);
      if (s?.kind !== "open" && s?.kind !== "closingSoon") return false;
    }
    return true;
  });

  const activeFilters =
    Number(meal !== "all") + Number(cat !== "all") + Number(viewOnly) + Number(openOnly);
  const clearAll = () => {
    chooseMeal("all");
    setCat("all");
    setViewOnly(false);
    setOpenOnly(false);
  };

  function chooseMeal(m: string) {
    setMeal(m);
    const params = new URLSearchParams(searchParams.toString());
    if (m === "all") params.delete("meal");
    else params.set("meal", m);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const bySlug = useMemo(
    () => new Map(eateries.map((e) => [e.slug, e])),
    [eateries],
  );

  useEffect(() => {
    const m = window.location.hash.match(/^#eatery-(.+)$/);
    if (!m) return;
    const slug = decodeURIComponent(m[1]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (bySlug.has(slug)) setSelected({ slug, tab: "anh" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = selected ? bySlug.get(selected.slug) : undefined;

  return (
    <div>
      <header>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ăn uống ở {placeName}
        </h2>
        <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <Stat glyph="bowl">
            {composition ?? (
              <>
                <b className="font-semibold text-foreground">
                  {eateries.length}
                </b>{" "}
                quán
              </>
            )}
          </Stat>
          {withView > 0 && (
            <Stat glyph="eye">
              <b className="font-semibold text-foreground">{withView}</b> chỗ ngồi
              có view
            </Stat>
          )}
          {span && (
            <Stat glyph="clock">
              mở từ{" "}
              <b className="font-semibold text-foreground">
                {formatMinutes(span.earliest)}
              </b>{" "}
              đến{" "}
              <b className="font-semibold text-foreground">
                {formatMinutes(span.latest)}
              </b>
            </Stat>
          )}
          {noticed > 0 && (
            <Stat glyph="warn">
              <b className="font-semibold text-foreground">{noticed}</b> quán có
              lưu ý
            </Stat>
          )}
        </div>
      </header>

      <div className="sticky top-12 z-30 -mx-4 mt-8 border-b border-border/60 bg-background/90 px-4 backdrop-blur-lg sm:-mx-6 sm:px-6 lg:top-28">
        <div className="hide-scrollbar flex items-center gap-2 overflow-x-auto py-3">
          <FilterChip
            active={openOnly}
            onClick={() => setOpenOnly((v) => !v)}
            count={openCount}
            glyph="clock"
            tone="live"
          >
            Đang mở
          </FilterChip>
          <span className="h-5 w-px shrink-0 bg-border" aria-hidden />
          <FilterChip active={meal === "all"} onClick={() => chooseMeal("all")}>
            Mọi bữa
          </FilterChip>
          {mealOptions.map((m) => (
            <FilterChip key={m} active={meal === m} onClick={() => chooseMeal(m)}>
              {label(MEAL_LABELS, m)}
            </FilterChip>
          ))}
        </div>

        {(catOptions.length > 0 || withView > 0) && (
          <div className="hide-scrollbar flex items-center gap-1.5 overflow-x-auto pb-3">
            {catOptions.length > 0 && (
              <>
                <span className="shrink-0 pr-0.5 text-xs font-medium text-muted-foreground/70">
                  Kiểu
                </span>
                <FilterChip small active={cat === "all"} onClick={() => setCat("all")}>
                  Tất cả
                </FilterChip>
                {catOptions.map((c) => (
                  <FilterChip
                    key={c}
                    small
                    active={cat === c}
                    onClick={() => setCat(c)}
                  >
                    {label(EATERY_CATEGORY_LABELS, c)}
                  </FilterChip>
                ))}
              </>
            )}
            {withView > 0 && (
              <>
                {catOptions.length > 0 && (
                  <span className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden />
                )}
                <FilterChip
                  small
                  active={viewOnly}
                  onClick={() => setViewOnly((v) => !v)}
                  count={withView}
                  glyph="eye"
                >
                  Có view
                </FilterChip>
              </>
            )}
          </div>
        )}
      </div>

      <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span>
          <b className="font-semibold tabular-nums text-foreground">
            {list.length}
          </b>{" "}
          quán
        </span>
        {activeFilters > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
          >
            Bỏ lọc
            <Glyph name="close" className="size-3 opacity-60" />
          </button>
        )}
      </p>

      {list.length > 0 ? (
        <div className="mt-6 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => (
            <EateryCard
              key={e.slug}
              eatery={e}
              status={statusOf(e.slug)}
              onOpen={(tab) => setSelected({ slug: e.slug, tab })}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">
            {openOnly && now != null
              ? `Giờ này (${formatMinutes(now)}) không quán nào còn mở.`
              : "Không có quán nào khớp bộ lọc này."}
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            Xem tất cả {eateries.length} quán
          </button>
        </div>
      )}

      {experiences.length > 0 && (
        <section className="mt-16 border-t border-border/60 pt-10">
          <div className="flex items-center gap-3">
            <span className={cn(R_CARD, "grid size-10 shrink-0 place-items-center bg-warm/10 text-warm")}>
              <Glyph name="chef" className="size-5" />
            </span>
            <div>
              <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
                Trải nghiệm ẩm thực
              </h3>
              <p className="text-xs text-muted-foreground">
                <b className="font-semibold text-foreground">
                  {experiences.length}
                </b>{" "}
                trải nghiệm — không chỉ ăn, mà xem cách làm ra
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {experiences.map((x) => (
              <ExperienceCard key={x.slug} exp={x} />
            ))}
          </div>
        </section>
      )}

      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "w-full max-w-none gap-0 overflow-hidden border-0 p-0 shadow-2xl",
            "top-auto bottom-0 left-0 max-h-[92dvh] translate-x-0 translate-y-0 rounded-t-[6px]",
            "data-[state=open]:slide-in-from-bottom-6 data-[state=closed]:slide-out-to-bottom-6",
            "sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-h-[88vh] sm:-translate-x-1/2 sm:-translate-y-1/2",
            "sm:max-w-[min(64rem,calc(100vw-3rem))] sm:rounded-b-[6px]",
            "sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0",
          )}
        >
          {active && (
            <>
              <EateryDetail
                data={active}
                status={statusOf(active.slug)}
                initialTab={selected?.tab}
              />
              <DialogClose
                className={cn(R_CTRL, "absolute right-3 top-3 z-10 grid size-9 place-items-center bg-background/85 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background")}
                aria-label="Đóng"
              >
                <Glyph name="close" className="size-4" />
              </DialogClose>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({
  glyph,
  children,
}: {
  glyph: GlyphName;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Glyph
        name={glyph}
        className="size-[1.05rem] shrink-0 text-muted-foreground/70"
      />
      {children}
    </span>
  );
}

function EateryCard({
  eatery: e,
  status,
  onOpen,
}: {
  eatery: EateryDetailData;
  status: OpeningStatus | null;
  onOpen: (tab: "anh" | "menu") => void;
}) {
  const area = e.wardName || null;
  const category = e.category ? label(EATERY_CATEGORY_LABELS, e.category) : null;
  const viewLabel = label(VIEW_TYPE_LABELS, e.viewType);
  const dimmed = status?.kind === "opensLater" || status?.kind === "closed";
  const menuShot = e.menuImages[0];
  const peeking = useRef(false);

  return (
    <button
      type="button"
      onClick={() => onOpen(peeking.current && menuShot ? "menu" : "anh")}
      onMouseEnter={() => (peeking.current = true)}
      onMouseLeave={() => (peeking.current = false)}
      onFocus={() => (peeking.current = true)}
      onBlur={() => (peeking.current = false)}
      aria-label={`Xem chi tiết ${e.name}`}
      className="group block w-full text-left"
    >
      <div
        className={cn(
          R_CARD,
          "relative aspect-[3/2] overflow-hidden bg-muted",
        )}
      >
        <Image
          src={coverUrl(e.images, e.slug)}
          alt={e.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className={cn(
            "object-cover transition-transform duration-300 group-hover:scale-[1.03]",
            dimmed && "saturate-[0.7]",
          )}
        />

        {menuShot && (
          <span
            className="absolute inset-0 bg-foreground/90 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden
          >
            <Image
              src={menuShot.url}
              alt=""
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-contain p-3"
            />
          </span>
        )}

        {category && (
          <span
            className={cn(
              R_BADGE,
              "absolute left-3 top-3 bg-white/95 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-neutral-900 shadow-sm backdrop-blur-sm",
            )}
          >
            {category}
          </span>
        )}
        {viewLabel && (
          <span
            className={cn(
              R_BADGE,
              "absolute right-3 top-3 inline-flex items-center gap-1 bg-white/95 px-2.5 py-1 text-[0.6875rem] font-semibold text-neutral-900 shadow-sm backdrop-blur-sm",
            )}
          >
            <Glyph name="eye" className="size-3.5 shrink-0" />
            Nhìn ra {viewLabel.toLowerCase()}
          </span>
        )}
        {menuShot && (
          <span
            className={cn(
              R_BADGE,
              "absolute bottom-3 left-3 inline-flex items-center gap-1 bg-neutral-900/85 px-2.5 py-1 text-[0.6875rem] font-semibold text-white backdrop-blur-sm",
            )}
          >
            <Glyph name="bowl" className="size-3.5 shrink-0" />
            Thực đơn
          </span>
        )}
      </div>

      <h3 className="mt-3.5 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight underline-offset-4 group-hover:underline">
        {e.name}
      </h3>

      {area && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Glyph name="pin" className="size-3.5 shrink-0" />
          <span className="truncate">{area}</span>
        </p>
      )}

      {e.description && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {e.description}
        </p>
      )}

      <div className="mt-3 space-y-1.5">
        {(status || e.openingHours) && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            {status && <StatusLine status={status} />}
            {e.openingHours && (
              <span className="tabular-nums text-muted-foreground">
                {e.openingHours}
              </span>
            )}
          </p>
        )}
          {e.bestTime && (
            <p className="flex gap-1.5 text-xs font-medium text-primary">
              <Glyph name="sunrise" className="mt-px size-3.5 shrink-0" />
              <span className="line-clamp-1">{e.bestTime}</span>
            </p>
          )}
          {e.notice && (
            <p className="flex gap-1.5 text-xs text-warm">
              <Glyph name="warn" className="mt-px size-3.5 shrink-0" />
              <span className="line-clamp-2">{e.notice}</span>
            </p>
          )}
      </div>
    </button>
  );
}

function StatusLine({ status }: { status: OpeningStatus }) {
  const s = statusView(status);
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-medium", s.tone)}>
      <span
        className={cn("size-1.5 shrink-0 rounded-full", s.dot)}
        aria-hidden
      />
      {s.text}
    </span>
  );
}

function statusView(status: OpeningStatus) {
  const map = {
    open: { text: "Đang mở", tone: "text-primary", dot: "bg-primary" },
    closingSoon: {
      text: `Sắp đóng · ${formatMinutes(status.kind === "closingSoon" ? status.closesAt : 0)}`,
      tone: "text-warm",
      dot: "bg-warm",
    },
    opensLater: {
      text: `Mở lúc ${formatMinutes(status.kind === "opensLater" ? status.opensAt : 0)}`,
      tone: "text-muted-foreground",
      dot: "bg-muted-foreground/50",
    },
    closed: {
      text: "Đã đóng cửa",
      tone: "text-muted-foreground",
      dot: "bg-muted-foreground/50",
    },
  } as const;
  return map[status.kind];
}

function ExperienceCard({ exp }: { exp: FoodExperience }) {
  return (
    <Link
      href={`/hoat-dong/${exp.slug}`}
      className="group block"
    >
      <div
        className={cn(R_CARD, "relative aspect-[3/2] overflow-hidden bg-muted")}
      >
        <Image
          src={coverUrl(exp.images, exp.slug)}
          alt={exp.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <span
          className={cn(
            R_BADGE,
            "absolute left-3 top-3 bg-warm/95 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-warm-foreground shadow-sm",
          )}
        >
          Trải nghiệm
        </span>
      </div>

      <h3 className="mt-3.5 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight underline-offset-4 group-hover:underline">
        {exp.name}
      </h3>
      {exp.description && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {exp.description}
        </p>
      )}
      {exp.durationText && (
        <p className="mt-3 flex gap-1.5 text-xs text-muted-foreground">
          <Glyph name="clock" className="mt-px size-3.5 shrink-0" />
          {exp.durationText}
        </p>
      )}
    </Link>
  );
}

