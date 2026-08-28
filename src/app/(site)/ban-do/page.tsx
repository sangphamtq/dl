import { Map as MapIcon } from "@/components/icons";
import { Playfair_Display } from "next/font/google";
import { getDestinationMapPoints } from "@/lib/geo";
import { VietnamMap } from "@/components/map/vietnam-map";
import { cn } from "@/lib/utils";

// Cùng họ chữ tiêu đề với trang danh sách điểm đến (`/diem-den`) — hai trang
// nói về cùng một tập nội dung nên tiêu đề phải cùng một giọng. Khai ở trang
// vì `--font-serif` không nằm trong root layout (xem `diem-den/page.tsx`).
const serif = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin", "vietnamese"],
  weight: ["400"],
  display: "swap",
});

export const metadata = {
  title: "Bản đồ du lịch Việt Nam · Halivivu",
  description:
    "Khám phá các điểm đến trên khắp Việt Nam qua bản đồ tương tác — chọn vùng, xem điểm đến nổi bật và lên ý tưởng cho chuyến đi.",
};

export default async function BanDoPage({
  searchParams,
}: {
  searchParams: Promise<{ tu?: string; at?: string; gio?: string; lo?: string }>;
}) {
  const [sp, points] = await Promise.all([searchParams, getDestinationMapPoints()]);

  return (
    // CHIỀU CAO PHẢI XÁC ĐỊNH, không được để `flex-1` tự lo.
    // Header nay nằm NGOÀI trang (ở layout `(site)`) nên `h-[100dvh]` cũ sẽ đẩy
    // tổng chiều cao vượt khung nhìn — nhưng thay bằng `flex-1` thì hỏng nặng
    // hơn: chuỗi cha chỉ có `min-h-full` trên <body>, tức KHÔNG có chiều cao xác
    // định, nên `flex-1` co về 0, Leaflet khởi tạo trên khung 0×0 và `fitBounds`
    // trả về `LatLng(NaN, NaN)` → cả trang văng sang màn hình lỗi.
    // Trừ thẳng chiều cao header: dưới lg header `hidden` nên không chiếm chỗ,
    // từ lg mới phải trừ 4rem (h-16 — xem header-chrome.tsx).
    <div className={cn("flex h-dvh flex-col lg:h-[calc(100dvh-4rem)]", serif.variable)}>
      <main className="min-h-0 flex-1">
        {points.length === 0 ? (
          <div className="grid h-full place-items-center px-6 text-center">
            <div className="max-w-md">
              <span
                aria-hidden
                className="mx-auto grid size-12 place-items-center bg-muted text-muted-foreground"
              >
                <MapIcon className="size-5" />
              </span>
              <p className="mt-5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Bản đồ du lịch
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-serif)] text-[clamp(1.75rem,5vw,2.75rem)] font-normal uppercase leading-[1.15] tracking-[0.12em]">
                Việt Nam
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Các điểm đến sẽ hiện trên bản đồ khi có địa điểm được gắn toạ độ.
                Hãy quay lại sau nhé.
              </p>
            </div>
          </div>
        ) : (
          // `?tu=` mốc · `?gio=` ngưỡng giờ lái · `?lo=` lộ trình đang đo.
          // `?at=` là tên cũ của `tu`, vẫn nhận để link đã chia sẻ không gãy.
          <VietnamMap
            points={points}
            initialAt={sp.tu ?? sp.at}
            initialHours={sp.gio ? Number(sp.gio) : undefined}
            initialStops={sp.lo ? sp.lo.split(",").filter(Boolean) : undefined}
          />
        )}
      </main>
    </div>
  );
}
