import { HelpCircle } from "@/components/icons";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ComingSoon } from "@/components/site/coming-soon";

export const metadata = { title: "Câu hỏi thường gặp" };

export default function CauHoiThuongGapPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <ComingSoon
        icon={HelpCircle}
        title="Câu hỏi thường gặp"
        description="Sắp có — giải đáp các thắc mắc thường gặp về cách dùng Halivivu: tra cứu điểm đến, liên hệ chỗ ở và đi lại an toàn."
      />
      <SiteFooter />
    </div>
  );
}
