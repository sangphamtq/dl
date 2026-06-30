"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, BadgeCheck, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import {
  ACCOMMODATION_CATEGORY_LABELS,
  PRICE_LABELS,
  label,
} from "@/lib/listing-labels";
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

// Lưới Nơi lưu trú: click card → trang chi tiết (/luu-tru/[slug]); hover hiện nút
// "Xem nhanh" → mở ngăn trượt (drawer) chi tiết tại chỗ. Hỗ trợ mở sẵn drawer theo
// ?open=<slug> (deep-link từ trang khác).
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
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Nơi lưu trú</h2>
        <p className="shrink-0 text-sm text-muted-foreground">
          {accommodations.length} mục
        </p>
      </div>
      <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
        {accommodations.map((a) => (
          <article key={a.slug} className="group relative">
            {/* Link phủ toàn card → trang chi tiết (stretched link) */}
            <Link
              href={`/luu-tru/${a.slug}`}
              aria-label={a.name}
              className="absolute inset-0 z-10 rounded-xl"
            />
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
              <Image
                src={coverUrl(a.images, a.slug)}
                alt={a.name}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              {/* Lớp phủ tối nhẹ khi hover (chỉ trang trí, không chặn click) */}
              <div className="pointer-events-none absolute inset-0 z-[15] bg-gradient-to-t from-black/25 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              {a.category && (
                <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur">
                  {label(ACCOMMODATION_CATEGORY_LABELS, a.category)}
                </span>
              )}
              {a.isVerified && (
                <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-600/95 px-2 py-1 text-xs font-medium text-white shadow-sm">
                  <BadgeCheck className="size-3" aria-hidden />
                  Đã xác minh
                </span>
              )}
              {/* Nút Xem nhanh (z cao hơn link) → mở drawer, không điều hướng */}
              <button
                type="button"
                onClick={() => setSelected(a.slug)}
                aria-label={`Xem nhanh ${a.name}`}
                className="absolute bottom-2 left-1/2 z-20 inline-flex -translate-x-1/2 translate-y-1 items-center gap-1.5 rounded-full bg-background/95 px-3 py-1.5 text-xs font-semibold shadow-md backdrop-blur transition-all duration-200 hover:bg-background focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 sm:opacity-0"
              >
                <Eye className="size-3.5" aria-hidden />
                Xem nhanh
              </button>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <h3 className="font-semibold tracking-tight line-clamp-1">
                {a.name}
              </h3>
              {a.priceRange && (
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  {label(PRICE_LABELS, a.priceRange)?.split(" · ")[0]}
                </span>
              )}
            </div>
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
          </article>
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
