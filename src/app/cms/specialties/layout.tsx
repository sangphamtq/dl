import Link from "next/link";
import { TriangleAlert } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// TẠM TẮT mục Đặc sản trong CMS.
//
// Phần món ăn đã gỡ khỏi mọi trang công khai, nên để biên tập tiếp tục soạn
// `Specialty` là mời người ta làm việc không ai nhìn thấy. Tắt ở LAYOUT nên
// chặn luôn cả /new, /[id] và /[id]/edit bằng một chỗ duy nhất — layout không
// render {children} thì page bên dưới không hề chạy, không truy vấn gì.
//
// BẬT LẠI: đổi cờ dưới đây thành `false` và trả mục "Đặc sản" vào
// `src/components/cms/sidebar.tsx`. Dữ liệu trong DB còn nguyên, không mất gì.
const DISABLED = true;

export default function SpecialtiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!DISABLED) return <>{children}</>;

  return (
    <div className="mx-auto max-w-2xl p-6 sm:p-8">
      <div className="rounded-2xl border border-warm/40 bg-warm/[0.06] p-6">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warm" aria-hidden />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Mục Đặc sản đang tạm tắt
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Phần món ăn đã gỡ khỏi các trang công khai, nên mục này tạm ngừng
              nhận biên tập. <strong>Dữ liệu cũ vẫn còn nguyên trong hệ thống</strong> —
              không có gì bị xoá, bật lại là thấy đủ.
            </p>
            <Link
              href="/cms"
              className={cn(buttonVariants({ variant: "outline" }), "mt-5")}
            >
              Về bảng điều khiển
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
