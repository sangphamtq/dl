"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "@/components/icons";
import { Glyph, type GlyphName } from "@/components/site/glyphs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { TOUCH_INPUT } from "@/lib/touch";
import { slugifyVi } from "@/lib/provinces";
import { defaultTripTitle } from "@/lib/trip-title";
import { addDays, isoDay, MonthGrid, parseDay, shortDay } from "@/components/trip/trip-topbar";
import { tripBagChanged } from "@/components/trip/trip-bag-events";
import { createTrip, type TripDestination } from "@/app/(site)/lich-trinh/actions";

const MICRO = "text-[0.6875rem] font-semibold uppercase tracking-[0.14em]";
const QUICK = 8;

/**
 * Trang TẠO CHUYẾN (`/lich-trinh/cua-toi/tao`): thông tin cơ bản trước, lịch trình sau. Mọi lối "tạo chuyến" chủ
 * động đều dẫn về đây; chỉ lối NGẦM khi lưu một địa điểm lúc chưa có chuyến là không hỏi.
 */
export function CreateTripForm({
  destinations,
  preset,
}: {
  destinations: TripDestination[];
  preset: TripDestination | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dest, setDest] = useState<TripDestination | null>(preset);
  const [days, setDays] = useState(3);
  const [date, setDate] = useState("");
  const [party, setParty] = useState<number | null>(null);
  const [title, setTitle] = useState("");

  // Đầu danh sách = điểm đến + tỉnh tự là điểm đến, theo thứ tự biên tập (`getTripDestinations`).
  const quick = destinations.slice(0, QUICK);
  const autoTitle = defaultTripTitle(dest?.name, days);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await createTrip({
        title: title.trim() || autoTitle,
        placeId: dest?.id ?? null,
        startDate: date || null,
        days,
        partySize: party,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      tripBagChanged();
      router.replace(`/lich-trinh/cua-toi/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/lich-trinh"
        className={cn(MICRO, "inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground")}
      >
        <Glyph name="back" className="size-3.5" />
        Lịch trình
      </Link>
      <h1 className="mt-5 font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-tight tracking-tight">
        Bạn định đi đâu?
      </h1>
      <p className="mt-2 text-muted-foreground">Chọn nơi đến và số ngày. Mọi thứ sửa lại được sau.</p>

      <section className="mt-9">
        <h2 className="text-sm font-semibold">Nơi đến</h2>
        <div className="mt-2">
          <Picker
            icon="pin"
            placeholder="Tìm điểm đến hoặc tỉnh"
            value={dest?.name ?? null}
            search="Tìm điểm đến, tỉnh…"
            empty="Chưa có nơi này trên site."
            items={destinations.map((d) => ({
              key: d.id,
              label: d.name,
              hint: d.isProvince ? "Tỉnh, thành phố" : d.province,
              image: d.image,
            }))}
            onPick={(k) => setDest(destinations.find((d) => d.id === k) ?? null)}
            onClear={() => setDest(null)}
          />
        </div>
        {quick.length > 0 && (
          // CHIP CHỮ, không ô ảnh: phần lớn điểm đến chưa có ảnh bìa thật, mà ảnh stock dán tên một nơi còn sai hơn là
          // không ảnh (cùng luật mục Trải nghiệm ở trang điểm đến).
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-medium text-muted-foreground">Hay đi</span>
            {quick.map((d) => {
              const on = dest?.id === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDest(on ? null : d)}
                  aria-pressed={on}
                  className={cn(
                    "inline-flex h-8 items-center gap-1 rounded-[4px] border px-2.5 text-sm transition-colors",
                    on
                      ? "border-primary bg-primary font-medium text-primary-foreground"
                      : "border-border hover:border-primary/50 hover:text-primary-ink",
                  )}
                >
                  {on && <Glyph name="tick" className="size-3.5" />}
                  {d.name}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-9 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-[auto_1fr_auto]">
        <Stepper label="Số ngày" value={days} min={1} max={14} onChange={setDays} unit="ngày" />
        <div className="col-span-2 grid gap-1.5 sm:col-span-1 sm:row-start-1 sm:col-start-2">
          <span className="text-sm font-semibold">Ngày đi</span>
          <DatePicker value={date} days={days} onChange={setDate} />
        </div>
        <Stepper
          label="Số người"
          value={party}
          min={1}
          max={99}
          onChange={setParty}
          unit="người"
          placeholder="—"
          firstStep={2}
        />
      </section>

      <section className="mt-9">
        <label className="grid gap-1.5">
          <span className="text-sm font-semibold">Tên chuyến</span>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={autoTitle}
            className="h-11 rounded-[4px]"
          />
          <span className="text-xs text-muted-foreground">Để trống thì đặt là “{autoTitle}”.</span>
        </label>
      </section>

      <div className="mt-10 flex items-center justify-end gap-2 border-t border-border pt-5">
        <Button asChild variant="ghost" className="rounded-[4px]">
          <Link href="/lich-trinh">Huỷ</Link>
        </Button>
        <Button type="submit" disabled={pending} className="h-11 rounded-[4px] px-5">
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Glyph name="plus" className="size-4" />}
          Tạo lịch trình
        </Button>
      </div>
    </form>
  );
}

type PickItem = { key: string; label: string; hint?: string | null; image?: string | null };

function Picker({
  icon,
  placeholder,
  value,
  search,
  empty,
  items,
  onPick,
  onClear,
}: {
  icon: GlyphName;
  placeholder: string;
  value: string | null;
  search: string;
  empty: string;
  items: PickItem[];
  onPick: (key: string, label: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative">
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-11 w-full items-center gap-2.5 rounded-[4px] border border-border bg-background px-3 text-left text-[0.9375rem] transition-colors hover:border-foreground/30 data-[state=open]:border-primary/50"
          >
            <Glyph name={icon} className="size-4 shrink-0 text-muted-foreground" />
            <span className={cn("min-w-0 flex-1 truncate", value ? "font-medium" : "text-muted-foreground")}>
              {value ?? placeholder}
            </span>
            {!value && <Glyph name="forward" className="size-4 shrink-0 rotate-90 text-muted-foreground" />}
          </button>
        </PopoverTrigger>
        {value && (
          <button
            type="button"
            onClick={onClear}
            aria-label={`Bỏ chọn ${value}`}
            className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-[3px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Glyph name="close" className="size-4" />
          </button>
        )}
      </div>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        {/* Lọc BỎ DẤU: người ta gõ "ha noi", "sa pa" — bộ lọc mặc định của cmdk không ra "Hà Nội". */}
        <Command filter={(v, q) => (slugifyVi(v).includes(slugifyVi(q)) ? 1 : 0)}>
          <CommandInput placeholder={search} className={TOUCH_INPUT} />
          <CommandList className="max-h-72">
            <CommandEmpty>{empty}</CommandEmpty>
            {items.map((it) => (
              <CommandItem
                key={it.key}
                value={`${it.label} ${it.hint ?? ""}`}
                onSelect={() => {
                  onPick(it.key, it.label);
                  setOpen(false);
                }}
                className="gap-2.5 rounded-[4px] py-2"
              >
                {it.image !== undefined && (
                  <span className="relative size-8 shrink-0 overflow-hidden rounded-[3px] bg-muted">
                    {it.image && <Image src={it.image} alt="" fill sizes="32px" className="object-cover" />}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{it.label}</span>
                  {it.hint && <span className="block truncate text-xs text-muted-foreground">{it.hint}</span>}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function Stepper<T extends number | null>({
  label,
  value,
  min,
  max,
  unit,
  placeholder,
  firstStep,
  onChange,
}: {
  label: string;
  value: T;
  min: number;
  max: number;
  unit: string;
  placeholder?: string;
  /** Đang trống mà bấm + thì nhảy tới số này (đi một mình hiếm hơn đi hai người). */
  firstStep?: number;
  onChange: (v: number) => void;
}) {
  const v = value ?? 0;
  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex h-10 items-center rounded-[4px] border border-border">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, v - 1))}
          disabled={value == null || v <= min}
          aria-label={`Bớt ${unit}`}
          className="grid h-full w-9 place-items-center text-lg leading-none text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          −
        </button>
        <span className="min-w-[3.25rem] text-center text-sm tabular-nums" aria-live="polite">
          {value == null ? (placeholder ?? "") : `${value} ${unit}`}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value == null ? (firstStep ?? min) : v + 1))}
          disabled={v >= max}
          aria-label={`Thêm ${unit}`}
          className="grid h-full w-9 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <Glyph name="plus" className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Ngày đi — cùng bộ lịch tháng với thanh đầu trang soạn (tiếng Việt, tô cả quãng ngày của chuyến). */
function DatePicker({ value, days, onChange }: { value: string; days: number; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const start = value ? parseDay(value) : null;
  const end = start ? addDays(start, Math.max(0, days - 1)) : null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-full items-center gap-2 rounded-[4px] border border-border bg-background px-3 text-left text-sm transition-colors hover:border-foreground/30 data-[state=open]:border-primary/50"
        >
          <Glyph name="calendar" className="size-4 shrink-0 text-muted-foreground" />
          {start && end ? (
            <span className="truncate tabular-nums">
              {shortDay(start)}
              {days > 1 && <span className="text-muted-foreground"> – {shortDay(end)}</span>}
            </span>
          ) : (
            <span className="text-muted-foreground">Chưa chọn</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <MonthGrid
          value={start}
          span={days}
          onPick={(d) => {
            setOpen(false);
            onChange(isoDay(d));
          }}
        />
        {start && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onChange("");
            }}
            className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Bỏ ngày đi
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
