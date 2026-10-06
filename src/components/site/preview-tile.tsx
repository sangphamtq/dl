import Image from "next/image";
import Link from "next/link";
import { Glyph, type GlyphName } from "@/components/site/glyphs";
import { R_BADGE, R_CARD } from "@/lib/radius";
import { cn } from "@/lib/utils";

export function TilePhoto({
  src,
  alt = "",
  sizes,
  priority,
  ratio = "aspect-[4/3]",
  className,
  children,
}: {
  src: string;
  alt?: string;
  sizes: string;
  priority?: boolean;
  ratio?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn(R_CARD, "relative overflow-hidden bg-muted", ratio, className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
      {children}
    </div>
  );
}

export function PhotoBadge({
  side = "left",
  tone = "cat",
  glyph,
  children,
}: {
  side?: "left" | "right";
  tone?: "cat" | "mark" | "dark" | "warn";
  glyph?: GlyphName;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        R_BADGE,
        "absolute top-3 inline-flex items-center gap-1 px-2.5 py-1 shadow-sm backdrop-blur-sm",
        side === "left" ? "left-3" : "right-3",
        tone === "dark"
          ? "bg-neutral-900/85 text-[0.6875rem] font-semibold tabular-nums text-white"
          : tone === "warn"
            ? "bg-warm text-[0.6875rem] font-semibold text-neutral-950"
            : "bg-white/95 text-neutral-900",
        tone === "cat" &&
          "text-[0.6rem] font-semibold uppercase tracking-[0.14em]",
        tone === "mark" && "text-[0.7rem] font-semibold",
      )}
    >
      {glyph && <Glyph name={glyph} className="size-3.5 shrink-0" />}
      {children}
    </span>
  );
}

export function TileName({
  size = "tile",
  className,
  children,
}: {
  size?: "tile" | "row" | "lead";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h3
      className={cn(
        // Không zoom ảnh, không gạch chân: dấu hiệu bấm được duy nhất ở các mục
        // xem trước là TÊN ĐỔI MÀU.
        "font-[family-name:var(--font-display)] font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary",
        size === "lead"
          ? "text-2xl sm:text-[1.75rem]"
          : size === "row"
            ? "text-base"
            : "text-base sm:text-lg",
        className,
      )}
    >
      {children}
    </h3>
  );
}

export function FactLine({
  glyph,
  tone = "mute",
  clamp = 1,
  children,
}: {
  glyph: GlyphName;
  tone?: "time" | "warn" | "mute";
  clamp?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "flex gap-1.5 text-xs",
        tone === "time"
          ? "font-medium text-primary-ink"
          : tone === "warn"
            ? "text-warm-ink"
            : "text-muted-foreground",
      )}
    >
      <Glyph name={glyph} className="mt-px size-3.5 shrink-0" />
      <span className={clamp === 2 ? "line-clamp-2" : "line-clamp-1"}>
        {children}
      </span>
    </p>
  );
}

/* Dòng "xem tất cả" dùng chung cho các mục xem trước. CỐ Ý không phải một dải
   nền đặc: ô "Xem tất cả" của lưới địa điểm tô nền được vì nó là MỘT Ô giữa các
   ô ảnh, còn ở đây nó nằm cuối một danh sách/lưới chữ — một mảng màu trải hết
   bề ngang là hình khối không có ở đâu khác trên trang, đọc ra như banner dán
   thêm. Nổi bật ở đây đến từ CON SỐ và xấp ảnh, không từ màu nền. */
export function PreviewAllRow({
  href,
  more,
  unit,
  allLabel,
  images = [],
  thumb = "square",
}: {
  href: string;
  more: number;
  /** Danh từ đi sau số: "trải nghiệm nữa", "quán nữa". */
  unit: string;
  /** Nhãn khi không còn mục nào ngoài những mục đang hiện. */
  allLabel: string;
  images?: string[];
  thumb?: "square" | "wide";
}) {
  const wide = thumb === "wide";

  return (
    <Link href={href} className="group flex items-center gap-4 py-4">
      {images.length > 0 && (
        <span
          aria-hidden
          className={cn("flex shrink-0", wide ? "-space-x-5" : "-space-x-4")}
        >
          {images.slice(0, 3).map((src, i) => (
            <span
              key={src}
              className={cn(
                R_BADGE,
                "relative overflow-hidden bg-muted ring-2 ring-background transition-transform duration-300 ease-out motion-reduce:transition-none",
                wide ? "aspect-[3/2] w-16" : "size-11",
                i === 1 && "group-hover:translate-x-1.5",
                i === 2 && "group-hover:translate-x-3",
              )}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes={wide ? "64px" : "44px"}
                className="object-cover"
              />
            </span>
          ))}
        </span>
      )}

      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="font-[family-name:var(--font-display)] text-3xl font-semibold leading-none tabular-nums tracking-tight text-foreground transition-colors group-hover:text-primary">
          {more > 0 ? `+${more}` : "Tất cả"}
        </span>
        <span className="truncate text-sm text-muted-foreground">
          {more > 0 ? unit : allLabel}
        </span>
      </span>

      <Glyph
        name="forward"
        className="size-5 shrink-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary motion-reduce:transition-none"
      />
    </Link>
  );
}
