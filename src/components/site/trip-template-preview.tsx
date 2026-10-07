import Image from "next/image";
import Link from "next/link";
import { Glyph } from "@/components/site/glyphs";
import { TileName } from "@/components/site/preview-tile";
import { R_BADGE } from "@/lib/radius";
import { cn } from "@/lib/utils";

const MAX_DAYS = 4;
const STACK = 3;

export type TripTemplatePreviewItem = {
  slug: string;
  title: string;
  stopCount: number;
  /** `images` = ảnh THẬT của các điểm dừng trong ngày, theo thứ tự đi (không gồm chỗ ở). */
  days: { title: string | null; images: string[] }[];
};

export function TripTemplatePreview({ trips }: { trips: TripTemplatePreviewItem[] }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {trips.map((t) => (
        <li key={t.slug}>
          <TripRow trip={t} />
        </li>
      ))}
    </ul>
  );
}

function TripRow({ trip }: { trip: TripTemplatePreviewItem }) {
  const days = trip.days.slice(0, MAX_DAYS);
  const moreDays = trip.days.length - days.length;

  return (
    <Link
      href={`/lich-trinh/${trip.slug}`}
      className="group grid grid-cols-1 gap-5 py-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)_auto] lg:items-center lg:gap-10"
    >
      <div>
        <TileName>{trip.title}</TileName>
        <p className="mt-1 text-sm text-muted-foreground">
          <b className="font-semibold tabular-nums text-foreground">{trip.stopCount}</b> điểm dừng
          {moreDays > 0 && (
            <span className="ps-4">
              <b className="font-semibold tabular-nums text-foreground">+{moreDays}</b> ngày nữa
            </span>
          )}
        </p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <ol
          className="relative grid w-max [--day-w:9.5rem] sm:[--day-w:12rem]"
          // Cột RỘNG CỐ ĐỊNH: "Ngày 2" của mọi mẫu nằm cùng một chỗ nên đọc dọc so được;
          // chia đều theo bề ngang thì mẫu 2 ngày đẩy ngày 2 ra tận giữa trang.
          style={{ gridTemplateColumns: `repeat(${days.length}, var(--day-w))` }}
        >
          {/* Vạch nối từ tâm xấp đầu tới xấp cuối; xấp ảnh đục nên chỉ khoảng
              giữa các ngày lộ vạch. */}
          {days.length > 1 && (
            <span
              aria-hidden
              className="absolute left-[22px] top-[22px] h-px bg-border"
              style={{ right: `calc(${100 / days.length}% - 22px)` }}
            />
          )}
          {days.map((d, i) => (
            <li key={i} className="relative min-w-0 pr-4">
              <DayStack index={i} images={d.images.slice(0, STACK)} />
              {/* Ngày không ảnh thì ô vuông đã in số ngày — khỏi nhắc lại nhãn. */}
              {d.images.length > 0 && (
                <p className="mt-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Ngày {i + 1}
                </p>
              )}
              {d.title && (
                <p
                  className={cn(
                    "truncate text-sm text-foreground/90",
                    d.images.length > 0 ? "mt-0.5" : "mt-2.5",
                  )}
                >
                  {d.title}
                </p>
              )}
            </li>
          ))}
        </ol>
      </div>

      <Glyph
        name="forward"
        className="hidden size-5 shrink-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary motion-reduce:transition-none lg:block"
      />
    </Link>
  );
}

function DayStack({ index, images }: { index: number; images: string[] }) {
  if (images.length === 0) {
    return (
      <span
        aria-hidden
        className={cn(
          R_BADGE,
          "relative flex size-11 items-center justify-center bg-muted font-[family-name:var(--font-display)] text-base font-semibold tabular-nums text-muted-foreground ring-2 ring-background",
        )}
      >
        {index + 1}
      </span>
    );
  }
  return (
    <span aria-hidden className="relative flex -space-x-4">
      {images.map((src) => (
        <span
          key={src}
          className={cn(R_BADGE, "relative size-11 overflow-hidden bg-muted ring-2 ring-background")}
        >
          <Image src={src} alt="" fill sizes="44px" className="object-cover" />
        </span>
      ))}
    </span>
  );
}
