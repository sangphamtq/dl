import Image from "next/image";
import Link from "next/link";
import { Glyph } from "@/components/site/glyphs";
import { PhotoBadge } from "@/components/site/preview-tile";
import type { SpotPreviewItem } from "@/components/site/spot-preview";
import { R_BADGE, R_CARD } from "@/lib/radius";
import { cn } from "@/lib/utils";

// Lưới 12 cột từ lg; ô "Xem tất cả" là một ô của lưới. Ô cuối và ô xem tất cả
// đặt vị trí tường minh ở hàng 3 để ô xem tất cả vẫn CUỐI trong DOM (tab tới sau
// cùng) mà nằm góc trái-dưới.
const LAYOUTS: Record<number, { rows: string; cells: string[]; all: string }> = {
  1: {
    rows: "lg:grid-rows-[15rem_15rem]",
    cells: ["lg:col-span-8 lg:row-span-2"],
    all: "lg:col-span-4 lg:row-span-2",
  },
  2: {
    rows: "lg:grid-rows-[15rem_15rem]",
    cells: ["lg:col-span-8 lg:row-span-2", "lg:col-span-4"],
    all: "lg:col-span-4",
  },
  3: {
    rows: "lg:grid-rows-[15rem_15rem]",
    cells: ["lg:col-span-6 lg:row-span-2", "lg:col-span-6", "lg:col-span-3"],
    all: "lg:col-span-3",
  },
  4: {
    rows: "lg:grid-rows-[14rem_14rem_15rem]",
    cells: [
      "lg:col-span-6 lg:row-span-2",
      "lg:col-span-6",
      "lg:col-span-6",
      "lg:col-span-8 lg:col-start-5 lg:row-start-3",
    ],
    all: "lg:col-span-4 lg:col-start-1 lg:row-start-3",
  },
  5: {
    rows: "lg:grid-rows-[14rem_14rem_15rem]",
    cells: [
      "lg:col-span-6 lg:row-span-2",
      "lg:col-span-3",
      "lg:col-span-3",
      "lg:col-span-6",
      "lg:col-span-8 lg:col-start-5 lg:row-start-3",
    ],
    all: "lg:col-span-4 lg:col-start-1 lg:row-start-3",
  },
};

export function SpotMosaic({
  items,
  head,
  allHref,
  total,
  moreImages = [],
}: {
  items: SpotPreviewItem[];
  head: React.ReactNode;
  allHref: string;
  total: number;
  moreImages?: string[];
}) {
  const shown = items.slice(0, 5);
  const n = shown.length;
  const layout = LAYOUTS[n] ?? LAYOUTS[5]!;

  // Thiếu ảnh địa điểm chưa hiện (nơi có ≤ 5 địa điểm) thì mượn ảnh từ cuối lưới.
  const stack = [
    ...moreImages,
    ...shown
      .map((s) => s.image)
      .reverse()
      .filter((u) => !moreImages.includes(u)),
  ].slice(0, Math.max(2, Math.min(3, total - n)));

  return (
    <div>
      {head}

      <div
        className={cn(
          "mt-8 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-12",
          layout.rows,
        )}
      >
        {shown.map((s, i) => {
          const lead = i === 0;
          // Dưới lg: ô đầu trải 2 cột, còn lại xếp cặp; lẻ cặp thì ô cuối trải 2 cột.
          const wideSmall = lead || (i === n - 1 && (n - 1) % 2 === 1);
          return (
            <Tile
              key={s.slug}
              s={s}
              index={i}
              lead={lead}
              className={cn(
                wideSmall
                  ? "col-span-2 aspect-[4/3] sm:aspect-[16/9]"
                  : "aspect-square sm:aspect-[4/3]",
                "lg:aspect-auto",
                layout.cells[i],
              )}
            />
          );
        })}

        <AllTile
          href={allHref}
          more={total - n}
          images={stack}
          className={cn("col-span-2 aspect-[16/9] sm:aspect-[5/2] lg:aspect-auto", layout.all)}
        />
      </div>
    </div>
  );
}

function Tile({
  s,
  index,
  lead,
  className,
}: {
  s: SpotPreviewItem;
  index: number;
  lead: boolean;
  className?: string;
}) {
  const subline = s.tagline ?? s.description;
  return (
    <Link
      href={`/dia-diem/${s.slug}`}
      className={cn(
        R_CARD,
        "group relative isolate flex min-h-0 flex-col justify-end overflow-hidden bg-muted p-2.5 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring sm:p-3",
        className,
      )}
    >
      <Image
        src={s.image}
        alt=""
        fill
        priority={lead}
        sizes={
          lead
            ? "(min-width: 1024px) 45vw, 100vw"
            : "(min-width: 1024px) 30vw, 50vw"
        }
        className="-z-10 object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />

      {s.notice && (
        // Ô vuông trên điện thoại (~170px) không đủ chỗ cho cả hai huy hiệu.
        <span className={cn(s.price && !lead && "max-sm:hidden")}>
          <PhotoBadge tone="warn" glyph="warn">
            Lưu ý
          </PhotoBadge>
        </span>
      )}
      {s.price && (
        <PhotoBadge side="right" tone="dark" glyph="ticket">
          {s.price}
        </PhotoBadge>
      )}

      {/* Nhãn kính mờ thay cho lớp phủ tối trùm ảnh: ảnh giữ nguyên độ sáng,
          chữ vẫn đọc được trên mọi nền (trời trắng, cát, biển). */}
      <div
        className={cn(
          "w-fit max-w-full rounded-[4px] bg-black/45 text-white backdrop-blur-md transition-colors duration-300 group-hover:bg-black/60",
          lead ? "px-3.5 py-2.5 sm:px-4 sm:py-3" : "px-2.5 py-1.5 sm:px-3 sm:py-2",
        )}
      >
        <p className="flex items-baseline gap-2">
          <span className="shrink-0 text-[0.6rem] font-semibold tabular-nums text-white/55">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span
            className={cn(
              "min-w-0 font-[family-name:var(--font-display)] font-semibold leading-snug tracking-tight",
              lead
                ? "text-lg sm:text-2xl"
                : "line-clamp-2 text-sm sm:text-base",
            )}
          >
            {s.name}
          </span>
        </p>
        {lead && subline && (
          <p className="mt-1 hidden max-w-md text-sm leading-relaxed text-white/80 sm:block">
            <span className="line-clamp-2">{subline}</span>
          </p>
        )}
        {(s.bestTime || s.categoryLabel) && (
          <p
            className={cn(
              "mt-0.5 flex items-center gap-1.5 truncate text-xs",
              s.bestTime ? "font-medium text-[#b4efa8]" : "text-white/65",
              lead ? "sm:mt-1.5" : "max-sm:hidden",
            )}
          >
            {s.bestTime && <Glyph name="sunrise" className="size-3.5 shrink-0" />}
            <span className="truncate">{s.bestTime ?? s.categoryLabel}</span>
          </p>
        )}
      </div>
    </Link>
  );
}

// Vị trí + độ nghiêng của từng tấm trong xấp ảnh; hover thì xấp xoè ra.
// Cao theo % của ô, rộng suy từ aspect ⇒ xấp co giãn theo mọi kích thước ô.
const PRINTS = [
  "right-[36%] top-[20%] h-[56%] -rotate-[10deg] group-hover:-translate-x-6 group-hover:-rotate-[18deg]",
  "right-[20%] top-[9%] z-10 h-[60%] rotate-[3deg] group-hover:-translate-y-3 group-hover:rotate-0",
  "right-[5%] top-[24%] h-[54%] rotate-[14deg] group-hover:translate-x-4 group-hover:rotate-[22deg]",
];

// Nền xanh rừng đậm viết thẳng mã màu: ô tối ở CẢ HAI theme.
function AllTile({
  href,
  more,
  images,
  className,
}: {
  href: string;
  more: number;
  images: string[];
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        R_CARD,
        "group relative isolate flex min-h-0 flex-col justify-end overflow-hidden bg-[#10231a] p-5 text-white outline-offset-2 transition-colors hover:bg-[#15301f] focus-visible:outline-2 focus-visible:outline-ring sm:p-6",
        className,
      )}
    >
      <span aria-hidden className="absolute inset-0 -z-10">
        {images.map((src, i) => (
          <span
            key={src}
            className={cn(
              R_BADGE,
              "absolute aspect-[4/5] overflow-hidden bg-white p-1 shadow-[0_14px_28px_-10px_rgba(0,0,0,0.6)] transition-[rotate,translate] duration-500 ease-out motion-reduce:transition-none",
              PRINTS[i],
            )}
          >
            <span className="relative block h-full w-full overflow-hidden rounded-[2px] bg-neutral-200">
              <Image src={src} alt="" fill sizes="180px" className="object-cover" />
            </span>
          </span>
        ))}
      </span>

      <span className="font-[family-name:var(--font-display)] text-5xl font-semibold leading-none tabular-nums tracking-tight sm:text-6xl">
        {more > 0 ? `+${more}` : "Tất cả"}
      </span>
      <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-white/85">
        {more > 0 ? "địa điểm nữa" : "địa điểm"}
        <Glyph
          name="forward"
          className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
        />
      </span>
    </Link>
  );
}
