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
      className="gap-3 rounded-lg px-3 py-2.5"
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
      <span className="ml-auto shrink-0 self-center pl-3 text-xs text-muted-foreground">
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
      className="gap-3 rounded-lg px-2 py-2"
    >
      <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-inset ring-border/60">
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
      <span className="ml-auto shrink-0 self-center pl-3 text-xs text-muted-foreground">
        {h.label}
      </span>
    </CommandItem>
  );
}

// Gợi ý điểm đến: ảnh tròn + tên.
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
      className="gap-3 rounded-lg px-2 py-1.5"
    >
      <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-inset ring-border/60">
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

const COMMAND_CLASS = cn(
  // Ô nhập: cao, rõ (sửa selector wrapper = data-slot, không phải cmdk-*).
  "[&_[data-slot=command-input-wrapper]]:h-16 [&_[data-slot=command-input-wrapper]]:gap-3 [&_[data-slot=command-input-wrapper]]:px-5",
  "[&_[data-slot=command-input-wrapper]_svg]:size-5 [&_[data-slot=command-input-wrapper]_svg]:opacity-60",
  "[&_[data-slot=command-input]]:text-base",
  // Tiêu đề nhóm: nhỏ, chữ hoa nhẹ, giãn chữ.
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[0.68rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/80",
  "[&_[cmdk-group]]:px-2 [&_[cmdk-group]]:py-2",
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
        className="top-[10vh] w-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] translate-y-0 gap-0 overflow-hidden rounded-2xl border-border/70 p-0 shadow-2xl sm:max-w-2xl"
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
                  className="gap-3 rounded-lg px-3 py-2.5 text-primary"
                >
                  <Search className="size-4 text-primary" />
                  <span className="text-sm font-medium">
                    Xem tất cả kết quả cho “{term}”
                  </span>
                  <ArrowUpRight className="ml-auto size-4 text-primary" />
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>

          {/* Thanh gợi ý phím */}
          <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-4 py-2 text-[0.7rem] text-muted-foreground">
            <span className="font-medium">halivivu</span>
            <span className="flex items-center gap-1.5">
              <kbd className="grid h-5 min-w-5 place-items-center rounded border bg-background px-1 font-sans">
                ↵
              </kbd>
              <span>chọn</span>
              <kbd className="ml-1 grid h-5 min-w-5 place-items-center rounded border bg-background px-1 font-sans">
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
