import { Mail } from "@/components/icons";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ComingSoon } from "@/components/site/coming-soon";

export const metadata = { title: "Liên hệ" };

export default function LienHePage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <ComingSoon
        icon={Mail}
        title="Liên hệ"
        description="Sắp có — kênh liên hệ với đội ngũ Halivivu để góp ý, báo lỗi hoặc đề xuất hợp tác."
      />
      <SiteFooter />
    </div>
  );
}
