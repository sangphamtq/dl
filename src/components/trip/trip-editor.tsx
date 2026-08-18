"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Map as MapIcon,
  MoreHorizontal,
  Navigation,
  Plus,
  Route,
  Sunrise,
  Trash2,
  TriangleAlert,
  Users,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ResolvedItem, DayView, ItemView } from "@/lib/trip";
import { formatMinutes, fmtDuration, DEFAULT_STAY_MIN, type TripWarning } from "@/lib/trip-time";
import {
  addDay,
  addItem,
  moveItem,
  removeDay,
  removeItem,
  updateDay,
  updateItem,
  updateTrip,
} from "@/app/(site)/lich-trinh/actions";
import { TripMap } from "@/components/trip/trip-map";
import { TripShare } from "@/components/trip/trip-share";

type TripHeader = {
  id: string;
  title: string;
  startDate: string | null;
  partySize: number | null;
  shareId: string | null;
  visibility: "private" | "unlisted";
};

const STAY_PRESETS = [15, 30, 45, 60, 90, 120, 180, 240, 360];

// Bố cục hai cột giống map-explorer: trái là dòng thời gian, phải là bản đồ.
// Dưới `lg` chỉ hiện một bên, đổi bằng cặp nút "Lịch trình / Bản đồ".
export function TripEditor({
  trip,
  days,
  backlog,
}: {
  trip: TripHeader;
  days: DayView[];
  backlog: ResolvedItem[];
}) {
  const [pending, start] = useTransition();
  const [activeDayId, setActiveDayId] = useState(days[0]?.id ?? "");
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [bagOpen, setBagOpen] = useState(false);

  const activeDay = days.find((d) => d.id === activeDayId) ?? days[0] ?? null;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) {
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error ?? "Không thực hiện được.");
        return;
      }
      if (done) toast.success(done);
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* ── Đầu trang ────────────────────────────────────────── */}
      <header className="border-b bg-gradient-to-b from-sky-100/70 to-background dark:from-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <Link
            href="/lich-trinh"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ‹ Lịch trình của tôi
          </Link>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <TitleField
                value={trip.title}
                onSave={(title) => run(() => updateTrip(trip.id, { title }))}
              />
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <label className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4" aria-hidden />
                  <input
                    type="date"
                    defaultValue={trip.startDate ?? ""}
                    onChange={(e) =>
                      run(() => updateTrip(trip.id, { startDate: e.target.value || null }))
                    }
                    aria-label="Ngày khởi hành"
                    className="rounded-md bg-transparent px-1 py-0.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <Users className="size-4" aria-hidden />
                  <input
                    type="number"
                    min={1}
                    max={99}
                    defaultValue={trip.partySize ?? ""}
                    placeholder="Số người"
                    onBlur={(e) =>
                      run(() =>
                        updateTrip(trip.id, {
                          partySize: e.target.value ? Number(e.target.value) : null,
                        }),
                      )
                    }
                    aria-label="Số người"
                    className="w-20 rounded-md bg-transparent px-1 py-0.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <span className="inline-flex items-center gap-1.5">
                  <Route className="size-4" aria-hidden />
                  {days.length} ngày · {days.reduce((s, d) => s + d.items.length, 0) + backlog.length} mục
                </span>
              </div>
            </div>

            <TripShare
              tripId={trip.id}
              title={trip.title}
              shareId={trip.shareId}
              shared={trip.visibility === "unlisted"}
            />
          </div>
        </div>
      </header>

      {/* Đổi khung nhìn — chỉ dưới lg */}
      <div className="border-b px-4 py-2 lg:hidden">
        <div className="inline-flex rounded-full bg-muted p-1">
          {(["list", "map"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setMobileView(v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                mobileView === v
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {v === "list" ? (
                <Route className="size-4" aria-hidden />
              ) : (
                <MapIcon className="size-4" aria-hidden />
              )}
              {v === "list" ? "Lịch trình" : "Bản đồ"}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        {/* ── Cột trái: dòng thời gian ───────────────────────── */}
        <div className={cn("min-w-0 px-4 py-6 sm:px-6", mobileView === "map" && "hidden lg:block")}>
          {days.map((day) => (
            <DayBlock
              key={day.id}
              day={day}
              dayCount={days.length}
              allDays={days}
              active={day.id === activeDay?.id}
              pending={pending}
              onFocus={() => setActiveDayId(day.id)}
              run={run}
            />
          ))}

          <Button
            variant="outline"
            onClick={() => run(() => addDay(trip.id))}
            disabled={pending}
            className="mt-2 w-full rounded-xl border-dashed"
          >
            <Plus className="size-4" aria-hidden />
            Thêm ngày {days.length + 1}
          </Button>

          {/* ── Túi đồ ──────────────────────────────────────── */}
          <section className="mt-8 rounded-2xl border bg-card/50">
            <button
              type="button"
              onClick={() => setBagOpen((o) => !o)}
              aria-expanded={bagOpen}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="flex items-center gap-2 font-semibold tracking-tight">
                Túi đồ
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {backlog.length}
                </span>
              </span>
              <ChevronDown
                className={cn("size-4 text-muted-foreground transition-transform", bagOpen && "rotate-180")}
                aria-hidden
              />
            </button>

            {bagOpen && (
              <div className="border-t px-4 py-3">
                {backlog.length === 0 ? (
                  <p className="py-4 text-center text-sm leading-relaxed text-muted-foreground">
                    Chưa có gì trong túi. Bấm <strong className="font-medium text-foreground">Thêm vào lịch trình</strong>{" "}
                    ở trang địa điểm, quán ăn hay chỗ ở để gom vào đây trước, xếp ngày sau.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {backlog.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-3 rounded-xl bg-background p-2"
                      >
                        <Thumb item={item} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[item.typeLabel, item.areaLabel].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={`Xếp ${item.name} vào ngày`}
                              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                            >
                              Xếp ngày
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Xếp vào</DropdownMenuLabel>
                            {days.map((d) => (
                              <DropdownMenuItem
                                key={d.id}
                                onSelect={() =>
                                  run(
                                    () => moveItem(item.id, d.id, d.items.length),
                                    `Đã xếp vào Ngày ${d.index + 1}`,
                                  )
                                }
                              >
                                Ngày {d.index + 1}
                                {d.dateLabel && (
                                  <span className="text-muted-foreground">· {d.dateLabel}</span>
                                )}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => run(() => removeItem(item.id), "Đã bỏ khỏi túi")}
                            >
                              <Trash2 className="size-4" aria-hidden />
                              Bỏ khỏi lịch trình
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </li>
                    ))}
                  </ul>
                )}

                <CustomItemForm
                  onAdd={(title) =>
                    run(() => addItem({ kind: "custom", title }, trip.id), "Đã thêm vào túi")
                  }
                  pending={pending}
                />
              </div>
            )}
          </section>
        </div>

        {/* ── Cột phải: bản đồ ───────────────────────────────── */}
        <div
          className={cn(
            "relative min-h-[24rem] border-l lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)]",
            mobileView === "list" && "hidden lg:block",
          )}
        >
          <TripMap
            key={activeDay?.id ?? "empty"}
            dayLabel={activeDay ? `Ngày ${activeDay.index + 1}` : ""}
            points={(activeDay?.items ?? [])
              .filter((i) => i.lat != null && i.lng != null)
              .map((i, idx) => ({
                id: i.id,
                order: idx + 1,
                name: i.name,
                kind: i.kind,
                lat: i.lat as number,
                lng: i.lng as number,
              }))}
          />
        </div>
      </div>
    </div>
  );
}

// ── Một ngày ─────────────────────────────────────────────────────────────

function DayBlock({
  day,
  dayCount,
  allDays,
  active,
  pending,
  onFocus,
  run,
}: {
  day: DayView;
  dayCount: number;
  allDays: DayView[];
  active: boolean;
  pending: boolean;
  onFocus: () => void;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) => void;
}) {
  return (
    <section
      onFocusCapture={onFocus}
      onMouseDown={onFocus}
      className={cn(
        "mb-4 rounded-2xl border bg-card p-4 transition-shadow",
        active ? "shadow-lg shadow-black/5 ring-1 ring-primary/20" : "shadow-sm",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-lg font-bold tracking-tight">Ngày {day.index + 1}</h2>
          {day.dateLabel && (
            <span className="text-sm text-muted-foreground">{day.dateLabel}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <label className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs">
            <Sunrise className="size-3.5 text-muted-foreground" aria-hidden />
            <span className="text-muted-foreground">Bắt đầu</span>
            <input
              type="time"
              defaultValue={toTimeValue(day.startMin)}
              onChange={(e) => {
                const min = fromTimeValue(e.target.value);
                if (min != null) run(() => updateDay(day.id, { startMin: min }));
              }}
              aria-label={`Giờ bắt đầu ngày ${day.index + 1}`}
              className="bg-transparent font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          {dayCount > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Tuỳ chọn ngày ${day.index + 1}`}
                  className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
                >
                  <MoreHorizontal className="size-4" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() =>
                    run(() => removeDay(day.id), "Đã xoá ngày · các mục về lại Túi đồ")
                  }
                >
                  <Trash2 className="size-4" aria-hidden />
                  Xoá ngày này
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Tổng kết ngày */}
      {day.items.length > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {formatMinutes(day.startMin)} – {formatMinutes(day.endMin)}
          </span>
          {day.driveMin > 0 && (
            <span className="inline-flex items-center gap-1">
              <Navigation className="size-3.5" aria-hidden />
              {fmtDuration(day.driveMin)} di chuyển
            </span>
          )}
        </p>
      )}

      {day.warnings.map((w) => (
        <WarningLine key={w.code} warning={w} className="mt-2" />
      ))}

      {/* Danh sách mục */}
      {day.items.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          Chưa có gì trong ngày này — xếp từ Túi đồ ở cuối trang.
        </p>
      ) : (
        <ol className="mt-3 space-y-1">
          {day.items.map((item, i) => (
            <ItemRow
              key={item.id}
              item={item}
              index={i}
              last={i === day.items.length - 1}
              day={day}
              allDays={allDays}
              pending={pending}
              run={run}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

// ── Một mục trong ngày ───────────────────────────────────────────────────

function ItemRow({
  item,
  index,
  last,
  day,
  allDays,
  pending,
  run,
}: {
  item: ItemView;
  index: number;
  last: boolean;
  day: DayView;
  allDays: DayView[];
  pending: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) => void;
}) {
  return (
    <li>
      <div className="flex gap-3 rounded-xl p-2 transition-colors hover:bg-muted/50">
        {/* Mốc giờ + số thứ tự */}
        <div className="flex w-12 shrink-0 flex-col items-center pt-1">
          <span className="text-sm font-semibold tabular-nums">
            {formatMinutes(item.arriveMin)}
          </span>
          <span className="mt-1 grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {index + 1}
          </span>
        </div>

        <Thumb item={item} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium leading-snug">
                {item.href ? (
                  <Link href={item.href} className="hover:text-primary">
                    {item.name}
                    <ArrowUpRight className="ml-0.5 inline size-3.5 align-[-2px] opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                  </Link>
                ) : (
                  item.name
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {[item.typeLabel, item.categoryLabel, item.areaLabel]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                disabled={pending || index === 0}
                onClick={() => run(() => moveItem(item.id, day.id, index - 1))}
                aria-label="Lên trên"
                className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
              >
                <ChevronUp className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                disabled={pending || last}
                onClick={() => run(() => moveItem(item.id, day.id, index + 1))}
                aria-label="Xuống dưới"
                className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
              >
                <ChevronDown className="size-4" aria-hidden />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Tuỳ chọn cho ${item.name}`}
                    className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <MoreHorizontal className="size-4" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>Ở lại</DropdownMenuLabel>
                  <div className="flex flex-wrap gap-1 px-2 pb-2">
                    {STAY_PRESETS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => run(() => updateItem(item.id, { stayMin: m }))}
                        className={cn(
                          "rounded-full px-2 py-1 text-xs transition-colors",
                          item.effectiveStayMin === m
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/70",
                        )}
                      >
                        {m < 60 ? `${m}′` : fmtDuration(m)}
                      </button>
                    ))}
                    {item.stayMin != null && (
                      <button
                        type="button"
                        onClick={() => run(() => updateItem(item.id, { stayMin: null }))}
                        className="rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
                      >
                        Mặc định ({fmtDuration(DEFAULT_STAY_MIN[item.kind])})
                      </button>
                    )}
                  </div>

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Chuyển sang</DropdownMenuLabel>
                  {allDays
                    .filter((d) => d.id !== day.id)
                    .map((d) => (
                      <DropdownMenuItem
                        key={d.id}
                        onSelect={() =>
                          run(() => moveItem(item.id, d.id, d.items.length), `Đã chuyển sang Ngày ${d.index + 1}`)
                        }
                      >
                        Ngày {d.index + 1}
                      </DropdownMenuItem>
                    ))}
                  <DropdownMenuItem
                    onSelect={() => run(() => moveItem(item.id, null, 0), "Đã đưa về Túi đồ")}
                  >
                    Túi đồ
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => run(() => removeItem(item.id), "Đã bỏ khỏi lịch trình")}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Bỏ khỏi lịch trình
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Tin thực địa: giờ mở cửa & giờ vàng — lên thẳng dòng, không chôn trong menu */}
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              Ở lại {fmtDuration(item.effectiveStayMin)}
            </span>
            {item.openingHours && <span>Mở: {item.openingHours}</span>}
            {item.bestTime && (
              <span className="text-primary">Đẹp nhất: {item.bestTime}</span>
            )}
          </p>

          {item.warnings.map((w, i) => (
            <WarningLine key={`${w.code}-${i}`} warning={w} className="mt-1.5" />
          ))}
        </div>
      </div>

      {/* Chặng tới mục kế tiếp */}
      {!last && (
        <div className="flex items-center gap-2 py-1 pl-[3.75rem] text-xs text-muted-foreground">
          <span className="h-4 w-px bg-border" aria-hidden />
          {item.driveToNextMin != null ? (
            <span className="inline-flex items-center gap-1">
              <Navigation className="size-3.5" aria-hidden />
              {item.driveApprox ? "~" : ""}
              {fmtDuration(item.driveToNextMin)} di chuyển
            </span>
          ) : (
            <span className="italic">chưa ước tính được đường đi</span>
          )}
        </div>
      )}
    </li>
  );
}

// ── Mảnh nhỏ ─────────────────────────────────────────────────────────────

function Thumb({ item }: { item: ResolvedItem }) {
  if (!item.image) {
    return (
      <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-muted">
        <Route className="size-4 text-muted-foreground/50" aria-hidden />
      </div>
    );
  }
  return (
    <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
      <Image src={item.image} alt={item.name} fill sizes="48px" className="object-cover" />
    </div>
  );
}

function WarningLine({
  warning,
  className,
}: {
  warning: TripWarning;
  className?: string;
}) {
  const Icon = warning.level === "info" ? AlertCircle : TriangleAlert;
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 rounded-md px-2 py-1 text-xs leading-relaxed",
        warning.level === "high" && "bg-destructive/10 text-destructive",
        warning.level === "medium" && "bg-warm/10 text-warm",
        warning.level === "info" && "text-muted-foreground",
        className,
      )}
    >
      <Icon className="mt-px size-3.5 shrink-0" aria-hidden />
      {warning.text}
    </p>
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
      className="w-full rounded-md bg-transparent text-2xl font-bold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-3xl"
    />
  );
}

function CustomItemForm({
  onAdd,
  pending,
}: {
  onAdd: (title: string) => void;
  pending: boolean;
}) {
  const [title, setTitle] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = title.trim();
        if (!t) return;
        onAdd(t);
        setTitle("");
      }}
      className="mt-3 flex gap-2"
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Tự thêm: chuyến bay, nhà người quen…"
        aria-label="Tên mục tự thêm"
        className="h-9 rounded-lg"
      />
      <Button type="submit" variant="outline" size="sm" disabled={pending || !title.trim()}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
        Thêm
      </Button>
    </form>
  );
}

function toTimeValue(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function fromTimeValue(v: string): number | null {
  const m = v.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const min = Number(m[1]) * 60 + Number(m[2]);
  return min >= 0 && min < 1440 ? min : null;
}
