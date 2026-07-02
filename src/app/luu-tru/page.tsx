import { BedDouble } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ComingSoon } from "@/components/site/coming-soon";

export const metadata = { title: "Lưu trú · Hành Trình Việt" };

// Placeholder — danh bạ lưu trú toàn quốc đang phát triển.
export default function LuuTruPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <ComingSoon
        icon={BedDouble}
        title="Danh bạ lưu trú"
        description="Sắp ra mắt — tìm homestay, khách sạn, resort đã xác minh chính chủ trên khắp Việt Nam, kèm cảnh báo chống lừa cọc."
      />
      <SiteFooter />
    </div>
  );
}
