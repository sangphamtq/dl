import { Car } from "@/components/icons";
import { ComingSoon } from "@/components/site/coming-soon";

export const metadata = { title: "Thuê xe · Halivivu" };

// Placeholder — dịch vụ thuê xe / đưa đón đang phát triển.
export default function ThueXePage() {
  return (
    <div className="flex flex-1 flex-col">
      <ComingSoon
        icon={Car}
        title="Thuê xe & đưa đón"
        description="Sắp ra mắt — thuê xe máy, ô tô và dịch vụ đưa đón từ các đơn vị đáng tin cậy tại điểm đến của bạn."
      />
    </div>
  );
}
