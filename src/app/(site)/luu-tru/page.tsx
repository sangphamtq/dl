import { BedDouble } from "@/components/icons";
import { ComingSoon } from "@/components/site/coming-soon";

export const metadata = { title: "Lưu trú · Halivivu" };

// Placeholder — danh bạ lưu trú toàn quốc đang phát triển.
export default function LuuTruPage() {
  return (
    <div className="flex flex-1 flex-col">
      <ComingSoon
        icon={BedDouble}
        title="Danh bạ lưu trú"
        description="Sắp ra mắt — tìm homestay, khách sạn, resort đã xác minh chính chủ trên khắp Việt Nam, kèm cảnh báo chống lừa cọc."
      />
    </div>
  );
}
