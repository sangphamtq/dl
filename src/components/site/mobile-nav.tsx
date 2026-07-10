"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { HomeProvincePicker } from "./home-province-picker";

type Props = {
  links: { href: string; label: string; badge?: string }[];
  isAuthed: boolean;
  provinces: string[];
  homeProvince: string | null;
};

export function MobileNav({ links, isAuthed, provinces, homeProvince }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Mở menu"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 gap-0 p-0">
        <SheetHeader className="border-b">
          <SheetTitle>
            <Image
              src="/logo_horizontal_trim.png"
              alt="halivivu"
              width={106}
              height={36}
              className="h-8 w-auto"
            />
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-4">
          {/* Tỉnh của bạn */}
          <div className="mb-3">
            <p className="px-1 text-sm font-semibold text-foreground">
              Bạn đang ở tỉnh nào?
            </p>
            <p className="mb-2 px-1 text-xs leading-relaxed text-muted-foreground">
              Để gợi ý điểm đến gần và cách di chuyển từ tỉnh của bạn.
            </p>
            <HomeProvincePicker
              full
              provinces={provinces}
              value={homeProvince}
              onSelected={() => setOpen(false)}
            />
          </div>
          {links.map((l) => {
            const active =
              pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary"
                  />
                )}
                {l.label}
                {l.badge && (
                  <Badge className="ml-2 h-4 border-transparent bg-warm/15 px-1 text-[0.6rem] font-semibold leading-none text-warm">
                    {l.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
          {!isAuthed && (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-warm px-3 py-2.5 text-center text-sm font-semibold text-warm-foreground shadow-sm shadow-warm/25 transition hover:bg-warm/90"
            >
              Đăng nhập
            </Link>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
