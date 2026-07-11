"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Loader2, Maximize } from "@/components/icons";

const Inner = dynamic(() => import("./place-mini-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="grid size-full place-items-center bg-muted">
      <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
    </div>
  ),
});

// Mini-map vị trí điểm đến trên trang chi tiết + lối vào bản đồ toàn quốc.
export function PlaceMiniMap({
  lat,
  lng,
  name,
  coverUrl,
  slug,
}: {
  lat: number;
  lng: number;
  name: string;
  coverUrl: string | null;
  slug: string;
}) {
  return (
    <div className="relative h-48 overflow-hidden rounded-2xl border border-border/60 bg-muted">
      <Inner lat={lat} lng={lng} name={name} coverUrl={coverUrl} />
      <Link
        href={`/ban-do?at=${slug}`}
        className="absolute bottom-3 right-3 z-[500] inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold shadow-lg shadow-black/10 backdrop-blur transition-colors hover:bg-background"
      >
        <Maximize className="size-3.5 text-primary" aria-hidden />
        Bản đồ toàn quốc
      </Link>
    </div>
  );
}
