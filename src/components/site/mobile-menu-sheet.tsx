"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Bell,
  BookOpen,
  ChevronRight,
  Info,
  LayoutDashboard,
  LogOut,
  MapPinCheck,
  Route,
  Search,
} from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { HomeProvincePicker } from "./home-province-picker";

const STAFF = ["admin", "editor"];

type NavData = {
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
    role: string | null;
  } | null;
  unread: number;
  provinces: string[];
  homeProvince: string | null;
};

// ĐIỀU HƯỚNG SITE — phần chính của bảng.
// Cố ý không lặp lại 4 mục đã nằm trên thanh tab (Trang chủ · Khám phá · Bản đồ
// · Cộng đồng): thấy hai lối vào cùng một chỗ trong một màn hình chỉ làm người
// dùng phân vân.
//
// TẠM BỎ (khớp với nav desktop — trang vẫn còn, chỉ không có lối vào từ menu):
// mục "Kiểm tra uy tín" (/kiem-tra) và bốn trang phụ của nhóm Thông tin
// (/cau-hoi-thuong-gap, /lien-he, /dieu-khoan, /bao-mat — cả bốn đang "Sắp có").
const NAV = [
  { href: "/blog", label: "Cẩm nang", Icon: BookOpen },
  { href: "/gioi-thieu", label: "Giới thiệu", Icon: Info },
];

// Tiện ích của riêng người dùng — nhóm PHỤ, nằm dưới điều hướng.
const MINE = [
  { href: "/thong-bao", label: "Thông báo", Icon: Bell, badgeUnread: true },
  { href: "/tai-khoan/da-den", label: "Đã đến", Icon: MapPinCheck },
  { href: "/lich-trinh/cua-toi", label: "Lịch trình", Icon: Route },
];

// Bảng menu trượt từ ĐÁY màn hình, thay cho toàn bộ header ở mobile.
//
// Dùng Drawer (vaul) chứ không phải Sheet (Radix Dialog): vaul cho VUỐT XUỐNG
// ĐỂ ĐÓNG đúng kiểu bảng của app native — kéo theo ngón tay, thả nửa chừng thì
// bật lại, kéo quá ngưỡng thì đóng. Sheet chỉ có nút X và bấm ra ngoài.
//
// THỨ TỰ ƯU TIÊN: điều hướng site lên trên, tiện ích tài khoản xuống dưới. Đây
// là menu của một trang thông tin — người mở nó phần lớn để đi tới một mục nội
// dung, không phải để xem thông báo của mình.
//
// Dữ liệu người dùng lấy LƯỜI — chỉ gọi `/api/nav-data` lần đầu bảng được mở
// (xem chú thích trong route đó để biết vì sao không truyền props được). Hệ quả
// phải chấp nhận: ở mobile không còn chuông thông báo hiện số ngay trên thanh,
// muốn biết có gì mới thì mở bảng. Đổi lại người chỉ đọc bài không phải gánh
// thêm request nào trên mỗi trang.
export function MobileMenuSheet({
  open,
  onOpenChange,
  onSearch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mở command palette. Bảng tự đóng trước — xem chú thích ở BottomNav. */
  onSearch: () => void;
}) {
  const pathname = usePathname();
  const [data, setData] = useState<NavData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    let alive = true;
    fetch("/api/nav-data")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: NavData | null) => {
        if (!alive) return;
        setData(d);
        setLoaded(true);
      })
      .catch(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [open, loaded]);

  const user = data?.user;
  const close = () => onOpenChange(false);
  const isOn = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {/* `drawer.tsx` của shadcn đã có sẵn thanh kéo (handle) ở mép trên cho
          hướng bottom — không tự vẽ thêm. */}
      <DrawerContent className="font-heading">
        <DrawerTitle className="sr-only">Menu</DrawerTitle>

        <div className="overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {/* Tìm kiếm — dựng thành Ô NHẬP GIẢ chứ không phải một hàng menu như
              các mục dưới: hình dáng ô tìm kiếm tự nói ra công dụng, và đây là
              hình mà header ở desktop vẫn dùng nên hai khổ màn cùng một ngôn
              ngữ. Đứng đầu bảng vì nó là lối tắt tới BẤT KỲ đâu, khác các mục
              bên dưới vốn chỉ dẫn tới một chỗ cố định. */}
          <button
            type="button"
            onClick={onSearch}
            className="mb-2 flex h-11 w-full items-center gap-2.5 rounded-lg bg-muted px-4 text-sm text-muted-foreground ring-1 ring-inset ring-border/60 transition-colors hover:bg-muted/70 active:scale-[0.99]"
          >
            <Search className="size-4 shrink-0" aria-hidden />
            <span className="truncate">Tìm điểm đến, quán ăn, chỗ ở…</span>
          </button>

          {/* ── Điều hướng site (chính) ─────────────────────────────── */}
          <nav>
            {NAV.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={close}
                aria-current={isOn(href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3.5 text-[0.95rem] transition-colors",
                  isOn(href)
                    ? "bg-primary/10 font-semibold text-primary"
                    : "font-medium text-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-5 shrink-0 opacity-70" aria-hidden />
                <span className="flex-1">{label}</span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground/60"
                  aria-hidden
                />
              </Link>
            ))}
          </nav>

          <hr className="my-3 border-border/60" />

          {/* ── Của bạn (phụ) ───────────────────────────────────────── */}
          {!loaded ? (
            <div className="h-14 animate-pulse rounded-2xl bg-muted" />
          ) : user ? (
            <>
              <Link
                href="/tai-khoan/da-den"
                onClick={close}
                className="flex items-center gap-3 rounded-2xl bg-muted/60 p-2.5 transition-colors hover:bg-muted"
              >
                <Avatar className="size-9">
                  <AvatarImage src={user.image ?? undefined} alt="" />
                  <AvatarFallback>
                    {(user.name ?? user.email ?? "?").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {user.name ?? "Tài khoản"}
                  </span>
                  {user.email && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  )}
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </Link>

              {/* Ba tiện ích thành HÀNG NGANG, không phải ba hàng đầy đủ: giữ
                  chúng ở đúng vai phụ và tiết kiệm chiều cao cho phần điều
                  hướng phía trên. */}
              <div className="mt-2 grid grid-cols-3 gap-2">
                {MINE.map(({ href, label, Icon, badgeUnread }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={close}
                    className={cn(
                      "relative flex flex-col items-center gap-1.5 rounded-xl px-1 py-3 text-xs transition-colors",
                      isOn(href)
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                    <span className="truncate">{label}</span>
                    {badgeUnread && (data?.unread ?? 0) > 0 && (
                      <span className="absolute right-2 top-2 grid min-w-4 place-items-center rounded-full bg-warm px-1 text-[0.625rem] font-semibold tabular-nums leading-4 text-warm-foreground">
                        {data!.unread > 9 ? "9+" : data!.unread}
                      </span>
                    )}
                  </Link>
                ))}
              </div>

              {STAFF.includes(user.role ?? "") && (
                <Link
                  href="/cms"
                  onClick={close}
                  className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-foreground transition-colors hover:bg-muted"
                >
                  <LayoutDashboard
                    className="size-5 shrink-0 opacity-70"
                    aria-hidden
                  />
                  <span className="flex-1">Quản trị nội dung</span>
                </Link>
              )}
            </>
          ) : (
            <Link
              href="/login"
              onClick={close}
              className="flex h-11 items-center justify-center rounded-lg bg-warm text-sm font-semibold text-warm-foreground shadow-sm shadow-warm/25 transition hover:bg-warm/90"
            >
              Đăng nhập
            </Link>
          )}

          {/* Tỉnh của bạn — cài đặt cá nhân, nên đứng cùng nhóm "của bạn". Nó
              đổi gợi ý điểm đến gần và cách di chuyển nên vẫn đáng nằm trong
              menu thay vì chôn trong trang tài khoản. */}
          {loaded && data && (
            <div className="mt-3 rounded-2xl bg-muted/50 p-3">
              <p className="text-sm font-semibold">Bạn đang ở tỉnh nào?</p>
              <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
                Để gợi ý điểm đến gần và cách di chuyển từ tỉnh của bạn.
              </p>
              <HomeProvincePicker
                full
                provinces={data.provinces}
                value={data.homeProvince}
                onSelected={close}
              />
            </div>
          )}

          {/* Đăng xuất: chữ nhỏ, cuối bảng. */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 px-3 text-xs text-muted-foreground">
            {user && (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <LogOut className="size-3.5" aria-hidden />
                Đăng xuất
              </button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
