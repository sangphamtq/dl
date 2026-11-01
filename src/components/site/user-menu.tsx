"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Check } from "@/components/icons";
import { NavIcon } from "./nav-icons";
import { MENU_CONTENT, MENU_ITEM, MENU_SEP } from "@/lib/menu-ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { removeDiacritics } from "@/lib/slug";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setHomeProvince } from "./home-province-actions";

const STAFF = ["admin", "editor"];

/**
 * Menu tài khoản — gọn, một chất liệu với cụm icon header: thẻ danh tính (avatar lớn + tên + email) · mục dùng CHUNG bộ
 * NavIcon nét mảnh của header (không Lucide, không ô icon tô màu) · rê / phím = nền xám nhạt (không mượn `accent` xanh) ·
 * Đăng xuất là chữ thường ở đáy (KHÔNG tô đỏ — đó là một lối ra, không phải một thao tác nguy hiểm).
 * Bo theo bộ chung: khung `R_CARD` 10px, mục 6px.
 */
const ITEM = MENU_ITEM;

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M14.5 4.5H17a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5h-2.5" />
      <path d="M10 8.2 6.2 12l3.8 3.8M6.5 12h8.3" />
    </svg>
  );
}

type Props = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
  provinces: string[];
  homeProvince: string | null;
};

export function UserMenu({ user, provinces, homeProvince }: Props) {
  const initial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();
  const isStaff = !!user.role && STAFF.includes(user.role);
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Tài khoản"
              // Ảnh đại diện giữ tròn (quy ước chung của avatar, không phải một khối của site); viền mảnh tách khỏi nền hero.
              className="rounded-full outline-none ring-offset-2 ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar className="size-8 ring-1 ring-foreground/15 transition-shadow hover:ring-2 hover:ring-foreground/25">
                {user.image && (
                  <AvatarImage src={user.image} alt={user.name ?? "Avatar"} />
                )}
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        {!open && <TooltipContent>Tài khoản</TooltipContent>}
      </Tooltip>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className={cn("w-64", MENU_CONTENT)}
      >
        {/* Thẻ danh tính — không phải mục bấm được, nên không có nền rê. */}
        <div className="flex items-center gap-3 px-2.5 pb-3 pt-2">
          <Avatar className="size-10 ring-1 ring-foreground/10">
            {user.image && <AvatarImage src={user.image} alt="" />}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="flex items-center gap-2">
              <span className="truncate text-[0.9375rem] font-semibold leading-tight">{user.name ?? "Tài khoản"}</span>
              {isStaff && (
                <span className="shrink-0 rounded-[4px] bg-foreground/[0.06] px-1.5 py-px text-[0.6875rem] font-medium text-muted-foreground">
                  {user.role === "admin" ? "Admin" : "Biên tập"}
                </span>
              )}
            </p>
            {user.email && <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>}
          </div>
        </div>

        <DropdownMenuSeparator className={MENU_SEP} />

        <DropdownMenuItem asChild className={ITEM}>
          <Link href="/lich-trinh">
            <NavIcon name="route" active={false} className="size-[1.125rem]" />
            Lịch trình
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={ITEM}>
          <Link href="/tai-khoan/da-den">
            <NavIcon name="checkin" active={false} className="size-[1.125rem]" />
            Nơi đã đến
          </Link>
        </DropdownMenuItem>
        <HomeProvinceSubmenu provinces={provinces} value={homeProvince} onDone={() => setOpen(false)} />
        {isStaff && (
          <DropdownMenuItem asChild className={ITEM}>
            <Link href="/cms">
              <NavIcon name="overview" active={false} className="size-[1.125rem]" />
              Quản trị
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className={MENU_SEP} />

        <DropdownMenuItem
          className={cn(ITEM, "text-muted-foreground focus:text-foreground")}
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogoutIcon className="size-[1.125rem]" />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HomeProvinceSubmenu({
  provinces,
  value,
  onDone,
}: {
  provinces: string[];
  value: string | null;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(value);
  const [pending, startTransition] = useTransition();

  function choose(name: string | null) {
    setSelected(name);
    onDone?.();
    startTransition(async () => {
      await setHomeProvince(name);
      router.refresh();
    });
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className={cn(ITEM, pending && "opacity-70")}>
        <NavIcon name="province" active={false} className="size-[1.125rem]" />
        <span className="flex-1">Tỉnh của bạn</span>
        <span className="max-w-[6.5rem] truncate text-xs text-muted-foreground">{selected ?? "Chưa chọn"}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent
        sideOffset={6}
        className="w-64 rounded-[10px] border-border/70 p-0 shadow-[0_16px_40px_-12px_rgb(0_0_0/0.22)]"
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Command
          filter={(v, s) =>
            removeDiacritics(v).includes(removeDiacritics(s)) ? 1 : 0
          }
        >
          <CommandInput placeholder="Tìm tỉnh/thành…" />
          <CommandList>
            <CommandEmpty>Không tìm thấy.</CommandEmpty>
            <CommandGroup>
              {selected && (
                <CommandItem
                  value="bo-chon"
                  onSelect={() => choose(null)}
                  className="text-muted-foreground"
                >
                  <span className="size-4 shrink-0" aria-hidden />
                  Bỏ chọn
                </CommandItem>
              )}
              {provinces.map((name) => (
                <CommandItem
                  key={name}
                  value={name}
                  onSelect={() => choose(name)}
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      selected === name ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                  {name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
