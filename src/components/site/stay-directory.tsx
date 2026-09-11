import Link from "next/link";
import { Glyph } from "@/components/site/glyphs";
import {
  FactLine,
  N,
  PhotoBadge,
  Stat,
  StatRow,
  TileName,
  TilePhoto,
} from "@/components/site/preview-tile";
import { coverUrl } from "@/lib/place-image";
import { compositionLine, countByLabel } from "@/lib/listing-summary";
import { ACCOMMODATION_CATEGORY_LABELS, label } from "@/lib/listing-labels";
import { SectionHeading } from "@/components/site/section-heading";

export type StayEntry = {
  slug: string;
  name: string;
  category: string | null;
  address: string | null;
  isVerified: boolean;
  images: { url: string; isCover: boolean }[];
};

export type StayFacts = { categoryLabel: string | null };

export function StayDirectory({
  placeName,
  href,
  total,
  verifiedTotal,
  stays,
  facts,
}: {
  placeName: string;
  href: string;
  total?: number;
  verifiedTotal: number;
  stays: StayEntry[];
  facts: StayFacts[];
}) {
  if (stays.length === 0) return null;

  return (
    <div>
      <SectionHeading
        serif
        title={`Nơi lưu trú ở ${placeName}`}
        href={href}
        count={total}
        unit="chỗ ở"
      />

      <StatRow>
        <Stat glyph="bed">
          {compositionLine(
            countByLabel(facts.map((f) => f.categoryLabel)),
            facts.length,
          ) ?? (
            <>
              <N>{total ?? stays.length}</N> chỗ ở
            </>
          )}
        </Stat>
        {verifiedTotal > 0 ? (
          <Stat glyph="check">
            <N>{verifiedTotal}</N> đã xác minh chính chủ
          </Stat>
        ) : (
          <Stat glyph="shield">Chưa chỗ nào được xác minh</Stat>
        )}
      </StatRow>

      <p className="mt-3 max-w-2xl text-xs leading-relaxed text-muted-foreground">
        <strong className="font-semibold text-foreground">Đã xác minh</strong> =
        Halivivu đã đối chiếu kênh liên hệ (Zalo, Facebook, điện thoại) với chủ
        nhà. Chỗ chưa xác minh vẫn hiện, nhưng bạn nên tự kiểm trước khi chuyển
        cọc.
      </p>

      <ul className="mt-6 grid grid-cols-2 gap-x-5 gap-y-9 sm:gap-x-6 md:grid-cols-4">
        {stays.map((s, i) => (
          <StayTile key={s.slug} s={s} priority={i < 4} />
        ))}
      </ul>

      <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <Glyph name="shield" className="mt-0.5 size-3.5 shrink-0 text-warm" />
        Chỉ chuyển cọc qua kênh liên hệ hiển thị trên trang từng chỗ ở.
      </p>
    </div>
  );
}

function StayTile({ s, priority }: { s: StayEntry; priority: boolean }) {
  return (
    <li>
      <Link href={`/luu-tru/${s.slug}`} className="group block">
        <TilePhoto
          src={coverUrl(s.images, s.slug, 800, 600)}
          sizes="(min-width: 768px) 23vw, 46vw"
          priority={priority}
        >
          {s.category && (
            <PhotoBadge>
              {label(ACCOMMODATION_CATEGORY_LABELS, s.category)}
            </PhotoBadge>
          )}
          {s.isVerified && (
            <PhotoBadge side="right" tone="mark" glyph="check">
              Đã xác minh
            </PhotoBadge>
          )}
        </TilePhoto>

        <div className="mt-3.5 flex min-h-[3.25rem] items-start">
          <TileName className="line-clamp-2">{s.name}</TileName>
        </div>

        {s.address && (
          <div className="mt-1">
            <FactLine glyph="pin">{s.address}</FactLine>
          </div>
        )}
      </Link>
    </li>
  );
}
