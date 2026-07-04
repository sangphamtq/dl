import { Car } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ComingSoon } from "@/components/site/coming-soon";

export const metadata = { title: "Thuê xe · Halivivu" };

// Placeholder — dịch vụ thuê xe / đưa đón đang phát triển.
export default function ThueXePage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <ComingSoon
        icon={Car}
        title="Thuê xe & đưa đón"
        description="Sắp ra mắt — thuê xe máy, ô tô và dịch vụ đưa đón từ các đơn vị đáng tin cậy tại điểm đến của bạn."
      />
      <SiteFooter />
    </div>
  );
}
