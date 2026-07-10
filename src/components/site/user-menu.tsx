"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  LogOut,
  Home,
  MapPinCheck,
  MapPin,
  Check,
  Route,
} from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setHomeProvince } from "./home-province-actions";

const STAFF = ["admin", "editor"];

type Props = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
  provinces: string[]; // danh sách tỉnh/thành để chọn "tỉnh của bạn"
  homeProvince: string | null; // tỉnh đang chọn
};

export function UserMenu({ user, provinces, homeProvince }: Props) {
  const initial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();
  const isStaff = !!user.role && STAFF.includes(user.role);
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Tài khoản"
          className="rounded-full outline-none ring-offset-2 ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="size-9">
            {user.image && (
              <AvatarImage src={user.image} alt={user.name ?? "Avatar"} />
            )}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium">
                  {user.name ?? "Tài khoản"}
                </span>
                {isStaff && (
                  <Badge
                    className={cn(
                      "shrink-0 border-transparent px-1.5 text-[0.7rem] font-semibold",
                      user.role === "admin"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {user.role === "admin" ? "Admin" : "Editor"}
                  </Badge>
                )}
              </span>
              {user.email && (
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              )}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <HomeProvinceSubmenu
            provinces={provinces}
            value={homeProvince}
            onDone={() => setOpen(false)}
          />
          <DropdownMenuItem asChild>
            <Link href="/">
              <Home className="size-4" aria-hidden />
              Trang chủ
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/tai-khoan/da-den">
              <MapPinCheck className="size-4" aria-hidden />
              Nơi đã đến
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/lich-trinh">
              <Route className="size-4" aria-hidden />
              Lịch trình của tôi
              <Badge className="ml-auto h-4 border-transparent bg-warm/15 px-1 text-[0.6rem] font-semibold text-warm">
                Sắp có
              </Badge>
            </Link>
          </DropdownMenuItem>
          {isStaff && (
            <DropdownMenuItem asChild>
              <Link href="/cms">
                <LayoutDashboard className="size-4" aria-hidden />
                Quản trị (CMS)
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="size-4" aria-hidden />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// "Tỉnh của bạn" — submenu có ô tìm kiếm không dấu. Cập nhật lạc quan rồi lưu
// (cookie + đồng bộ User) qua server action, refresh để gợi ý cập nhật theo tỉnh.
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
      <DropdownMenuSubTrigger className={cn(pending && "opacity-70")}>
        <MapPin className="size-4" aria-hidden />
        <span className="flex-1">Tỉnh của bạn</span>
        <span
          className={cn(
            "max-w-[6.5rem] truncate text-xs",
            selected ? "text-muted-foreground" : "text-muted-foreground/60",
          )}
        >
          {selected ?? "Chọn"}
        </span>
      </DropdownMenuSubTrigger>
      {/* stopPropagation: để cmdk xử lý gõ/di chuyển, không bị typeahead của menu chặn */}
      <DropdownMenuSubContent
        className="w-64 p-0"
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
