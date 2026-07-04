import { Route } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ComingSoon } from "@/components/site/coming-soon";

export const metadata = { title: "Lịch trình · Halivivu" };

// Placeholder — trình lập lịch trình chuyến đi đang phát triển.
export default function LichTrinhPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <ComingSoon
        icon={Route}
        title="Lịch trình chuyến đi"
        description="Sắp ra mắt — tự lên lịch trình nhiều ngày: thêm điểm đến, quán ăn và nơi lưu trú vào từng ngày, xem gợi ý di chuyển và ước tính chi phí cho chuyến đi của bạn."
      />
      <SiteFooter />
    </div>
  );
}
