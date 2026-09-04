"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search, X } from "@/components/icons";
import { cn } from "@/lib/utils";
import { R_BADGE, R_CTRL } from "@/lib/radius";
import { SORTS, type SortKey } from "@/lib/spot-sort";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";

// Điều khiển của trang địa điểm. Không giữ danh sách, không lọc gì — chỉ đọc và
// ghi URL; việc lọc nằm ở server (xem `(site)/dia-diem/page.tsx`).
//
// Nhờ vậy mỗi bộ lọc là một ĐỊA CHỈ: dán được cho người khác, quay lại được
// bằng nút back, và bộ máy tìm kiếm index được từng loại hình.
export function SpotControls({
  categories,
  cat,
  q,
  sort,
}: {
  categories: { value: string; label: string; count: number }[];
  cat: string | null;
  q: string;
  sort: SortKey;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [draft, setDraft] = useState(q);

  // Ô tìm kiếm giữ chữ đang gõ trong state riêng rồi mới đẩy lên URL sau 350ms.
  // Ghi thẳng từng phím là mỗi ký tự một lần điều hướng — server chạy lại truy
  // vấn cho từng chữ cái, và lịch sử trình duyệt đầy những bước nửa vời.
  const draftRef = useRef(draft);
  draftRef.current = draft;
  useEffect(() => {
    if (draft === q) return;
    const id = setTimeout(() => {
      push({ q: draftRef.current || null, trang: null });
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, q]);

  // Mỗi lần đổi bộ lọc đều xoá `trang`: kết quả đã khác, mà giữ số trang cũ thì
  // người dùng rơi vào trang 3 của một danh sách chỉ còn một trang.
  function push(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-border/40 bg-background/90 backdrop-blur sm:-mx-6 lg:top-16">
      <div className="flex flex-col gap-1.5 px-4 py-2 sm:flex-row sm:items-center sm:gap-8 sm:px-6">
        <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:shrink-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          <CatTab
            active={cat === null}
            onClick={() => push({ loai: null, trang: null })}
          >
            Tất cả
          </CatTab>
          {categories.map((c) => (
            <CatTab
              key={c.value}
              active={cat === c.value}
              onClick={() => push({ loai: c.value, trang: null })}
            >
              {c.label}
            </CatTab>
          ))}
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-4 sm:gap-6">
          <div className="group relative min-w-0 flex-1 sm:w-52 sm:flex-none">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Tìm địa điểm…"
              aria-label="Tìm địa điểm"
              className={cn(R_CTRL, "h-9 w-full border border-border bg-transparent pl-9 pr-9 text-[0.8125rem] outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-foreground [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none")}
            />
            {draft && (
              <button
                type="button"
                onClick={() => {
                  setDraft("");
                  push({ q: null, trang: null });
                }}
                aria-label="Xóa tìm kiếm"
                className={cn(R_BADGE, "absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground")}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Sắp xếp: ${SORTS.find((x) => x.key === sort)?.label}`}
                className={cn(R_CTRL, "inline-flex h-9 shrink-0 items-center gap-2 border border-border bg-transparent pl-4 pr-3.5 text-[0.8125rem] font-medium transition-colors hover:border-foreground focus-visible:border-foreground focus-visible:outline-none")}
              >
                {SORTS.find((x) => x.key === sort)?.label}
                <ChevronDown
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[9rem]">
              <DropdownMenuRadioGroup
                value={sort}
                onValueChange={(v) =>
                  push({ "sap-xep": v === "noi-bat" ? null : v, trang: null })
                }
              >
                {SORTS.map((s) => (
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
      </div>
    </div>
  );
}

function CatTab({
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
        "h-9 shrink-0 whitespace-nowrap px-4 transition-colors sm:px-5",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
