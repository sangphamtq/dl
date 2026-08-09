import { FileText } from "@/components/icons";
import { ComingSoon } from "@/components/site/coming-soon";

export const metadata = { title: "Điều khoản sử dụng" };

export default function DieuKhoanPage() {
  return (
    <div className="flex flex-1 flex-col">
      <ComingSoon
        icon={FileText}
        title="Điều khoản sử dụng"
        description="Sắp có — điều khoản sử dụng dịch vụ Halivivu."
      />
    </div>
  );
}
