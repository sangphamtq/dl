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
      <span className="text-[#2e2e2e]/60 dark:text-white/50">Sắp xếp</span>
      <span className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none rounded-md border border-[#e8e6e1] bg-white py-1.5 pl-3.5 pr-8 text-sm font-medium text-[#1f2226] outline-none transition-colors focus:border-[#348320] focus:ring-2 focus:ring-[#348320]/15 dark:border-white/15 dark:bg-white/5 dark:text-white"
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[#2e2e2e]/50 dark:text-white/50"
          aria-hidden
        />
      </span>
    </label>
  );
}
