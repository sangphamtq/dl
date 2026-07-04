import { Map as MapIcon } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ComingSoon } from "@/components/site/coming-soon";

export const metadata = { title: "Bản đồ du lịch · Halivivu" };

// Placeholder — bản đồ khám phá điểm đến toàn Việt Nam đang phát triển.
export default function BanDoPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <ComingSoon
        icon={MapIcon}
        title="Bản đồ du lịch Việt Nam"
        description="Sắp ra mắt — khám phá mọi điểm đến trên khắp Việt Nam qua một bản đồ tương tác. Chọn vùng, xem các điểm đến nổi bật và lên ý tưởng cho chuyến đi tiếp theo."
      />
      <SiteFooter />
    </div>
  );
}
