"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { ACCOMMODATION_CATEGORY_LABELS, label } from "@/lib/listing-labels";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AccommodationDetail,
  type AccommodationDetailData,
} from "@/components/site/accommodation-detail";

// Lưới Nơi lưu trú: bấm card mở ngăn trượt (drawer) chi tiết. Hỗ trợ mở sẵn theo
// ?open=<slug> (deep-link từ trang khác / URL chi tiết cũ đã chuyển hướng về đây).
export function AccommodationSection({
  accommodations,
  openSlug,
}: {
  accommodations: AccommodationDetailData[];
  openSlug?: string;
}) {
  const bySlug = useMemo(
    () => new Map(accommodations.map((a) => [a.slug, a])),
    [accommodations],
  );
  const [selected, setSelected] = useState<string | null>(() =>
    openSlug && bySlug.has(openSlug) ? openSlug : null,
  );

  const active = selected ? bySlug.get(selected) : undefined;

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
        {accommodations.map((a) => (
          <button
            key={a.slug}
            type="button"
            onClick={() => setSelected(a.slug)}
            aria-label={`Xem chi tiết ${a.name}`}
            className="group block text-left"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted shadow-sm shadow-black/5 transition-shadow group-hover:shadow-md">
              <Image
                src={coverUrl(a.images, a.slug)}
                alt={a.name}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              {a.category && (
                <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur">
                  {label(ACCOMMODATION_CATEGORY_LABELS, a.category)}
                </span>
              )}
            </div>
            <h3 className="mt-2.5 font-semibold tracking-tight line-clamp-1">
              {a.name}
            </h3>
            {a.description && (
              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {a.description}
              </p>
            )}
            {a.address && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" aria-hidden />
                <span className="line-clamp-1">
                  {a.address.split(",").pop()?.trim()}
                </span>
              </p>
            )}
            {a.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {a.tags.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>

      <Sheet
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        <SheetContent
          side="right"
          className={cn(
            "w-full gap-0 overflow-y-auto p-0 will-change-transform sm:max-w-md lg:max-w-lg",
            "data-[state=open]:duration-300! data-[state=closed]:duration-200!",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:slide-in-from-right-8! data-[state=closed]:slide-out-to-right-8!",
          )}
        >
          {active && (
            <>
              <SheetHeader className="sr-only">
                <SheetTitle>{active.name}</SheetTitle>
                <SheetDescription>Chi tiết nơi lưu trú</SheetDescription>
              </SheetHeader>
              <AccommodationDetail data={active} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
