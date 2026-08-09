import { Map as MapIcon } from "@/components/icons";
import { getDestinationMapPoints, getAllGeoListingPoints } from "@/lib/geo";
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
    // CHIỀU CAO PHẢI XÁC ĐỊNH, không được để `flex-1` tự lo.
    // Header nay nằm NGOÀI trang (ở layout `(site)`) nên `h-[100dvh]` cũ sẽ đẩy
    // tổng chiều cao vượt khung nhìn — nhưng thay bằng `flex-1` thì hỏng nặng
    // hơn: chuỗi cha chỉ có `min-h-full` trên <body>, tức KHÔNG có chiều cao xác
    // định, nên `flex-1` co về 0, Leaflet khởi tạo trên khung 0×0 và `fitBounds`
    // trả về `LatLng(NaN, NaN)` → cả trang văng sang màn hình lỗi.
    // Trừ thẳng chiều cao header: dưới lg header `hidden` nên không chiếm chỗ,
    // từ lg mới phải trừ 4rem (h-16 — xem header-chrome.tsx).
    <div className="flex h-dvh flex-col lg:h-[calc(100dvh-4rem)]">
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
