"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { TabIcon, type TabIconName } from "./tab-icons";
import { CommandPalette } from "./command-palette";
import { MobileMenuSheet } from "./mobile-menu-sheet";
import { cn } from "@/lib/utils";

// Khu vực riêng tư / trang tự chứa — không có thanh tab dưới.
// Giữ đồng bộ với `HIDDEN_ON` của install-prompt và `NEVER_CACHE` trong sw.js.
const HIDDEN_ON = ["/cms", "/sale", "/login", "/offline"];

type Item = {
  label: string;
  /** Icon riêng của thanh tab (xem tab-icons.tsx) — tự có bản viền & bản đặc. */
  icon: TabIconName;
} & (
  | {
      /** Mục điều hướng: mở một trang. */
      href: string;
      /** Chỉ khớp đúng đường dẫn này (dùng cho trang chủ). */
      exact?: boolean;
      /** Các tiền tố route cũng tính là "đang ở mục này". */
      match?: string[];
      action?: never;
    }
  | {
      /** Mục hành động: mở lớp phủ, KHÔNG đổi trang. */
      action: "menu";
      href?: never;
    }
);

// 5 mục — đúng mức tối đa của một tab bar iOS, và cũng là mức còn đọc được nhãn
// ở 375px.
//
// Từ khi BỎ HEADER ở mobile, thanh này là điều hướng DUY NHẤT. Bốn mục đầu là
// các KHU VỰC của site; mục cuối là MENU — bảng trượt từ đáy gom nốt phần header
// cũ còn giữ: tìm kiếm, tài khoản, thông báo, đã đến, lịch trình, cẩm nang, uy
// tín, thông tin, tỉnh của bạn.
//
// Tìm kiếm CỐ Ý không chiếm một tab: nó là một hành động, không phải một nơi để
// ở lại, mà chỗ trên thanh thì chỉ có năm. Nó nằm ngay đầu bảng menu dưới dạng
// một ô tìm kiếm — vẫn trong tầm ngón cái, chỉ tốn thêm một chạm.
const ITEMS: Item[] = [
  {
    href: "/",
    label: "Trang chủ",
    icon: "home",
    exact: true,
  },
  {
    href: "/diem-den",
    label: "Khám phá",
    icon: "compass",
    // Mọi trang chi tiết listing đều là nhánh của luồng khám phá → giữ mục này
    // sáng để người dùng biết mình đang ở đâu trong site.
    match: [
      "/diem-den",
      "/dia-diem",
      "/hoat-dong",
      "/luu-tru",
      "/trai-nghiem",
      "/tim-kiem",
    ],
  },
  {
    href: "/ban-do",
    label: "Bản đồ",
    icon: "map",
  },
  // Cộng đồng: TẠM ẨN (route /cong-dong vẫn còn). Bật lại thì bỏ comment.
  // {
  //   href: "/cong-dong",
  //   label: "Cộng đồng",
  //   icon: "community",
  // },
  { action: "menu", label: "Menu", icon: "menu" },
];

function isActive(pathname: string, it: Item) {
  if (!it.href) return false;
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
  const [search, setSearch] = useState(false);
  const [menu, setMenu] = useState(false);

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

  // ── Né thanh công cụ dưới của trình duyệt ────────────────────────────────
  // Safari trên iPhone (và Chrome Android) đặt thanh địa chỉ/điều hướng ĐÈ lên
  // đáy khung nhìn bố cục. Một phần tử `fixed bottom-0` vì thế nằm KHUẤT sau
  // thanh đó ở trạng thái thanh đang bung ra.
  //
  // `visualViewport` cho biết vùng thực sự nhìn thấy: phần đáy bị che =
  // chiều cao khung nhìn bố cục − (chiều cao thấy được + phần đã trượt lên).
  // Đẩy con số đó vào `--browser-bottom-chrome`; thanh tab cộng nó vào
  // PADDING (không phải `bottom`) nên nền vẫn kéo sát mép máy, chỉ icon/nhãn
  // được nâng lên khỏi thanh trình duyệt — giống hệt cách vật liệu của tab bar
  // iOS phủ xuống dưới vùng home indicator.
  //
  // Trình duyệt không có `visualViewport` → biến giữ 0 → y như trước.
  useEffect(() => {
    if (hidden) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const el = document.documentElement;

    const update = () => {
      const covered = Math.round(el.clientHeight - vv.height - vv.offsetTop);
      // Che nhiều hơn ngần này thì là BÀN PHÍM ảo, không phải thanh công cụ.
      // Lúc đó để nguyên: bàn phím che thanh tab là đúng hành vi của iOS, đẩy
      // thanh tab lên ngồi trên bàn phím mới là sai.
      const chrome = covered > 0 && covered < 160 ? covered : 0;
      el.style.setProperty("--browser-bottom-chrome", `${chrome}px`);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      el.style.removeProperty("--browser-bottom-chrome");
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
          KHỚP thanh thật (49pt + hairline + đệm đáy) — cố ý viết thẳng số thay
          vì đọc `--bottom-nav-h`, vì biến đó chỉ có giá trị sau khi hydrate.
          KHÔNG cộng `--browser-bottom-chrome`: đó là phần trình duyệt phủ lên
          khung nhìn, không phải chỗ trống của trang. */}
      {!overlayOnly && (
        <div
          aria-hidden
          className="h-[calc(3.125rem+max(env(safe-area-inset-bottom),0.5rem)+0.375rem)] shrink-0 lg:hidden"
        />
      )}

      <nav
        aria-label="Điều hướng nhanh"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border/60 lg:hidden",
          // Vật liệu mờ. Máy không hỗ trợ backdrop-filter thì rơi về nền gần đục
          // để nhãn vẫn đọc được trên ảnh.
          "bg-background/95 supports-[backdrop-filter]:bg-background/75 supports-[backdrop-filter]:backdrop-blur-2xl supports-[backdrop-filter]:backdrop-saturate-150",
          // Đệm đáy = (vùng home indicator của iPhone, tối thiểu 8px để nhãn
          // không dính mép máy) + 6px thở thêm + (phần đáy bị thanh công cụ
          // trình duyệt che, đo bằng visualViewport ở trên). Là PADDING nên nền
          // vẫn kéo sát mép. 6px này CỘNG THÊM chứ không phải nâng sàn: máy có
          // home indicator (safe-area 34px) cũng được nhấc lên, không thì chỉ
          // máy không khuyết mới thấy khác.
          "pb-[calc(max(env(safe-area-inset-bottom),0.5rem)+0.375rem+var(--browser-bottom-chrome,0px))]",
        )}
      >
        <ul className="flex h-[3.0625rem] items-stretch">
          {ITEMS.map((it) => {
            // Mục hành động sáng lên khi lớp phủ của nó đang mở — cùng một tín
            // hiệu "đang ở đây" với mục điều hướng, chỉ khác cái "đây" là một
            // lớp phủ chứ không phải một trang.
            const active = it.action ? menu : isActive(pathname, it);
            const inner = (
              <>
                <TabIcon
                  name={it.icon}
                  active={active}
                  className="size-[1.5625rem] shrink-0"
                />
                {/* 10px/medium là đúng cỡ nhãn tab bar iOS (SF Caption 2).
                    Siết tracking một chút vì tiếng Việt nhiều dấu, chữ dày
                    hơn tiếng Anh ở cùng cỡ. */}
                <span className="text-[0.625rem] font-medium leading-none tracking-[-0.01em]">
                  {it.label}
                </span>
              </>
            );
            const klass = cn(
              "flex h-full w-full flex-col items-center justify-center gap-[3px] transition-opacity duration-100 active:opacity-50",
              active ? "text-primary" : "text-muted-foreground",
            );

            return (
              <li key={it.href ?? it.action} className="flex-1">
                {it.action ? (
                  <button
                    type="button"
                    onClick={() => setMenu(true)}
                    aria-expanded={active}
                    aria-label={it.label}
                    className={klass}
                  >
                    {inner}
                  </button>
                ) : (
                  <Link
                    href={it.href}
                    aria-current={active ? "page" : undefined}
                    className={klass}
                  >
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Hai lớp phủ. Đặt ở đây (không phải trong từng trang) vì từ khi bỏ
          header ở mobile, thanh tab là nơi DUY NHẤT gọi chúng.
          Ô tìm kiếm nằm TRONG bảng menu, nên nó phải đóng bảng rồi mới mở
          palette — hai lớp phủ chồng nhau thì khoá cuộn và bẫy focus của chúng
          đá nhau. Chờ hết animation trượt xuống của bảng (~200ms) mới mở. */}
      <CommandPalette open={search} onOpenChange={setSearch} />
      <MobileMenuSheet
        open={menu}
        onOpenChange={setMenu}
        onSearch={() => {
          setMenu(false);
          setTimeout(() => setSearch(true), 220);
        }}
      />
    </>
  );
}
