"use client";

import { useState } from "react";
import { Footprints } from "@/components/icons";
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
import { stanceMeta, type ReviewStance } from "@/lib/review-meta";

export type CheckInPerson = {
  id: string;
  name: string | null;
  image: string | null;
  stance?: ReviewStance | null;
};

// Pill cảm nhận: tích cực xanh, tiêu cực xám (khớp danh sách review).
function stancePill(stance: ReviewStance) {
  const { tone } = stanceMeta(stance);
  return tone === "positive" || tone === "posSoft"
    ? "bg-primary/10 text-primary"
    : "bg-muted text-muted-foreground";
}

const FACES = 5;
const initial = (name: string | null) =>
  (name?.trim().charAt(0) || "?").toUpperCase();

// Avatar stack các Vivu-er đã check-in + mở dialog xem toàn bộ danh sách.
export function CheckInFaces({
  people,
  total,
}: {
  people: CheckInPerson[];
  total: number;
}) {
  const [open, setOpen] = useState(false);
  if (total <= 0 || people.length === 0) return null;

  const faces = people.slice(0, FACES);
  const overflow = total - faces.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Xem ${total} Vivu-er đã đến`}
          className="group inline-flex items-center gap-3 rounded-full text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <AvatarGroup>
            {faces.map((p) => (
              <Avatar key={p.id}>
                {p.image && (
                  <AvatarImage src={p.image} alt={p.name ?? "Vivu-er"} />
                )}
                <AvatarFallback>{initial(p.name)}</AvatarFallback>
              </Avatar>
            ))}
            {overflow > 0 && (
              <AvatarGroupCount>
                +{overflow > 99 ? "99" : overflow}
              </AvatarGroupCount>
            )}
          </AvatarGroup>
          <span className="text-sm text-muted-foreground group-hover:text-foreground">
            Vivu-er đã đến
          </span>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Footprints className="size-5 text-primary" aria-hidden />
            {total.toLocaleString("vi-VN")} Vivu-er đã đến
          </DialogTitle>
          <DialogDescription className="sr-only">
            Danh sách thành viên Halivivu đã đánh dấu đã đến nơi này.
          </DialogDescription>
        </DialogHeader>

        <ul className="-mx-2 max-h-[60vh] space-y-0.5 overflow-y-auto">
          {people.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-lg px-2 py-2"
            >
              <Avatar>
                {p.image && (
                  <AvatarImage src={p.image} alt={p.name ?? "Vivu-er"} />
                )}
                <AvatarFallback>{initial(p.name)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {p.name ?? "Vivu-er ẩn danh"}
              </span>
              {p.stance && (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                    stancePill(p.stance),
                  )}
                >
                  {stanceMeta(p.stance).label}
                </span>
              )}
            </li>
          ))}
        </ul>

        {total > people.length && (
          <p className="text-center text-sm text-muted-foreground">
            và {(total - people.length).toLocaleString("vi-VN")} Vivu-er khác
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
