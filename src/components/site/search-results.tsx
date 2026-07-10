"use client";

import { createElement, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BedDouble,
  Camera,
  ChevronRight,
  Compass,
  Landmark,
  MapPin,
  Newspaper,
  type LucideIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import type { SearchGroup } from "@/lib/search";

const PREFIX_ICON: Record<string, LucideIcon> = {
  "hoat-dong": Compass,
  "dia-diem": Camera,
  "luu-tru": BedDouble,
  blog: Newspaper,
};
function iconFor(prefix: string, province: boolean): LucideIcon {
  if (prefix === "diem-den") return province ? Landmark : MapPin;
  return PREFIX_ICON[prefix] ?? MapPin;
}

type Row = {
  href: string;
  name: string;
  context?: string;
  image?: string;
  prefix: string;
  label: string;
  province: boolean;
};

export function SearchResults({
  q,
  groups,
}: {
  q: string;
  groups: SearchGroup[];
}) {
  const rows: Row[] = useMemo(
    () =>
      groups.flatMap((g) =>
        g.items.map((it) => {
          const province = g.prefix === "diem-den" && !!it.isProvince;
          return {
            href: `/${g.prefix}/${it.slug}`,
            name: it.name,
            context: it.context,
            image: it.image,
            prefix: g.prefix,
            province,
            label: province ? "Tỉnh/Thành phố" : g.label,
          };
        }),
      ),
    [groups],
  );

  const tabs = useMemo(
    () => [
      { key: "all", label: "Tất cả", count: rows.length },
      ...groups.map((g) => ({
        key: g.prefix,
        label: g.label,
        count: g.items.length,
      })),
    ],
    [groups, rows.length],
  );

  const [active, setActive] = useState("all");
  const shown = active === "all" ? rows : rows.filter((r) => r.prefix === active);

  return (
    <div className="mt-6">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{rows.length}</span> kết
        quả cho “{q}”
      </p>

      {/* Tab lọc theo loại */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              active === t.key
                ? "bg-foreground text-background"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t.label}
            <span
              className={cn(
                "text-xs tabular-nums",
                active === t.key ? "text-background/60" : "text-muted-foreground/70",
              )}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Danh sách kết quả */}
      <ul className="mt-4 space-y-1">
        {shown.map((r) => (
          <li key={r.href}>
            <Link
              href={r.href}
              className="group flex items-center gap-4 rounded-2xl p-2.5 transition-colors hover:bg-muted/60"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-inset ring-border/60 sm:size-[72px]">
                {r.image ? (
                  <Image
                    src={r.image}
                    alt=""
                    fill
                    sizes="72px"
                    className="object-cover"
                  />
                ) : (
                  <span className="grid size-full place-items-center text-muted-foreground">
                    {createElement(iconFor(r.prefix, r.province), {
                      className: "size-5",
                    })}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-foreground">
                    {r.name}
                  </span>
                  <span className="shrink-0 rounded-full border px-2 py-0.5 text-[0.7rem] text-muted-foreground">
                    {r.label}
                  </span>
                </div>
                {r.context && (
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {r.context}
                  </p>
                )}
              </div>

              <ChevronRight className="size-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
