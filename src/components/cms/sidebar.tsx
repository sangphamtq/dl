"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  MapPin,
  Compass,
  Mountain,
  Sparkles,
  UtensilsCrossed,
  BedDouble,
  Bus,
  Newspaper,
  Image as ImageIcon,
  Users,
  Settings,
  ChevronsUpDown,
  LogOut,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: "Tổng quan",
    items: [{ href: "/cms", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Địa điểm",
    items: [{ href: "/cms/places", label: "Tỉnh & Điểm đến", icon: MapPin }],
  },
  {
    label: "Listing",
    items: [
      { href: "/cms/activities", label: "Hoạt động", icon: Compass },
      { href: "/cms/spots", label: "Địa điểm nhỏ", icon: Mountain },
      { href: "/cms/specialties", label: "Đặc sản", icon: Sparkles },
      { href: "/cms/eateries", label: "Quán ăn", icon: UtensilsCrossed },
      { href: "/cms/accommodations", label: "Lưu trú", icon: BedDouble },
      { href: "/cms/transport", label: "Di chuyển", icon: Bus },
    ],
  },
  {
    label: "Blog",
    items: [{ href: "/cms/posts", label: "Bài viết", icon: Newspaper }],
  },
  {
    label: "Hệ thống",
    items: [
      { href: "/cms/media", label: "Ảnh / Media", icon: ImageIcon },
      { href: "/cms/users", label: "Người dùng", icon: Users },
      { href: "/cms/settings", label: "Cài đặt", icon: Settings },
    ],
  },
];

type Props = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
};

export function AppSidebar({ user }: Props) {
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const initial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/cms">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Compass className="size-5" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Hành Trình Việt</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Quản trị nội dung
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const active =
                  item.href === "/cms"
                    ? pathname === "/cms"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 rounded-lg">
                    {user.image && (
                      <AvatarImage src={user.image} alt={user.name ?? "Avatar"} />
                    )}
                    <AvatarFallback className="rounded-lg">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {user.name ?? "Tài khoản"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="size-8 rounded-lg">
                      {user.image && (
                        <AvatarImage
                          src={user.image}
                          alt={user.name ?? "Avatar"}
                        />
                      )}
                      <AvatarFallback className="rounded-lg">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">
                        {user.name ?? "Tài khoản"}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/">
                    <ExternalLink />
                    Xem website
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <LogOut />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
