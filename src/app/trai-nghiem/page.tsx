import { Ticket } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { ComingSoon } from "@/components/site/coming-soon";

export const metadata = { title: "Tour & trải nghiệm · Halivivu" };

// Placeholder — tour, vé & hoạt động trải nghiệm đang phát triển.
export default function TraiNghiemPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <ComingSoon
        icon={Ticket}
        title="Tour & trải nghiệm"
        description="Sắp ra mắt — đặt tour, vé tham quan và các hoạt động trải nghiệm đặc sắc ở từng điểm đến."
      />
      <SiteFooter />
    </div>
  );
}
