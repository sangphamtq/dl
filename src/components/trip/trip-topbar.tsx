"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Glyph } from "@/components/site/glyphs";
import { cn } from "@/lib/utils";
import { R_CTRL } from "@/lib/radius";
import { updateTrip } from "@/app/(site)/lich-trinh/actions";
import { MICRO } from "@/components/trip/trip-rail";
import { TripShare } from "@/components/trip/trip-share";
import { TripSectionSheet } from "@/components/trip/trip-side-nav";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TripRefreshButton, type TripSync } from "@/components/trip/trip-refresh-button";
import type { TripPerson } from "@/lib/trip";

export type TripChrome = {
  id: string;
  title: string;
  startDate: string | null;
  partySize: number | null;
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
    // Nền + đường ngăn do `TripShell headerBand` vẽ (trải hết bề ngang, không bị lề khung cắt).
    <header>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Link
          href="/lich-trinh/cua-toi"
          className={cn(
            MICRO,
            "inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground",
          )}
        >
          <Glyph name="back" className="size-3.5" />
          Lịch trình của tôi
        </Link>

        <div className="flex items-center gap-2.5">
          <TripSectionSheet tripId={trip.id} />
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

      <div className="mt-3 max-w-3xl">
        {/* key theo GIÁ TRỊ: ô chỉ đọc giá trị lúc dựng, người khác đổi rồi bấm "Cập nhật"
            mà không dựng lại thì vẫn hiện chữ cũ. */}
        <TitleField
          key={trip.title}
          value={trip.title}
          onSave={(title) => run(() => updateTrip(trip.id, { title }))}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
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
            className={cn(CHIP, "cursor-pointer gap-2 pr-2")}
            title="Tự ước tính thời gian và quãng đường lái giữa các điểm, rồi cộng vào giờ. Áp dụng cho cả chuyến."
          >
            <Glyph name="car" className="size-4 shrink-0 text-muted-foreground" />
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
          <p className="flex items-baseline gap-x-5 text-sm text-muted-foreground sm:ml-auto">
            {facts.map((f) => (
              <span key={f}>
                <strong className="font-semibold tabular-nums text-foreground">{f.split(" ")[0]}</strong>{" "}
                {f.split(" ").slice(1).join(" ")}
              </span>
            ))}
          </p>
        )}
      </div>
      <span className="sr-only" aria-live="polite">
        {pending ? "Đang lưu" : ""}
      </span>
    </header>
  );
}

/** Một "chip" bấm được của hàng thông số chuyến: icon + giá trị, mở bảng chỉnh. */
const CHIP =
  "inline-flex h-9 items-center gap-1.5 rounded-[4px] border border-border bg-background px-3 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:border-primary/50 data-[state=open]:bg-muted/40";

const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** "YYYY-MM-DD" ⇄ Date theo NGÀY LỊCH (UTC) — không để múi giờ máy làm lệch một ngày. */
function parseDay(v: string): Date {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}
function shortDay(d: Date, withYear = false): string {
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
        <button type="button" className={CHIP} aria-label="Ngày khởi hành">
          <Glyph name="calendar" className="size-4 shrink-0 text-muted-foreground" />
          {start && end ? (
            <span className="tabular-nums">
              {shortDay(start)}
              {dayCount > 1 && (
                <>
                  <span className="mx-1.5 text-muted-foreground">→</span>
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

function MonthGrid({
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
        <button type="button" className={CHIP} aria-label="Số người">
          <Glyph name="people" className="size-4 shrink-0 text-muted-foreground" />
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
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const next = draft.trim();
        if (next && next !== value) onSave(next);
        else setDraft(value);
      }}
      aria-label="Tên lịch trình"
      className={cn(
        R_CTRL,
        // Rê chuột hiện nền nhẹ: nói được "tên này sửa được" mà không cần viền thường trực.
        "-mx-2 w-[calc(100%+1rem)] bg-transparent px-2 py-0.5 font-[family-name:var(--font-display)] text-[clamp(1.5rem,3.4vw,2.25rem)] font-semibold leading-[1.15] tracking-tight outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring",
      )}
    />
  );
}
