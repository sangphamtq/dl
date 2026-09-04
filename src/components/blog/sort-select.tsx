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

  // Ô VUÔNG viền mảnh, sáng lên bằng mực khi rê/focus — cùng vật liệu với ô sắp
  // xếp của `/dia-diem` và `/diem-den`; bản trước bo góc + vòng sáng xanh.
  return (
    <label className="inline-flex items-center gap-2 text-[0.8125rem]">
      <span className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Sắp xếp
      </span>
      <span className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 appearance-none rounded-[4px] border border-border bg-transparent pl-3.5 pr-8 text-[0.8125rem] font-medium text-foreground outline-none transition-colors hover:border-foreground focus:border-foreground"
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      </span>
    </label>
  );
}
