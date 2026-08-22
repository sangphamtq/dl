"use client";

import { useEffect, useState } from "react";
import { Search } from "@/components/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CommandPalette } from "./command-palette";

// Nút tìm kiếm của header: một icon mở Command palette (⌘K).
//
// CHỈ MỘT nút, không có bản mobile. `HeaderSearch` chỉ được dùng trong
// `SiteHeader`, mà header thì `hidden lg:block` — nên nhánh `lg:hidden` từng có
// ở đây là code chết. Dưới `lg`, lối vào tìm kiếm là tab giữa của `BottomNav`
// (nó tự dựng `CommandPalette` riêng). Vì vậy nút này KHÔNG cần class responsive
// nào: cha quyết định lúc nào cả thanh xuất hiện.
export function HeaderSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Tìm kiếm"
            onClick={() => setOpen(true)}
            // TRẦN — không nền, không viền, không bóng. Cùng VẬT LIỆU với nhóm
            // icon bên phải (Nơi đã đến · Lịch trình · Chuông): đĩa tròn chỉ
            // hiện khi rê.
            //
            // Đã thử và BỎ ba bản có khung — đừng quay lại: viên nang rộng có
            // viền + nền + bóng (thành một cặp nút anh em giả với "Đăng nhập"
            // ngay cạnh, dù vai trò ngược hẳn); ô vuông nền xám đặc (`xám là
            // màu chết` — đọc ra khối chưa được style); ô viền mảnh (thêm một
            // đường viền nữa vào thanh vốn chỉ toàn mực trần). Mọi thứ đắp thêm
            // lên nút này đều thành vật thừa, vì cả header không dùng khung.
            //
            // ⚠️ KHÔNG tô nền brand nhạt (`bg-primary/10 text-primary`): đó
            // đúng là trạng thái ACTIVE của ba nút bên cạnh, tô vậy thì nút tìm
            // kiếm lúc nào cũng trông như đang bật.
            //
            // Phân biệt với nhóm kia bằng hai thứ KHÔNG phải trang trí:
            //   · NÉT LỚN HƠN MỘT BẬC — `size-5` so với `size-4` của nhóm.
            //   · VẠCH NGĂN đứng giữa (dựng ở `site-header`, chỉ khi đã đăng
            //     nhập — lúc chưa đăng nhập nhóm kia không tồn tại nên không có
            //     gì để mà ngăn).
            // Tức là cái "khác" đến từ nhịp và khoảng trắng. Nhờ vậy cả thanh
            // vẫn chỉ có ĐÚNG MỘT hình khối đặc: nút "Đăng nhập".
            className="grid size-10 shrink-0 place-items-center rounded-full text-foreground transition-colors hover:bg-foreground/10"
          >
            <Search className="size-5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent>Tìm kiếm</TooltipContent>
      </Tooltip>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}
