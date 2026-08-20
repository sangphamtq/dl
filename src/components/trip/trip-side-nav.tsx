"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TRIP_SECTIONS, tripSectionHref, type TripSection } from "@/lib/trip-sections";

// Menu các mục của một lịch trình. Hai hình dạng, cùng một dữ liệu:
//   • từ `lg`  — danh sách dọc ở đầu cột trái (TripSideNav)
//   • dưới `lg` — một nút trong thanh tiêu đề mở tấm trượt (TripSectionSheet)
//
// Vì sao mobile KHÔNG dùng một dải chip nữa: cột trái dưới `lg` đã là một trong
// ba khung nhìn của TripShell (Lịch trình · Chưa xếp · Bản đồ). Thêm một dải
// nữa là hai tầng điều khiển chồng nhau cho ~5 mục — đúng thứ đã bị chê ở màn
// hình Ẩm thực. Nút mở tấm trượt giữ nguyên MỘT dải luôn hiện.
//
// Trạng thái đang mở dùng NỀN MỜ + chữ đậm + icon cam. Ở đây nền là đúng (khác
// PlaceTabs, nơi viên nền bị loại): menu DỌC thì nền là cách duy nhất phủ hết
// một hàng, và `ui/sidebar` của chính dự án cũng làm vậy (`data-[active=true]`).

function useActiveToken(tripId: string): string | null {
  const path = usePathname();
  const rest = path.replace(`/lich-trinh/cua-toi/${tripId}`, "").replace(/^\//, "");
  return rest || null;
}

// Chuyển mục bằng `history.pushState` thay vì điều hướng: cả bốn mục đã render
// sẵn trong TripWorkspace, đổi URL là đủ để trình soạn tự hiện đúng mục —
// không vòng server nào giữa hai cú bấm. Next hỗ trợ shallow routing kiểu này
// (`usePathname` cập nhật theo pushState, Back/Forward cũng chạy đúng).
//
// Giữ nguyên <Link> để cmd-click/chuột giữa vẫn mở tab mới được — chỉ chặn cú
// bấm thường.
function navClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  e.preventDefault();
  window.history.pushState(null, "", href);
}

const rowBase =
  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Row({
  section,
  tripId,
  active,
  onNavigate,
}: {
  section: TripSection;
  tripId: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = section.icon;
  const href = tripSectionHref(tripId, section.token);
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={(e) => {
        navClick(e, href);
        onNavigate?.();
      }}
      aria-current={active ? "page" : undefined}
      className={cn(
        rowBase,
        active
          ? "bg-muted font-semibold text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <Icon className={cn("size-4 shrink-0", active && "text-warm")} aria-hidden />
      <span className="truncate">{section.label}</span>
    </Link>
  );
}

/** Danh sách dọc — dùng ở đầu cột trái, từ `lg`. */
export function TripSideNav({ tripId, collapsed }: { tripId: string; collapsed?: boolean }) {
  const token = useActiveToken(tripId);

  if (collapsed) {
    // Rail icon: không còn chỗ cho chữ nên "sắp ra mắt" hạ xuống một chấm cam.
    return (
      <nav aria-label="Mục của lịch trình" className="grid gap-1">
        {TRIP_SECTIONS.map((s) => {
          const Icon = s.icon;
          const active = s.token === token;
          return (
            <Link
              key={s.label}
              href={tripSectionHref(tripId, s.token)}
              prefetch={false}
              onClick={(e) => navClick(e, tripSectionHref(tripId, s.token))}
              title={s.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative grid size-8 place-items-center justify-self-center rounded-lg transition-colors",
                active
                  ? "bg-muted text-warm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              <span className="sr-only">{s.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Mục của lịch trình" className="grid gap-0.5">
      {TRIP_SECTIONS.map((s) => (
        <Row key={s.label} section={s} tripId={tripId} active={s.token === token} />
      ))}
    </nav>
  );
}

/** Nút + tấm trượt — dùng trong thanh tiêu đề, chỉ dưới `lg`. */
export function TripSectionSheet({ tripId }: { tripId: string }) {
  const token = useActiveToken(tripId);
  const [open, setOpen] = useState(false);
  const current = TRIP_SECTIONS.find((s) => s.token === token) ?? TRIP_SECTIONS[0];
  const Icon = current.icon;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3.5 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        >
          <Icon className="size-4 shrink-0 text-warm" aria-hidden />
          <span className="max-w-[8rem] truncate">{current.label}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="pb-0">
          <SheetTitle>Mục của chuyến này</SheetTitle>
          <SheetDescription className="sr-only">
            Chuyển giữa lịch trình, ghi chú, đồ mang theo, phân công và chi phí.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-0.5 px-4 pb-6">
          {TRIP_SECTIONS.map((s) => (
            <Row
              key={s.label}
              section={s}
              tripId={tripId}
              active={s.token === token}
              onNavigate={() => setOpen(false)}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
