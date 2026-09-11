import { notFound } from "next/navigation";
import { Compass } from "@/components/icons";
import Link from "next/link";
import { getPlaceHeader } from "@/lib/place-meta";
import { getPlaceGeoPoints } from "@/lib/geo";
import { isStaffViewer } from "@/lib/preview";
import { MapExplorer } from "@/components/map/map-explorer";
import { notFoundMetadata } from "@/lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ placeSlug: string }>;
}) {
  const { placeSlug } = await params;
  const place = await getPlaceHeader(placeSlug);
  if (!place || place.status !== "published") return notFoundMetadata;
  return { title: `Bản đồ ${place.name}` };
}

export default async function PlaceMapPage({
  params,
}: {
  params: Promise<{ placeSlug: string }>;
}) {
  const { placeSlug } = await params;
  const place = await getPlaceHeader(placeSlug);
  const staff = await isStaffViewer();
  if (!place || (place.status !== "published" && !staff)) notFound();

  const points = await getPlaceGeoPoints(place.id);

  return (
    <div className="flex h-dvh flex-col lg:h-[calc(100dvh-4rem)]">
      <main className="min-h-0 flex-1">
        {points.length > 0 ? (
          <MapExplorer
            points={points}
            placeName={place.name}
            placeSlug={place.slug}
          />
        ) : (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <Compass className="mx-auto size-8 text-muted-foreground/60" aria-hidden />
              <p className="mt-3 font-medium">Chưa có địa điểm trên bản đồ</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {place.name} chưa có địa điểm, quán ăn hay nơi lưu trú nào được gắn toạ độ.
              </p>
              <Link
                href={`/diem-den/${place.slug}`}
                className="mt-4 inline-flex rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
              >
                Quay lại {place.name}
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
