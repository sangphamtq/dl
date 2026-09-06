"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "@/components/icons";
import { cn } from "@/lib/utils";
import { R_CTRL } from "@/lib/radius";
import { TRIP_SORTS, type TripSortKey } from "@/lib/trip-template-sort";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";


/**
 * Lọc + sắp xếp cho danh sách lịch trình mẫu.
 *
 * Chip độ dài SINH TỪ DỮ LIỆU (`lengths`), không phải danh sách cứng 1/2/3/4+:
 * bày một chip mà bấm vào ra rỗng thì tệ hơn là không có chip đó. Cũng vì vậy
 * cả thanh này TỰ ẨN khi chỉ có một nhóm độ dài — lúc đó lọc không chia được gì.
 *
 * Trạng thái nằm ở URL (`?ngay=`, `?sap-xep=`) chứ không phải `useState`: cùng
 * cách với `/dia-diem`, và nhờ vậy chia sẻ được đường dẫn đã lọc.
 */
export function TripControls({
  lengths,
  days,
  sort,
}: {
  /** Các độ dài CÓ THẬT trong dữ liệu, đã sắp tăng dần. */
  lengths: number[];
  days: number | null;
  sort: TripSortKey;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function push(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const showLengths = lengths.length > 1;
  const current = TRIP_SORTS.find((s) => s.key === sort) ?? TRIP_SORTS[0];

  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
      {showLengths && (
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={days === null} onClick={() => push({ ngay: null })}>
            Tất cả
          </Chip>
          {lengths.map((n) => (
            <Chip
              key={n}
              active={days === n}
              onClick={() => push({ ngay: days === n ? null : String(n) })}
            >
              {n} ngày
            </Chip>
          ))}
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Sắp xếp: ${current.label}`}
            className={cn(
              R_CTRL,
              "ml-auto inline-flex h-9 shrink-0 items-center gap-2 border border-border bg-transparent pl-4 pr-3.5 text-[0.8125rem] font-medium transition-colors hover:border-foreground focus-visible:border-foreground focus-visible:outline-none",
            )}
          >
            {current.label}
            <ChevronDown
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[11rem]">
          <DropdownMenuRadioGroup
            value={sort}
            onValueChange={(v) =>
              push({ "sap-xep": v === "noi-bat" ? null : v })
            }
          >
            {TRIP_SORTS.map((s) => (
              <DropdownMenuRadioItem
                key={s.key}
                value={s.key}
                className={cn(
                  "pl-2 [&>span:first-child]:hidden",
                  sort === s.key
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {s.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        MICRO,
        R_CTRL,
        "h-9 shrink-0 whitespace-nowrap border px-4 transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
