"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { NavIcon } from "./nav-icons";
import { XIcon } from "@/components/icons";
import { searchSite, getSuggestions, type SearchHit, type SearchGroup } from "./search-action";

/**
 * Bo góc RIÊNG, tròn hơn bộ chung một nấc (biên tập: "bo góc hơn nữa"): hộp 16px · chip / dòng / nút 10px · ảnh nhỏ, nhãn,
 * phím 6px. Có chủ đích — đừng "sửa" về bộ chung 10 / 6 / 4.
 *
 * Hộp tìm kiếm toàn site (⌘K) — kiểu SPOTLIGHT: ô gõ chữ LỚN không khung (nút "Xoá" chữ + nút × đóng hộp), nền sau mờ; chưa gõ thì một hàng
 * CHIP điểm đến nổi bật (ảnh nhỏ + tên) — đã BỎ hàng lối tắt và lưới ảnh lớn; có kết quả thì thẻ "Phù hợp nhất" lớn + danh sách gọn, phần chữ khớp IN ĐẬM (khớp cả khi gõ không dấu).
 */

/** Bỏ dấu TỪNG KÝ TỰ (giữ nguyên độ dài chuỗi) — để chỉ số khớp trên bản bỏ dấu dùng lại được trên tên gốc. */
function foldChar(c: string): string {
  if (c === "đ") return "d";
  if (c === "Đ") return "D";
  return c.normalize("NFD").replace(/[̀-ͯ]/g, "").charAt(0) || c;
}
const fold = (s: string) => Array.from(s, foldChar).join("").toLowerCase();

function Highlight({ text, term }: { text: string; term: string }) {
  const t = fold(term.trim());
  if (!t) return <>{text}</>;
  const chars = Array.from(text);
  const i = fold(text).indexOf(t);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {chars.slice(0, i).join("")}
      <mark className="bg-transparent font-bold text-foreground">{chars.slice(i, i + t.length).join("")}</mark>
      {chars.slice(i + t.length).join("")}
    </>
  );
}

/** Ảnh thật hoặc ảnh giữ chỗ — thẻ kết quả luôn có một khối hình, không để ô trống. */
function Thumb({ src, className, sizes }: { src: string; className?: string; sizes: string }) {
  return (
    <span className={cn("relative shrink-0 overflow-hidden rounded-[6px] bg-muted", className)}>
      <Image src={src} alt="" fill sizes={sizes} className="object-cover" />
    </span>
  );
}

const KIND = "shrink-0 rounded-[6px] bg-foreground/[0.06] px-1.5 py-0.5 text-[0.6875rem] font-medium text-muted-foreground";
const HEADING =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground";
const ITEM_ON = "data-[selected=true]:bg-foreground/[0.06] data-[selected=true]:text-foreground";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchGroup[]>([]);
  const [done, setDone] = useState("");
  const [suggestions, setSuggestions] = useState<SearchHit[]>([]);
  const reqId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadedSug = useRef(false);

  useEffect(() => {
    if (!open || loadedSug.current) return;
    loadedSug.current = true;
    getSuggestions()
      .then((s) => setSuggestions(s))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      if (!term) {
        if (id === reqId.current) {
          setResults([]);
          setDone("");
        }
        return;
      }
      const res = await searchSite(term);
      if (id === reqId.current) {
        setResults(res);
        setDone(term);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [q]);

  const term = q.trim();
  const loading = !!term && done !== term;
  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };
  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setQ("");
      setResults([]);
      setDone("");
    }
    onOpenChange(o);
  };

  // Kết quả ĐẦU TIÊN (nhóm đầu, mục đầu) lên thẻ "Phù hợp nhất"; phần còn lại giữ nhóm.
  const ready = !!term && done === term;
  const top = ready ? results[0]?.items[0] : undefined;
  const rest = ready
    ? results
        .map((g, gi) => ({ ...g, items: gi === 0 ? g.items.slice(1) : g.items }))
        .filter((g) => g.items.length > 0)
    : [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/35 backdrop-blur-[3px]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[8vh] z-50 w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-[16px] bg-background shadow-[0_32px_80px_-24px_rgb(0_0_0/0.5),0_0_0_1px_rgb(0_0_0/0.04)] outline-none duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 dark:shadow-[0_32px_80px_-24px_rgb(0_0_0/0.8),0_0_0_1px_rgb(255_255_255/0.08)]"
        >
          <DialogPrimitive.Title className="sr-only">Tìm kiếm</DialogPrimitive.Title>
          <Command shouldFilter={false} className="bg-transparent">
            {/* Ô gõ: chữ LỚN font tiêu đề, không khung — hộp CHÍNH LÀ ô tìm. Vạch đáy chạy khi đang chờ kết quả. */}
            <div className="relative flex items-center gap-3 px-5 pt-5 pb-4 sm:px-6">
              <NavIcon name="search" active={false} className="size-6 shrink-0 text-foreground/50" />
              <CommandPrimitive.Input
                ref={inputRef}
                value={q}
                onValueChange={setQ}
                placeholder="Bạn muốn đi đâu?"
                className="h-10 w-full min-w-0 bg-transparent font-[family-name:var(--font-display)] text-2xl font-medium tracking-tight outline-none placeholder:text-foreground/30 sm:text-[1.75rem]"
              />
              {/* XOÁ chữ = nút chữ nhỏ (chỉ khi đã gõ); ĐÓNG hộp = nút × luôn có — hai việc khác nhau thì hai hình khác nhau,
                  không để hai dấu × đứng cạnh nhau. */}
              {q && (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    inputRef.current?.focus();
                  }}
                  className="h-8 shrink-0 rounded-[10px] px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                >
                  Xoá
                </button>
              )}
              <DialogPrimitive.Close
                aria-label="Đóng tìm kiếm"
                className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-foreground/[0.05] text-foreground/70 transition-colors hover:bg-foreground/[0.1] hover:text-foreground"
              >
                <XIcon className="size-[1.125rem]" />
              </DialogPrimitive.Close>
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-0 bottom-0 h-px bg-border",
                  loading && "animate-pulse bg-primary/60",
                )}
              />
            </div>

            <CommandList className={cn("max-h-[min(64vh,34rem)] px-2 pb-2", HEADING)}>
              {!term && suggestions.length > 0 && (
                // GỢI Ý = CHIP nhỏ (ảnh vuông 28px + tên, KHÔNG tên tỉnh), xuống dòng tự do — hộp mở ra gọn, chỗ chính dành cho ô gõ.
                <CommandGroup heading="Điểm đến nổi bật">
                  <div className="flex flex-wrap gap-1.5 px-1 pb-2">
                    {suggestions.map((h) => (
                      <CommandItem
                        key={h.href}
                        value={h.href}
                        onSelect={() => go(h.href)}
                        // Rê / chọn bằng phím: chip NHUỐM màu chính (nền xanh nhạt + chữ xanh), ảnh to ra và nghiêng nhẹ. Đủ rõ
                        //  để biết đang trỏ vào đâu (bản chỉ đậm nền xám 2% quá nhẹ).
                        className="group/chip h-10 gap-2 rounded-[10px] bg-foreground/[0.04] py-0 pl-1.5 pr-3 transition-colors duration-200 hover:bg-primary/10 data-[selected=true]:bg-primary/10"
                      >
                        <span className="relative size-7 shrink-0 overflow-hidden rounded-[6px] bg-muted transition-transform duration-300 ease-out group-hover/chip:-rotate-3 group-hover/chip:scale-110 group-data-[selected=true]/chip:-rotate-3 group-data-[selected=true]/chip:scale-110 motion-reduce:transition-none">
                          <Image src={h.image} alt="" fill sizes="28px" className="object-cover" />
                        </span>
                        <span className="text-sm font-medium text-foreground transition-colors group-hover/chip:text-primary-ink group-data-[selected=true]/chip:text-primary-ink">
                          {h.name}
                        </span>
                      </CommandItem>
                    ))}
                  </div>
                </CommandGroup>
              )}

              {loading && (
                <div className="space-y-1 px-1 py-2" aria-hidden>
                  <div className="flex items-center gap-4 p-2">
                    <span className="h-[4.5rem] w-24 shrink-0 animate-pulse rounded-[6px] bg-muted" />
                    <span className="flex min-w-0 flex-1 flex-col gap-2">
                      <span className="h-4 w-2/5 animate-pulse rounded-[4px] bg-muted" />
                      <span className="h-3 w-1/4 animate-pulse rounded-[4px] bg-muted/70" />
                    </span>
                  </div>
                  {[0, 1].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-2 py-1.5">
                      <span className="size-10 shrink-0 animate-pulse rounded-[6px] bg-muted" />
                      <span className="h-3 w-1/3 animate-pulse rounded-[4px] bg-muted" />
                    </div>
                  ))}
                </div>
              )}

              {/* KHÔNG dùng `CommandEmpty`: nó chỉ render khi cmdk đếm 0 item, mà hàng "Xem tất cả" luôn là một item.
                  `shouldFilter={false}` ⇒ tình trạng rỗng do chính ta biết. */}
              {ready && results.length === 0 && (
                <div className="px-4 py-12 text-center">
                  <p className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                    Chưa tìm thấy “{term}”
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">Thử gõ tên tỉnh, điểm đến hoặc một món ăn.</p>
                </div>
              )}

              {top && (
                <CommandGroup heading="Phù hợp nhất">
                  <CommandItem
                    value={top.href}
                    onSelect={() => go(top.href)}
                    className={cn("group/top gap-4 rounded-[10px] p-2", ITEM_ON)}
                  >
                    <Thumb src={top.image} sizes="96px" className="h-[4.5rem] w-24" />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="truncate font-[family-name:var(--font-display)] text-lg font-medium leading-tight tracking-tight text-foreground">
                        <Highlight text={top.name} term={term} />
                      </span>
                      <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                        {top.kind && <span className={KIND}>{top.kind}</span>}
                        {top.context && <span className="truncate">{top.context}</span>}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground opacity-0 transition-opacity group-data-[selected=true]/top:opacity-100">
                      Mở ↵
                    </span>
                  </CommandItem>
                </CommandGroup>
              )}

              {rest.map((g) => (
                <CommandGroup key={g.label} heading={g.label}>
                  {g.items.map((h) => (
                    <CommandItem
                      key={h.href}
                      value={h.href}
                      onSelect={() => go(h.href)}
                      className={cn("gap-3 rounded-[10px] px-2 py-1.5", ITEM_ON)}
                    >
                      <Thumb src={h.image} sizes="40px" className="size-10" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[0.9375rem] text-foreground">
                          <Highlight text={h.name} term={term} />
                        </span>
                        {h.context && <span className="truncate text-xs text-muted-foreground">{h.context}</span>}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}

              {ready && results.length > 0 && (
                <CommandGroup>
                  <CommandItem
                    value="__xem-tat-ca__"
                    onSelect={() => go(`/tim-kiem?q=${encodeURIComponent(term)}`)}
                    className={cn("mt-1 gap-2 rounded-[10px] px-3 py-2.5 text-sm font-medium text-primary-ink", ITEM_ON)}
                  >
                    <NavIcon name="search" active={false} className="size-4" />
                    Xem tất cả kết quả cho “{term}”
                    <span className="ml-auto text-muted-foreground">→</span>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>

            <div className="flex items-center gap-4 border-t border-border bg-foreground/[0.02] px-5 py-2.5 text-xs text-muted-foreground sm:px-6">
              {[
                ["↑↓", "di chuyển"],
                ["↵", "mở"],
                ["esc", "đóng"],
              ].map(([k, l]) => (
                <Fragment key={k}>
                  <span className="hidden items-center gap-1.5 sm:flex">
                    <kbd className="grid h-5 min-w-5 place-items-center rounded-[6px] border border-border bg-background px-1 font-sans text-[0.6875rem]">
                      {k}
                    </kbd>
                    {l}
                  </span>
                </Fragment>
              ))}
              <span className="ml-auto">Tìm trong điểm đến, địa điểm, lưu trú, bài viết</span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
