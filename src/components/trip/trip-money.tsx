"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowRight, ChevronDown, Plus, RotateCcw, Trash2, X } from "@/components/icons";
import { cn } from "@/lib/utils";
import { formatVnd, initials, timeAgo } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MICRO } from "@/components/trip/trip-rail";
import { balances, ceilTo, settlements } from "@/lib/trip-money";
import { addExpense, deleteExpense, restoreExpense } from "@/app/(site)/lich-trinh/actions";
import type { TripExpenseRow, TripPerson } from "@/lib/trip";

// Mục "Chi phí". Thiết kế & lý do: docs/lich-trinh-cong-cu-nhom.md §13.
//
// Đây là SỔ CHIA TIỀN, không phải bảng dự trù ngân sách. Việc thật của nhóm bạn
// không phải "chuyến này dự kiến hết bao nhiêu" (chẳng ai lập ngân sách cho 3
// ngày) mà là "**ai ứng bao nhiêu, cuối chuyến ai trả ai**" — thứ mà bình
// thường phải lục lại tin nhắn để cộng.
//
// ⚠️ Số tiền LUÔN do người dùng gõ. Không bao giờ suy ra từ `Eatery`,
// `Accommodation`… — xem docs/lich-trinh.md §9.3.
//
// Chuyến ĐI MỘT MÌNH tự thoái hoá thành một sổ chi tiêu: không hỏi ai trả, không
// hỏi chia cho ai, không có khối "ai trả ai". Cùng một màn hình, ít câu hỏi hơn.
export function TripMoney({
  tripId,
  expenses,
  people,
  viewerId,
}: {
  tripId: string;
  expenses: TripExpenseRow[];
  people: TripPerson[];
  viewerId: string;
}) {
  const [pending, start] = useTransition();
  const solo = people.length < 2;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Không thực hiện được.");
    });
  }

  const alive = expenses.filter((e) => !e.deletedAt);
  const removed = expenses.filter((e) => e.deletedAt);

  const total = alive.reduce((n, e) => n + e.amount, 0);
  const bal = balances(
    alive.map((e) => ({
      amount: e.amount,
      paidById: e.paidBy?.id ?? null,
      shareIds: e.shareIds,
    })),
    people.map((p) => p.id),
  );
  const owed = settlements(bal);
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? "Đã rời chuyến";
  const personOf = (id: string) => people.find((p) => p.id === id) ?? null;

  return (
    <div className="mx-auto max-w-[42rem]">
      <h1 className="sr-only">Chi phí</h1>

      {/* Số trần, `tabular-nums` — KHÔNG biểu đồ tròn: một cái bánh chia màu chỉ
          vẽ lại đúng mấy con số này, mà lại đòi thêm một bảng chú giải. */}
      <p className="text-sm text-muted-foreground">
        <strong className="text-lg font-semibold tabular-nums text-foreground">
          {formatVnd(total)}
        </strong>{" "}
        đã chi
        {alive.length > 0 && (
          <span className="ml-3 border-l border-border pl-3 tabular-nums">
            {alive.length} khoản
          </span>
        )}
        {!solo && alive.length > 0 && (
          <span className="ml-3 border-l border-border pl-3 tabular-nums">
            {formatVnd(ceilTo(total / people.length))}/người
          </span>
        )}
      </p>

      <ExpenseForm
        tripId={tripId}
        people={people}
        viewerId={viewerId}
        solo={solo}
        pending={pending}
        run={run}
      />

      {!solo && owed.length > 0 && (
        <section className="mt-9">
          <h2 className={cn(MICRO, "text-muted-foreground")}>Ai trả ai</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Ít lượt chuyển khoản nhất để mọi người hoà nhau. Phần chia làm tròn lên nghìn —
            người ứng tiền chịu phần lẻ, nên số phải chuyển luôn là số tròn.
          </p>
          <ul className="mt-3 divide-y divide-border/60 border-t border-border/60">
            {owed.map((s) => (
              <li
                key={s.fromId + s.toId}
                className="flex items-center gap-2.5 py-3 text-sm"
              >
                <Face person={personOf(s.fromId)} />
                <span className="min-w-0 truncate">{nameOf(s.fromId)}</span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <Face person={personOf(s.toId)} />
                <span className="min-w-0 truncate">{nameOf(s.toId)}</span>
                <strong className="ml-auto shrink-0 font-semibold tabular-nums">
                  {formatVnd(s.amount)}
                </strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!solo && alive.length > 0 && owed.length === 0 && (
        <p className="mt-9 text-sm text-muted-foreground">
          Cả nhóm đang hoà nhau — không ai nợ ai.
        </p>
      )}

      <section className="mt-9">
        <h2 className={cn(MICRO, "text-muted-foreground")}>Các khoản đã chi</h2>
        {alive.length === 0 ? (
          <div className="mt-3">
            <p className="text-base font-medium">Chưa ghi khoản nào</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Ghi lại khi có người ứng tiền — tiền phòng, tiền xăng, bữa ăn ai đó trả cả bàn.
              Cuối chuyến trang này tự tính ai trả ai, khỏi lục lại tin nhắn.
            </p>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border/60 border-t border-border/60">
            {alive.map((e) => (
              <li key={e.id} className="group/exp flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base">{e.title}</p>
                  {!solo && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Face person={e.paidBy} size="xs" />
                      <span className="min-w-0 truncate">
                        {e.paidBy?.name ?? "Đã rời chuyến"} trả
                      </span>
                      <span className="ml-1.5 shrink-0 tabular-nums">
                        chia {e.shareIds.length} người
                      </span>
                    </p>
                  )}
                </div>
                <strong className="shrink-0 font-semibold tabular-nums">
                  {formatVnd(e.amount)}
                </strong>
                <button
                  type="button"
                  onClick={() => run(() => deleteExpense(e.id))}
                  disabled={pending}
                  aria-label={`Xoá ${e.title}`}
                  title="Xoá"
                  className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover/exp:opacity-100 [@media(pointer:coarse)]:opacity-100"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {removed.length > 0 && (
        <DeletedLog removed={removed} pending={pending} run={run} />
      )}
    </div>
  );
}

// Sổ tiền chung mà xoá được LẶNG LẼ thì một người có thể rút hoá đơn khỏi sổ
// không ai biết. Nên xoá ở đây là xoá mềm, và mục này là phần công khai của nó:
// ai xoá cái gì lúc nào đều đọc được, và khôi phục lại được một chạm. Gấp lại
// mặc định — nó là sổ đối chiếu, không phải nội dung chính.
function DeletedLog({
  removed,
  pending,
  run,
}: {
  removed: TripExpenseRow[];
  pending: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mt-9">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg py-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
            !open && "-rotate-90",
          )}
          aria-hidden
        />
        Đã xoá
        <span className="tabular-nums text-muted-foreground/60">{removed.length}</span>
      </button>

      {open && (
        <ul className="mt-2 divide-y divide-border/60 border-t border-border/60">
          {removed.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-muted-foreground line-through decoration-muted-foreground/50">
                  {e.title}
                </p>
                {/* AI XOÁ là thông tin chính của mục này — không phải chú thích. */}
                <p suppressHydrationWarning className="mt-0.5 text-xs text-muted-foreground">
                  <strong className="font-medium text-foreground/70">
                    {e.deletedBy?.name ?? "Ai đó đã rời chuyến"}
                  </strong>{" "}
                  xoá {e.deletedAt ? timeAgo(e.deletedAt) : ""}
                </p>
              </div>
              <span className="shrink-0 tabular-nums text-sm text-muted-foreground line-through decoration-muted-foreground/50">
                {formatVnd(e.amount)}
              </span>
              <button
                type="button"
                onClick={() => run(() => restoreExpense(e.id))}
                disabled={pending}
                aria-label={`Khôi phục ${e.title}`}
                title="Khôi phục"
                className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RotateCcw className="size-4" aria-hidden />
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

// Ô tiền tính bằng NGHÌN ĐỒNG — gõ "350" là 350.000đ. Ba số 0 cuối cùng không
// mang thông tin (không ai chi lẻ dưới nghìn) mà gõ thì dễ thừa thiếu một con
// số 0; đuôi ".000đ" in chết ngay trong khung nhập nên đơn vị không thể hiểu
// nhầm. Bỏ luôn kiểu hậu tố "350k"/"2tr" của bản trước — đơn vị đã cố định thì
// bộ đoán hậu tố chỉ còn là chỗ để hiểu sai.
const DENOMS = [1, 2, 5, 10, 20, 50, 100, 200, 500]; // nghìn — đủ bộ mệnh giá tiền VN

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
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [title, setTitle] = useState("");
  const [raw, setRaw] = useState(""); // số NGHÌN, chuỗi để giữ nguyên cái người dùng gõ
  const [paidById, setPaidById] = useState(viewerId);
  const [shareIds, setShareIds] = useState<string[]>(people.map((p) => p.id));

  const digits = raw.replace(/[.,\s]/g, "");
  const nghin = raw.trim() === "" ? null : /^\d+$/.test(digits) ? Number(digits) : NaN;
  const amount = nghin === null || Number.isNaN(nghin) ? null : nghin * 1_000;
  const canSubmit = title.trim().length > 0 && amount !== null && amount > 0 && shareIds.length > 0;

  // Chip mệnh giá CỘNG DỒN: 370k = bấm 200 + 100 + 50 + 20, nhanh hơn gõ khi
  // đang cầm điện thoại. Chip cộng vào số đang có (kể cả số vừa gõ tay).
  function bump(denom: number) {
    const cur = nghin === null || Number.isNaN(nghin) ? 0 : nghin;
    setRaw(String(cur + denom));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || amount === null) return;
    setTitle("");
    setRaw("");
    run(() => addExpense(tripId, { title, amount, paidById: solo ? viewerId : paidById, shareIds }));
  }

  return (
    <form onSubmit={submit} className="mt-5 rounded-2xl border p-3 sm:p-4">
      <div className="flex flex-wrap gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tiền phòng, tiền xăng, bữa tối…"
          aria-label="Tên khoản chi"
          className="h-10 min-w-[12rem] flex-1 rounded-xl"
        />
        {/* Khung tiền tự dựng: input trần + đuôi ".000đ" chết — nhìn là biết
            đang gõ theo nghìn, không cần đọc chú thích. */}
        <label className="flex h-10 w-36 items-center rounded-xl border border-input bg-transparent pl-3 pr-2 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            inputMode="numeric"
            placeholder="350"
            aria-label="Số tiền (nghìn đồng)"
            className="w-full min-w-0 bg-transparent text-right text-base tabular-nums outline-none md:text-sm"
          />
          <span aria-hidden className="shrink-0 pl-0.5 text-sm text-muted-foreground">
            .000đ
          </span>
        </label>
        <Button type="submit" disabled={pending || !canSubmit} className="h-10 rounded-xl">
          <Plus className="size-4" aria-hidden />
          Thêm
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {DENOMS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => bump(d)}
            aria-label={`Cộng ${d} nghìn`}
            className="rounded-full border border-border px-2.5 py-1 text-xs tabular-nums text-muted-foreground transition-colors hover:border-foreground/25 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            +{d}k
          </button>
        ))}
        {raw.trim() !== "" && (
          <button
            type="button"
            onClick={() => setRaw("")}
            aria-label="Xoá số tiền"
            className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
        {/* HIỆN LẠI số đã hiểu — chip cộng dồn vài lần thì phải thấy ngay tổng. */}
        <span className="ml-auto min-h-4 text-xs tabular-nums text-muted-foreground">
          {raw.trim() === "" ? "" : amount === null ? (
            <span className="text-destructive">Không đọc được số tiền</span>
          ) : (
            `= ${formatVnd(amount)}`
          )}
        </span>
      </div>

      {!solo && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <PayerPicker people={people} value={paidById} onChange={setPaidById} />
          <SharePicker people={people} viewerId={viewerId} value={shareIds} onChange={setShareIds} />
        </div>
      )}
    </form>
  );
}

function PayerPicker({
  people,
  value,
  onChange,
}: {
  people: TripPerson[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const cur = people.find((p) => p.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Face person={cur ?? null} size="xs" />
          <span className="max-w-[8rem] truncate font-medium text-foreground">
            {cur?.name ?? "Ai đó"}
          </span>
          trả
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1.5">
        <p className="px-2 pb-1.5 pt-1 text-xs text-muted-foreground">Ai ứng tiền?</p>
        {people.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              onChange(p.id);
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
              p.id === value && "bg-muted font-medium",
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

function SharePicker({
  people,
  viewerId,
  value,
  onChange,
}: {
  people: TripPerson[];
  viewerId: string;
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const all = value.length === people.length;
  const justMe = value.length === 1 && value[0] === viewerId;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          chia cho
          <span className="font-medium text-foreground">
            {all ? "cả nhóm" : justMe ? "mình tôi" : `${value.length} người`}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1.5">
        <p className="px-2 pb-1.5 pt-1 text-xs text-muted-foreground">Chia đều cho ai?</p>
        {/* Hai đáp án chiếm gần hết trường hợp thật: cả nhóm ăn chung, hoặc mình
            mua đồ cho riêng mình. Đặt thành nút một-phát rồi ĐÓNG luôn popover —
            tick từng người chỉ dành cho ca lẻ "bữa này thiếu một đứa". */}
        <div className="flex gap-1.5 px-1 pb-2">
          <QuickPick
            label="Cả nhóm"
            active={all}
            onClick={() => {
              onChange(people.map((p) => p.id));
              setOpen(false);
            }}
          />
          <QuickPick
            label="Chỉ mình tôi"
            active={justMe}
            onClick={() => {
              onChange([viewerId]);
              setOpen(false);
            }}
          />
        </div>
        {people.map((p) => {
          const on = value.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              // Không cho bỏ hết: một khoản chia cho 0 người là vô nghĩa, và
              // server cũng từ chối — chặn ngay ở đây thì khỏi phải báo lỗi.
              onClick={() =>
                onChange(on ? (value.length > 1 ? value.filter((id) => id !== p.id) : value) : [...value, p.id])
              }
              aria-pressed={on}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                on && "font-medium",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  on ? "bg-primary" : "bg-border",
                )}
              />
              <Face person={p} />
              <span className="min-w-0 truncate">{p.name ?? "Không rõ"}</span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function QuickPick({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-lg border px-2 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary bg-primary/10 font-medium text-primary"
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
