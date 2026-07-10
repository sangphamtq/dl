"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "@/components/icons";

const OPTIONS = [
  { value: "moi-nhat", label: "Mới nhất" },
  { value: "cu-nhat", label: "Cũ nhất" },
  { value: "pho-bien", label: "Xem nhiều" },
] as const;

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const onChange = (v: string) => {
    const p = new URLSearchParams(sp.toString());
    if (v && v !== "moi-nhat") p.set("sort", v);
    else p.delete("sort");
    p.delete("page");
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Sắp xếp</span>
      <span className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none rounded-full border border-border/60 bg-card py-1.5 pl-3.5 pr-8 text-sm font-medium outline-none transition-colors hover:bg-muted focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      </span>
    </label>
  );
}
