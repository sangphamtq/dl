"use client";

import { useState } from "react";
import Link from "next/link";
import { Glyph } from "@/components/site/glyphs";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import { R_CARD, R_CTRL } from "@/lib/radius";
import { STANCE_TEXT, stanceMeta, type ReviewStance } from "@/lib/review-meta";

export type CheckInPerson = {
  id: string;
  name: string | null;
  image: string | null;
  stance?: ReviewStance | null;
  checkedAt?: string;
};

const FACES = 5;
const DENSE_FACES = 3;
const initial = (name: string | null) =>
  (name?.trim().charAt(0) || "?").toUpperCase();

export function CheckInFaces({
  people,
  total,
  label = "Vivu-er đã đến",
  placeName,
  reviewsHref,
  tone = "default",
  dense = false,
}: {
  people: CheckInPerson[];
  total: number;
  label?: string;
  placeName?: string;
  reviewsHref?: string;
  tone?: "default" | "onDark";
  dense?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (total <= 0 || people.length === 0) return null;

  const faces = people.slice(0, FACES);
  const overflow = total - faces.length;
  const denseOverflow = total - Math.min(faces.length, DENSE_FACES);

  // Only count stances when the list is complete: `people` is capped server-side,
  // and a ratio over a partial list would describe a different set than `total`.
  const complete = people.length >= total;
  const reviewed = people.filter((p) => p.stance).length;
  const worth = people.filter(
    (p) => p.stance === "love" || p.stance === "worthOnce",
  ).length;
  const rest = total - people.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Xem ${total} Vivu-er đã đến`}
          className={cn(
            R_CTRL,
            "group inline-flex items-center text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            dense ? "gap-2 sm:gap-3" : "gap-3",
          )}
        >
          <AvatarGroup>
            {faces.map((p, i) => (
              <Avatar
                key={p.id}
                className={cn(
                  dense && "size-6 sm:size-8",
                  dense && i >= DENSE_FACES && "hidden sm:flex",
                )}
              >
                {p.image && (
                  <AvatarImage src={p.image} alt={p.name ?? "Vivu-er"} />
                )}
                <AvatarFallback>{initial(p.name)}</AvatarFallback>
              </Avatar>
            ))}
            {dense && denseOverflow > 0 && (
              <AvatarGroupCount className="size-6 text-xs sm:hidden">
                +{denseOverflow > 99 ? "99" : denseOverflow}
              </AvatarGroupCount>
            )}
            {overflow > 0 && (
              <AvatarGroupCount
                className={cn(dense && "hidden sm:flex sm:size-8 sm:text-sm")}
              >
                +{overflow > 99 ? "99" : overflow}
              </AvatarGroupCount>
            )}
          </AvatarGroup>
          <span
            className={cn(
              "text-sm transition-colors",
              dense && "hidden sm:inline",
              tone === "onDark"
                ? "text-white/70 group-hover:text-white"
                : "text-muted-foreground group-hover:text-foreground",
            )}
          >
            {label}
          </span>
        </button>
      </DialogTrigger>

      <DialogContent
        // Opening with the mouse would otherwise land focus on the close button
        // and paint its focus ring as if it were selected.
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cn(R_CARD, "gap-0 p-0 sm:max-w-md")}
      >
        <DialogHeader className="border-b border-border px-5 pb-4 pt-5 pr-12 text-left sm:px-6">
          <DialogTitle className="font-[family-name:var(--font-display)] text-[0.95rem] font-normal uppercase leading-snug tracking-[0.12em]">
            {placeName ? `Đã đến ${placeName}` : "Vivu-er đã đến"}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Glyph
                  name="walk"
                  className="size-4 shrink-0 text-muted-foreground/70"
                />
                <b className="font-semibold tabular-nums text-foreground">
                  {total.toLocaleString("vi-VN")}
                </b>
                Vivu-er
              </span>
              {complete && reviewed > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Glyph
                    name="check"
                    className="size-4 shrink-0 text-muted-foreground/70"
                  />
                  <b className="font-semibold tabular-nums text-foreground">
                    {worth}/{reviewed}
                  </b>
                  thấy đáng đi
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto px-5 sm:px-6">
          {people.map((p) => {
            const meta = p.stance ? stanceMeta(p.stance) : null;
            return (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <Avatar className="size-9">
                  {p.image && (
                    <AvatarImage src={p.image} alt={p.name ?? "Vivu-er"} />
                  )}
                  <AvatarFallback>{initial(p.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {p.name ?? "Vivu-er ẩn danh"}
                  </p>
                  {/* Stance and time share the second line: side by side with the
                      name, a long stance ("Thất vọng, không nên đi") squeezes the
                      name down to a few letters on narrow screens. */}
                  <p className="mt-0.5 flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-xs">
                    {meta && (
                      <span className={cn("font-semibold", STANCE_TEXT[meta.tone])}>
                        {meta.label}
                      </span>
                    )}
                    {p.checkedAt && (
                      <span className="text-muted-foreground">
                        {timeAgo(new Date(p.checkedAt))}
                      </span>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        {(rest > 0 || (reviewsHref && reviewed > 0)) && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border px-5 py-3.5 text-sm sm:px-6">
            <span className="text-muted-foreground">
              {rest > 0 && `và ${rest.toLocaleString("vi-VN")} Vivu-er khác`}
            </span>
            {reviewsHref && reviewed > 0 && (
              <Link
                href={reviewsHref}
                onClick={() => setOpen(false)}
                className="group inline-flex items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline"
              >
                Đọc đánh giá
                <Glyph
                  name="forward"
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
