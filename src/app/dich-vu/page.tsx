import { ConciergeBell } from "@/components/icons";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ComingSoon } from "@/components/site/coming-soon";

export const metadata = { title: "Dịch vụ · Halivivu" };

// Placeholder — hub dịch vụ du lịch (lưu trú, thuê xe, tour…) đang phát triển.
export default function DichVuPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <ComingSoon
        icon={ConciergeBell}
        title="Dịch vụ du lịch"
        description="Sắp ra mắt — đặt lưu trú, thuê xe, tour và các dịch vụ du lịch đã xác minh, lọc theo tỉnh bạn đang ở."
      />
      <SiteFooter />
    </div>
  );
}
