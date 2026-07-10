"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ic } from "@/components/icon";
import { cn } from "@/lib/utils";

type Opt = { slug: string; name: string };

// Các "loại màn hình" của một Place (khớp token route [loai] trong CLAUDE.md).
const LOAI: Opt[] = [
  { slug: "", name: "Tất cả" },
  { slug: "hoat-dong", name: "Hoạt động" },
  { slug: "dia-diem", name: "Địa điểm" },
  { slug: "am-thuc", name: "Ẩm thực" },
  { slug: "luu-tru", name: "Lưu trú" },
  { slug: "di-chuyen", name: "Di chuyển" },
];

// Thanh tìm kiếm nổi trên hero: chọn điểm đến + chủ đề → điều hướng tới trang
// Place (hoặc màn hình [loai] của nó). Native <select> để nhẹ & đáng tin.
export function HeroSearch({ places }: { places: Opt[] }) {
  const router = useRouter();
  const [place, setPlace] = useState("");
  const [loai, setLoai] = useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    if (!place) return;
    router.push(`/diem-den/${place}${loai ? `/${loai}` : ""}`);
  }

  return (
    <form
      onSubmit={go}
      className="flex flex-col gap-2 rounded-3xl bg-background/95 p-2 shadow-xl shadow-black/10 ring-1 ring-black/5 backdrop-blur sm:flex-row sm:items-center sm:rounded-full sm:p-1.5"
    >
      <Field icon={<Ic icon="map-pin" className="size-4 text-primary" aria-hidden />}>
        <span className="pointer-events-none absolute left-9 top-1.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
          Điểm đến
        </span>
        <select
          aria-label="Chọn điểm đến"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          className="w-full cursor-pointer appearance-none bg-transparent pl-9 pr-3 pt-4 pb-1 text-sm font-semibold text-foreground outline-none"
        >
          <option value="">Bạn muốn đi đâu?</option>
          {places.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>

      <span aria-hidden className="mx-1 hidden h-8 w-px bg-border sm:block" />

      <Field icon={<Ic icon="compass" className="size-4 text-primary" aria-hidden />}>
        <span className="pointer-events-none absolute left-9 top-1.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
          Chủ đề
        </span>
        <select
          aria-label="Chọn chủ đề"
          value={loai}
          onChange={(e) => setLoai(e.target.value)}
          className="w-full cursor-pointer appearance-none bg-transparent pl-9 pr-3 pt-4 pb-1 text-sm font-semibold text-foreground outline-none"
        >
          {LOAI.map((l) => (
            <option key={l.slug} value={l.slug}>
              {l.name}
            </option>
          ))}
        </select>
      </Field>

      <button
        type="submit"
        className={cn(
          "flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:size-12 sm:px-0",
        )}
      >
        <Ic icon="search" className="size-4" aria-hidden />
        <span className="sm:hidden">Tìm kiếm</span>
      </button>
    </form>
  );
}

function Field({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-1 items-center rounded-2xl px-1 sm:rounded-full">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
        {icon}
      </span>
      {children}
    </div>
  );
}
