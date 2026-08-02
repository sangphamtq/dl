"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import type { HeroImage } from "@/components/site/place-hero-stack";

// Lightbox full-screen dùng chung cho mọi hero (deck polaroid, full-bleed…):
// carousel kéo/vuốt + phím mũi tên + dải thumbnail. Portal ra body để thoát mọi
// stacking context của hero (header z-50 → lightbox z-60).
export function HeroLightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: HeroImage[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const n = images.length;
  const active = images[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") api?.scrollNext();
      if (e.key === "ArrowLeft") api?.scrollPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api, onClose]);

  // Đồng bộ slide carousel → index của hero (đóng lại vẫn đúng ảnh đang xem).
  useEffect(() => {
    if (!api) return;
    const onSel = () => onIndexChange(api.selectedScrollSnap());
    api.on("select", onSel);
    return () => {
      api.off("select", onSel);
    };
  }, [api, onIndexChange]);

  if (typeof document === "undefined" || !active) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Thanh trên */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium tabular-nums text-white/80">
          {index + 1} / {n}
        </span>
        <button
          type="button"
          aria-label="Đóng"
          onClick={onClose}
          className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      {/* Ảnh — carousel chiếm phần giữa */}
      <div className="relative min-h-0 flex-1">
        <Carousel
          setApi={setApi}
          opts={{ startIndex: index, loop: n > 1, watchDrag: n > 1 }}
          className="h-full [&>div]:h-full"
        >
          <CarouselContent className="ml-0 h-full">
            {images.map((img, i) => (
              <CarouselItem key={i} className="h-full pl-0">
                {/* Vùng letterbox quanh ảnh: click để đóng; click ảnh thì không. */}
                <div className="flex h-full items-center justify-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.alt ?? ""}
                    draggable={false}
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

      {/* Caption + dải thumbnail */}
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
                  aria-current={i === index ? "true" : undefined}
                  className={cn(
                    "relative aspect-[3/2] w-16 shrink-0 overflow-hidden rounded-md transition-all",
                    i === index
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
