import Link from "next/link";
import { cn } from "@/lib/utils";
import { R_BADGE, R_CARD } from "@/lib/radius";
import Image from "next/image";
import { Ic } from "@/components/icon";
import { coverUrl } from "@/lib/place-image";

export type PlaceCardData = {
  slug: string;
  name: string;
  kind: "province" | "destination";
  description: string | null;
  images: { url: string; isCover: boolean }[];
};

export function PlaceCard({ place }: { place: PlaceCardData }) {
  const isProvince = place.kind === "province";

  return (
    <Link
      href={`/diem-den/${place.slug}`}
      className={cn(R_CARD, "group flex flex-col border border-border bg-card p-3 transition-colors hover:border-foreground")}
    >
      <div className={cn(R_BADGE, "relative aspect-[4/3] overflow-hidden bg-muted")}>
        <Image
          src={coverUrl(place.images, place.slug)}
          alt={place.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Ic
            icon={isProvince ? "map-pin" : "compass"}
            className="size-3.5 text-primary"
            aria-hidden
          />
          {isProvince ? "Tỉnh / Thành phố" : "Điểm đến"}
        </div>
        <h3 className="mt-1 font-semibold tracking-tight underline-offset-4 group-hover:underline">
          {place.name}
        </h3>
        {place.description && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {place.description}
          </p>
        )}
      </div>
    </Link>
  );
}
