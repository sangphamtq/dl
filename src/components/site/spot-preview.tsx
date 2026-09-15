import { SectionHeading } from "@/components/site/section-heading";
import { N, Stat, StatRow } from "@/components/site/preview-tile";
import { SpotMosaic } from "@/components/site/spot-mosaic";
import { compositionLine, countByLabel } from "@/lib/listing-summary";

export type SpotPreviewItem = {
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  categoryLabel: string | null;
  area: string | null;
  bestTime: string | null;
  notice: string | null;
  price: string | null;
  image: string;
};

export type SpotFacts = {
  categoryLabel: string | null;
  free: boolean;
  paid: boolean;
  noticed: boolean;
};

export function SpotPreview({
  title,
  count,
  allHref,
  spots,
  facts,
  moreImages = [],
}: {
  title: string;
  count?: number;
  allHref: string;
  spots: SpotPreviewItem[];
  facts: SpotFacts[];
  /** Ảnh bìa của các địa điểm chưa có ô, cho ô "Xem tất cả". */
  moreImages?: string[];
}) {
  const items = spots.slice(0, 5);
  if (items.length === 0) return null;

  const cats = countByLabel(facts.map((f) => f.categoryLabel));
  const composition = compositionLine(cats, facts.length);
  const paid = facts.filter((f) => f.paid).length;
  const free = facts.filter((f) => f.free).length;
  const noticed = facts.filter((f) => f.noticed).length;
  const total = count ?? facts.length;

  return (
    <SpotMosaic
      items={items}
      allHref={allHref}
      total={total}
      moreImages={moreImages}
      head={
        <>
          <SectionHeading
            serif
            title={title}
            href={allHref}
            count={count}
            unit="địa điểm"
          />
          <StatRow>
            <Stat glyph="pin">
              {composition ?? (
                <>
                  <N>{total}</N> địa điểm
                </>
              )}
            </Stat>
            {free > 0 && (
              <Stat glyph="gate">
                <N>{free}</N> vào tự do
              </Stat>
            )}
            {paid > 0 && (
              <Stat glyph="ticket">
                <N>{paid}</N> có bán vé
              </Stat>
            )}
            {noticed > 0 && (
              <Stat glyph="warn">
                <N>{noticed}</N> nơi có lưu ý
              </Stat>
            )}
          </StatRow>
        </>
      }
    />
  );
}
