"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Ic } from "@/components/icon";
import { cn } from "@/lib/utils";

// Khu vực riêng tư / trang tự chứa — không có thanh tab dưới.
// Giữ đồng bộ với `HIDDEN_ON` của install-prompt và `NEVER_CACHE` trong sw.js.
const HIDDEN_ON = ["/cms", "/sale", "/login", "/offline"];

type Item = {
  href: string;
  label: string;
  /** Tên icon bản VIỀN (mục không mở) và bản ĐẶC (mục đang mở). */
  icon: string;
  iconFill: string;
  /** Chỉ khớp đúng đường dẫn này (dùng cho trang chủ). */
  exact?: boolean;
  /** Các tiền tố route cũng tính là "đang ở mục này". */
  match?: string[];
};

// 5 mục — đúng mức tối đa của một tab bar iOS, và cũng là mức còn đọc được nhãn
// ở 375px. Cẩm nang / Uy tín / Thông tin vẫn nằm trong menu hamburger của
// header: thanh dưới là lối đi NHANH tới các khu vực hay quay lại, không phải
// bản sao của nav.
const ITEMS: Item[] = [
  {
    href: "/",
    label: "Trang chủ",
    icon: "home",
    iconFill: "home-fill",
    exact: true,
  },
  {
    href: "/diem-den",
    label: "Khám phá",
    icon: "compass",
    iconFill: "compass-fill",
    // Mọi trang chi tiết listing đều là nhánh của luồng khám phá → giữ mục này
    // sáng để người dùng biết mình đang ở đâu trong site.
    match: [
      "/diem-den",
      "/dia-diem",
      "/hoat-dong",
      "/dac-san",
      "/quan-an",
      "/luu-tru",
      "/trai-nghiem",
      "/tim-kiem",
    ],
  },
  {
    href: "/ban-do",
    label: "Bản đồ",
    icon: "map-pinned",
    iconFill: "map-pinned-fill",
  },
  {
    href: "/cong-dong",
    label: "Cộng đồng",
    icon: "messages-square",
    iconFill: "messages-square-fill",
  },
  {
    href: "/tai-khoan/da-den",
    label: "Tài khoản",
    icon: "user",
    iconFill: "user-fill",
    match: ["/tai-khoan", "/thong-bao", "/lich-trinh"],
  },
];

function isActive(pathname: string, it: Item) {
  if (it.exact) return pathname === it.href;
  const prefixes = it.match ?? [it.href];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Thanh tab dưới đáy màn hình (chỉ mobile/tablet — từ lg trở lên đã có nav ngang
// trong header). Dựng theo đúng khuôn UITabBar của iOS:
//
//  - TRÀN HẾT BỀ NGANG, dán sát đáy, không bo góc, không đổ bóng — tab bar iOS
//    là một phần của khung máy chứ không phải một tấm thẻ nổi trên nội dung.
//    Đường phân cách duy nhất là hairline 1px ở mép trên.
//  - Nền "vật liệu": trong mờ + `backdrop-blur` mạnh + tăng bão hoà — nội dung
//    cuộn qua bên dưới ánh lên màu, đúng cảm giác của UIBlurEffect.
//  - Cao 49pt (chuẩn iOS) cho phần bấm, cộng thêm `safe-area-inset-bottom` để
//    nội dung không nằm dưới thanh home indicator.
//  - Mục đang mở đổi icon từ VIỀN sang ĐẶC + đổi màu sang tint của app. KHÔNG
//    có viên nền hay gạch chân — đó là ngôn ngữ Material, không phải iOS.
//  - Chạm vào thì mờ đi (`active:opacity-*`) thay vì hiệu ứng gợn sóng.
//
// Trang không có thanh này (xem HIDDEN_ON) thì component trả null — và cũng gỡ
// luôn `data-bottom-nav` để các phần tử fixed khác thôi né chỗ.
export function BottomNav() {
  const pathname = usePathname();
  const hidden = HIDDEN_ON.some((p) => pathname.startsWith(p));

  // Đánh dấu trên <html> để CSS đặt `--bottom-nav-h` (xem globals.css). Các nút
  // nổi khác (lên đầu trang, mời cài app, thanh chuyển nhanh điểm đến) cộng biến
  // này vào `bottom` của chúng nên tự động xếp chồng lên trên thanh tab, không
  // ai phải nhớ con số chiều cao ở hai nơi.
  useEffect(() => {
    if (hidden) return;
    const el = document.documentElement;
    el.dataset.bottomNav = "";
    return () => {
      delete el.dataset.bottomNav;
    };
  }, [hidden]);

  if (hidden) return null;

  // Trang bản đồ cao đúng 100dvh và KHÔNG cuộn (/ban-do và
  // /diem-den/[slug]/ban-do) — độn thêm chỗ trống ở đó chỉ tạo ra một quãng cuộn
  // thừa. Thanh tab nổi đè lên bản đồ, đúng kiểu app bản đồ.
  const overlayOnly = pathname.endsWith("/ban-do");

  return (
    <>
      {/* Chỗ trống cuối trang: thanh `fixed` không đẩy được nội dung, thiếu khối
          này thì footer và nút cuối trang nằm khuất sau thanh. Chiều cao phải
          KHỚP thanh thật (49pt + hairline + safe area) — cố ý viết thẳng số thay
          vì đọc `--bottom-nav-h`, vì biến đó chỉ có giá trị sau khi hydrate. */}
      {!overlayOnly && (
        <div
          aria-hidden
          className="h-[calc(3.125rem+env(safe-area-inset-bottom))] shrink-0 lg:hidden"
        />
      )}

      <nav
        aria-label="Điều hướng nhanh"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border/60 lg:hidden",
          // Vật liệu mờ. Máy không hỗ trợ backdrop-filter thì rơi về nền gần đục
          // để nhãn vẫn đọc được trên ảnh.
          "bg-background/95 supports-[backdrop-filter]:bg-background/75 supports-[backdrop-filter]:backdrop-blur-2xl supports-[backdrop-filter]:backdrop-saturate-150",
          // Thanh home indicator của iPhone: chừa chỗ, phần nền vẫn kéo xuống hết.
          "pb-[env(safe-area-inset-bottom)]",
        )}
      >
        <ul className="flex h-[3.0625rem] items-stretch">
          {ITEMS.map((it) => {
            const active = isActive(pathname, it);
            return (
              <li key={it.href} className="flex-1">
                <Link
                  href={it.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-[3px] transition-opacity duration-100 active:opacity-50",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Ic
                    icon={active ? it.iconFill : it.icon}
                    className="size-[1.5625rem] shrink-0"
                    aria-hidden
                  />
                  {/* 10px/medium là đúng cỡ nhãn tab bar iOS (SF Caption 2).
                      Siết tracking một chút vì tiếng Việt nhiều dấu, chữ dày
                      hơn tiếng Anh ở cùng cỡ. */}
                  <span className="text-[0.625rem] font-medium leading-none tracking-[-0.01em]">
                    {it.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
