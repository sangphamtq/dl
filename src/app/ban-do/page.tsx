import { Map as MapIcon } from "@/components/icons";
import { getDestinationMapPoints, getAllGeoListingPoints } from "@/lib/geo";
import { SiteHeader } from "@/components/site/site-header";
import { VietnamMap } from "@/components/map/vietnam-map";

export const metadata = {
  title: "Bản đồ du lịch Việt Nam · Halivivu",
  description:
    "Khám phá các điểm đến trên khắp Việt Nam qua bản đồ tương tác — chọn vùng, xem điểm đến nổi bật và lên ý tưởng cho chuyến đi.",
};

export default async function BanDoPage({
  searchParams,
}: {
  searchParams: Promise<{ mien?: string; at?: string }>;
}) {
  const [sp, points, listings] = await Promise.all([
    searchParams,
    getDestinationMapPoints(),
    getAllGeoListingPoints(),
  ]);

  return (
    <div className="flex h-[100dvh] flex-col">
      <SiteHeader />
      <main className="min-h-0 flex-1">
        {points.length === 0 ? (
          <div className="grid h-full place-items-center px-6 text-center">
            <div className="max-w-md">
              <MapIcon
                className="mx-auto size-10 text-muted-foreground/60"
                aria-hidden
              />
              <h1 className="mt-4 text-xl font-bold tracking-tight">
                Bản đồ du lịch Việt Nam
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Các điểm đến sẽ hiện trên bản đồ khi có địa điểm được gắn toạ độ.
                Hãy quay lại sau nhé.
              </p>
            </div>
          </div>
        ) : (
          <VietnamMap
            points={points}
            listings={listings}
            initialRegion={sp.mien}
            initialAt={sp.at}
          />
        )}
      </main>
    </div>
  );
}
