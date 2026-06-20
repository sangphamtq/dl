"use client";

import { Children } from "react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// Carousel ngang (Embla): kéo chuột/vuốt được sẵn, thêm nút ‹ › trên desktop.
// itemClassName: bề rộng mỗi card (vd "w-72", "w-44").
// arrowClassName: canh lại vị trí nút ‹ › (vd "top-1/2 -translate-y-1/2" cho card cao).
export function Rail({
  children,
  itemClassName,
  arrowClassName,
}: {
  children: React.ReactNode;
  itemClassName?: string;
  arrowClassName?: string;
}) {
  const arrowBase =
    "left-3 top-[36%] hidden size-10 border-0 bg-black/45 text-white opacity-0 shadow-lg backdrop-blur-md transition-all pointer-events-none hover:bg-black/65 hover:text-white disabled:cursor-default disabled:bg-black/25 disabled:opacity-0 disabled:pointer-events-auto group-hover/rail:pointer-events-auto group-hover/rail:opacity-100 sm:inline-flex";

  return (
    <Carousel
      opts={{ align: "start", dragFree: true }}
      plugins={[WheelGesturesPlugin()]}
      className="group/rail mt-6"
    >
      <CarouselContent className="-ml-4">
        {Children.map(children, (child) => (
          <CarouselItem className={itemClassName}>{child}</CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className={cn(arrowBase, arrowClassName)} />
      <CarouselNext className={cn(arrowBase, "left-auto right-3", arrowClassName)} />
    </Carousel>
  );
}
