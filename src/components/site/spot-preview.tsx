import { SectionHeading } from "@/components/site/section-heading";
import { SpotMosaic } from "@/components/site/spot-mosaic";

export type SpotPreviewItem = {
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  image: string;
};


export function SpotPreview({
  title,
  count,
  allHref,
  spots,
  moreImages = [],
}: {
  title: string;
  count: number;
  allHref: string;
  spots: SpotPreviewItem[];
  /** Ảnh bìa của các địa điểm chưa có ô, cho ô "Xem tất cả". */
  moreImages?: string[];
}) {
  const items = spots.slice(0, 5);
  if (items.length === 0) return null;

  return (
    <SpotMosaic
      items={items}
      allHref={allHref}
      total={count}
      moreImages={moreImages}
      head={
        <SectionHeading
          serif
          title={title}
          href={allHref}
          count={count}
          unit="địa điểm"
        />
      }
    />
  );
}
