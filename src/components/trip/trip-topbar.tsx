"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Glyph } from "@/components/site/glyphs";
import { cn } from "@/lib/utils";
import { R_CARD } from "@/lib/radius";
import { updateTrip } from "@/app/(site)/lich-trinh/actions";
import { MICRO } from "@/components/trip/trip-rail";
import { TripShare } from "@/components/trip/trip-share";
import { TripSectionTabs } from "@/components/trip/trip-side-nav";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TripRefreshButton, type TripSync } from "@/components/trip/trip-refresh-button";
import type { TripPerson } from "@/lib/trip";

export type TripChrome = {
  id: string;
  title: string;
  startDate: string | null;
  partySize: number | null;
  place?: { slug: string; name: string } | null;
  autoTravel?: boolean;
  shareId: string | null;
  visibility: "private" | "unlisted";
  isOwner: boolean;
  people: TripPerson[];
};

export function TripTopbar({
  trip,
  facts,
  sync,
}: {
  trip: TripChrome;
  facts?: string[];
  sync?: TripSync;
}) {
  const [pending, start] = useTransition();
  // Bật/tắt phản hồi NGAY, không chờ server dựng lại cả lịch (có thể vài giây vì OSRM).
  const [travel, setTravel] = useState(trip.autoTravel ?? true);
  const [travelFor, setTravelFor] = useState(trip.autoTravel);
  if (trip.autoTravel !== travelFor) {
    setTravelFor(trip.autoTravel);
    setTravel(trip.autoTravel ?? true);
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Không thực hiện được.");
    });
  }

  const dayCount = Number.parseInt(facts?.[0] ?? "", 10) || 1;

  return (
    <header>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Link
          href="/lich-trinh/cua-toi"
          className={cn(MICRO, "inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground")}
        >
          <Glyph name="back" className="size-3.5" />
          Lịch trình của tôi
        </Link>

        <div className="flex items-center gap-2.5">
          {sync && <TripRefreshButton sync={sync} />}
          <TripShare
            tripId={trip.id}
            title={trip.title}
            shareId={trip.shareId}
            shared={trip.visibility === "unlisted"}
            isOwner={trip.isOwner}
            people={trip.people}
          />
        </div>
      </div>

      <div className="mt-5 max-w-4xl sm:mt-7">
        {/* key theo GIÁ TRỊ: ô chỉ đọc giá trị lúc dựng, người khác đổi rồi bấm "Cập nhật"
            mà không dựng lại thì vẫn hiện chữ cũ. */}
        <TitleField
          key={trip.title}
          value={trip.title}
          onSave={(title) => run(() => updateTrip(trip.id, { title }))}
        />
      </div>

      {/* Hàng "thuộc tính" kiểu Notion: nút KHÔNG viền, rê vào mới có nền. `-ml-2` để chữ của
          thuộc tính đầu dóng thẳng mép tên chuyến chứ không phải mép nền hover. */}
      <div className="-ml-2 mt-3 flex flex-wrap items-center gap-x-1 gap-y-1">
        {trip.place && (
          <Link href={`/diem-den/${trip.place.slug}`} className={PROP} title={`Trang điểm đến ${trip.place.name}`}>
            <Glyph name="pin" className={PROP_ICON} />
            {trip.place.name}
          </Link>
        )}
        <DateChip
          value={trip.startDate}
          dayCount={dayCount}
          onChange={(startDate) => run(() => updateTrip(trip.id, { startDate }))}
        />
        <PartyChip
          value={trip.partySize}
          onChange={(partySize) => run(() => updateTrip(trip.id, { partySize }))}
        />
        {trip.autoTravel !== undefined && (
          <label
            className={cn(PROP, "cursor-pointer gap-2")}
            title="Tự ước tính thời gian và quãng đường lái giữa các điểm, rồi cộng vào giờ. Áp dụng cho cả chuyến."
          >
            <Glyph name="car" className={PROP_ICON} />
            Tự tính đường đi
            <Switch
              checked={travel}
              onCheckedChange={(on) => {
                setTravel(on);
                run(async () => {
                  const res = await updateTrip(trip.id, { autoTravel: on });
                  if (!res.ok) setTravel(!on);
                  else
                    toast(
                      on
                        ? "Đã bật: giờ đến đã cộng thời gian di chuyển."
                        : "Đã tắt: giờ đến nối thẳng giờ rời điểm trước.",
                    );
                  return res;
                });
              }}
              aria-label="Tự tính thời gian và quãng đường giữa các điểm"
            />
          </label>
        )}

        {facts && facts.length > 0 && (
          <p className="ml-2 flex items-baseline gap-x-4 text-sm text-muted-foreground">
            {facts.map((f) => (
              <span key={f}>
                <strong className="font-semibold tabular-nums text-foreground">{f.split(" ")[0]}</strong>{" "}
                {f.split(" ").slice(1).join(" ")}
              </span>
            ))}
          </p>
        )}
      </div>
      {/* Điện thoại: dải mục hiện sẵn (từ lg đã có cột trái). */}
      <TripSectionTabs tripId={trip.id} className="mt-5 lg:hidden" />
      <span className="sr-only" aria-live="polite">
        {pending ? "Đang lưu" : ""}
      </span>
    </header>
  );
}

/** Một "thuộc tính" của chuyến: icon + giá trị, bấm để chỉnh. Không viền — rê vào / đang mở mới có nền. */
const PROP =
  "inline-flex h-8 items-center gap-1.5 rounded-[4px] px-2 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted";
const PROP_ICON = "size-4 shrink-0 text-muted-foreground";

const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** "YYYY-MM-DD" ⇄ Date theo NGÀY LỊCH (UTC) — không để múi giờ máy làm lệch một ngày. */
export function parseDay(v: string): Date {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}
export function shortDay(d: Date, withYear = false): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${WEEKDAY[d.getUTCDay()]} ${dd}/${mm}${withYear ? `/${d.getUTCFullYear()}` : ""}`;
}

/**
 * Ngày khởi hành. KHÔNG dùng `<input type="date">`: trình duyệt vẽ theo ngôn ngữ của máy nên
 * ra "mm/dd/yyyy" — cùng bệnh với ô giờ bắt đầu ngày. Chip hiện cả KHOẢNG ngày của chuyến.
 */
function DateChip({
  value,
  dayCount,
  onChange,
}: {
  value: string | null;
  dayCount: number;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const start = value ? parseDay(value) : null;
  const end = start ? addDays(start, Math.max(0, dayCount - 1)) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={PROP} aria-label="Ngày khởi hành">
          <Glyph name="calendar" className={PROP_ICON} />
          {start && end ? (
            <span className="tabular-nums">
              {shortDay(start)}
              {dayCount > 1 && (
                <>
                  <span className="mx-1.5 text-muted-foreground">–</span>
                  {shortDay(end, true)}
                </>
              )}
              {dayCount <= 1 && `/${start.getUTCFullYear()}`}
            </span>
          ) : (
            <span className="text-muted-foreground">Chọn ngày đi</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <MonthGrid
          value={start}
          span={dayCount}
          onPick={(d) => {
            setOpen(false);
            if (!start || isoDay(d) !== isoDay(start)) onChange(isoDay(d));
          }}
        />
        {start && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onChange(null);
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

export function MonthGrid({
  value,
  span,
  onPick,
}: {
  value: Date | null;
  /** Số ngày của chuyến — tô cả khoảng từ ngày đi. */
  span: number;
  onPick: (d: Date) => void;
}) {
  const today = parseDay(new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }));
  const [cursor, setCursor] = useState(() => {
    const base = value ?? today;
    return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
  });
  const first = cursor;
  // Tuần bắt đầu THỨ HAI (cách người Việt đọc lịch).
  const lead = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => addDays(first, i))];
  const inSpan = (d: Date) =>
    value != null && d.getTime() >= value.getTime() && d.getTime() <= addDays(value, span - 1).getTime();

  const shift = (n: number) =>
    setCursor(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + n, 1)));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="Tháng trước"
          className="grid size-8 place-items-center rounded-[4px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Glyph name="back" className="size-4" />
        </button>
        <p className="text-sm font-semibold">
          Tháng {first.getUTCMonth() + 1}, {first.getUTCFullYear()}
        </p>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Tháng sau"
          className="grid size-8 place-items-center rounded-[4px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Glyph name="forward" className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((w) => (
          <span key={w} className="py-1 text-[0.7rem] font-medium text-muted-foreground">
            {w}
          </span>
        ))}
        {cells.map((d, i) =>
          d ? (
            <button
              key={i}
              type="button"
              onClick={() => onPick(d)}
              className={cn(
                "h-8 rounded-[4px] text-sm tabular-nums transition-colors",
                value && isoDay(d) === isoDay(value)
                  ? "bg-primary font-semibold text-primary-foreground"
                  : inSpan(d)
                    ? "bg-primary/10 text-primary-ink"
                    : "hover:bg-muted",
                isoDay(d) === isoDay(today) && !inSpan(d) && "font-semibold text-primary-ink",
              )}
            >
              {d.getUTCDate()}
            </button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
    </div>
  );
}

function PartyChip({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? 2);
  // Chỉ lưu khi người dùng ĐÃ bấm −/+ — chưa có số người mà mở rồi đóng thì không được tự ghi
  // con số khởi điểm 2.
  const [touched, setTouched] = useState(false);
  const step = (n: number) => {
    setTouched(true);
    setDraft((d) => Math.min(99, Math.max(1, d + n)));
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setDraft(value ?? 2);
          setTouched(false);
        }
        // Đóng bảng là LƯU — khỏi thêm một nút "Xong" cho một con số.
        else if (touched && draft !== value) onChange(draft);
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" className={PROP} aria-label="Số người">
          <Glyph name="people" className={PROP_ICON} />
          {value ? (
            <span className="tabular-nums">{value} người</span>
          ) : (
            <span className="text-muted-foreground">Số người</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-3">
        <p className="text-sm font-semibold">Đi mấy người?</p>
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={draft <= 1}
            aria-label="Bớt một người"
            className="grid size-9 place-items-center rounded-[4px] border border-border text-lg leading-none hover:bg-muted disabled:opacity-40"
          >
            −
          </button>
          <span className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums">{draft}</span>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={draft >= 99}
            aria-label="Thêm một người"
            className="grid size-9 place-items-center rounded-[4px] border border-border hover:bg-muted disabled:opacity-40"
          >
            <Glyph name="plus" className="size-4" />
          </button>
        </div>
        {value != null && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onChange(null);
            }}
            className="mt-3 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Bỏ số người
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function TitleField({
  value,
  onSave,
}: {
  value: string;
  onSave: (title: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  // Esc rồi blur() chạy NGAY trong cùng lượt: onBlur vẫn thấy `draft` cũ ⇒ sẽ lưu nhầm.
  const cancelled = useRef(false);
  const text = cn(
    "font-[family-name:var(--font-display)] text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-[1.1] tracking-tight",
  );
  return (
    // Ô nhập CO THEO CHỮ (lớp chữ ẩn cùng ô lưới đặt cỡ) để nền rê/nền sửa ôm sát tên. `-mx-2`
    // bù phần đệm: chữ vẫn dóng mép trái như khi không có nền.
    <span className="-mx-2 inline-grid min-w-0 max-w-[calc(100%+1rem)] align-top">
      {/* `min-w-0 overflow-hidden`: lớp đo này `whitespace-pre` — để nguyên thì tên dài ("Phan Thiết 3 ngày 2 đêm") đẩy
          ô lưới rộng hơn màn hình 320px. Tên dài hơn khung thì ô nhập tự cuộn ngang khi gõ. */}
      <span aria-hidden className={cn(text, "invisible col-start-1 row-start-1 min-w-0 overflow-hidden whitespace-pre px-2 py-1")}>
        {draft || " "}
      </span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (cancelled.current) {
            cancelled.current = false;
            setDraft(value);
            return;
          }
          const next = draft.trim();
          if (next && next !== value) onSave(next);
          else setDraft(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            cancelled.current = true;
            e.currentTarget.blur();
          }
        }}
        aria-label="Tên lịch trình"
        title="Bấm để đổi tên"
        spellCheck={false}
        size={1}
        className={cn(
          R_CARD,
          text,
          "col-start-1 row-start-1 w-full min-w-0 cursor-text bg-transparent px-2 py-1 caret-primary outline-none transition-[background-color,box-shadow] duration-150",
          "selection:bg-primary/20 hover:bg-muted/70",
          "focus:bg-background focus:shadow-[0_0_0_1.5px_color-mix(in_oklab,var(--color-primary)_70%,transparent),0_0_0_5px_color-mix(in_oklab,var(--color-primary)_16%,transparent),0_1px_2px_rgb(0_0_0/0.06)] focus:hover:bg-background",
        )}
      />
    </span>
  );
}
