"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { removeDiacritics } from "@/lib/slug";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { setHomeProvince } from "./home-province-actions";

type Props = {
  provinces: string[]; // tên tỉnh/thành
  value: string | null;
  full?: boolean; // true = nút full-width (trong sheet mobile); false = pill header
  onSelected?: () => void; // vd đóng sheet sau khi chọn
};

// Ô chọn "tỉnh của bạn" trên header — Popover + Command tìm kiếm không dấu.
// Cập nhật lạc quan (state cục bộ) rồi lưu qua server action + router.refresh().
export function HomeProvincePicker({
  provinces,
  value,
  full = false,
  onSelected,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(value);
  const [pending, startTransition] = useTransition();

  function choose(name: string | null) {
    setSelected(name);
    setOpen(false);
    onSelected?.();
    startTransition(async () => {
      await setHomeProvince(name);
      router.refresh();
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={selected ? `Tỉnh của bạn: ${selected}` : "Chọn tỉnh của bạn"}
          className={cn(
            "group inline-flex h-9 items-center text-sm transition-colors",
            full
              ? // Sheet mobile: hàng full-width kiểu ô nhập
                "w-full gap-2 rounded-md border border-border/60 bg-muted/40 px-3 text-foreground hover:bg-muted"
              : // Header: nút tròn khi hẹp; hộp nền như ô tìm kiếm khi ≥ xl
                "relative w-9 justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground xl:w-auto xl:justify-start xl:gap-2 xl:rounded-md xl:border xl:border-transparent xl:bg-muted/60 xl:px-2.5 xl:hover:bg-muted xl:hover:text-foreground",
            pending && "opacity-70",
          )}
        >
          <MapPin
            className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
            aria-hidden
          />
          {/* Chấm báo "đã chọn" khi nút thu gọn thành icon (lg → xl) */}
          {selected && !full && (
            <span
              aria-hidden
              className="absolute right-2 top-2 size-1.5 rounded-full bg-primary xl:hidden"
            />
          )}
          <span
            className={cn(
              "truncate",
              full ? "flex-1 text-left" : "hidden xl:inline",
              !selected && "text-muted-foreground",
            )}
          >
            {selected ?? "Chọn tỉnh"}
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground/60",
              full ? "ml-auto" : "hidden xl:inline",
            )}
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align={full ? "start" : "end"} className="w-72 p-0">
        <div className="border-b px-3 py-2.5">
          <p className="text-lg font-semibold text-foreground">
            Bạn đang ở tỉnh nào?
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            Cho biết nơi bạn ở để gợi ý điểm đến gần bạn và cách di chuyển tới
            các điểm đến từ tỉnh của bạn.
          </p>
        </div>
        <Command
          filter={(v, s) =>
            removeDiacritics(v).includes(removeDiacritics(s)) ? 1 : 0
          }
        >
          <CommandInput placeholder="Tìm tỉnh/thành…" />
          <CommandList>
            <CommandEmpty>Không tìm thấy.</CommandEmpty>
            <CommandGroup>
              {selected && (
                <CommandItem
                  value="bo-chon"
                  onSelect={() => choose(null)}
                  className="text-muted-foreground"
                >
                  <span className="size-4 shrink-0" aria-hidden />
                  Bỏ chọn
                </CommandItem>
              )}
              {provinces.map((name) => (
                <CommandItem
                  key={name}
                  value={name}
                  onSelect={() => choose(name)}
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      selected === name ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                  {name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
