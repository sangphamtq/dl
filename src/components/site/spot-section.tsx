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

export type SpotListItem = {
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  category: string | null;
  categoryLabel: string | null;
  bestTime: string | null;
  notice: string | null;
  price: string | null;
  review: { worthGoing: number; total: number } | null;
  images: { url: string; isCover: boolean }[];
  highlights: string[];
  activities: { slug: string; name: string }[];
};



const MIN_REVIEWS = 3;

export function SpotSection({
  spots,
  placeName,
  initialView = "grid",
}: {
  spots: SpotListItem[];
  placeName: string;
  initialView?: ListViewMode;
}) {
  const { cats, activeCat, effective, filtered, chooseCat } =
    useCatFilter(spots);
  const [view, chooseView] = useListView(initialView);
  const items = filtered;

  const paid = items.filter((s) => s.price).length;
  const free = items.length - paid;
  const noticed = items.filter((s) => s.notice).length;

  const composition =
    effective === "all" ? compositionLine(cats, spots.length) : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Đi đâu ở {placeName}
        </h2>
        <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {composition ? (
            <Stat glyph="pin">{composition}</Stat>
          ) : (
            <Stat glyph="pin">
              <b className="font-semibold text-foreground">{items.length}</b> địa
              điểm
            </Stat>
          )}
          {free > 0 && (
            <Stat glyph="gate">
              <b className="font-semibold text-foreground">{free}</b> vào tự do
            </Stat>
          )}
          {paid > 0 && (
            <Stat glyph="ticket">
              <b className="font-semibold text-foreground">{paid}</b> có bán vé
            </Stat>
          )}
          {noticed > 0 && (
            <Stat glyph="warn">
              <b className="font-semibold text-foreground">{noticed}</b> nơi có
              lưu ý
            </Stat>
          )}
        </div>
      </header>

      <ViewToggle view={view} onChange={chooseView} />
      </div>

      <CatChipRow
        cats={cats}
        effective={effective}
        total={spots.length}
        onChoose={chooseCat}
      />

      {items.length === 0 ? (
        <EmptyFilter
          categoryLabel={activeCat?.label}
          unit="địa điểm"
          onReset={() => chooseCat("all")}
        />
      ) : view === "grid" ? (
        <div className="mt-8 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <SpotGridCard key={s.slug} s={s} />
          ))}
        </div>
      ) : (
        <ul className="mt-8 border-t border-border/60">
          {items.map((s) => (
            <li key={s.slug} className="border-b border-border/60">
              <SpotListRow s={s} />
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
      <Glyph name={glyph} className="size-[1.05rem] shrink-0 text-muted-foreground/70" />
      {children}
    </span>
  );
}

function SpotGridCard({ s }: { s: SpotListItem }) {
  const subline = s.tagline ?? s.description;
  return (
    <Link href={`/dia-diem/${s.slug}`} className="group block">
      <div
        className={cn(
          R_CARD,
          "relative aspect-[3/2] overflow-hidden bg-muted",
        )}
      >
        <Image
          src={coverUrl(s.images, s.slug, 900, 600)}
          alt=""
          fill
          sizes="(min-width: 1024px) 32vw, (min-width: 640px) 48vw, 92vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        {s.categoryLabel && (
          <span
            className={cn(
              R_BADGE,
              "absolute left-3 top-3 bg-white/95 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-neutral-900 shadow-sm backdrop-blur-sm",
            )}
          >
            {s.categoryLabel}
          </span>
        )}
        {s.price && (
          <span
            className={cn(
              R_BADGE,
              "absolute right-3 top-3 inline-flex items-center gap-1 bg-neutral-900/85 px-2.5 py-1 text-[0.6875rem] font-semibold text-white tabular-nums backdrop-blur-sm",
            )}
          >
            <Glyph name="ticket" className="size-3.5 shrink-0" />
            {s.price}
          </span>
        )}
      </div>

      <h3 className="mt-3.5 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight underline-offset-4 group-hover:underline">
        {s.name}
      </h3>

      {subline && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {subline}
        </p>
      )}

      <FactLines s={s} />
    </Link>
  );
}

function FactLines({ s }: { s: SpotListItem }) {
  const worth = s.review && s.review.total >= MIN_REVIEWS ? s.review : null;
  if (!s.bestTime && !s.notice && !worth) return null;
  return (
    <div className="mt-3 space-y-1.5">
      {s.bestTime && (
        <p className="flex gap-1.5 text-xs font-medium text-primary">
          <Glyph name="sunrise" className="mt-px size-3.5 shrink-0" />
          <span className="line-clamp-1">Đẹp nhất: {s.bestTime}</span>
        </p>
      )}
      {s.notice && (
        <p className="flex gap-1.5 text-xs text-warm">
          <Glyph name="warn" className="mt-px size-3.5 shrink-0" />
          <span className="line-clamp-2">{s.notice}</span>
        </p>
      )}
      {worth && (
        <p className="flex gap-1.5 text-xs text-muted-foreground">
          <Glyph name="check" className="mt-px size-3.5 shrink-0" />
          <span>
            <b className="font-semibold text-foreground tabular-nums">
              {worth.worthGoing}/{worth.total}
            </b>{" "}
            khách thấy đáng đi
          </span>
        </p>
      )}
    </div>
  );
}


function SpotListRow({ s }: { s: SpotListItem }) {
  const subline = s.tagline ?? s.description;
  return (
    <Link
      href={`/dia-diem/${s.slug}`}
      className="group flex gap-4 py-5 sm:gap-6 sm:py-6"
    >
      <div
        className={cn(
          R_CARD,
          "relative aspect-[3/2] w-28 shrink-0 self-start overflow-hidden bg-muted sm:w-52 lg:w-64",
        )}
      >
        <Image
          src={coverUrl(s.images, s.slug, 900, 600)}
          alt=""
          fill
          sizes="(min-width: 1024px) 256px, (min-width: 640px) 208px, 92vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        {s.categoryLabel && (
          <span
            className={cn(
              R_BADGE,
              "absolute left-3 top-3 hidden bg-white/95 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-neutral-900 shadow-sm backdrop-blur-sm sm:block",
            )}
          >
            {s.categoryLabel}
          </span>
        )}
        {s.price && (
          <span
            className={cn(
              R_BADGE,
              "absolute right-3 top-3 hidden items-center gap-1 bg-neutral-900/85 px-2.5 py-1 text-[0.6875rem] font-semibold tabular-nums text-white backdrop-blur-sm sm:inline-flex",
            )}
          >
            <Glyph name="ticket" className="size-3.5 shrink-0" />
            {s.price}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold leading-snug tracking-tight underline-offset-4 group-hover:underline">
          {s.name}
        </h3>

        {subline && (
          <p className="mt-1.5 line-clamp-2 leading-relaxed text-muted-foreground">
            {subline}
          </p>
        )}

        <FactLines s={s} />

        {s.activities.length > 0 && (
          <TagLine label="Làm gì" items={s.activities.map((a) => a.name)} />
        )}
        {s.highlights.length > 0 && (
          <TagLine label="Điểm nhấn" items={s.highlights} />
        )}
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
