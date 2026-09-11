import Link from "next/link";
import {
  FactLine,
  N,
  PhotoBadge,
  Stat,
  StatRow,
  TileName,
  TilePhoto,
} from "@/components/site/preview-tile";
import { cn } from "@/lib/utils";
import { R_BADGE } from "@/lib/radius";
import { coverUrl } from "@/lib/place-image";
import { compositionLine, countByLabel } from "@/lib/listing-summary";
import {
  EATERY_CATEGORY_LABELS,
  MEAL_LABELS,
  VIEW_TYPE_LABELS,
  label,
} from "@/lib/listing-labels";
import { SectionHeading } from "@/components/site/section-heading";

export type FoodVenue = {
  slug: string;
  name: string;
  category: string | null;
  venueKind: string;
  viewType: string | null;
  bestTime: string | null;
  meals: string[];
  wardName: string | null;
  images: { url: string; isCover: boolean }[];
};

const SLOTS = 4;
const DRINK_SLOTS = 2;

export type FoodFacts = {
  categoryLabel: string | null;
  hasView: boolean;
  hasBestTime: boolean;
};

export function FoodMenu({
  placeName,
  href,
  count,
  facts,
  eateries,
  drinks = [],
}: {
  placeName: string;
  href: string;
  count?: number;
  facts: FoodFacts[];
  eateries: FoodVenue[];
  drinks?: FoodVenue[];
}) {
  const venues = pickVenues(eateries, drinks);
  if (venues.length === 0) return null;

  const withView = facts.filter((f) => f.hasView).length;
  const withBest = facts.filter((f) => f.hasBestTime).length;
  const composition = compositionLine(
    countByLabel(facts.map((f) => f.categoryLabel)),
    facts.length,
  );

  return (
    <div>
      <SectionHeading
        serif
        title={`Ăn uống ở ${placeName}`}
        href={href}
        count={count}
        unit="quán"
      />

      <StatRow>
        <Stat glyph="bowl">
          {composition ?? (
            <>
              <N>{count ?? facts.length}</N> quán ăn &amp; quán nước
            </>
          )}
        </Stat>
        {withView > 0 && (
          <Stat glyph="eye">
            <N>{withView}</N> chỗ ngồi có view
          </Stat>
        )}
        {withBest > 0 && (
          <Stat glyph="sunrise">
            <N>{withBest}</N> nơi có giờ đẹp riêng
          </Stat>
        )}
      </StatRow>

      <ul className="mt-7 grid grid-cols-2 gap-x-5 gap-y-9 sm:gap-x-6 md:grid-cols-4">
        {venues.map((v, i) => (
          <VenueTile key={v.slug} v={v} priority={i < SLOTS} href={href} />
        ))}
      </ul>
    </div>
  );
}

function pickVenues(eats: FoodVenue[], drinks: FoodVenue[]): FoodVenue[] {
  const rankedDrinks = [...drinks].sort(
    (a, b) => Number(Boolean(b.viewType)) - Number(Boolean(a.viewType)),
  );
  const picked = rankedDrinks.slice(0, Math.min(DRINK_SLOTS, drinks.length));
  const taken = new Set(picked.map((d) => d.slug));
  const rest = eats.filter((e) => !taken.has(e.slug));
  const out = [...rest.slice(0, SLOTS - picked.length), ...picked];
  if (out.length < SLOTS) {
    for (const d of rankedDrinks) {
      if (out.length >= SLOTS) break;
      if (!out.some((x) => x.slug === d.slug)) out.push(d);
    }
  }
  return out.slice(0, SLOTS);
}

function VenueTile({
  v,
  priority,
  href,
}: {
  v: FoodVenue;
  priority: boolean;
  href: string;
}) {
  const viewLabel = label(VIEW_TYPE_LABELS, v.viewType);
  const kicker =
    (v.category && v.category !== "other"
      ? label(EATERY_CATEGORY_LABELS, v.category)
      : null) ?? (v.venueKind === "eat" ? "Quán ăn" : "Quán nước");
  const facts = [
    ...v.meals
      .map((m) => label(MEAL_LABELS, m))
      .filter((m): m is string => Boolean(m))
      .slice(0, 2),
    v.wardName,
  ].filter((f): f is string => Boolean(f));

  return (
    <li>
      <Link href={`${href}#eatery-${v.slug}`} className="group block">
        <TilePhoto
          src={coverUrl(v.images, v.slug, 800, 600)}
          sizes="(min-width: 768px) 23vw, 46vw"
          priority={priority}
        >
          <PhotoBadge>{kicker}</PhotoBadge>
          {/* Hướng nhìn sang góc PHẢI: góc trái đã là chỗ của huy hiệu loại ở
              cả bốn mục xem trước, hai huy hiệu chồng một góc thì cái sau che
              cái trước trên ô hẹp 170px. */}
          {viewLabel && (
            <PhotoBadge side="right" tone="mark" glyph="eye">
              {viewLabel}
            </PhotoBadge>
          )}
        </TilePhoto>

        <div className="mt-3.5 flex min-h-[3.25rem] items-start">
          <TileName className="line-clamp-2">{v.name}</TileName>
        </div>

        {v.bestTime ? (
          <div className="mt-1">
            <FactLine glyph="sunrise" tone="time">
              {v.bestTime}
            </FactLine>
          </div>
        ) : facts.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {facts.map((f) => (
              <span
                key={f}
                className={cn(
                  R_BADGE,
                  "max-w-full truncate bg-muted px-2 py-0.5 text-xs text-muted-foreground",
                )}
              >
                {f}
              </span>
            ))}
          </div>
        ) : null}
      </Link>
    </li>
  );
}
