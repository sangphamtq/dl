"use client";

import Link from "next/link";
import Image from "next/image";
import { Glyph, type GlyphName } from "@/components/site/glyphs";
import {
  CatChipRow,
  EmptyFilter,
  ViewToggle,
  useCatFilter,
  useListView,
  type ListViewMode,
} from "@/components/site/listing-filter";
import { compositionLine } from "@/lib/listing-summary";
import { coverUrl } from "@/lib/place-image";
import { R_BADGE, R_CARD } from "@/lib/radius";
import { cn } from "@/lib/utils";

export type ActivityListItem = {
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  categoryLabel: string | null;
  duration: string | null;
  season: string | null;
  price: string | null;
  operator: string | null;
  spots: { slug: string; name: string }[];
  images: { url: string; isCover: boolean }[];
};

export function ActivitySection({
  activities,
  placeName,
  initialView = "grid",
}: {
  activities: ActivityListItem[];
  placeName: string;
  initialView?: ListViewMode;
}) {
  const { cats, activeCat, effective, filtered, chooseCat } =
    useCatFilter(activities);
  const [view, chooseView] = useListView(initialView);
  const items = filtered;

  const paid = items.filter((a) => a.price).length;
  const organized = items.filter((a) => a.operator).length;
  const composition =
    effective === "all" ? compositionLine(cats, activities.length) : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <header>
          <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Chơi gì ở {placeName}
          </h2>
          <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Stat glyph="sparkle">
              {composition ?? (
                <>
                  <b className="font-semibold tabular-nums text-foreground">
                    {items.length}
                  </b>{" "}
                  hoạt động
                </>
              )}
            </Stat>
            {paid > 0 && (
              <Stat glyph="ticket">
                <b className="font-semibold tabular-nums text-foreground">
                  {paid}
                </b>{" "}
                có thu phí
              </Stat>
            )}
            {organized > 0 && (
              <Stat glyph="check">
                <b className="font-semibold tabular-nums text-foreground">
                  {organized}
                </b>{" "}
                có đơn vị tổ chức
              </Stat>
            )}
          </div>
        </header>

        <ViewToggle view={view} onChange={chooseView} />
      </div>

      <CatChipRow
        cats={cats}
        effective={effective}
        total={activities.length}
        onChoose={chooseCat}
      />

      {items.length === 0 ? (
        <EmptyFilter
          categoryLabel={activeCat?.label}
          unit="hoạt động"
          onReset={() => chooseCat("all")}
        />
      ) : view === "grid" ? (
        <div className="mt-8 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <ActivityCard key={a.slug} a={a} />
          ))}
        </div>
      ) : (
        <ul className="mt-8 border-t border-border/60">
          {items.map((a) => (
            <li key={a.slug} className="border-b border-border/60">
              <ActivityRow a={a} />
            </li>
          ))}
        </ul>
      )}
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

function FactLines({ a }: { a: ActivityListItem }) {
  if (!a.season && !a.duration) return null;
  return (
    <div className="mt-3 space-y-1.5">
      {a.season && (
        <p className="flex gap-1.5 text-xs font-medium text-primary">
          <Glyph name="calendar" className="mt-px size-3.5 shrink-0" />
          <span className="line-clamp-1">{a.season}</span>
        </p>
      )}
      {a.duration && (
        <p className="flex gap-1.5 text-xs text-muted-foreground">
          <Glyph name="clock" className="mt-px size-3.5 shrink-0" />
          <span className="line-clamp-1">{a.duration}</span>
        </p>
      )}
    </div>
  );
}

function Cover({ a, sizes }: { a: ActivityListItem; sizes: string }) {
  return (
    <>
      <Image
        src={coverUrl(a.images, a.slug, 900, 600)}
        alt=""
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      {a.categoryLabel && (
        <span
          className={cn(
            R_BADGE,
            "absolute left-3 top-3 bg-white/95 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-neutral-900 shadow-sm backdrop-blur-sm",
          )}
        >
          {a.categoryLabel}
        </span>
      )}
      {a.price && (
        <span
          className={cn(
            R_BADGE,
            "absolute right-3 top-3 inline-flex items-center gap-1 bg-neutral-900/85 px-2.5 py-1 text-[0.6875rem] font-semibold tabular-nums text-white backdrop-blur-sm",
          )}
        >
          <Glyph name="ticket" className="size-3.5 shrink-0" />
          {a.price}
        </span>
      )}
    </>
  );
}

function ActivityCard({ a }: { a: ActivityListItem }) {
  return (
    <Link href={`/hoat-dong/${a.slug}`} className="group block">
      <div className={cn(R_CARD, "relative aspect-[3/2] overflow-hidden bg-muted")}>
        <Cover
          a={a}
          sizes="(min-width: 1024px) 32vw, (min-width: 640px) 48vw, 92vw"
        />
      </div>

      <h3 className="mt-3.5 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight underline-offset-4 group-hover:underline">
        {a.name}
      </h3>

      {a.description && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {a.description}
        </p>
      )}

      <FactLines a={a} />
    </Link>
  );
}

function ActivityRow({ a }: { a: ActivityListItem }) {
  return (
    <Link
      href={`/hoat-dong/${a.slug}`}
      className="group flex gap-4 py-5 sm:gap-6 sm:py-6"
    >
      <div
        className={cn(
          R_CARD,
          "relative aspect-[3/2] w-28 shrink-0 self-start overflow-hidden bg-muted sm:w-52 lg:w-64",
        )}
      >
        <div className="hidden sm:contents">
          <Cover
            a={a}
            sizes="(min-width: 1024px) 256px, (min-width: 640px) 208px, 112px"
          />
        </div>
        <div className="contents sm:hidden">
          <Image
            src={coverUrl(a.images, a.slug, 400, 267)}
            alt=""
            fill
            sizes="112px"
            className="object-cover"
          />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold leading-snug tracking-tight underline-offset-4 group-hover:underline">
          {a.name}
        </h3>

        {a.description && (
          <p className="mt-1.5 line-clamp-2 leading-relaxed text-muted-foreground">
            {a.description}
          </p>
        )}

        <FactLines a={a} />

        {a.spots.length > 0 && (
          <TagLine label="Diễn ra ở" items={a.spots.map((s) => s.name)} />
        )}
        {a.operator && <TagLine label="Đơn vị" items={[a.operator]} />}
      </div>
    </Link>
  );
}

function TagLine({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mt-2.5 hidden flex-wrap items-center gap-x-2 gap-y-1.5 sm:flex">
      <span className="text-xs text-muted-foreground/80">{label}</span>
      {items.map((t, i) => (
        <span
          key={i}
          className={cn(
            R_BADGE,
            "bg-muted px-2 py-0.5 text-xs text-muted-foreground",
          )}
        >
          {t}
        </span>
      ))}
    </div>
  );
}
