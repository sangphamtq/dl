"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowUpRight, Search } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  searchSite,
  getSuggestions,
  type SearchHit,
  type SearchGroup,
} from "./search-action";

/**
 * MỘT khuôn hàng cho MỌI loại kết quả: ảnh · tên · ngữ cảnh.
 *
 * Trước đây có hai khuôn — Place/Spot thì ảnh thumbnail, còn Lưu trú/Bài viết
 * chỉ được một icon xám. Sự phân hạng đó không đến từ dữ liệu: chẳng loại nào
 * có ảnh thật cả (kể cả "Phan Thiết"), chỉ là hai khuôn xử lý chỗ trống theo
 * hai cách. Nay `searchSite` cho mọi hit đi qua `coverUrl()` nên ảnh LUÔN có,
 * và một khuôn là đủ.
 *
 * KHÔNG còn nhãn loại ở mép phải: tiêu đề nhóm đã nói loại, và nhãn đó ăn mất
 * bề ngang của đúng thứ người ta đang đọc — cái tên.
 */
function HitRow({ h, onSelect }: { h: SearchHit; onSelect: () => void }) {
  return (
    <CommandItem
      value={h.href}
      onSelect={onSelect}
      className="group gap-3 rounded-[4px] px-2 py-2"
    >
      <span className="relative size-11 shrink-0 overflow-hidden bg-muted">
        <Image src={h.image} alt="" fill sizes="44px" className="object-cover" />
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
      {/* Mũi tên chỉ hiện ở hàng đang chọn — cùng cách thẻ lưu trú để lộ mũi tên
          khi rê chuột, thay cho một cột nhãn chiếm chỗ vĩnh viễn. */}
      <ArrowUpRight
        className="ml-auto size-4 shrink-0 self-center text-muted-foreground opacity-0 group-data-[selected=true]:opacity-100"
        aria-hidden
      />
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
      {/* Ô VUÔNG 40px, đúng bằng dấu chân của ảnh tròn cũ. */}
      <span className="relative size-10 shrink-0 overflow-hidden bg-muted">
        <Image src={h.image} alt="" fill sizes="40px" className="object-cover" />
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
  // Tiêu đề nhóm: đúng thang `MICRO` dùng chung với các trang danh sách, phân
  // tầng bằng KHOẢNG TRẮNG chứ không phải gạch chân. Bản trước mỗi nhóm một nét
  // ngang — hồi đó chỉ có hai nhóm nên còn chịu được; nay nhóm chia theo loại
  // thật (tới năm nhóm) thì panel cao 480px kẻ tới năm vạch, đúng thứ đã gỡ ở
  // `/lich-trinh`.
  "[&_[cmdk-group-heading]]:mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-1 [&_[cmdk-group-heading]]:text-[0.6rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-muted-foreground",
  "[&_[cmdk-group]]:px-2 [&_[cmdk-group]]:pb-3",
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
  const [results, setResults] = useState<SearchGroup[]>([]);
  /**
   * Từ khoá mà `results` đang mô tả — KHÔNG phải một cờ `loading`.
   *
   * Cờ loading chỉ bật bên trong callback của debounce, tức 150ms sau phím cuối.
   * Trong khoảng đó `loading=false` và `results=[]`, nên điều kiện "rỗng" cũ ăn
   * đúng vào lúc người ta còn đang gõ dở: câu "Không có kết quả cho …" nháy lên
   * giữa chừng mỗi từ khoá. So khớp từ khoá thì không có khe hở nào.
   */
  const [done, setDone] = useState("");
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
            {term && done !== term && (
              <div className="px-2 py-2" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-2">
                    <span className="size-11 shrink-0 animate-pulse bg-muted" />
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="h-3 w-2/5 animate-pulse bg-muted" />
                      <span className="h-2.5 w-1/4 animate-pulse bg-muted/70" />
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* KHÔNG dùng `CommandEmpty`: nó chỉ render khi cmdk đếm được 0 item,
                mà hàng "Xem tất cả" bên dưới luôn là một item — nên câu báo rỗng
                bị nuốt và người gõ trượt chỉ thấy một panel trống trơn. Ở đây
                `shouldFilter={false}`, tình trạng rỗng do chính ta biết. */}
            {term && done === term && results.length === 0 && (
              <p className="px-4 py-12 text-center text-sm text-muted-foreground">
                Không có kết quả cho “{term}”.
              </p>
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

            {done === term &&
              results.map((g) => (
                <CommandGroup key={g.label} heading={g.label}>
                  {g.items.map((h) => (
                    <HitRow key={h.href} h={h} onSelect={() => go(h.href)} />
                  ))}
                </CommandGroup>
              ))}

            {done === term && results.length > 0 && (
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
