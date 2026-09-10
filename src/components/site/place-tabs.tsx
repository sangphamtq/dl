"use client";

import Link, { useLinkStatus } from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavIcon, type NavIconName } from "@/components/site/nav-icons";
import { Glyph } from "@/components/site/glyphs";
import { R_BADGE } from "@/lib/radius";
import { cn } from "@/lib/utils";
import type { PlaceTab } from "@/lib/place-meta";

// Icon của một mục → tên trong bộ `nav-icons` (SVG tự vẽ, KHÔNG phải `Ic`/
// Material Symbols). Cùng bộ với thanh tab dưới và cụm icon header: nét mảnh
// 1.7 trên khung 24, hình mở, và có sẵn cặp VIỀN/ĐẶC để báo mục đang mở —
// đúng cách thanh này vốn đã phân biệt trạng thái.
function iconName(tab: PlaceTab): NavIconName {
  if (tab.icon === "map") return "map";
  if (tab.icon === "community") return "community";
  if (tab.icon === "overview") return "overview";
  switch (tab.href.split("/").pop()) {
    case "dia-diem":
      return "spot";
    case "hoat-dong":
      return "experience";
    case "am-thuc":
      return "food";
    case "luu-tru":
      return "stay";
    case "di-chuyen":
      return "route";
    default:
      return "overview";
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
// KHÔNG hiện số lượng bên cạnh nhãn. Từng có, với lý do "khách biết nơi nào
// đáng vào trước khi bấm" — nhưng nó thêm một con số vào mỗi mục của một thanh
// vốn phải cuộn ngang trên điện thoại, và cái tin nó mang lại thì mỗi trang
// đích đều nói lại ngay ở dòng mở đầu. Tab rỗng vẫn không xảy ra:
// `buildPlaceTabs` chỉ dựng tab cho loại có dữ liệu.
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
// tô đũa (ẩm thực), giường (lưu trú), tuyến đường (di chuyển). Nhìn hình là biết
// mục gì, không phải đọc chữ; và cả dải trở thành một hàng đồ vật du lịch, tự nó
// mang chất chuyến đi mà không cần dán thêm hoạ tiết nào.
//
// Icon lấy từ `nav-icons` (SVG tự vẽ) chứ KHÔNG từ `@/components/icons`
// (Material Symbols): bộ Material nét dày và khối đặc, xếp cạnh chữ ở 16px thì
// thanh trông nặng — đúng lý do thanh tab dưới đã tách ra bộ riêng.
//
// Mục đang mở: icon bản ĐẶC + tô CAM + nhãn in đậm. Mục khác: bản VIỀN, icon và
// chữ cùng một mức xám. Chỉ một điểm màu trong cả thanh.
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
export function PlaceTabs({
  items,
  place,
}: {
  items: PlaceTab[];
  /** Cụm danh tính bên trái — CHỈ truyền ở các tab con. Trang Tổng quan đã có
   *  hero lớn nên không cần (và không được) nhắc lại tên nơi ở đây.
   *  Truyền prop này còn có nghĩa: cụm danh tính LÀ đường về Tổng quan, nên mục
   *  "Tổng quan" bị bỏ khỏi dải tab (xem `navItems`). */
  place?: { slug: string; name: string; image: string | null };
}) {
  const pathname = usePathname();
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  // Kéo tab đang mở vào giữa DẢI khi đổi route.
  //
  // Cuộn CHÍNH dải này bằng `scrollLeft`, KHÔNG dùng `scrollIntoView`: kể cả với
  // `block: "nearest"`, khi thanh tab còn nằm dưới màn hình (lúc mới mở trang,
  // hero còn chiếm hết khung nhìn) trình duyệt sẽ cuộn luôn CẢ TRANG xuống cho
  // nó lọt vào tầm nhìn — người dùng vừa mở trang điểm đến đã bị nhảy qua hero.
  const navRef = useRef<HTMLElement | null>(null);
  // Còn tab bị khuất bên nào? Dùng để chỉ fade ĐÚNG mép đang giấu nội dung.
  // Bản trước fade mép phải VĨNH VIỄN, kể cả khi đã cuộn hết — một vệt mờ luôn
  // hiện thì đọc ra là trang trí, nên trên máy 390px ba tab (Ẩm thực · Nơi lưu
  // trú · Di chuyển) nằm ngoài màn mà không có tín hiệu nào nói rằng chúng tồn
  // tại. Fade có/không theo trạng thái mới là một tín hiệu.
  const [edge, setEdge] = useState({ left: false, right: false });
  const measure = (nav: HTMLElement | null) => {
    if (!nav) return;
    const left = nav.scrollLeft > 4;
    const right = nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 4;
    setEdge((prev) =>
      prev.left === left && prev.right === right ? prev : { left, right },
    );
  };
  useIsoLayoutEffect(() => {
    const nav = navRef.current;
    const el = tabRefs.current[pathname];
    if (!nav || !el) return;
    const offset =
      el.getBoundingClientRect().left -
      nav.getBoundingClientRect().left +
      nav.scrollLeft;
    nav.scrollTo({ left: offset - (nav.clientWidth - el.clientWidth) / 2 });
  }, [pathname, items]);

  // Bản đồ + Cộng đồng tách riêng → render bên phải (không cuộn mất).
  const mapTab = items.find((it) => it.icon === "map");
  const communityTab = items.find((it) => it.icon === "community");
  // Có cụm danh tính ⇒ BỎ mục "Tổng quan" khỏi dải.
  //
  // Hai thứ đó trỏ CÙNG một URL và đứng cách nhau 8px: mũi tên + tên nơi bên
  // trái, rồi ngay sau là một tab tên "Tổng quan". Giữ cả hai thì người dùng
  // phải đoán xem chúng khác nhau chỗ nào (không khác gì cả), còn dải tab ở khổ
  // hẹp thì mất một suất cho thứ đã có người làm.
  // Vì sao bỏ mục TAB chứ không bỏ mũi tên: cụm danh tính còn kiêm việc nói
  // "bạn đang ở Phan Thiết" — thứ dải tab không nói. Ngược lại, trang Tổng quan
  // KHÔNG có cụm danh tính (nó có hero), nên ở đó mục "Tổng quan" vẫn còn để
  // dải tab có mục đang mở.
  const navItems = items.filter(
    (it) =>
      it.icon !== "map" &&
      it.icon !== "community" &&
      !(place && it.icon === "overview"),
  );

  // Có ít nhất 2 tab, hoặc có bản đồ/cộng đồng để gắn nút → mới hiện thanh.
  if (navItems.length <= 1 && !mapTab && !communityTab) return null;

  return (
    <div className="sticky top-0 lg:top-16 z-40 border-b border-border/60 bg-background">
        <div className="mx-auto flex h-12 max-w-7xl items-center gap-3 px-4 font-heading sm:px-6">
          {/* DANH TÍNH gộp thẳng vào thanh tab thay vì đứng thành một thanh
              riêng phía trên (`PlaceContextBar` cũ, cao 72px).
              Lý do: 48px dính của thanh này trước đó KHÔNG nói bạn đang ở đâu —
              nó chỉ có tên các tab — trong khi thanh mang tên nơi thì lại cuộn
              đi mất. Gộp vào thì phần dính làm hai việc mà chiều cao không đổi,
              và tổng khung đầu trang xuống còn 48px thay vì 120px.
              Ở khổ hẹp chỉ còn mũi tên + ảnh nhỏ, giấu tên nơi: tên đã nằm ngay
              trong tiêu đề mục bên dưới ("Đi đâu ở Phan Thiết"), mà mỗi ký tự ở
              đây lấy đi một phần dải tab vốn đã phải cuộn ngang. */}
          {place && (
            <>
              <Link
                href={`/diem-den/${place.slug}`}
                className="group -ml-1 flex min-w-0 shrink-0 items-center gap-2 pr-1 text-sm"
                title={`Về tổng quan ${place.name}`}
              >
                <Glyph
                  name="back"
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5"
                />
                {place.image && (
                  <span
                    className={cn(
                      R_BADGE,
                      "relative size-7 shrink-0 overflow-hidden bg-muted",
                    )}
                  >
                    <Image
                      src={place.image}
                      alt=""
                      fill
                      sizes="28px"
                      className="object-cover"
                    />
                  </span>
                )}
                <span className="hidden truncate font-semibold tracking-tight transition-colors group-hover:text-primary sm:block">
                  {place.name}
                </span>
              </Link>
              <span
                aria-hidden
                className="h-5 w-px shrink-0 bg-border/70"
              />
            </>
          )}

          {/* flex-1 để dải tab luôn chiếm hết phần trống → lớp mask chỉ ăn vào
              khoảng trống khi chưa tràn, và fade đúng chữ khi tràn. */}
          <nav
            ref={(el) => {
              navRef.current = el;
              measure(el);
            }}
            onScroll={(e) => measure(e.currentTarget)}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              edge.left && edge.right &&
                "[mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%_-_2rem),transparent)]",
              edge.left && !edge.right &&
                "[mask-image:linear-gradient(to_right,transparent,black_2rem)]",
              !edge.left && edge.right &&
                "[mask-image:linear-gradient(to_right,black_calc(100%_-_2rem),transparent)]",
            )}
          >
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
                    // h-11 dưới lg: 32px là dưới ngưỡng đích chạm 44×44, mà đây là thanh
                    // điều hướng chính của trang trên điện thoại.
                    "inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap px-2.5 text-sm transition-colors lg:h-8",
                    active
                      ? "font-semibold text-foreground"
                      : "font-medium text-muted-foreground hover:text-foreground",
                  )}
                >
                  {/* Icon CHỈ từ sm. Ở khổ điện thoại dải tab đã phải cuộn
                      ngang, mỗi icon ăn thêm ~22px là bớt đi một phần nhãn nhìn
                      thấy được — mà nhãn mới là thứ đọc ra mục gì. Bỏ icon thì
                      thường vừa hết các mục trong một màn, khỏi cuộn. */}
                  <NavIcon
                    name={iconName(it)}
                    active={active}
                    className={cn(
                      "hidden size-[1.1rem] shrink-0 sm:block",
                      active ? "text-warm" : "opacity-70",
                    )}
                  />
                  <TabLabel label={it.label} />
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
                      "inline-flex h-11 shrink-0 items-center gap-2 px-2 text-sm transition-colors sm:px-2.5 lg:h-8",
                      active
                        ? "font-semibold text-foreground"
                        : "font-medium text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <NavIcon
                      name={iconName(tab)}
                      active={active}
                      className={cn(
                        "size-[1.1rem] shrink-0",
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
