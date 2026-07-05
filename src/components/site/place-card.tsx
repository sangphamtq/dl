import Link from "next/link";
import Image from "next/image";
import { MapPin, Compass } from "lucide-react";
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
  const Icon = isProvince ? MapPin : Compass;

  return (
    <Link
      href={`/diem-den/${place.slug}`}
      className="group block overflow-hidden rounded-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
        <Image
          src={coverUrl(place.images, place.slug)}
          alt={place.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="size-3.5" aria-hidden />
          {isProvince ? "Tỉnh / Thành phố" : "Điểm đến"}
        </div>
        <h3 className="font-semibold tracking-tight transition-colors group-hover:text-primary">
          {place.name}
        </h3>
        {place.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {place.description}
          </p>
        )}
      </div>
    </Link>
  );
}
