"use client";

import { createElement, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowUpRight,
  BedDouble,
  Camera,
  Compass,
  Landmark,
  MapPin,
  Newspaper,
  Search,
  type LucideIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  searchSite,
  getSuggestions,
  type SearchHit,
  type SearchResults,
} from "./search-action";

// Icon theo loại kết quả (suy từ tiền tố route; tỉnh khác điểm đến con).
const PREFIX_ICON: Record<string, LucideIcon> = {
  "hoat-dong": Compass,
  "dia-diem": Camera,
  "luu-tru": BedDouble,
  blog: Newspaper,
};
function iconFor(h: SearchHit): LucideIcon {
  const prefix = h.href.split("/")[1] ?? "";
  if (prefix === "diem-den") return h.province ? Landmark : MapPin;
  return PREFIX_ICON[prefix] ?? MapPin;
}

// Một hàng kết quả: icon · tên + ngữ cảnh · loại (cuối hàng).
function HitItem({ h, onSelect }: { h: SearchHit; onSelect: () => void }) {
  return (
    <CommandItem
      value={h.href}
      onSelect={onSelect}
      className="gap-3 rounded-[4px] px-3 py-2.5"
    >
      {createElement(iconFor(h), {
        className: "size-5 shrink-0 text-muted-foreground",
      })}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">
          {h.name}
        </span>
        {h.context && (
          <span className="truncate text-xs text-muted-foreground">
            {h.context}
          </span>
        )}
      </span>
      <span className={cn(MICRO, "ml-auto shrink-0 self-center pl-3 text-muted-foreground")}>
        {h.label}
      </span>
    </CommandItem>
  );
}

// Hàng "Địa điểm" (nhóm chính): ảnh thumbnail + tên + ngữ cảnh + loại.
function PlaceHitItem({ h, onSelect }: { h: SearchHit; onSelect: () => void }) {
  return (
    <CommandItem
      value={h.href}
      onSelect={onSelect}
      className="gap-3 rounded-[4px] px-2 py-2"
    >
      <span className="relative size-11 shrink-0 overflow-hidden bg-muted ring-1 ring-inset ring-border">
        {h.image ? (
          <Image src={h.image} alt="" fill sizes="44px" className="object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-muted-foreground">
            {createElement(iconFor(h), { className: "size-4" })}
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">
          {h.name}
        </span>
        {h.context && (
          <span className="truncate text-xs text-muted-foreground">
            {h.context}
          </span>
        )}
      </span>
      <span className={cn(MICRO, "ml-auto shrink-0 self-center pl-3 text-muted-foreground")}>
        {h.label}
      </span>
    </CommandItem>
  );
}

// Gợi ý điểm đến: ô ảnh vuông + tên.
//
// Ảnh TRÒN đã bỏ: cả hệ thẻ của site (điểm đến, địa điểm, bài viết) cắt ảnh
// theo khung chữ nhật 3/2, còn hình tròn ở đây đọc ra là avatar người — sai
// loại nội dung. Cùng lý do với việc bỏ pin tròn ở bản đồ toàn quốc.
function SuggestionCard({
  h,
  onSelect,
}: {
  h: SearchHit;
  onSelect: () => void;
}) {
  return (
    <CommandItem
      value={h.href}
      onSelect={onSelect}
      className="gap-3 rounded-[4px] px-2 py-1.5"
    >
      {/* Ô VUÔNG 40px, đúng bằng dấu chân của ảnh tròn cũ. Đã thử khung 3/2
          rộng 56px: phần lớn điểm đến chưa có ảnh bìa nên lưới sáu gợi ý thành
          sáu mảng xám to hơn hẳn, trông như ảnh hỏng chứ không phải chỗ trống. */}
      <span className="relative size-10 shrink-0 overflow-hidden bg-muted ring-1 ring-inset ring-border">
        {h.image ? (
          <Image src={h.image} alt="" fill sizes="40px" className="object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-muted-foreground">
            {createElement(h.province ? Landmark : MapPin, {
              className: "size-4",
            })}
          </span>
        )}
      </span>
      <span className="truncate text-sm font-medium">{h.name}</span>
    </CommandItem>
  );
}

const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";

const COMMAND_CLASS = cn(
  // Ô nhập: cao, rõ (sửa selector wrapper = data-slot, không phải cmdk-*).
  "[&_[data-slot=command-input-wrapper]]:h-16 [&_[data-slot=command-input-wrapper]]:gap-3 [&_[data-slot=command-input-wrapper]]:px-5",
  "[&_[data-slot=command-input-wrapper]_svg]:size-5 [&_[data-slot=command-input-wrapper]_svg]:opacity-60",
  "[&_[data-slot=command-input]]:text-base",
  // Tiêu đề nhóm: đúng thang `MICRO` dùng chung với các trang danh sách, và có
  // một gạch chân mảnh — cùng cách `SectionHeading serif` phân tầng.
  "[&_[cmdk-group-heading]]:mb-1.5 [&_[cmdk-group-heading]]:border-b [&_[cmdk-group-heading]]:border-border [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:text-[0.6rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-muted-foreground",
  "[&_[cmdk-group]]:px-2 [&_[cmdk-group]]:py-2",
  // Hàng đang chọn: nền MỰC nhạt, không phải nền xanh brand. Trên trang này
  // xanh nghĩa là "bấm được"; cả một hàng tô xanh khi mới chỉ di chuột/phím là
  // nói dối bảng từ vựng đó.
  "[&_[cmdk-item][data-selected=true]]:bg-muted [&_[cmdk-item][data-selected=true]]:text-foreground",
);

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults>({
    places: [],
    others: [],
  });
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchHit[]>([]);
  const reqId = useRef(0);
  const loadedSug = useRef(false);

  // Nạp gợi ý (điểm đến nổi bật) lần đầu mở modal.
  useEffect(() => {
    if (!open || loadedSug.current) return;
    loadedSug.current = true;
    getSuggestions()
      .then((s) => setSuggestions(s))
      .catch(() => {});
  }, [open]);

  // Debounce tìm kiếm server-side (searchSite đã lọc → tắt lọc của cmdk).
  // Mọi setState nằm trong callback bất đồng bộ (không set đồng bộ trong effect).
  useEffect(() => {
    const term = q.trim();
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      if (!term) {
        if (id === reqId.current) {
          setResults({ places: [], others: [] });
          setLoading(false);
        }
        return;
      }
      if (id === reqId.current) setLoading(true);
      const res = await searchSite(term);
      if (id === reqId.current) {
        setResults(res);
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [q]);

  const term = q.trim();
  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setQ("");
      setResults({ places: [], others: [] });
      setLoading(false);
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[10vh] w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] translate-y-0 gap-0 overflow-hidden rounded-[4px] border-border p-0 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.45)] sm:max-w-2xl"
      >
        <DialogTitle className="sr-only">Tìm kiếm</DialogTitle>
        <DialogDescription className="sr-only">
          Tìm điểm đến, quán ăn, bài viết hoặc nhảy nhanh tới một mục.
        </DialogDescription>
        <Command shouldFilter={false} className={COMMAND_CLASS}>
          <CommandInput
            value={q}
            onValueChange={setQ}
            placeholder="Tìm điểm đến, địa điểm, lưu trú, bài viết…"
            // Gợi ý phím tắt chuyển từ nút ở header vào đây — nút header nhờ vậy
            // gọn hẳn, còn người dùng vẫn học được phím mở nhanh khi đang dùng.
            trailing={
              <kbd className="pointer-events-none hidden shrink-0 items-center border border-border bg-muted/40 px-2 py-0.5 font-mono text-[0.65rem] text-muted-foreground sm:inline-flex">
                ⌘K
              </kbd>
            }
          />
          <CommandList className="max-h-[min(62vh,480px)] p-2">
            {term &&
              !loading &&
              results.places.length === 0 &&
              results.others.length === 0 && (
                <CommandEmpty className="py-12 text-center text-sm text-muted-foreground">
                  Không có kết quả cho “{term}”.
                </CommandEmpty>
              )}

            {!term && suggestions.length > 0 && (
              <CommandGroup
                heading="Gợi ý điểm đến"
                className="[&_[cmdk-group-items]]:grid [&_[cmdk-group-items]]:grid-cols-2 [&_[cmdk-group-items]]:gap-2.5 sm:[&_[cmdk-group-items]]:grid-cols-3"
              >
                {suggestions.map((h) => (
                  <SuggestionCard
                    key={h.href}
                    h={h}
                    onSelect={() => go(h.href)}
                  />
                ))}
              </CommandGroup>
            )}

            {results.places.length > 0 && (
              <CommandGroup heading="Địa điểm">
                {results.places.map((h) => (
                  <PlaceHitItem key={h.href} h={h} onSelect={() => go(h.href)} />
                ))}
              </CommandGroup>
            )}

            {results.others.length > 0 && (
              <CommandGroup heading="Khác">
                {results.others.map((h) => (
                  <HitItem key={h.href} h={h} onSelect={() => go(h.href)} />
                ))}
              </CommandGroup>
            )}

            {term && (
              <CommandGroup>
                <CommandItem
                  value="__xem-tat-ca__"
                  onSelect={() => go(`/tim-kiem?q=${encodeURIComponent(term)}`)}
                  className="mt-1 gap-3 rounded-[4px] border-t border-border px-3 py-3 text-foreground"
                >
                  <Search className="size-4" />
                  <span className={cn(MICRO)}>
                    Xem tất cả kết quả cho “{term}”
                  </span>
                  <ArrowUpRight className="ml-auto size-4" />
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>

          {/* Thanh gợi ý phím */}
          <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-2 text-[0.7rem] text-muted-foreground">
            <span className={cn(MICRO)}>halivivu</span>
            <span className="flex items-center gap-1.5">
              <kbd className="grid h-5 min-w-5 place-items-center border border-border bg-background px-1 font-sans">
                ↵
              </kbd>
              <span>chọn</span>
              <kbd className="ml-1 grid h-5 min-w-5 place-items-center border border-border bg-background px-1 font-sans">
                esc
              </kbd>
              <span>đóng</span>
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
