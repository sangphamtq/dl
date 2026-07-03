"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  LogOut,
  Home,
  MapPinCheck,
  Route,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STAFF = ["admin", "editor"];

type Props = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
};

export function UserMenu({ user }: Props) {
  const initial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();
  const isStaff = !!user.role && STAFF.includes(user.role);

  return (
    <DropdownMenu>
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
      <DropdownMenuContent align="end" className="w-56">
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
