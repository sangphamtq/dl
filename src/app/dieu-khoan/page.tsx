import { FileText } from "@/components/icons";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ComingSoon } from "@/components/site/coming-soon";

export const metadata = { title: "Điều khoản sử dụng" };

export default function DieuKhoanPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <ComingSoon
        icon={FileText}
        title="Điều khoản sử dụng"
        description="Sắp có — điều khoản sử dụng dịch vụ Halivivu."
      />
      <SiteFooter />
    </div>
  );
}
