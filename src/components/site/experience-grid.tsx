import Link from "next/link";
import { SectionHeading } from "@/components/site/section-heading";
import {
  FactLine,
  N,
  PhotoBadge,
  Stat,
  StatRow,
  TileName,
  TilePhoto,
} from "@/components/site/preview-tile";
import { compositionLine, countByLabel } from "@/lib/listing-summary";
import { R_BADGE } from "@/lib/radius";
import { cn } from "@/lib/utils";

export type ExperienceItem = {
  slug: string;
  name: string;
  category: string | null;
  image: string;
  duration: string | null;
  season: string | null;
  spotNames: string[];
  spotCount: number;
};

export type ExperienceFacts = { categoryLabel: string | null; seasonal: boolean };

export function ExperienceGrid({
  title,
  href,
  count,
  unit,
  items,
  facts,
}: {
  title: string;
  href?: string;
  count?: number;
  unit?: string;
  items: ExperienceItem[];
  facts: ExperienceFacts[];
}) {
  if (items.length === 0) return null;

  const cats = countByLabel(facts.map((f) => f.categoryLabel));
  const composition = compositionLine(cats, facts.length);
  const seasonal = facts.filter((f) => f.seasonal).length;

  return (
    <div>
      <SectionHeading serif title={title} href={href} count={count} unit={unit} />

      <StatRow>
        <Stat glyph="sparkle">
          {composition ?? (
            <>
              <N>{count ?? facts.length}</N> trải nghiệm
            </>
          )}
        </Stat>
        {seasonal > 0 && (
          <Stat glyph="calendar">
            <N>{seasonal}</N> việc có mùa riêng
          </Stat>
        )}
      </StatRow>

      <ul className="mt-7 grid grid-cols-2 gap-x-5 gap-y-9 sm:gap-x-6 md:grid-cols-4">
        {items.map((it) => (
          <Card key={it.slug} it={it} />
        ))}
      </ul>
    </div>
  );
}

function Card({ it }: { it: ExperienceItem }) {
  return (
    <li>
      <Link href={`/hoat-dong/${it.slug}`} className="group block">
        <TilePhoto
          src={it.image}
          ratio="aspect-[4/5]"
          sizes="(min-width: 768px) 23vw, 46vw"
        >
          {it.category && <PhotoBadge>{it.category}</PhotoBadge>}
        </TilePhoto>

        <div className="mt-3.5 flex min-h-[3.25rem] items-start">
          <TileName className="line-clamp-2">{it.name}</TileName>
        </div>

        {(it.season || it.duration) && (
          <div className="mt-1 space-y-1.5">
            {it.season && (
              <FactLine glyph="calendar" tone="time">
                {it.season}
              </FactLine>
            )}
            {it.duration && <FactLine glyph="clock">{it.duration}</FactLine>}
          </div>
        )}

        {it.spotNames.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {it.spotNames.map((nme) => (
              <span
                key={nme}
                className={cn(
                  R_BADGE,
                  "max-w-full truncate bg-muted px-2 py-0.5 text-xs text-muted-foreground",
                )}
              >
                {nme}
              </span>
            ))}
            {it.spotCount > it.spotNames.length && (
              <span className="py-0.5 text-xs text-muted-foreground/80">
                +{it.spotCount - it.spotNames.length}
              </span>
            )}
          </div>
        )}
      </Link>
    </li>
  );
}
