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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MICRO } from "@/components/trip/trip-rail";
import {
  balances,
  fundSummary,
  personSummary,
  settlements,
  splitShares,
  type ExpenseInput,
} from "@/lib/trip-money";
import {
  addExpense,
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
});

/** Phần của từng người trong một khoản — cùng một phép chia với số dư, nên hai chỗ không lệch nhau. */
const sharesOf = (e: TripExpenseRow) =>
  splitShares(e.amount, e.shareIds, e.fromFund ? null : (e.paidBy?.id ?? null));

export function TripMoney({
  tripId,
  fundKeeperId,
  expenses,
  people,
  viewerId,
}: {
  tripId: string;
  fundKeeperId: string;
  expenses: TripExpenseRow[];
  people: TripPerson[];
  viewerId: string;
}) {
  const [pending, start] = useTransition();
  const [view, setView] = useState<"items" | "people">("items");
  const solo = people.length < 2;

  const run: Run = (fn) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Không thực hiện được.");
    });

  const alive = expenses.filter((e) => !e.deletedAt);
  const removed = expenses.filter((e) => e.deletedAt);
  const spending = alive.filter((e) => e.kind === "expense");
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

  return (
    <div className="pt-6">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight sm:text-[1.75rem]">
            Chi phí
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {solo
              ? "Ghi lại những khoản đã chi trong chuyến."
              : "Ghi lại ai đã ứng tiền hay chi từ quỹ chung. Cuối chuyến trang này tự tính ai trả ai."}
          </p>
        </div>
        {/* Số trần, `tabular-nums` — KHÔNG biểu đồ tròn: một cái bánh chia màu chỉ vẽ lại đúng mấy
            con số này, mà lại đòi thêm một bảng chú giải. */}
        {spending.length > 0 && (
          <dl className="text-sm">
            <Stat label="Tổng đã chi" value={formatVnd(total)} big />
          </dl>
        )}
      </header>

      {/* Dưới lg: ô ghi → sổ của nhóm → danh sách (đang đi thì việc hay làm nhất là GHI). Từ lg: ô ghi
          và danh sách ở cột trái, sổ của nhóm dính ở cột phải. */}
      <div
        className={cn(
          "mt-6",
          !solo && "lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-8",
        )}
      >
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <ExpenseForm tripId={tripId} people={people} viewerId={viewerId} solo={solo} pending={pending} run={run} />
        </div>

        {!solo && (
          <aside className="mt-8 grid gap-3 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0">
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

            <section className="rounded-[6px] bg-band p-4">
              <h2 className={cn(MICRO, "text-foreground/60")}>Ai trả ai</h2>
              {alive.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Chưa có khoản nào để tính.</p>
              ) : owed.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Cả nhóm đang hoà nhau.</p>
              ) : (
                <ul className="mt-2 grid gap-2.5">
                  {owed.map((t) => (
                    <li key={t.fromId + t.toId} className="flex min-w-0 items-center gap-2 text-sm">
                      <p className="flex min-w-0 flex-1 items-center gap-1.5">
                        <Face person={personOf(t.fromId)} size="xs" />
                        <span className="min-w-0 truncate">{nameOf(t.fromId)}</span>
                        <Glyph name="forward" className="size-3.5 shrink-0 text-muted-foreground" />
                        <Face person={personOf(t.toId)} size="xs" />
                        <span className="min-w-0 truncate">{nameOf(t.toId)}</span>
                      </p>
                      <strong className="shrink-0 font-semibold tabular-nums">{formatVnd(t.amount)}</strong>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {hasFund && keeper
                  ? `Tiền quỹ đang ở ${keeper.name ?? "người giữ quỹ"}, nên phần dư hay hụt của quỹ tính vào người đó. `
                  : ""}
                Phần chia làm tròn lên nghìn, người ứng tiền chịu phần lẻ.
              </p>
            </section>
          </aside>
        )}

        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <section className="mt-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className={cn(MICRO, "text-foreground/60")}>
                {view === "items" ? "Các khoản đã chi" : "Chi phí từng người"}
              </h2>
              {!solo && spending.length > 0 && (
                <div role="tablist" aria-label="Cách xem" className="flex rounded-[4px] bg-muted p-0.5 text-xs">
                  {(
                    [
                      ["items", "Theo khoản"],
                      ["people", "Theo người"],
                    ] as const
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      role="tab"
                      aria-selected={view === v}
                      onClick={() => setView(v)}
                      className={cn(
                        "rounded-[3px] px-2.5 py-1 font-medium transition-colors",
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
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Chưa ghi khoản nào. Ghi ngay khi có người ứng tiền: tiền phòng, tiền xăng, bữa ăn ai đó trả cả
                bàn.
              </p>
            ) : view === "items" || solo ? (
              <ul className="mt-2 divide-y divide-border/60">
                {spending.map((e) => (
                  <ExpenseRow key={e.id} e={e} solo={solo} people={people} pending={pending} run={run} />
                ))}
              </ul>
            ) : (
              <ul className="mt-2 divide-y divide-border/60">
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
      </div>
    </div>
  );
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div>
      <dt className="whitespace-nowrap text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 whitespace-nowrap font-[family-name:var(--font-display)] font-bold leading-none tabular-nums",
          big ? "text-xl sm:text-2xl" : "text-base sm:text-lg",
        )}
      >
        {value}
      </dd>
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

function ExpenseRow({
  e,
  solo,
  people,
  pending,
  run,
}: {
  e: TripExpenseRow;
  solo: boolean;
  people: TripPerson[];
  pending: boolean;
  run: Run;
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
          disabled={solo}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-[4px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
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
          {!solo && (
            <Glyph
              name="chevron-down"
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
                !open && "-rotate-90",
              )}
            />
          )}
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
        <div className="ml-1 mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-l-2 border-border pl-3 text-sm">
          <span className="text-xs text-muted-foreground">
            Chi cho {everyone ? "cả nhóm" : `${e.shareIds.length} người`}
          </span>
          {sharers.map((p, i) => (
            <span key={p?.id ?? i} className="inline-flex items-center gap-1.5">
              <Face person={p} size="xs" />
              {p?.name ?? "Đã rời chuyến"}
            </span>
          ))}
          {e.shareIds.length > 1 && (
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">
              mỗi người <strong className="font-semibold text-foreground">{formatVnd(part)}</strong>
            </span>
          )}
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
}: {
  tripId: string;
  people: TripPerson[];
  viewerId: string;
  solo: boolean;
  pending: boolean;
  run: Run;
}) {
  const [title, setTitle] = useState("");
  // Số NGHÌN đồng, chỉ chữ số. Hiển thị có dấu chấm ngăn nhóm.
  const [digits, setDigits] = useState("");
  const [paidById, setPaidById] = useState(viewerId);
  const [shareIds, setShareIds] = useState<string[]>(people.map((p) => p.id));
  const [moreHints, setMoreHints] = useState(false);

  const nghin = digits ? Number(digits) : 0;
  const amount = nghin * 1_000;
  const canSubmit = title.trim().length > 0 && amount > 0 && shareIds.length > 0;
  const everyone = shareIds.length === people.length;

  function toggleShare(id: string) {
    setShareIds((cur) =>
      cur.includes(id) ? (cur.length > 1 ? cur.filter((x) => x !== id) : cur) : [...cur, id],
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const fromFund = !solo && paidById === FUND;
    setTitle("");
    setDigits("");
    run(() =>
      addExpense(tripId, {
        title,
        amount,
        paidById: solo || fromFund ? viewerId : paidById,
        shareIds: solo ? [viewerId] : shareIds,
        fromFund,
      }),
    );
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 rounded-[6px] bg-band p-4 sm:p-5">
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
                title === t ? "bg-foreground text-background" : "bg-background text-foreground/75 hover:text-foreground",
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
            <div className="flex items-baseline justify-between gap-3">
              <FieldLabel>Chia đều cho</FieldLabel>
              <button
                type="button"
                onClick={() => setShareIds(everyone ? [viewerId] : people.map((p) => p.id))}
                className="text-xs font-medium text-primary-ink hover:underline"
              >
                {everyone ? "Chỉ mình tôi" : "Cả nhóm"}
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {people.map((p) => (
                <Choice key={p.id} selected={shareIds.includes(p.id)} onClick={() => toggleShare(p.id)} multi>
                  <Face person={p} />
                  {p.id === viewerId ? "Tôi" : (p.name ?? "Không rõ")}
                </Choice>
              ))}
            </div>
          </div>
        </>
      )}

      <Button type="submit" disabled={pending || !canSubmit} className="h-12 w-full rounded-[6px] text-base">
        {amount > 0 ? (
          <>
            Ghi khoản <span className="tabular-nums">{formatVnd(amount)}</span>
            {!solo && shareIds.length > 1 && (
              <span className="font-normal opacity-80">
                {" "}
                ({shareIds.length} người)
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
