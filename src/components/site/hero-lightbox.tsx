"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import type { HeroImage } from "@/components/site/place-hero-stack";

export function HeroLightbox({
  images,
  index,
  onClose,
}: {
  images: HeroImage[];
  index: number;
  /** Nhận vị trí ảnh đang xem lúc đóng, để hero nhảy theo. */
  onClose: (index: number) => void;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const n = images.length;

  // Vị trí chạy CỤC BỘ trong lúc mở: đẩy ngược lên hero ngay sẽ khiến `opts`
  // đổi giá trị ⇒ embla `reInit()` NGAY GIỮA CÚ KÉO (xem ghi chú ở `opts`).
  const [current, setCurrent] = useState(index);
  const active = images[current];

  // ⚠️ `opts` phải GIỮ NGUYÊN GIÁ TRỊ suốt vòng đời: embla so sánh sâu options
  // và `reInit()` khi thấy khác — reInit dựng lại engine rồi nhảy về
  // `startIndex`, nên `startIndex` động làm cú kéo khựng/giật ngược.
  const [startIndex] = useState(index);
  const opts = useMemo(
    () => ({ startIndex, loop: n > 1, watchDrag: n > 1 }),
    [startIndex, n],
  );

  // Hero chỉ nhận vị trí mới LÚC ĐÓNG — mỗi lần hero render lại là một loạt
  // transform 700ms chạy ngay dưới lớp phủ.
  const close = useCallback(() => onClose(current), [current, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") api?.scrollNext();
      if (e.key === "ArrowLeft") api?.scrollPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api, close]);

  useEffect(() => {
    if (!api) return;
    const onSel = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSel);
    return () => {
      api.off("select", onSel);
    };
  }, [api]);

  if (typeof document === "undefined" || !active) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/95"
      onClick={close}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium tabular-nums text-white/80">
          {current + 1} / {n}
        </span>
        <button
          type="button"
          aria-label="Đóng"
          onClick={close}
          className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <Carousel setApi={setApi} opts={opts} className="h-full [&>div]:h-full">
          <CarouselContent className="ml-0 h-full">
            {images.map((img, i) => (
              <CarouselItem key={i} className="h-full pl-0">
                <div className="flex h-full items-center justify-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.alt ?? ""}
                    draggable={false}
                    decoding="async"
                    onClick={(e) => e.stopPropagation()}
                    className="max-h-full max-w-full select-none object-contain"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {n > 1 && (
          <>
            <button
              type="button"
              aria-label="Ảnh trước"
              onClick={(e) => {
                e.stopPropagation();
                api?.scrollPrev();
              }}
              className="absolute left-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 sm:left-6"
            >
              <ChevronLeft className="size-6" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Ảnh tiếp theo"
              onClick={(e) => {
                e.stopPropagation();
                api?.scrollNext();
              }}
              className="absolute right-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 sm:right-6"
            >
              <ChevronRight className="size-6" aria-hidden />
            </button>
          </>
        )}
      </div>

      <div className="shrink-0 space-y-3 px-4 pb-5 pt-2 sm:px-6">
        {active.caption && (
          <p className="mx-auto max-w-2xl truncate text-center text-sm text-white/80">
            {active.caption}
          </p>
        )}
        {n > 1 && (
          <div className="flex justify-center">
            <div className="flex max-w-full gap-2 overflow-x-auto p-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    api?.scrollTo(i);
                  }}
                  aria-label={`Ảnh ${i + 1}`}
                  aria-current={i === current ? "true" : undefined}
                  className={cn(
                    "relative aspect-[3/2] w-16 shrink-0 overflow-hidden rounded-md transition-all",
                    i === current
                      ? "ring-2 ring-white"
                      : "opacity-50 hover:opacity-100",
                  )}
                >
                  <Image
                    src={img.url}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
