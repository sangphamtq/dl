"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import {
  BedDouble,
  LayoutGrid,
  MapPin,
  MapPinned,
  MessagesSquare,
  Route,
  Sparkles,
  Utensils,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import type { PlaceTab } from "@/lib/place-meta";

// Icon theo loại mục. Trả về JSX chứ KHÔNG trả về tham chiếu component để nơi
// gọi tự `<Icon/>`: gán component vào biến viết hoa rồi render trong thân một
// component khác bị React Compiler báo "cannot create components during render".
function SectionIcon({ tab, className }: { tab: PlaceTab; className?: string }) {
  const p = { className, "aria-hidden": true } as const;
  if (tab.icon === "map") return <MapPinned {...p} />;
  if (tab.icon === "community") return <MessagesSquare {...p} />;
  if (tab.icon === "overview") return <LayoutGrid {...p} />;
  switch (tab.href.split("/").pop()) {
    case "dia-diem":
      return <MapPin {...p} />;
    case "hoat-dong":
      return <Sparkles {...p} />;
    case "am-thuc":
      return <Utensils {...p} />;
    case "luu-tru":
      return <BedDouble {...p} />;
    case "di-chuyen":
      return <Route {...p} />;
    default:
      return <LayoutGrid {...p} />;
  }
}

// useLayoutEffect chạy được ở client; tránh cảnh báo khi SSR.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Nhãn tab — khi đang điều hướng tới tab này thì sáng lên + nhấp nháy nhẹ.
// Cần thiết vì mỗi tab là MỘT TRANG MỚI: bấm xong có độ trễ tải, không có phản
// hồi thì người dùng tưởng máy đơ và bấm lại.
function TabLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return (
    <span className={cn("transition-colors", pending && "animate-pulse text-primary")}>
      {label}
    </span>
  );
}

// Thanh tab sticky: điều hướng giữa trang Place và các trang danh sách listing.
// Tràn thì cuộn ngang (tab active tự vào tầm nhìn).
//
// Mỗi mục kèm SỐ LƯỢNG — khách biết nơi nào đáng vào trước khi bấm, đỡ mất một
// lượt tải trang để rồi quay ra. Không cần lo tab rỗng: `buildPlaceTabs` chỉ
// dựng tab cho loại có count > 0.
//
// VẬT LIỆU: luôn là dải SÁNG ĐẶC (`bg-background` + hairline), KHÔNG đổi theo
// cuộn và KHÔNG dùng kính như header. Đã thử cho nó hoá kính khi ghim để "liền"
// với header, nhưng lúc đó là hai dải kính tối gần giống hệt xếp chồng — 64px
// header + 48px thanh = một mảng tối 112px trên đỉnh, mắt không phân biệt được
// đâu là chrome hệ thống đâu là công cụ của trang, và hai lớp blur chồng nhau
// nhìn rất nặng. Để nó đặc và sáng thì hai vai trò tách bạch ngay: header là
// kính tối nổi trên nội dung, thanh này là thanh công cụ của chính trang.
//
// HÌNH THỨC: mỗi mục dẫn đầu bằng ICON CỦA CHÍNH THỨ NÓ CHỨA — ghim (địa điểm),
// dĩa (ẩm thực), giường (lưu trú), tuyến đường (di chuyển). Nhìn hình là biết
// mục gì, không phải đọc chữ; và cả dải trở thành một hàng đồ vật du lịch, tự nó
// mang chất chuyến đi mà không cần dán thêm hoạ tiết nào.
//
// Mục đang mở: icon tô CAM + nhãn in đậm. Mục khác: icon và chữ cùng một mức
// xám. Chỉ một điểm màu trong cả thanh.
//
// Icon cũng gánh luôn việc ngăn cách: nhịp icon–chữ, icon–chữ đã đủ tách các mục,
// nên không cần dấu chấm, gạch dọc hay viên nền giữa chúng.
//
// Đã thử và bỏ: viên nền cho mục đang mở (thành mấy mảng màu xếp ngang, giống
// thanh bộ lọc của app thương mại điện tử); nét đứt + chấm cam (đúng chất bản đồ
// nhưng thêm một lớp hoạ tiết vào thứ vốn chỉ cần là chữ); dòng mục lục ngăn bằng
// dấu chấm giữa (sạch nhưng khô, và không tận dụng được gì từ dữ liệu).
//
// Hai nửa (mục nội dung · công cụ) tách nhau bằng hairline DỌC — một vạch là đủ,
// không thêm mảng màu nào.
export function PlaceTabs({ items }: { items: PlaceTab[] }) {
  const pathname = usePathname();
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  // Cuộn tab active vào giữa khi đổi route.
  useIsoLayoutEffect(() => {
    tabRefs.current[pathname]?.scrollIntoView({
      block: "nearest",
      inline: "center",
    });
  }, [pathname, items]);

  // Bản đồ + Cộng đồng tách riêng → render bên phải (không cuộn mất).
  const mapTab = items.find((it) => it.icon === "map");
  const communityTab = items.find((it) => it.icon === "community");
  const navItems = items.filter(
    (it) => it.icon !== "map" && it.icon !== "community",
  );

  // Có ít nhất 2 tab, hoặc có bản đồ/cộng đồng để gắn nút → mới hiện thanh.
  if (navItems.length <= 1 && !mapTab && !communityTab) return null;

  return (
    <div className="sticky top-16 z-40 border-b border-border/60 bg-background">
        <div className="mx-auto flex h-12 max-w-7xl items-center gap-3 px-4 font-heading sm:px-6">
          {/* flex-1 để dải tab luôn chiếm hết phần trống → lớp mask chỉ ăn vào
              khoảng trống khi chưa tràn, và fade đúng chữ khi tràn. */}
          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [mask-image:linear-gradient(to_right,black_calc(100%_-_2rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map((it) => {
              const active = pathname === it.href;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  ref={(el) => {
                    tabRefs.current[it.href] = el;
                  }}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-2 whitespace-nowrap px-2.5 text-sm transition-colors",
                    active
                      ? "font-semibold text-foreground"
                      : "font-medium text-muted-foreground hover:text-foreground",
                  )}
                >
                  <SectionIcon
                    tab={it}
                    className={cn(
                      "size-4 shrink-0",
                      active ? "text-warm" : "opacity-70",
                    )}
                  />
                  <TabLabel label={it.label} />
                  {/* Số lượng: `tabular-nums` để số không so le khi đổi trang, và
                      nhạt hơn nhãn — nó là chú thích, không phải nhãn. */}
                  {it.count != null && (
                    <span className="text-[0.6875rem] font-normal tabular-nums text-muted-foreground/70">
                      {it.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Nhóm bên phải: Cộng đồng + Bản đồ — cùng là route như tab bên trái
              nhưng là "công cụ" xem cả điểm đến. Phân biệt bằng VỊ TRÍ + hairline
              dọc + icon, KHÔNG bằng một khối nền riêng: khối nền làm chúng nặng
              hơn cả tab nội dung. Mobile chỉ còn icon để không giành chỗ dải tab. */}
          {(communityTab || mapTab) && (
            <div className="flex shrink-0 items-center gap-1 border-l border-border/60 pl-3">
              {[communityTab, mapTab].map((tab) => {
                if (!tab) return null;
                const active = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    ref={(el) => {
                      tabRefs.current[tab.href] = el;
                    }}
                    aria-current={active ? "page" : undefined}
                    aria-label={tab.label}
                    title={tab.label}
                    className={cn(
                      "inline-flex h-8 shrink-0 items-center gap-2 px-2 text-sm transition-colors sm:px-2.5",
                      active
                        ? "font-semibold text-foreground"
                        : "font-medium text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <SectionIcon
                      tab={tab}
                      className={cn(
                        "size-4 shrink-0",
                        active ? "text-warm" : "opacity-70",
                      )}
                    />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
    </div>
  );
}
