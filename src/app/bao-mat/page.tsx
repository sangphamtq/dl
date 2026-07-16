import { ShieldCheck } from "@/components/icons";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ComingSoon } from "@/components/site/coming-soon";

export const metadata = { title: "Chính sách bảo mật" };

export default function BaoMatPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <ComingSoon
        icon={ShieldCheck}
        title="Chính sách bảo mật"
        description="Sắp có — chính sách bảo mật và cách chúng tôi xử lý dữ liệu của bạn."
      />
      <SiteFooter />
    </div>
  );
}
