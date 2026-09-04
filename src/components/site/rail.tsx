"use client";

import { Children, useEffect, useState } from "react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { cn } from "@/lib/utils";
import { R_CTRL } from "@/lib/radius";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
} from "@/components/ui/carousel";

export function Rail({
  children,
  itemClassName,
  arrowClassName,
  arrowWrapClassName,
  progress = false,
  heading,
  headingClassName,
  contentClassName,
  viewportClassName,
  meta,
}: {
  children: React.ReactNode;
  itemClassName?: string;
  /** Bo góc/viền của KHUNG bọc cặp mũi tên — khung mới là thứ nhìn thấy, bo
   *  riêng từng nút bên trong thì nền hover sẽ lệch khỏi khung. */
  arrowWrapClassName?: string;
  arrowClassName?: string;
  progress?: boolean;
  heading?: React.ReactNode;
  headingClassName?: string;
  contentClassName?: string;
  viewportClassName?: string;
  meta?: React.ReactNode;
}) {
  const arrowInline =
    R_CTRL + " static hidden size-9 shrink-0 translate-y-0 border-0 bg-transparent text-foreground opacity-100 shadow-none transition-colors hover:bg-foreground hover:text-background disabled:cursor-default disabled:bg-transparent disabled:text-muted-foreground/30 sm:inline-flex";
  const arrowOverlay =
    R_CTRL + " left-3 top-[36%] hidden size-10 border-0 bg-black/45 text-white opacity-0 shadow-lg backdrop-blur-md transition-all pointer-events-none hover:bg-black/65 hover:text-white disabled:cursor-default disabled:bg-black/25 disabled:opacity-0 disabled:pointer-events-auto group-hover/rail:pointer-events-auto group-hover/rail:opacity-100 sm:inline-flex";
  const arrowBase = heading ? arrowInline : arrowOverlay;

  return (
    <Carousel
      opts={{ align: "start", dragFree: true }}
      plugins={[WheelGesturesPlugin()]}
      className="group/rail mt-6"
    >
      {heading && (
        <div
          className={cn(
            "mb-5 flex items-end justify-between gap-6",
            headingClassName,
          )}
        >
          <div className="min-w-0">{heading}</div>
          <div className="hidden shrink-0 items-center gap-5 sm:flex">
            {meta}
            {progress && <RailProgress />}
            <ArrowPair
              wrapClassName={arrowWrapClassName}
              className={cn(arrowBase, arrowClassName)}
              nextClassName={cn(
                arrowBase,
                "left-auto right-auto",
                arrowClassName,
              )}
            />
          </div>
        </div>
      )}
      <div className="relative">
        <CarouselContent
          className={cn("-ml-4", contentClassName)}
          viewportClassName={viewportClassName}
        >
          {Children.map(children, (child) => (
            <CarouselItem className={itemClassName}>{child}</CarouselItem>
          ))}
        </CarouselContent>
        {!heading && (
          <>
            <CarouselPrevious className={cn(arrowBase, arrowClassName)} />
            <CarouselNext
              className={cn(arrowBase, "left-auto right-3", arrowClassName)}
            />
          </>
        )}
      </div>
      {progress && !heading && <RailProgress />}
    </Carousel>
  );
}

function ArrowPair({
  className,
  nextClassName,
  wrapClassName,
}: {
  className?: string;
  nextClassName?: string;
  wrapClassName?: string;
}) {
  const { canScrollPrev, canScrollNext } = useCarousel();
  if (!canScrollPrev && !canScrollNext) return null;

  return (
    <div
      className={cn(
        "flex items-center divide-x divide-border border border-border",
        wrapClassName,
      )}
    >
      <CarouselPrevious className={className} />
      <CarouselNext className={nextClassName} />
    </div>
  );
}

function RailProgress() {
  const { api } = useCarousel();
  const [view, setView] = useState<{ pos: number; ratio: number } | null>(null);

  useEffect(() => {
    if (!api) return;
    const measure = () => {
      const root = api.rootNode();
      const container = api.containerNode();
      const ratio = Math.min(1, root.clientWidth / container.scrollWidth);
      const pos = Math.min(1, Math.max(0, api.scrollProgress()));
      setView({ pos, ratio });
    };
    measure();
    api.on("scroll", measure).on("reInit", measure);
    return () => {
      api.off("scroll", measure).off("reInit", measure);
    };
  }, [api]);

  if (!view || view.ratio >= 0.999) return null;

  const width = view.ratio * 100;
  return (
    <div aria-hidden className="h-[2px] w-14 shrink-0 overflow-hidden bg-border sm:w-20">
      <div
        className="h-full bg-warm"
        style={{
          width: `${width}%`,
          transform: `translateX(${(view.pos * (100 - width) * 100) / width}%)`,
        }}
      />
    </div>
  );
}
