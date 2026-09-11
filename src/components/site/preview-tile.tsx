import Image from "next/image";
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
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
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
  tone?: "cat" | "mark" | "dark";
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
        "font-[family-name:var(--font-display)] font-semibold leading-snug tracking-tight underline-offset-4 group-hover:underline",
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
          ? "font-medium text-primary"
          : tone === "warn"
            ? "text-warm"
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

export function StatRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function Stat({
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

export function N({ children }: { children: React.ReactNode }) {
  return (
    <b className="font-semibold tabular-nums text-foreground">{children}</b>
  );
}
