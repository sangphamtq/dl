"use client";

import { useMemo, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { UserPlus } from "@/components/icons";
import { Glyph, type GlyphName } from "@/components/site/glyphs";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GROUP_ORDER,
  OTHER_GROUP,
  PACK_SUGGESTIONS,
  isCatalogGroup,
  packGroupOf,
  packKey,
  type PackGroup,
} from "@/lib/packing-suggestions";
import {
  addPackItem,
  deletePackItem,
  renamePackGroup,
  setMyPackCheck,
  updatePackItem,
} from "@/app/(site)/lich-trinh/actions";
import type { TripPackRow, TripPerson } from "@/lib/trip";

type Run = (fn: () => Promise<{ ok: boolean; error?: string }>) => void;

type PackState = "none" | "ready" | "packed";

const stateOf = (i: { isReady: boolean; isPacked: boolean }): PackState =>
  i.isPacked ? "packed" : i.isReady ? "ready" : "none";

// Bấm ô là đi tiếp một nấc: chưa có → đã có sẵn → đã xếp vào túi → chưa có…
const NEXT: Record<PackState, PackState> = { none: "ready", ready: "packed", packed: "none" };
const FLAGS: Record<PackState, { isReady: boolean; isPacked: boolean }> = {
  none: { isReady: false, isPacked: false },
  ready: { isReady: true, isPacked: false },
  packed: { isReady: true, isPacked: true },
};

const STATE_LABEL: Record<PackState, string> = {
  none: "chưa có",
  ready: "đã có sẵn",
  packed: "đã xếp vào túi",
};

export function TripPacking({
  tripId,
  items,
  people,
}: {
  tripId: string;
  items: TripPackRow[];
  people: TripPerson[];
}) {
  const [pending, start] = useTransition();

  const run: Run = (fn) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Không thực hiện được.");
    });

  const group = items.filter((i) => i.scope === "group");
  const personal = items.filter((i) => i.scope === "personal");
  const orphan = group.filter((i) => !i.assignee).length;

  return (
    <div className="pt-6">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight sm:text-[1.75rem]">
            Đồ mang theo
          </h1>
          {/* Chú giải VẼ RA ba nấc bằng đúng `StateMark` của từng hàng — hai chỗ không thể lệch nhau. */}
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>Bấm ô để chuyển:</span>
            {(["none", "ready", "packed"] as const).map((st, i) => (
              <span key={st} className="flex items-center gap-1.5">
                {i > 0 && <Glyph name="forward" className="size-3 text-muted-foreground/50" />}
                <StateMark state={st} />
                {STATE_LABEL[st]}
              </span>
            ))}
          </p>
        </div>
      </header>

      <Section
        title="Đồ chung của nhóm"
        hint="Mỗi món một cái cho cả nhóm. Nhớ chọn người mang."
        flag={orphan > 0 ? `${orphan} món chưa ai nhận` : null}
        scope="group"
        items={group}
        {...{ tripId, people, pending, run }}
      />
      <Section
        title="Đồ riêng của bạn"
        hint="Ai cũng mang một cái. Tick ở đây chỉ mình bạn thấy."
        scope="personal"
        grouped
        items={personal}
        {...{ tripId, people, pending, run }}
      />
    </div>
  );
}

function StateMark({ state }: { state: PackState }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-[4px] border-[1.5px] transition-colors",
        state === "none" && "border-border bg-background",
        state === "ready" && "border-primary bg-background text-primary",
        state === "packed" && "border-primary bg-primary text-primary-foreground",
      )}
    >
      {state !== "none" && <Glyph name="tick" className="size-3.5" />}
    </span>
  );
}

function Section({
  title,
  hint,
  flag = null,
  scope,
  grouped,
  items,
  tripId,
  people,
  pending,
  run,
}: {
  title: string;
  hint: string;
  flag?: string | null;
  scope: "group" | "personal";
  grouped?: boolean;
  items: TripPackRow[];
  tripId: string;
  people: TripPerson[];
  pending: boolean;
  run: Run;
}) {
  const [open, setOpen] = useState(true);
  const rows = (list: TripPackRow[]) =>
    list.map((item) => <PackRow key={`${item.id}:${item.name}`} {...{ item, people, pending, run }} />);

  return (
    <section className="mt-10">
      <div className="border-b border-border pb-2">
        <h2>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="-ml-1 flex flex-wrap items-baseline gap-x-2.5 rounded-[4px] px-1 text-left text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Chevron open={open} className="size-4 self-center" />
            {title}
            {items.length > 0 && (
              <span className="text-sm font-normal tabular-nums text-muted-foreground">
                {items.filter((i) => i.isReady).length}/{items.length}
              </span>
            )}
            {flag && <span className="text-xs font-medium text-warm-ink">{flag}</span>}
          </button>
        </h2>
        {open && <p className="mt-0.5 pl-6 text-xs text-muted-foreground">{hint}</p>}
      </div>

      <Collapse open={open}>

      {grouped ? (
        groupItems(items).map(([label, list]) => (
          <GroupBlock key={label} label={label} list={list} tripId={tripId} run={run}>
            {rows(list)}
          </GroupBlock>
        ))
      ) : (
        <ul className="divide-y divide-border/60">{rows(items)}</ul>
      )}

      <div className={cn(grouped && items.length > 0 && "mt-4 border-t border-border/60 pt-1")}>
        <AddRow
          scope={scope}
          group={null}
          tripId={tripId}
          run={run}
          placeholder={scope === "group" ? "Thêm đồ chung rồi Enter…" : "Thêm đồ khác rồi Enter…"}
        />
      </div>
      </Collapse>
    </section>
  );
}

/**
 * Gập / mở bằng `grid-template-rows: 0fr ↔ 1fr` (nội suy được, khỏi đoán chiều cao). Gập thì `inert` — món bên
 * trong không còn nhận Tab. Chỉ cắt (`overflow-hidden`) lúc gập, mở rồi thì để tràn: viền focus của ô sửa tên
 * vẽ ra ngoài khung.
 */
function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
    >
      <div inert={!open} className={cn("min-h-0", open ? "overflow-visible" : "overflow-hidden")}>
        {children}
      </div>
    </div>
  );
}

function Chevron({ open, className }: { open: boolean; className?: string }) {
  return (
    <Glyph
      name="chevron-down"
      className={cn(
        "shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
        !open && "-rotate-90",
        className,
      )}
    />
  );
}

/** Thứ tự cố định để rà soát: nhóm danh mục → nhóm tự đặt (theo lần đầu xuất hiện) → "Khác" cuối. */
function groupItems(items: TripPackRow[]): [string, TripPackRow[]][] {
  const bucket = new Map<string, TripPackRow[]>();
  for (const it of items) {
    const key = packGroupOf(it);
    const list = bucket.get(key);
    if (list) list.push(it);
    else bucket.set(key, [it]);
  }
  const catalog = GROUP_ORDER.filter((g) => g !== OTHER_GROUP && bucket.has(g));
  const custom = [...bucket.keys()].filter((g) => g !== OTHER_GROUP && !GROUP_ORDER.includes(g));
  const order = [...catalog, ...custom, ...(bucket.has(OTHER_GROUP) ? [OTHER_GROUP] : [])];
  return order.map((g) => [g, bucket.get(g)!]);
}

/**
 * Một nhóm đồ riêng. Thêm món vào nhóm & đổi tên nhóm nằm trong menu ⋯ (rê vào tiêu đề mới hiện) —
 * mở sẵn ô gõ ở mọi nhóm thì danh sách rà soát thành một chồng ô nhập.
 */
function GroupBlock({
  label,
  list,
  tripId,
  run,
  children,
}: {
  label: string;
  list: TripPackRow[];
  tripId: string;
  run: Run;
  children: ReactNode;
}) {
  const [mode, setMode] = useState<"idle" | "add" | "rename">("idle");
  const [open, setOpen] = useState(true);
  const afterClose = useRef<"add" | "rename" | null>(null);
  const renamable = !isCatalogGroup(label);

  return (
    <div className="group/grp mt-5">
      <div className="flex h-7 items-center gap-2">
        {mode === "rename" ? (
          <InlineText
            value={label}
            ariaLabel={`Đổi tên nhóm ${label}`}
            className="h-7 text-xs font-semibold"
            onDone={(next) => {
              setMode("idle");
              if (next && next !== label) run(() => renamePackGroup(tripId, label, next));
            }}
          />
        ) : (
          <h3>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="-ml-1 flex items-center gap-1.5 rounded-[3px] px-1 text-xs font-semibold text-foreground/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Chevron open={open} className="size-3.5" />
              {label}
              <span className="font-normal tabular-nums text-muted-foreground">
                {list.filter((i) => i.isReady).length}/{list.length}
              </span>
            </button>
          </h3>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Tuỳ chọn nhóm ${label}`}
              className="grid size-6 place-items-center rounded-[3px] text-muted-foreground opacity-0 transition-[opacity,background-color] hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/grp:opacity-100 data-[state=open]:opacity-100 [@media(pointer:coarse)]:opacity-100"
            >
              <Glyph name="more" className="size-4" />
            </button>
          </DropdownMenuTrigger>
          {/* Mở ô gõ SAU KHI menu đóng hẳn — lúc menu còn đóng dở nó vẫn giữ focus, ô gõ mở sớm sẽ mất
              focus ngay (cùng bẫy với "Thêm ghi chú" ở trang lịch). */}
          <DropdownMenuContent
            align="start"
            className="w-48"
            onCloseAutoFocus={(e) => {
              const next = afterClose.current;
              if (!next) return;
              afterClose.current = null;
              e.preventDefault();
              setMode(next);
              // Thêm món vào một nhóm đang gập ⇒ mở nó ra, kẻo ô gõ hiện dưới một nhóm trống trơn.
              if (next === "add") setOpen(true);
            }}
          >
            <DropdownMenuItem onSelect={() => (afterClose.current = "add")}>
              <Glyph name="plus" className="size-4" />
              Thêm món vào nhóm
            </DropdownMenuItem>
            {renamable && (
              <DropdownMenuItem onSelect={() => (afterClose.current = "rename")}>
                <Glyph name="pencil" className="size-4" />
                Đổi tên nhóm
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Collapse open={open}>
        <ul className="mt-1 divide-y divide-border/60">{children}</ul>
      </Collapse>
      {mode === "add" && (
        <AddRow
          scope="personal"
          // "Khác" là nơi rơi mặc định — món thêm vào nó để null cho đúng nghĩa.
          group={label === OTHER_GROUP ? null : label}
          tripId={tripId}
          run={run}
          placeholder={`Thêm vào ${label} rồi Enter…`}
          small
          autoFocus
          onClose={() => setMode("idle")}
        />
      )}
    </div>
  );
}

/** Ô sửa chữ một lần: tự focus + bôi đen, Enter/rời ô là xong, Esc là huỷ. */
function InlineText({
  value,
  ariaLabel,
  className,
  onDone,
}: {
  value: string;
  ariaLabel: string;
  className?: string;
  onDone: (next: string | null) => void;
}) {
  const [draft, setDraft] = useState(value);
  // Esc rồi blur() chạy ngay trong cùng lượt: onBlur vẫn thấy `draft` cũ ⇒ sẽ lưu nhầm.
  const cancelled = useRef(false);
  return (
    <input
      autoFocus
      onFocus={(e) => e.currentTarget.select()}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (cancelled.current) return onDone(null);
        const next = draft.trim();
        onDone(next || null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
      aria-label={ariaLabel}
      className={cn(
        "-ml-1.5 min-w-0 flex-1 rounded-[4px] bg-background px-1.5 outline-none shadow-[0_0_0_1.5px_color-mix(in_oklab,var(--color-primary)_70%,transparent),0_0_0_4px_color-mix(in_oklab,var(--color-primary)_14%,transparent)]",
        className,
      )}
    />
  );
}

/** Ô thêm LUÔN mở: gõ, Enter, gõ tiếp — ô xoá ngay, không đợi server. */
function AddRow({
  scope,
  group,
  tripId,
  run,
  placeholder,
  small = false,
  autoFocus = false,
  onClose,
}: {
  scope: "group" | "personal";
  /** Nhóm đồ riêng nhận món mới; null ⇒ suy theo tên (không khớp thì vào "Khác"). */
  group: string | null;
  tripId: string;
  run: Run;
  placeholder: string;
  /** Ô trong từng nhóm: nhỏ và nhạt hơn ô cuối mục. */
  small?: boolean;
  autoFocus?: boolean;
  /** Ô mở từ menu: rời ô khi còn trống (hoặc Esc) thì đóng lại. */
  onClose?: () => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const name = draft.trim();
        if (!name) return;
        setDraft("");
        run(() => addPackItem(tripId, name, scope, group));
      }}
      className="flex items-center gap-3 rounded-[4px] px-1 transition-colors focus-within:bg-muted/60 hover:bg-muted/40"
    >
      <Glyph name="plus" className={cn("shrink-0 text-muted-foreground", small ? "size-3.5" : "size-4")} />
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder.replace(/…$/, "")}
        autoFocus={autoFocus}
        onBlur={() => {
          if (!draft.trim()) onClose?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setDraft("");
            onClose?.();
          }
        }}
        className={cn(
          "min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground",
          small ? "h-8 text-[0.8125rem] placeholder:text-muted-foreground/70" : "h-10 text-sm",
        )}
      />
    </form>
  );
}

function PackRow({
  item,
  people,
  pending,
  run,
}: {
  item: TripPackRow;
  people: TripPerson[];
  pending: boolean;
  run: Run;
}) {
  const [renaming, setRenaming] = useState(false);
  // Ô đổi NGAY dưới tay; React tự trả về sự thật của server khi lượt lưu xong.
  const [state, setState] = useOptimistic<PackState, PackState>(stateOf(item), (_, next) => next);
  const [, start] = useTransition();

  function step() {
    const next = NEXT[state];
    start(async () => {
      setState(next);
      const patch = FLAGS[next];
      const res =
        item.scope === "group" ? await updatePackItem(item.id, patch) : await setMyPackCheck(item.id, patch);
      if (!res.ok) toast.error(res.error ?? "Không thực hiện được.");
    });
  }

  return (
    <li className="group/pack flex min-h-11 items-center gap-3">
      <button
        type="button"
        onClick={step}
        aria-label={`${item.name}: ${STATE_LABEL[state]}. Bấm để chuyển sang ${STATE_LABEL[NEXT[state]]}`}
        title={STATE_LABEL[state]}
        // Vùng bấm 36px dù ô vẽ ra chỉ 20px — dễ trúng trên điện thoại.
        className="-ml-2 grid size-9 shrink-0 place-items-center rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <StateMark state={state} />
      </button>

      {renaming ? (
        <InlineText
          value={item.name}
          ariaLabel={`Sửa tên ${item.name}`}
          className="h-8 text-[0.9375rem]"
          onDone={(next) => {
            setRenaming(false);
            if (next && next !== item.name) run(() => updatePackItem(item.id, { name: next }));
          }}
        />
      ) : (
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[0.9375rem]",
            state === "packed" && "text-muted-foreground line-through decoration-muted-foreground/50",
          )}
        >
          {item.name}
        </span>
      )}

      {item.scope === "group" && <AssigneePicker item={item} people={people} pending={pending} run={run} />}
      <RowMenu item={item} pending={pending} run={run} onRename={() => setRenaming(true)} />
    </li>
  );
}

function RowMenu({
  item,
  pending,
  run,
  onRename,
}: {
  item: TripPackRow;
  pending: boolean;
  run: Run;
  onRename: () => void;
}) {
  const renameAfterClose = useRef(false);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={pending}
          aria-label={`Tuỳ chọn cho ${item.name}`}
          className="grid size-7 shrink-0 place-items-center rounded-[3px] text-muted-foreground opacity-0 transition-[opacity,background-color] hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/pack:opacity-100 data-[state=open]:opacity-100 [@media(pointer:coarse)]:opacity-100"
        >
          <Glyph name="more" className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52"
        onCloseAutoFocus={(e) => {
          if (!renameAfterClose.current) return;
          renameAfterClose.current = false;
          e.preventDefault();
          onRename();
        }}
      >
        <DropdownMenuItem onSelect={() => (renameAfterClose.current = true)}>
          <Glyph name="pencil" className="size-4" />
          Sửa tên
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            run(() => updatePackItem(item.id, { scope: item.scope === "group" ? "personal" : "group" }))
          }
        >
          <Glyph name={item.scope === "group" ? "person" : "people"} className="size-4" />
          {item.scope === "group" ? "Chuyển sang đồ riêng" : "Chuyển sang đồ chung"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => run(() => deletePackItem(item.id))}>
          <Glyph name="trash" className="size-4" />
          Xoá món này
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// "Chưa ai nhận" là trạng thái ĐÁNG CHÚ Ý chứ không phải ô trống: đó chính là món sẽ bị bỏ quên.
function AssigneePicker({
  item,
  people,
  pending,
  run,
}: {
  item: TripPackRow;
  people: TripPerson[];
  pending: boolean;
  run: Run;
}) {
  const [open, setOpen] = useState(false);

  function pick(assigneeId: string | null) {
    setOpen(false);
    run(() => updatePackItem(item.id, { assigneeId }));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={pending}
          aria-label={item.assignee ? `Đổi người mang ${item.name}` : `Chọn người mang ${item.name}`}
          className={cn(
            "flex h-7 shrink-0 items-center gap-1.5 rounded-[4px] px-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            item.assignee
              ? "text-muted-foreground hover:bg-muted hover:text-foreground"
              : "border border-dashed border-warm/60 text-warm-ink hover:bg-warm/10",
          )}
        >
          {item.assignee ? (
            <>
              <Avatar className="size-5 shrink-0">
                {item.assignee.image && <AvatarImage src={item.assignee.image} alt="" />}
                <AvatarFallback className="text-[0.6rem]">{initials(item.assignee.name)}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[7rem] truncate sm:inline">{item.assignee.name ?? "Không rõ"}</span>
            </>
          ) : (
            <>
              <UserPlus className="size-3.5 shrink-0" aria-hidden />
              <span className="hidden sm:inline">Ai mang?</span>
            </>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-56 p-1.5">
        <p className="px-2 pb-1.5 pt-1 text-xs text-muted-foreground">Ai mang món này?</p>
        {people.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => pick(p.id)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-[4px] px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
              item.assignee?.id === p.id && "bg-muted font-medium",
            )}
          >
            <Avatar className="size-6 shrink-0">
              {p.image && <AvatarImage src={p.image} alt="" />}
              <AvatarFallback className="text-[0.65rem]">{initials(p.name)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 truncate">{p.name ?? "Không rõ"}</span>
          </button>
        ))}
        {item.assignee && (
          <button
            type="button"
            onClick={() => pick(null)}
            className="mt-1 flex w-full items-center gap-2.5 rounded-[4px] px-2 py-1.5 pt-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Glyph name="close" className="size-4 shrink-0" />
            Bỏ gán
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function PackSuggestions({
  tripId,
  items,
}: {
  tripId: string;
  items: TripPackRow[];
}) {
  const [pending, start] = useTransition();
  const [scope, setScope] = useState<"group" | "personal">("personal");
  // MỘT nhóm mở một lúc: mở nhiều nhóm thì cột dài ~45 hàng và mất chỗ đang đứng.
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  // Khoá theo CẢ phạm vi: "Sạc dự phòng" ở đồ riêng không có nghĩa là đồ chung đã có nó.
  const keyOf = (sc: "group" | "personal", name: string) => `${sc}:${packKey(name)}`;
  const byKey = useMemo(
    () => new Map(items.map((i) => [`${i.scope}:${packKey(i.name)}`, i])),
    [items],
  );

  const [keys, addOptimistic] = useOptimistic(
    useMemo(() => new Set(byKey.keys()), [byKey]),
    (set: Set<string>, p: { key: string; adding: boolean }) => {
      const next = new Set(set);
      if (p.adding) next.add(p.key);
      else next.delete(p.key);
      return next;
    },
  );

  const has = (name: string) => keys.has(keyOf(scope, name));

  function click(name: string) {
    const key = keyOf(scope, name);
    const adding = !has(name);
    const existing = byKey.get(key);
    start(async () => {
      addOptimistic({ key, adding });
      const res = adding
        ? await addPackItem(tripId, name, scope)
        : existing
          ? await deletePackItem(existing.id)
          : { ok: true as const };
      if (!res.ok) toast.error(res.error ?? "Không thực hiện được.");
    });
  }

  const total = PACK_SUGGESTIONS.reduce(
    (n, g) => n + g.items.filter((i) => !has(i)).length,
    0,
  );

  return (
    <div className="flex min-h-0 flex-auto flex-col">
      <div className="sticky top-0 z-10 bg-background/95 px-3 py-2.5 backdrop-blur">
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-xs font-medium text-foreground/70">Thêm vào</span>
          <ScopeButton
            active={scope === "personal"}
            onClick={() => setScope("personal")}
            glyph="person"
            label="Đồ riêng"
          />
          <ScopeButton
            active={scope === "group"}
            onClick={() => setScope("group")}
            glyph="people"
            label="Đồ chung"
          />
        </div>
      </div>

      <div data-pack-scroll className="min-h-0 flex-auto overflow-y-auto px-3 py-2.5">
        <p className="px-1 text-xs leading-relaxed text-foreground/70">
          Còn <strong className="font-semibold tabular-nums text-foreground">{total}</strong> món chưa có
          trong {scope === "personal" ? "đồ riêng" : "đồ chung"}. Bấm để thêm, bấm lần nữa để bỏ.
        </p>

        <div className="mt-2">
          {PACK_SUGGESTIONS.map((g) => (
            <Group
              key={g.label}
              group={g}
              has={has}
              pending={pending}
              onClick={click}
              open={openGroup === g.label}
              onToggle={() => setOpenGroup((cur) => (cur === g.label ? null : g.label))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ScopeButton({
  active,
  onClick,
  glyph,
  label,
}: {
  active: boolean;
  onClick: () => void;
  glyph: GlyphName;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-foreground font-medium text-background" : "text-foreground/75 hover:bg-muted hover:text-foreground",
      )}
    >
      <Glyph name={glyph} className="size-3.5 shrink-0" />
      {label}
    </button>
  );
}

function Group({
  group,
  has,
  pending,
  onClick,
  open,
  onToggle,
}: {
  group: PackGroup;
  has: (name: string) => boolean;
  pending: boolean;
  onClick: (name: string) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const added = group.items.filter((i) => has(i)).length;

  return (
    <section ref={ref}>
      <button
        type="button"
        onClick={() => {
          onToggle();
          // Đợi nhóm vừa mở / nhóm cũ gập xong (300ms) rồi mới kéo tiêu đề lên đầu vùng cuộn —
          // kéo sớm thì vị trí còn đang trôi theo nhóm đang gập.
          // Chỉ cuộn VÙNG CUỘN của cột — `scrollIntoView` cuộn cả trang theo.
          if (!open)
            setTimeout(() => {
              const el = ref.current;
              const box = el?.closest<HTMLElement>("[data-pack-scroll]");
              if (!el || !box) return;
              const top = box.scrollTop + el.getBoundingClientRect().top - box.getBoundingClientRect().top;
              box.scrollTo({ top: top - 4, behavior: "smooth" });
            }, 320);
        }}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-[4px] px-1 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Glyph name="chevron-down"
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
            !open && "-rotate-90",
          )}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{group.label}</span>
        <span
          className={cn(
            "shrink-0 text-xs tabular-nums",
            added > 0 ? "font-semibold text-primary-ink" : "text-muted-foreground",
          )}
        >
          {added > 0 ? `${added}/${group.items.length}` : group.items.length}
        </span>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <ul className="overflow-hidden">
          {group.items.map((name) => {
            const on = has(name);
            return (
              <li key={name}>
                <button
                  type="button"
                  disabled={pending}
                  aria-pressed={on}
                  tabIndex={open ? 0 : -1}
                  onClick={() => onClick(name)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-[4px] px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    on ? "text-foreground/60" : "text-foreground",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-[1.125rem] shrink-0 place-items-center rounded-[3px] border transition-colors",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {on && <Glyph name="tick" className="size-3" />}
                  </span>
                  <span className="min-w-0 flex-1">{name}</span>
                  {on && <span className="shrink-0 text-xs">bỏ ra</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
