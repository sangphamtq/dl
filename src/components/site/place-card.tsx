import Link from "next/link";
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
      className="group flex flex-col rounded-2xl bg-card p-3 shadow-md shadow-black/5 ring-1 ring-border/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
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
        <h3 className="mt-1 font-semibold tracking-tight transition-colors group-hover:text-primary">
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
