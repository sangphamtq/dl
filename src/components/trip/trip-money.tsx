"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { RotateCcw } from "@/components/icons";
import { Glyph } from "@/components/site/glyphs";
import { cn } from "@/lib/utils";
import { formatVnd, initials, timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MICRO } from "@/components/trip/trip-rail";
import {
  balances,
  fundSummary,
  personSummary,
  vnDayMinute,
  partsOf,
  settlements,
  type ExpenseInput,
} from "@/lib/trip-money";
import {
  addExpense,
  updateExpense,
  addFundContributions,
  deleteExpense,
  restoreExpense,
  setFundKeeper,
} from "@/app/(site)/lich-trinh/actions";
import type { TripExpenseRow, TripPerson } from "@/lib/trip";

type Run = (fn: () => Promise<{ ok: boolean; error?: string }>) => void;

/** Giá trị "người trả" khi khoản chi trả bằng quỹ. */
const FUND = "__fund__";

const toInput = (e: TripExpenseRow): ExpenseInput => ({
  amount: e.amount,
  paidById: e.paidBy?.id ?? null,
  shareIds: e.shareIds,
  kind: e.kind,
  fromFund: e.fromFund,
  shareAmounts: e.shareAmounts,
});

/** Phần của từng người trong một khoản — cùng một phép chia với số dư, nên hai chỗ không lệch nhau. */
const sharesOf = (e: TripExpenseRow) => partsOf(toInput(e));

export function TripMoney({
  tripId,
  fundKeeperId,
  startDate = null,
  dayCount = 0,
  expenses,
  people,
  viewerId,
}: {
  tripId: string;
  fundKeeperId: string;
  /** Ngày khởi hành "YYYY-MM-DD" — có thì khoản chi xếp theo "Ngày 1, Ngày 2…" và ô ghi có nút chọn ngày. */
  startDate?: string | null;
  dayCount?: number;
  expenses: TripExpenseRow[];
  people: TripPerson[];
  viewerId: string;
}) {
  const [pending, start] = useTransition();
  const [view, setView] = useState<"items" | "table" | "people" | "settle">("items");
  const [formOpen, setFormOpen] = useState(false);
  // Khoản đang sửa — cùng hộp thoại với ghi mới, điền sẵn.
  const [editing, setEditing] = useState<TripExpenseRow | null>(null);
  const solo = people.length < 2;

  const run: Run = (fn) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Không thực hiện được.");
    });

  const alive = expenses.filter((e) => !e.deletedAt);
  const removed = expenses.filter((e) => e.deletedAt);
  // Theo LÚC CHI (không theo lúc ghi): ngày cũ trước, trong ngày theo giờ; không nhớ giờ thì cuối ngày.
  const spending = alive
    .filter((e) => e.kind === "expense")
    .sort((a, b) => a.spentOn.localeCompare(b.spentOn) || (a.spentMin ?? 1440) - (b.spentMin ?? 1440));
  const days = tripDays(startDate, dayCount);
  const contributions = alive.filter((e) => e.kind === "contribution");

  const inputs = alive.map(toInput);
  const total = spending.reduce((n, e) => n + e.amount, 0);
  const bal = balances(inputs, people.map((p) => p.id), fundKeeperId);
  const owed = settlements(bal);
  const fund = fundSummary(inputs);
  const hasFund = contributions.length > 0 || spending.some((e) => e.fromFund);
  const personOf = (id: string) => people.find((p) => p.id === id) ?? null;
  const nameOf = (id: string) => personOf(id)?.name ?? "Đã rời chuyến";
  const keeper = personOf(fundKeeperId);

  const VIEWS = [
    ["items", "Các khoản"],
    ["table", "Bảng chia"],
    ["people", "Từng người"],
    ["settle", "Ai trả ai"],
  ] as const;

  const openForm = (
    <Button onClick={() => setFormOpen(true)} className="h-11 w-full rounded-[6px] text-[0.9375rem]">
      <Glyph name="plus" className="size-4" />
      Ghi khoản chi
    </Button>
  );

  return (
    <div className="pt-6">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight sm:text-[1.75rem]">
          Chi phí
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {solo
            ? "Ghi lại những khoản đã chi trong chuyến."
            : "Ghi lại ai đã ứng tiền hay chi từ quỹ chung. Cuối chuyến trang này tự tính ai trả ai."}
        </p>
      </header>

      <Dialog
        open={formOpen || editing != null}
        onOpenChange={(o) => {
          if (o) return;
          setFormOpen(false);
          setEditing(null);
        }}
      >
        <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-[6px] p-0 sm:max-w-[34rem]">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle className="font-[family-name:var(--font-display)] text-xl">
              {editing ? "Sửa khoản chi" : "Ghi khoản chi"}
            </DialogTitle>
          </DialogHeader>
          <ExpenseForm
            key={editing?.id ?? "new"}
            initial={editing}
            tripId={tripId}
            people={people}
            viewerId={viewerId}
            solo={solo}
            pending={pending}
            run={run}
            days={days}
            onDone={() => {
              setFormOpen(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* HÀNG TÓM TẮT: tiêu bao nhiêu · quỹ còn bao nhiêu. Sổ chi tiết (kể cả "ai trả ai") trải hết bề ngang
          bên dưới — bảng chia cần chỗ cho nhiều cột. */}
      <div className={cn("mt-6 grid items-stretch gap-3", !solo && "sm:grid-cols-2")}>
        <section className="flex flex-col rounded-[6px] bg-band p-4">
          <h2 className={cn(MICRO, "text-foreground/60")}>Tổng đã chi</h2>
          {/* Số trần, `tabular-nums` — KHÔNG biểu đồ tròn: một cái bánh chia màu chỉ vẽ lại đúng mấy con số
              này, mà lại đòi thêm một bảng chú giải. */}
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-[1.75rem] font-bold leading-none tabular-nums">
            {formatVnd(total)}
          </p>
          <div className="mt-auto pt-4">{openForm}</div>
        </section>

        {!solo && (
          <FundCard
            tripId={tripId}
            people={people}
            keeper={keeper}
            fund={fund}
            hasFund={hasFund}
            contributions={contributions}
            pending={pending}
            run={run}
          />
        )}

      </div>

      <section className="mt-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Sổ chi tiêu</h2>
          {/* Một chỗ, ba cách xem cùng một sổ. */}
          {!solo && spending.length > 0 && (
            <div role="tablist" aria-label="Cách xem" className="flex max-w-full overflow-x-auto rounded-[6px] bg-muted p-1">
              {VIEWS.map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-[4px] px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3.5",
                    view === v
                      ? "bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08)]"
                      : "text-foreground/60 hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {spending.length === 0 ? (
          <div className="mt-3 rounded-[6px] bg-band px-5 py-8 text-center">
            <p className="text-sm font-medium">Chưa ghi khoản nào</p>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Ghi ngay khi có người ứng tiền: tiền phòng, tiền xăng, bữa ăn ai đó trả cả bàn.
            </p>
          </div>
        ) : view === "items" || solo ? (
          <div className="mt-3">
            {groupByDay(spending, days).map((g) => (
              <section key={g.key} className="mt-5 first:mt-0">
                <h3 className="flex items-baseline gap-2.5 border-b border-border pb-1.5">
                  <span className="text-sm font-semibold">{g.title}</span>
                  {g.sub && <span className="text-xs text-muted-foreground">{g.sub}</span>}
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                    {formatVnd(g.list.reduce((n, e) => n + e.amount, 0))}
                  </span>
                </h3>
                <ul className="divide-y divide-border/60">
                  {g.list.map((e) => (
                    <ExpenseRow
                      key={e.id}
                      e={e}
                      solo={solo}
                      people={people}
                      pending={pending}
                      run={run}
                      showTime={g.showTime}
                      onEdit={() => setEditing(e)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : view === "table" ? (
          <ShareTable spending={spending} people={people} />
        ) : view === "settle" ? (
          <div className="mt-3 border-t border-border/60">
            {owed.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">Cả nhóm đang hoà nhau, không ai nợ ai.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {owed.map((t) => (
                  <li key={t.fromId + t.toId} className="flex min-w-0 items-center gap-3 py-3.5">
                    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.9375rem]">
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <Face person={personOf(t.fromId)} />
                        <span className="truncate font-medium">{nameOf(t.fromId)}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        chuyển cho
                        <Glyph name="forward" className="size-3.5" />
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <Face person={personOf(t.toId)} />
                        <span className="truncate font-medium">{nameOf(t.toId)}</span>
                      </span>
                    </span>
                    <strong className="shrink-0 font-[family-name:var(--font-display)] text-lg font-bold tabular-nums">
                      {formatVnd(t.amount)}
                    </strong>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Ít lượt chuyển khoản nhất để cả nhóm hoà nhau.{" "}
              {hasFund && keeper
                ? `Tiền quỹ đang ở ${keeper.name ?? "người giữ quỹ"}, nên phần dư hay hụt của quỹ tính vào người đó. `
                : ""}
              Phần chia làm tròn lên nghìn, người ứng tiền chịu phần lẻ.
            </p>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border/60 border-t border-border/60">
            {people.map((p) => (
              <PersonRow
                key={p.id}
                person={p}
                isKeeper={hasFund && p.id === fundKeeperId}
                summary={personSummary(inputs, p.id)}
                balance={bal.get(p.id) ?? 0}
                items={spending.filter((e) => e.shareIds.includes(p.id))}
              />
            ))}
          </ul>
        )}
      </section>

      {removed.length > 0 && <DeletedLog removed={removed} pending={pending} run={run} />}
    </div>
  );
}

/** Chữ "được nhận / cần trả" — tiền không mang màu (§3 CLAUDE.md), và chữ đọc ngay còn dấu ± phải dịch. */
function BalanceText({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-muted-foreground">hoà</span>;
  return (
    <span className="text-right text-xs leading-tight text-muted-foreground">
      {value > 0 ? "được nhận" : "cần trả"}
      <strong className="block text-sm font-semibold tabular-nums text-foreground">{formatVnd(Math.abs(value))}</strong>
    </span>
  );
}

function FundCard({
  tripId,
  people,
  keeper,
  fund,
  hasFund,
  contributions,
  pending,
  run,
}: {
  tripId: string;
  people: TripPerson[];
  keeper: TripPerson | null;
  fund: { contributed: number; spent: number; left: number };
  hasFund: boolean;
  contributions: TripExpenseRow[];
  pending: boolean;
  run: Run;
}) {
  // Gộp theo người: "Huy góp 500k" chứ không phải ba dòng 200k + 200k + 100k.
  const byPerson = new Map<string, { person: TripExpenseRow["paidBy"]; total: number; rows: TripExpenseRow[] }>();
  for (const c of contributions) {
    const id = c.paidBy?.id ?? "?";
    const cur = byPerson.get(id) ?? { person: c.paidBy, total: 0, rows: [] };
    cur.total += c.amount;
    cur.rows.push(c);
    byPerson.set(id, cur);
  }

  return (
    <section className="rounded-[6px] bg-band p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className={cn(MICRO, "text-foreground/60")}>Quỹ chung</h2>
          {hasFund && (
            <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-bold leading-none tabular-nums">
              {formatVnd(Math.max(0, fund.left))}
            </p>
          )}
        </div>
        <ContributeButton tripId={tripId} people={people} pending={pending} run={run} first={!hasFund} />
      </div>

      {!hasFund ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Góp trước một khoản cho cả nhóm tiêu chung (tiền ăn, tiền xăng…). Khi ghi khoản chi, chọn người trả là{" "}
          <strong className="font-medium text-foreground/80">Quỹ chung</strong>.
        </p>
      ) : (
        <>
          <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">
            {fund.left < 0 ? (
              <span className="font-medium text-warm-ink">Quỹ đang hụt {formatVnd(-fund.left)}. </span>
            ) : (
              "còn lại. "
            )}
            Đã góp {formatVnd(fund.contributed)}, đã chi {formatVnd(fund.spent)}.
          </p>

          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Người giữ quỹ</span>
            <KeeperPicker tripId={tripId} people={people} keeper={keeper} run={run} />
          </div>

          {byPerson.size > 0 && (
            <ul className="mt-3 grid gap-1.5 border-t border-border/70 pt-3">
              {[...byPerson.values()].map(({ person, total, rows }) => (
                <li key={person?.id ?? "?"} className="group/ct flex min-w-0 items-center gap-2 text-sm">
                  <Face person={person} size="xs" />
                  <span className="min-w-0 flex-1 truncate">{person?.name ?? "Đã rời chuyến"}</span>
                  <span className="shrink-0 tabular-nums">{formatVnd(total)}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Các lần góp của ${person?.name ?? "người này"}`}
                        className="grid size-6 shrink-0 place-items-center rounded-[3px] text-muted-foreground opacity-0 transition-[opacity,background-color] hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/ct:opacity-100 data-[state=open]:opacity-100 [@media(pointer:coarse)]:opacity-100"
                      >
                        <Glyph name="more" className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {rows.map((r) => (
                        <DropdownMenuItem key={r.id} variant="destructive" onSelect={() => run(() => deleteExpense(r.id))}>
                          <Glyph name="trash" className="size-4" />
                          Xoá lần góp {formatVnd(r.amount)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function KeeperPicker({
  tripId,
  people,
  keeper,
  run,
}: {
  tripId: string;
  people: TripPerson[];
  keeper: TripPerson | null;
  run: Run;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-[4px] px-1.5 py-0.5 font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Face person={keeper} size="xs" />
          {keeper?.name ?? "Chưa chọn"}
          <Glyph name="chevron-down" className="size-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1.5">
        <p className="px-2 pb-1.5 pt-1 text-xs text-muted-foreground">Tiền quỹ đang nằm ở ai?</p>
        {people.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setOpen(false);
              if (p.id !== keeper?.id) run(() => setFundKeeper(tripId, p.id));
            }}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-[4px] px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
              p.id === keeper?.id && "bg-muted font-medium",
            )}
          >
            <Face person={p} />
            <span className="min-w-0 truncate">{p.name ?? "Không rõ"}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/** Góp quỹ: mặc định "mỗi người góp như nhau" (cách nhóm bạn lập quỹ thật), hoặc một người góp. */
function ContributeButton({
  tripId,
  people,
  pending,
  run,
  first,
}: {
  tripId: string;
  people: TripPerson[];
  pending: boolean;
  run: Run;
  first: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"each" | "one">("each");
  const [who, setWho] = useState(people[0]?.id ?? "");
  const [raw, setRaw] = useState("");
  const nghin = /^\d+$/.test(raw.replace(/[.,\s]/g, "")) ? Number(raw.replace(/[.,\s]/g, "")) : null;
  const amount = nghin ? nghin * 1_000 : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    const entries = mode === "each" ? people.map((p) => ({ userId: p.id, amount })) : [{ userId: who, amount }];
    setOpen(false);
    setRaw("");
    run(() => addFundContributions(tripId, entries));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={pending}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] border border-border bg-background px-2.5 text-xs font-medium transition-colors hover:border-primary/40"
        >
          <Glyph name="plus" className="size-3.5" />
          {first ? "Lập quỹ" : "Góp quỹ"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <form onSubmit={submit} className="grid gap-3">
          <div role="tablist" className="flex rounded-[4px] bg-muted p-0.5 text-xs">
            {(
              [
                ["each", "Mỗi người góp"],
                ["one", "Một người góp"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={mode === v}
                onClick={() => setMode(v)}
                className={cn(
                  "flex-1 rounded-[3px] py-1 font-medium transition-colors",
                  mode === v ? "bg-background shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-foreground/60",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "one" && (
            <div className="grid gap-1">
              {people.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setWho(p.id)}
                  aria-pressed={who === p.id}
                  className={cn(
                    "flex items-center gap-2 rounded-[4px] px-2 py-1 text-left text-sm transition-colors hover:bg-muted",
                    who === p.id && "bg-muted font-medium",
                  )}
                >
                  <Face person={p} size="xs" />
                  <span className="min-w-0 truncate">{p.name ?? "Không rõ"}</span>
                </button>
              ))}
            </div>
          )}

          <label className="flex h-10 items-center rounded-[4px] border border-input bg-background pl-3 pr-2 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
            <input
              autoFocus
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              inputMode="numeric"
              placeholder="500"
              aria-label="Số tiền góp (nghìn đồng)"
              className="w-full min-w-0 bg-transparent text-right text-sm tabular-nums outline-none"
            />
            <span aria-hidden className="shrink-0 pl-0.5 text-sm text-muted-foreground">
              .000đ
            </span>
          </label>
          {mode === "each" && amount && (
            <p className="-mt-1 text-xs tabular-nums text-muted-foreground">
              {people.length} người × {formatVnd(amount)} = {formatVnd(amount * people.length)}
            </p>
          )}
          <Button type="submit" disabled={!amount || pending} className="h-9 rounded-[4px]">
            Ghi vào quỹ
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

type TripDayRef = { index: number; iso: string; label: string };
const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** Các ngày của chuyến theo lịch ("YYYY-MM-DD", tính theo ngày lịch UTC — không để múi giờ máy làm lệch). */
function tripDays(start: string | null, count: number): TripDayRef[] {
  if (!start || count <= 0) return [];
  const base = Date.parse(`${start}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base + i * 86_400_000);
    const iso = d.toISOString().slice(0, 10);
    return { index: i, iso, label: `${WEEKDAY[d.getUTCDay()]} ${iso.slice(8, 10)}/${iso.slice(5, 7)}` };
  });
}

function shortDate(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${WEEKDAY[d.getUTCDay()]} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/**
 * Nhóm của một khoản: TRONG chuyến thì theo từng ngày (lúc đó mới cần soát "hôm qua tiêu gì"); TRƯỚC / SAU
 * chuyến gom MỘT nhóm, không chia ngày, không hiện giờ — đặt vé, đặt phòng, chia lại sau chuyến hiếm ai quan
 * tâm ngày giờ. Chuyến chưa có ngày đi thì chia theo ngày lịch.
 */
type DayGroup = { key: string; title: string; sub: string | null; showTime: boolean; list: TripExpenseRow[] };

function groupByDay(list: TripExpenseRow[], days: TripDayRef[]): DayGroup[] {
  const out = new Map<string, DayGroup>();
  for (const e of list) {
    const hit = days.find((d) => d.iso === e.spentOn);
    const g: Omit<DayGroup, "list"> = hit
      ? { key: e.spentOn, title: `Ngày ${hit.index + 1}`, sub: hit.label, showTime: true }
      : days.length > 0 && e.spentOn < days[0].iso
        ? { key: "before", title: "Trước chuyến", sub: null, showTime: false }
        : days.length > 0
          ? { key: "after", title: "Sau chuyến", sub: null, showTime: false }
          : { key: e.spentOn, title: shortDate(e.spentOn), sub: null, showTime: true };
    const cur = out.get(g.key);
    if (cur) cur.list.push(e);
    else out.set(g.key, { ...g, list: [e] });
  }
  // `list` đã xếp theo lúc chi ⇒ thứ tự nhóm tự đúng: trước chuyến → ngày 1…n → sau chuyến.
  return [...out.values()];
}

/** Một thời điểm → "15:37 25/10" theo giờ Việt Nam. */
function stamp(d: Date): string {
  const { day, min } = vnDayMinute(d);
  return `${hhmm(min)} ${day.slice(8, 10)}/${day.slice(5, 7)}`;
}

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

function ExpenseRow({
  e,
  solo,
  people,
  pending,
  run,
  showTime = true,
  onEdit,
}: {
  e: TripExpenseRow;
  solo: boolean;
  people: TripPerson[];
  pending: boolean;
  run: Run;
  /** Ngoài lịch chuyến thì không hiện giờ (không ai soát giờ của khoản đặt vé / chia lại sau chuyến). */
  showTime?: boolean;
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const part = Math.max(0, ...sharesOf(e).values());
  const everyone = e.shareIds.length === people.length;
  const sharers = e.shareIds.map((id) => people.find((p) => p.id === id) ?? null);

  return (
    <li className="group/exp py-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-[4px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* Cột giờ chi (theo giờ VN) — trống khi không nhớ giờ, để tên các khoản vẫn dóng một mép. */}
          <span className="w-10 shrink-0 self-start pt-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {showTime && e.spentMin != null ? hhmm(e.spentMin) : ""}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9375rem] font-medium">{e.title}</p>
            {!solo && (
              <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                {e.fromFund ? (
                  <span className="inline-flex items-center gap-1 font-medium text-foreground/75">
                    <Glyph name="wallet" className="size-3.5" />
                    Quỹ chung trả
                  </span>
                ) : (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <Face person={e.paidBy} size="xs" />
                    <strong className="truncate font-medium text-foreground/75">{e.paidBy?.name ?? "Đã rời chuyến"}</strong>
                    trả
                  </span>
                )}
                {/* Chỉ xấp avatar — tên & phần mỗi người để dành cho lúc mở. */}
                <span className="inline-flex items-center gap-1.5" aria-label={`chi cho ${e.shareIds.length} người`}>
                  cho
                  <FaceStack people={sharers} />
                </span>
              </p>
            )}
          </div>
          <p className="shrink-0 font-semibold tabular-nums">{formatVnd(e.amount)}</p>
          <Glyph
            name="chevron-down"
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
              !open && "-rotate-90",
            )}
          />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={pending}
              aria-label={`Tuỳ chọn cho ${e.title}`}
              className="grid size-7 shrink-0 place-items-center rounded-[3px] text-muted-foreground opacity-0 transition-[opacity,background-color] hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/exp:opacity-100 data-[state=open]:opacity-100 [@media(pointer:coarse)]:opacity-100"
            >
              <Glyph name="more" className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onSelect={onEdit}>
              <Glyph name="pencil" className="size-4" />
              Sửa khoản chi
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => run(() => deleteExpense(e.id))}>
              <Glyph name="trash" className="size-4" />
              Xoá khỏi sổ
            </DropdownMenuItem>
            <p className="px-2 pb-1.5 pt-1 text-xs leading-snug text-muted-foreground">
              Vẫn nằm ở mục Đã xoá, kèm tên người xoá — khôi phục được.
            </p>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hàng gập chỉ nói AI TRẢ; chia cho ai và mỗi người bao nhiêu để dành cho lúc mở — không lặp lại. */}
      {open && (
        <div className="ml-[3.25rem] mt-2.5 grid gap-2 border-l-2 border-border pl-3">
        {!solo && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
          <span className="text-xs text-muted-foreground">
            Chi cho {everyone ? "cả nhóm" : `${e.shareIds.length} người`}
          </span>
          {sharers.map((p, i) => (
            <span key={p?.id ?? i} className="inline-flex items-center gap-1.5">
              <Face person={p} size="xs" />
              {p?.name ?? "Đã rời chuyến"}
              {/* Chia không đều: số của từng người nằm ngay cạnh tên — không có "mỗi người" chung. */}
              {e.shareAmounts && (
                <strong className="font-semibold tabular-nums">{formatVnd(e.shareAmounts[p?.id ?? ""] ?? 0)}</strong>
              )}
            </span>
          ))}
          {e.shareIds.length > 1 && !e.shareAmounts && (
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">
              mỗi người <strong className="font-semibold text-foreground">{formatVnd(part)}</strong>
            </span>
          )}
          {e.shareAmounts && <span className="ml-auto text-xs text-muted-foreground">chia không đều</span>}
        </div>
        )}
        {/* Lúc GHI ≠ lúc CHI, và sổ chung sửa được ⇒ ai ghi / ai sửa phải nhìn thấy được. */}
        <p suppressHydrationWarning className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          <span>
            Ghi lúc {stamp(e.recordedAt)}
            {e.recordedBy?.name && (
              <>
                {" "}bởi <strong className="font-medium text-foreground/75">{e.recordedBy.name}</strong>
              </>
            )}
          </span>
          {e.editedAt && (
            <span>
              Sửa lúc {stamp(e.editedAt)}
              {e.editedBy?.name && (
                <>
                  {" "}bởi <strong className="font-medium text-foreground/75">{e.editedBy.name}</strong>
                </>
              )}
            </span>
          )}
        </p>
        </div>
      )}
    </li>
  );
}

function PersonRow({
  person,
  isKeeper,
  summary,
  balance,
  items,
}: {
  person: TripPerson;
  isKeeper: boolean;
  summary: { spent: number; paid: number; contributed: number };
  balance: number;
  items: TripExpenseRow[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className="py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full min-w-0 items-center gap-3 rounded-[4px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Face person={person} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-medium">
            {person.name ?? "Không rõ"}
            {isKeeper && <span className="ml-2 text-xs font-normal text-muted-foreground">giữ quỹ</span>}
          </p>
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs tabular-nums text-muted-foreground">
            <span>
              tiêu <strong className="font-semibold text-foreground">{formatVnd(summary.spent)}</strong>
            </span>
            {summary.paid > 0 && <span>trả hộ {formatVnd(summary.paid)}</span>}
            {summary.contributed > 0 && <span>góp quỹ {formatVnd(summary.contributed)}</span>}
          </p>
        </div>
        <BalanceText value={balance} />
        <Glyph
          name="chevron-down"
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", !open && "-rotate-90")}
        />
      </button>

      {open && (
        <ul className="ml-3 mt-2.5 grid gap-1.5 border-l-2 border-border pl-3">
          {items.length === 0 ? (
            <li className="text-sm text-muted-foreground">Chưa có khoản nào chia cho người này.</li>
          ) : (
            items.map((e) => (
              <li key={e.id} className="flex min-w-0 items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{e.title}</span>
                <span className="shrink-0 tabular-nums text-foreground/80">
                  {formatVnd(sharesOf(e).get(person.id) ?? 0)}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </li>
  );
}

/**
 * Bảng chia tiền: mỗi khoản một hàng, mỗi người một cột, ô = phần người đó chịu (cùng phép chia với số
 * dư). Hàng cuối cộng phần từng người. Nhiều người thì bảng cuộn ngang, cột tên khoản đứng yên.
 */
function ShareTable({ spending, people }: { spending: TripExpenseRow[]; people: TripPerson[] }) {
  const rows = spending.map((e) => ({ e, parts: sharesOf(e) }));
  const totalOf = (id: string) => rows.reduce((n, r) => n + (r.parts.get(id) ?? 0), 0);
  const grand = spending.reduce((n, e) => n + e.amount, 0);
  const stick = "sticky left-0 z-10 bg-background";

  return (
    <section className="mt-3">
      <div className="overflow-x-auto rounded-[6px]">
        <table className="w-full border-collapse text-sm tabular-nums">
          <thead>
            <tr className="border-b border-border/70 bg-band text-xs text-foreground/65">
              <th scope="col" className={cn(stick, "bg-band px-3 py-2 text-left font-medium")}>
                Khoản chi
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-2 text-right font-medium">
                Tổng
              </th>
              {people.map((p) => (
                <th key={p.id} scope="col" className="whitespace-nowrap px-3 py-2 text-right font-medium">
                  {/* Tên ĐỦ: lấy một chữ thì "Huy Phạm" và "Sang Pham" đều ra "Phạm" — tên trong tài khoản
                      không theo một thứ tự họ/tên cố định. */}
                  <span className="inline-flex max-w-[8rem] items-center gap-1.5" title={p.name ?? undefined}>
                    <Face person={p} size="xs" />
                    <span className="truncate">{p.name ?? "Không rõ"}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ e, parts }) => (
              <tr key={e.id} className="border-b border-border/50 last:border-b-0">
                <th scope="row" className={cn(stick, "max-w-[11rem] px-3 py-2 text-left font-normal")}>
                  <span className="block truncate font-medium">{e.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {e.fromFund ? "Quỹ chung trả" : `${e.paidBy?.name ?? "Đã rời chuyến"} trả`}
                  </span>
                </th>
                <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">{formatVnd(e.amount)}</td>
                {people.map((p) => {
                  const v = parts.get(p.id);
                  return (
                    <td key={p.id} className="whitespace-nowrap px-3 py-2 text-right">
                      {v ? formatVnd(v) : <span className="text-muted-foreground/50">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-band font-semibold">
              <th scope="row" className={cn(stick, "bg-band px-3 py-2 text-left text-xs font-semibold text-foreground/70")}>
                Mỗi người chịu
              </th>
              <td className="whitespace-nowrap px-3 py-2 text-right">{formatVnd(grand)}</td>
              {people.map((p) => (
                <td key={p.id} className="whitespace-nowrap px-3 py-2 text-right">
                  {formatVnd(totalOf(p.id))}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function FaceStack({ people }: { people: (TripPerson | null)[] }) {
  const shown = people.slice(0, 5);
  return (
    <span className="flex -space-x-1">
      {shown.map((p, i) => (
        <span key={p?.id ?? i} className="rounded-full ring-2 ring-background">
          <Face person={p} size="xs" />
        </span>
      ))}
      {people.length > shown.length && (
        <span className="grid size-4 place-items-center rounded-full bg-muted text-[0.55rem] font-semibold ring-2 ring-background">
          +{people.length - shown.length}
        </span>
      )}
    </span>
  );
}

function DeletedLog({ removed, pending, run }: { removed: TripExpenseRow[]; pending: boolean; run: Run }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mt-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-[4px] py-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Glyph
          name="chevron-down"
          className={cn("size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none", !open && "-rotate-90")}
        />
        Đã xoá
        <span className="tabular-nums">{removed.length}</span>
      </button>

      {open && (
        <ul className="mt-2 divide-y divide-border/60">
          {removed.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-muted-foreground line-through decoration-muted-foreground/50">
                  {e.kind === "contribution" ? `Góp quỹ: ${e.paidBy?.name ?? "Đã rời chuyến"}` : e.title}
                </p>
                <p suppressHydrationWarning className="mt-0.5 text-xs text-muted-foreground">
                  <strong className="font-medium text-foreground/70">{e.deletedBy?.name ?? "Ai đó đã rời chuyến"}</strong>{" "}
                  xoá {e.deletedAt ? timeAgo(e.deletedAt) : ""}
                </p>
              </div>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground line-through decoration-muted-foreground/50">
                {formatVnd(e.amount)}
              </span>
              <button
                type="button"
                onClick={() => run(() => restoreExpense(e.id))}
                disabled={pending}
                className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[4px] px-2 text-xs font-medium text-foreground/75 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RotateCcw className="size-3.5" aria-hidden />
                Khôi phục
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Face({ person, size }: { person: TripPerson | TripExpenseRow["paidBy"]; size?: "xs" }) {
  return (
    <Avatar className={cn("shrink-0", size === "xs" ? "size-4" : "size-6")}>
      {person?.image && <AvatarImage src={person.image} alt="" />}
      <AvatarFallback className={size === "xs" ? "text-[0.5rem]" : "text-[0.65rem]"}>
        {initials(person?.name ?? null)}
      </AvatarFallback>
    </Avatar>
  );
}

// Đủ chín mệnh giá tiền VN — cộng dồn như đếm tờ tiền (370k = 200 + 100 + 50 + 20).
const DENOMS = [1, 2, 5, 10, 20, 50, 100, 200, 500];
// Tên khoản hay gặp — một chạm thay vì gõ trên điện thoại. Chỉ là chữ gợi ý, KHÔNG phải danh mục
// (không lưu trường loại nào). Xếp theo tần suất: TITLE_FIRST món đầu hiện sẵn, còn lại bấm mới mở.
const TITLE_HINTS = [
  "Ăn trưa",
  "Ăn tối",
  "Cà phê",
  "Xăng xe",
  "Tiền phòng",
  "Vé tham quan",
  "Grab / taxi",
  "Gửi xe",
  "Ăn sáng",
  "Ăn vặt",
  "Nước uống",
  "Đồ nhậu",
  "Thuê xe máy",
  "Vé xe khách",
  "Vé máy bay",
  "Phí cầu đường",
  "Thuê thuyền / tour",
  "Đi chợ / siêu thị",
  "Quà",
  "Thuốc",
];
const TITLE_FIRST = 8;

const FIELD_FOCUS =
  "focus-within:border-primary/60 focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-primary)_14%,transparent)]";

/**
 * Ô ghi một khoản chi. Thứ tự theo lúc đang cầm điện thoại thanh toán: SỐ TIỀN (to, ô đầu tiên) →
 * tên khoản → ai trả → chia cho ai. Ai trả / chia cho là NÚT HIỆN SẴN chứ không giấu trong popover:
 * nhóm 3–6 người thì một hàng nút vừa đủ, và mỗi lựa chọn chỉ một chạm.
 */
function ExpenseForm({
  tripId,
  people,
  viewerId,
  solo,
  pending,
  run,
  days = [],
  onDone,
  initial = null,
}: {
  tripId: string;
  people: TripPerson[];
  viewerId: string;
  solo: boolean;
  pending: boolean;
  run: Run;
  /** Các ngày của chuyến — để ghi lại khoản chi của một ngày đã qua. */
  days?: TripDayRef[];
  /** Gọi ngay khi gửi (hộp thoại đóng lại, không đợi server). */
  onDone?: () => void;
  /** Có ⇒ SỬA khoản này (điền sẵn mọi ô, gửi `updateExpense`). */
  initial?: TripExpenseRow | null;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  // LÚC CHI. Hôm nay nằm trong chuyến (hoặc chuyến chưa có ngày) ⇒ mặc định "vừa xong" — ghi ngay tại chỗ.
  // Ngoài chuyến (thường là về rồi mới ghi) ⇒ KHÔNG chọn sẵn, bắt chọn ngày: "vừa xong" lúc đó là ngày sai.
  const today = vnDayMinute(new Date()).day;
  const inTrip = days.length === 0 || days.some((d) => d.iso === today);
  const [when, setWhen] = useState<string | null>(initial ? initial.spentOn : inTrip ? "now" : null);
  const [time, setTime] = useState(initial?.spentMin != null ? hhmm(initial.spentMin) : "");
  const timeMin = parseHhmm(time);
  // Số NGHÌN đồng, chỉ chữ số. Hiển thị có dấu chấm ngăn nhóm.
  const [digits, setDigits] = useState(initial ? String(Math.round(initial.amount / 1_000)) : "");
  const [paidById, setPaidById] = useState(
    initial ? (initial.fromFund ? FUND : (initial.paidBy?.id ?? viewerId)) : viewerId,
  );
  const [shareIds, setShareIds] = useState<string[]>(initial?.shareIds ?? people.map((p) => p.id));
  const [moreHints, setMoreHints] = useState(false);
  // Chia không đều: số NGHÌN đồng mỗi người tự nhập (chuỗi chữ số; trống = không chịu phần nào).
  const [mode, setMode] = useState<"even" | "custom">(initial?.shareAmounts ? "custom" : "even");
  const [custom, setCustom] = useState<Record<string, string>>(
    initial?.shareAmounts
      ? Object.fromEntries(Object.entries(initial.shareAmounts).map(([id, v]) => [id, String(Math.round(v / 1_000))]))
      : {},
  );

  const nghin = digits ? Number(digits) : 0;
  const amount = nghin * 1_000;
  const customOf = (id: string) => Number(custom[id] || 0);
  const customSum = people.reduce((n, p) => n + customOf(p.id), 0) * 1_000;
  const customIds = people.filter((p) => customOf(p.id) > 0).map((p) => p.id);
  const uneven = !solo && mode === "custom";
  const canSubmit =
    title.trim().length > 0 &&
    amount > 0 &&
    when !== null &&
    (time === "" || timeMin != null) &&
    (uneven ? customIds.length > 0 && customSum === amount : shareIds.length > 0);
  const everyone = shareIds.length === people.length;
  const left = amount - customSum;

  /** Chia đều phần CÒN LẠI cho những người chưa nhập (theo nghìn, người đầu hứng phần dư). */
  function fillRest() {
    const empty = people.filter((p) => !custom[p.id]).map((p) => p.id);
    const restK = Math.round(left / 1_000);
    if (empty.length === 0 || restK <= 0) return;
    const base = Math.floor(restK / empty.length);
    const extra = restK - base * empty.length;
    setCustom((cur) => {
      const next = { ...cur };
      empty.forEach((id, i) => {
        const v = base + (i < extra ? 1 : 0);
        if (v > 0) next[id] = String(v);
      });
      return next;
    });
  }

  function toggleShare(id: string) {
    setShareIds((cur) =>
      cur.includes(id) ? (cur.length > 1 ? cur.filter((x) => x !== id) : cur) : [...cur, id],
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const fromFund = !solo && paidById === FUND;
    const shareAmounts = uneven
      ? Object.fromEntries(customIds.map((id) => [id, customOf(id) * 1_000]))
      : null;
    setTitle("");
    setDigits("");
    setCustom({});
    onDone?.();
    const payload = {
        title,
        amount,
        paidById: solo || fromFund ? viewerId : paidById,
        shareIds: solo ? [viewerId] : uneven ? customIds : shareIds,
        fromFund,
        shareAmounts,
        // "Vừa xong" ⇒ để server lấy giờ của chính nó (cùng một đồng hồ cho cả nhóm).
        spentOn: when === "now" ? null : when,
        spentMin: when === "now" ? null : timeMin,
    };
    run(() => (initial ? updateExpense(initial.id, payload) : addExpense(tripId, payload)));
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 px-5 pb-5">
      <div>
        <FieldLabel>Số tiền</FieldLabel>
        {/* Chín tờ tiền nằm MỘT hàng ngay dưới ô. */}
        <div className="mt-1.5 flex flex-col gap-2">
        <label
          className={cn(
            "flex h-16 w-full items-center gap-1 rounded-[6px] border border-border bg-background px-4 transition-[border-color,box-shadow]",
            FIELD_FOCUS,
          )}
        >
          {digits && (
            <button
              type="button"
              onClick={() => setDigits("")}
              aria-label="Xoá số tiền"
              className="-ml-1.5 grid size-7 shrink-0 place-items-center rounded-[4px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Glyph name="close" className="size-4" />
            </button>
          )}
          <input
            value={digits ? Number(digits).toLocaleString("vi-VN") : ""}
            onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 7))}
            inputMode="numeric"
            placeholder="0"
            aria-label="Số tiền (nghìn đồng)"
            className="min-w-0 flex-1 bg-transparent text-right font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums outline-none placeholder:text-muted-foreground/40"
          />
          <span aria-hidden className="shrink-0 font-[family-name:var(--font-display)] text-xl font-semibold text-muted-foreground">
            .000đ
          </span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {DENOMS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDigits(String(nghin + d))}
              aria-label={`Cộng ${d} nghìn`}
              className="h-[1.875rem] min-w-[3rem] rounded-[4px] border border-border bg-background px-2 text-[0.8125rem] font-medium tabular-nums transition-colors hover:border-primary/50 active:bg-muted"
            >
              +{d}k
            </button>
          ))}
        </div>
        </div>
      </div>

      <div>
        <FieldLabel>Chi cho việc gì</FieldLabel>
        <label
          className={cn(
            "mt-1.5 flex h-11 items-center rounded-[6px] border border-border bg-background px-3.5 transition-[border-color,box-shadow]",
            FIELD_FOCUS,
          )}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiền phòng, bữa tối, đổ xăng…"
            aria-label="Tên khoản chi"
            className="min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-muted-foreground"
          />
        </label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(moreHints ? TITLE_HINTS : TITLE_HINTS.slice(0, TITLE_FIRST)).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTitle(t)}
              className={cn(
                "h-8 rounded-[4px] px-2.5 text-[0.8125rem] transition-colors",
                title === t ? "bg-foreground text-background" : "bg-muted text-foreground/75 hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMoreHints((v) => !v)}
            className="h-8 rounded-[4px] px-2 text-[0.8125rem] font-medium text-primary-ink hover:underline"
          >
            {moreHints ? "Thu gọn" : `+${TITLE_HINTS.length - TITLE_FIRST} gợi ý khác`}
          </button>
        </div>
      </div>

      <div>
        <FieldLabel>Khi nào</FieldLabel>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Choice selected={when === "now"} onClick={() => setWhen("now")}>
            <span className="pl-1.5">Vừa xong</span>
          </Choice>
          {days.map((d) => (
            <Choice key={d.iso} selected={when === d.iso} onClick={() => setWhen(d.iso)}>
              <span className="pl-1.5">
                Ngày {d.index + 1} <span className="font-normal text-muted-foreground">{d.label}</span>
              </span>
            </Choice>
          ))}
          {/* Đang sửa một khoản có ngày NGOÀI lịch chuyến: giữ ngày đó thành một nút, kẻo không nút nào sáng. */}
          {when && when !== "now" && !days.some((d) => d.iso === when) && (
            <Choice selected onClick={() => setWhen(when)}>
              <span className="pl-1.5">{shortDate(when)}</span>
            </Choice>
          )}
        </div>
        {when === null && (
          <p className="mt-2 text-xs font-medium text-warm-ink">
            Hôm nay không nằm trong lịch chuyến — chọn ngày đã chi, hoặc “Vừa xong” nếu là khoản của hôm nay.
          </p>
        )}
        {when !== null && when !== "now" && (
          <div className="mt-2 flex items-center gap-2.5">
            <span className="text-xs text-muted-foreground">Lúc</span>
            <label
              className={cn(
                "flex h-10 w-24 items-center rounded-[6px] border border-border bg-background px-3 transition-[border-color,box-shadow]",
                FIELD_FOCUS,
                time !== "" && timeMin == null && "border-warm",
              )}
            >
              <input
                value={time}
                onChange={(e) => setTime(formatHhmmInput(e.target.value))}
                inputMode="numeric"
                placeholder="19:30"
                aria-label="Giờ chi (24 giờ, tuỳ chọn)"
                className="w-full min-w-0 bg-transparent text-center text-[0.9375rem] font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-muted-foreground/50"
              />
            </label>
            <span className="text-xs text-muted-foreground">Không nhớ giờ thì để trống.</span>
          </div>
        )}
      </div>

      {!solo && (
        <>
          <div>
            <FieldLabel>Ai trả</FieldLabel>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Choice selected={paidById === FUND} onClick={() => setPaidById(FUND)}>
                <span className="grid size-6 place-items-center rounded-[4px] bg-muted">
                  <Glyph name="wallet" className="size-3.5" />
                </span>
                Quỹ chung
              </Choice>
              {people.map((p) => (
                <Choice key={p.id} selected={paidById === p.id} onClick={() => setPaidById(p.id)}>
                  <Face person={p} />
                  {p.id === viewerId ? "Tôi" : (p.name ?? "Không rõ")}
                </Choice>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <FieldLabel>Chia cho</FieldLabel>
              <div role="tablist" aria-label="Cách chia" className="flex rounded-[4px] bg-muted p-0.5 text-xs">
                {(
                  [
                    ["even", "Chia đều"],
                    ["custom", "Theo số tiền"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    role="tab"
                    aria-selected={mode === v}
                    onClick={() => setMode(v)}
                    className={cn(
                      "rounded-[3px] px-2.5 py-1 font-medium transition-colors",
                      mode === v
                        ? "bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08)]"
                        : "text-foreground/60 hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {mode === "even" ? (
              <>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {people.map((p) => (
                    <Choice key={p.id} selected={shareIds.includes(p.id)} onClick={() => toggleShare(p.id)} multi>
                      <Face person={p} />
                      {p.id === viewerId ? "Tôi" : (p.name ?? "Không rõ")}
                    </Choice>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShareIds(everyone ? [viewerId] : people.map((p) => p.id))}
                  className="mt-2 text-xs font-medium text-primary-ink hover:underline"
                >
                  {everyone ? "Chỉ mình tôi" : "Cả nhóm"}
                </button>
              </>
            ) : (
              <>
                <ul className="mt-2 grid gap-1.5">
                  {people.map((p) => (
                    <li key={p.id} className="flex items-center gap-2.5">
                      <Face person={p} />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {p.id === viewerId ? "Tôi" : (p.name ?? "Không rõ")}
                      </span>
                      <label
                        className={cn(
                          "flex h-10 w-36 shrink-0 items-center rounded-[6px] border border-border bg-background pl-3 pr-2.5 transition-[border-color,box-shadow]",
                          FIELD_FOCUS,
                        )}
                      >
                        <input
                          value={custom[p.id] ? Number(custom[p.id]).toLocaleString("vi-VN") : ""}
                          onChange={(e) =>
                            setCustom((cur) => ({
                              ...cur,
                              [p.id]: e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 7),
                            }))
                          }
                          inputMode="numeric"
                          placeholder="0"
                          aria-label={`Phần của ${p.name ?? "người này"} (nghìn đồng)`}
                          className="w-full min-w-0 bg-transparent text-right text-[0.9375rem] font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-muted-foreground/50"
                        />
                        <span aria-hidden className="shrink-0 text-sm text-muted-foreground">
                          .000đ
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
                  <span className={cn(left === 0 && amount > 0 ? "text-muted-foreground" : "font-medium text-warm-ink")}>
                    {amount === 0
                      ? "Nhập số tiền của khoản trước."
                      : left === 0
                        ? `Đã chia đủ ${formatVnd(amount)}.`
                        : left > 0
                          ? `Đã chia ${formatVnd(customSum)}, còn thiếu ${formatVnd(left)}.`
                          : `Chia dư ${formatVnd(-left)} so với ${formatVnd(amount)}.`}
                  </span>
                  {left > 0 && people.some((p) => !custom[p.id]) && (
                    <button
                      type="button"
                      onClick={fillRest}
                      className="font-medium text-primary-ink hover:underline"
                    >
                      Chia đều phần còn lại
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}

      <Button type="submit" disabled={pending || !canSubmit} className="h-12 w-full rounded-[6px] text-base">
        {amount > 0 ? (
          <>
            Ghi khoản <span className="tabular-nums">{formatVnd(amount)}</span>
            {!solo && (uneven ? customIds : shareIds).length > 1 && (
              <span className="font-normal opacity-80">
                {" "}
                ({(uneven ? customIds : shareIds).length} người{uneven ? ", không đều" : ""})
              </span>
            )}
          </>
        ) : (
          "Ghi khoản chi"
        )}
      </Button>
    </form>
  );
}

/** "19:30" → 1170; sai định dạng / ngoài 00:00–23:59 → null. */
function parseHhmm(v: string): number | null {
  const m = v.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  return h < 24 && mi < 60 ? h * 60 + mi : null;
}

/** Gõ "1930" ra "19:30": tự chèn dấu hai chấm — trên điện thoại bàn phím số không có dấu ":". */
function formatHhmmInput(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, d.length - 2)}:${d.slice(-2)}`;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-semibold text-foreground/70">{children}</span>;
}

/** Một lựa chọn bấm được: viền, chọn rồi thì viền + nền xanh nhạt + dấu tick (chọn nhiều). */
function Choice({
  selected,
  onClick,
  multi = false,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  multi?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-[6px] border pl-1.5 pr-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary/[0.08] font-medium text-foreground"
          : "border-border bg-background text-foreground/75 hover:border-foreground/25 hover:text-foreground",
      )}
    >
      {children}
      {multi && selected && <Glyph name="tick" className="-mr-0.5 size-3.5 text-primary-ink" />}
    </button>
  );
}
