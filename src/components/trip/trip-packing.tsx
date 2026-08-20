"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, Plus, Trash2, User, UserPlus, Users, X } from "@/components/icons";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MICRO } from "@/components/trip/trip-rail";
import {
  GROUP_ORDER,
  OTHER_GROUP,
  PACK_SUGGESTIONS,
  groupOfItem,
  packKey,
  type PackGroup,
} from "@/lib/packing-suggestions";
import {
  addPackItem,
  deletePackItem,
  setMyPackCheck,
  updatePackItem,
} from "@/app/(site)/lich-trinh/actions";
import type { TripPackRow, TripPerson } from "@/lib/trip";

// Mục "Đồ mang theo". Thiết kế & lý do: docs/lich-trinh-cong-cu-nhom.md §12.
//
// Trang này bám đúng cách người ta chuẩn bị đồ thật, gồm HAI trục:
//
//   1. HAI NHÓM ĐỒ
//      • Đồ chung — một cái cho cả nhóm (lều, loa). Có người nhận, trạng thái
//        là CHUNG: Minh xếp rồi thì cả nhóm coi như xong.
//      • Đồ riêng — ai cũng phải mang một cái (bàn chải). Không có người nhận,
//        và MỖI NGƯỜI TỰ TICK phần của mình; bạn không thấy tick của người khác.
//
//   2. BA TRẠNG THÁI TRÊN CHÍNH Ô TICK, bấm để đi tiếp:
//         ○ chưa có  →  ◍ đã có sẵn  →  ● đã xếp vào túi  →  ○ …
//      Hai bước này cách nhau vài ngày trong đời thật (soát trong nhà xem CÓ
//      chưa, rồi tối trước hôm đi soát xem đã NẰM TRONG TÚI chưa), nhưng chúng
//      là hai nấc của CÙNG MỘT món — nên chúng thuộc về cùng một ô.
//
//      Bản trước tách thành hai TAB "Đã có sẵn" / "Đã xếp vào túi". Hỏng ở chỗ:
//      mỗi lúc chỉ thấy được một nửa sự thật, muốn biết "món này có rồi nhưng
//      đã bỏ vào túi chưa" phải nhảy qua nhảy lại; và cái tab ấy là một tầng
//      điều khiển nữa cho một thông tin vốn thuộc về từng hàng.
//
//      Vì ô đi theo vòng, `packed` luôn kéo theo `ready` — nhờ vậy câu tóm tắt
//      "6/11 đã có sẵn, trong đó 2 đã xếp" luôn đúng, không phải trạng thái lạ
//      kiểu "đã xếp mà chưa có".

type PackState = "none" | "ready" | "packed";

const stateOf = (i: TripPackRow): PackState =>
  i.isPacked ? "packed" : i.isReady ? "ready" : "none";

/** Nấc kế tiếp khi bấm — vòng lại đầu để bỏ đánh dấu mà không cần nút thứ hai. */
const NEXT: Record<PackState, { isReady: boolean; isPacked: boolean }> = {
  none: { isReady: true, isPacked: false },
  ready: { isReady: true, isPacked: true },
  packed: { isReady: false, isPacked: false },
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

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Không thực hiện được.");
    });
  }

  const group = items.filter((i) => i.scope === "group");
  const personal = items.filter((i) => i.scope === "personal");
  const ready = items.filter((i) => i.isReady).length;
  const packed = items.filter((i) => i.isPacked).length;

  return (
    <div className="mx-auto max-w-[42rem]">
      <h1 className="sr-only">Đồ mang theo</h1>

      {items.length > 0 && (
        <p className="text-sm tabular-nums text-muted-foreground">
          <strong className="font-semibold text-foreground">
            {ready}/{items.length}
          </strong>{" "}
          đã có sẵn, trong đó{" "}
          <strong className="font-semibold text-foreground">{packed}</strong> đã xếp vào túi.
        </p>
      )}

      {/* Chú giải VẼ RA ba nấc bằng đúng ký hiệu của ô tick, không tả bằng lời:
          một vòng bấm ba trạng thái là thứ phải nhìn mới hiểu. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>Bấm ô để chuyển:</span>
        {(["none", "ready", "packed"] as const).map((st, i) => (
          <span key={st} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className="text-muted-foreground/50">→</span>}
            <StateMark state={st} />
            {STATE_LABEL[st]}
          </span>
        ))}
      </div>

      <Section
        label="Đồ chung của nhóm"
        note="Một cái cho cả nhóm — nhớ gán ai mang"
        icon={Users}
        scope="group"
        items={group}
        doneCount={group.filter((i) => i.isReady).length}
        {...{ tripId, people, pending, run }}
      />
      <Section
        label="Đồ riêng của bạn"
        note="Ai cũng cần một cái. Tick ở đây chỉ mình bạn thấy"
        icon={User}
        scope="personal"
        grouped
        items={personal}
        doneCount={personal.filter((i) => i.isReady).length}
        {...{ tripId, people, pending, run }}
      />
    </div>
  );
}

// Dấu ba nấc. Cùng một hình tròn, ĐẦY DẦN — nhìn ra ngay là một tiến trình chứ
// không phải ba biểu tượng rời rạc:
//   ○ viền mảnh · ◍ viền đậm + dấu tick màu · ● tô đặc + tick trắng
// Dùng chung cho ô trên từng hàng VÀ cho chú giải ở đầu trang, nên hai chỗ
// không thể trôi khác nhau.
function StateMark({ state }: { state: PackState }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-[1.125rem] shrink-0 place-items-center rounded-full border transition-colors",
        state === "none" && "border-border",
        state === "ready" && "border-primary text-primary",
        state === "packed" && "border-primary bg-primary text-primary-foreground",
      )}
    >
      {state !== "none" && <Check className="size-3" />}
    </span>
  );
}

function Section({
  label,
  note,
  icon: Icon,
  scope,
  grouped,
  items,
  doneCount,
  tripId,
  people,
  pending,
  run,
}: {
  label: string;
  note: string;
  icon: typeof Users;
  scope: "group" | "personal";
  /** Chia nhóm theo danh mục (chỉ dùng cho đồ riêng — xem chú thích dưới). */
  grouped?: boolean;
  items: TripPackRow[];
  doneCount: number;
  tripId: string;
  people: TripPerson[];
  pending: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [draft, setDraft] = useState("");
  const orphan = scope === "group" ? items.filter((i) => !i.assignee).length : 0;

  return (
    <section className="mt-9">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className={cn(MICRO, "flex items-center gap-1.5 text-muted-foreground")}>
          <Icon className="size-3.5 shrink-0" aria-hidden />
          {label}
        </h2>
        {items.length > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {doneCount}/{items.length}
          </span>
        )}
        {orphan > 0 && (
          <span className="text-xs tabular-nums text-warm">{orphan} chưa ai nhận</span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>

      {/* Đồ RIÊNG chia nhóm cho dễ rà soát: danh sách này dài nhất (giấy tờ,
          thuốc, vệ sinh, quần áo…) và người ta soát nó theo từng cụm, không đọc
          tuần tự. Đồ CHUNG để phẳng — nó vốn ngắn, chia nhóm thì thành mấy tiêu
          đề cho mỗi một món. */}
      {grouped ? (
        <div className="mt-3">
          {groupItems(items).map(([label, list]) => (
            <div key={label} className="mt-4 first:mt-0">
              <div className="flex items-baseline gap-2">
                <h3 className="text-xs font-medium text-foreground/70">{label}</h3>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {list.filter((i) => i.isReady).length}/{list.length}
                </span>
              </div>
              <ul className="mt-1 divide-y divide-border/60 border-t border-border/60">
                {list.map((item) => (
                  <PackRow key={item.id} {...{ item, people, pending, run }} />
                ))}
              </ul>
            </div>
          ))}
          <div className="mt-3 border-t border-border/60">
            <AddRow scope={scope} tripId={tripId} draft={draft} setDraft={setDraft} run={run} />
          </div>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-border/60 border-t border-border/60">
          {items.map((item) => (
            <PackRow key={item.id} {...{ item, people, pending, run }} />
          ))}
          <AddRow scope={scope} tripId={tripId} draft={draft} setDraft={setDraft} run={run} />
        </ul>
      )}
    </section>
  );
}

// Gom theo nhóm danh mục, giữ THỨ TỰ DANH MỤC (Giấy tờ → Thiết bị → …) chứ
// không phải thứ tự thêm vào: rà soát thì cần cùng một trình tự mỗi lần mở.
// Nhóm rỗng bị bỏ qua; "Khác" luôn xuống cuối.
function groupItems(items: TripPackRow[]): [string, TripPackRow[]][] {
  const bucket = new Map<string, TripPackRow[]>();
  for (const it of items) {
    const key = groupOfItem(it.name) ?? OTHER_GROUP;
    const list = bucket.get(key);
    if (list) list.push(it);
    else bucket.set(key, [it]);
  }
  return GROUP_ORDER.filter((g) => bucket.has(g)).map((g) => [g, bucket.get(g)!]);
}

// Ô thêm món — nằm TRONG từng mục nên khỏi cần công tắc "thêm vào đâu": gõ ở
// mục nào là vào mục đó.
function AddRow({
  scope,
  tripId,
  draft,
  setDraft,
  run,
}: {
  scope: "group" | "personal";
  tripId: string;
  draft: string;
  setDraft: (v: string) => void;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  return (
    <li className="list-none">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const name = draft.trim();
          if (!name) return;
          setDraft("");
          run(() => addPackItem(tripId, name, scope));
        }}
        className="flex items-center gap-3 py-1.5"
      >
        <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={scope === "group" ? "Thêm đồ chung…" : "Thêm đồ riêng…"}
          aria-label={scope === "group" ? "Thêm đồ chung" : "Thêm đồ riêng"}
          className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
      </form>
    </li>
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
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [name, setName] = useState(item.name);
  const state = stateOf(item);

  function step() {
    const patch = NEXT[state];
    run(() =>
      item.scope === "group"
        ? updatePackItem(item.id, patch)
        : setMyPackCheck(item.id, patch),
    );
  }

  return (
    <li className="group/pack flex items-center gap-3 py-2.5">
      <button
        type="button"
        onClick={step}
        disabled={pending}
        aria-label={`${item.name} — ${STATE_LABEL[state]}. Bấm để chuyển sang ${
          STATE_LABEL[state === "none" ? "ready" : state === "ready" ? "packed" : "none"]
        }`}
        title={STATE_LABEL[state]}
        className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <StateMark state={state} />
      </button>

      {/* Tên sửa được TẠI CHỖ bằng ô nhập trong suốt — cùng cách tên chuyến ở
          thanh tiêu đề, nên không cần thêm nút bút. */}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          const next = name.trim();
          if (next && next !== item.name) run(() => updatePackItem(item.id, { name: next }));
          else setName(item.name);
        }}
        aria-label="Tên món đồ"
        className={cn(
          "min-w-0 flex-1 rounded-md bg-transparent text-base outline-none focus-visible:ring-2 focus-visible:ring-ring",
          state === "packed" && "text-muted-foreground line-through decoration-muted-foreground/50",
        )}
      />

      {item.scope === "group" && (
        <AssigneePicker item={item} people={people} pending={pending} run={run} />
      )}

      <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/pack:opacity-100 [@media(pointer:coarse)]:opacity-100">
        <IconBtn
          label={item.scope === "group" ? "Chuyển thành đồ riêng" : "Chuyển thành đồ chung"}
          onClick={() =>
            run(() =>
              updatePackItem(item.id, { scope: item.scope === "group" ? "personal" : "group" }),
            )
          }
          disabled={pending}
        >
          {item.scope === "group" ? <User className="size-4" /> : <Users className="size-4" />}
        </IconBtn>
        <IconBtn
          label={`Xoá ${item.name}`}
          danger
          onClick={() => run(() => deletePackItem(item.id))}
          disabled={pending}
        >
          <Trash2 className="size-4" />
        </IconBtn>
      </span>
    </li>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        danger ? "hover:text-destructive" : "hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

// "Chưa ai nhận" là trạng thái ĐÁNG CHÚ Ý chứ không phải ô trống: đó chính là
// món sẽ bị bỏ quên. Nên nó hiện thành một nút nền cam mời bấm.
function AssigneePicker({
  item,
  people,
  pending,
  run,
}: {
  item: TripPackRow;
  people: TripPerson[];
  pending: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
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
            "flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            item.assignee
              ? "text-muted-foreground hover:bg-muted"
              : "bg-warm/10 text-warm hover:bg-warm/20",
          )}
        >
          {item.assignee ? (
            <>
              <Avatar className="size-5 shrink-0">
                {item.assignee.image && <AvatarImage src={item.assignee.image} alt="" />}
                <AvatarFallback className="text-[0.6rem]">
                  {initials(item.assignee.name)}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[7rem] truncate">{item.assignee.name ?? "Không rõ"}</span>
            </>
          ) : (
            <>
              <UserPlus className="size-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline">Chưa ai nhận</span>
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
              "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
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
            className="mt-1 flex w-full items-center gap-2.5 rounded-lg border-t px-2 py-1.5 pt-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4 shrink-0" aria-hidden />
            Bỏ gán
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── Bảng gợi ý: nội dung của CỘT PHẢI trong TripShell ─────────────────────
//
// BẤM LÀ SANG NGAY, bấm lần nữa là bỏ ra. Bản trước bắt tick một loạt rồi bấm
// "Thêm N món": ít vòng máy chủ hơn, nhưng thêm một bước cho việc mà người dùng
// nghĩ là một bước — và cái nút ấy còn kéo theo cả chuyện ghim chân cột.
//
// Đổi lại là mỗi cú bấm một vòng máy chủ. Bù bằng cập nhật LẠC QUAN: dấu tick
// đổi ngay tại chỗ, không đợi server; hỏng thì trả lại đúng viên đó và báo lỗi.
//
// Điểm đến (đồ chung / đồ riêng) do một CÔNG TẮC HIỆN RÕ ở đầu bảng quyết định,
// không phải một quy tắc ngầm theo nhóm — xem chú thích ở packing-suggestions.ts.
export function PackSuggestions({
  tripId,
  items,
}: {
  tripId: string;
  items: TripPackRow[];
}) {
  const [pending, start] = useTransition();
  const [scope, setScope] = useState<"group" | "personal">("personal");

  const byKey = useMemo(() => new Map(items.map((i) => [packKey(i.name), i])), [items]);

  // `useOptimistic` chứ không phải một `useState` tự quản: dấu tick đổi ngay khi
  // bấm, và React TỰ trả nó về sự thật của server khi transition xong. Bản tự
  // quản phải tự dọn ghi đè — mà dọn trong `useEffect` thì vướng đúng luật
  // "không setState đồng bộ trong effect" của React Compiler, còn không dọn thì
  // nó âm thầm che sự thật khi người khác trong nhóm xoá món mình vừa thêm.
  const [keys, addOptimistic] = useOptimistic(
    useMemo(() => new Set(byKey.keys()), [byKey]),
    (set: Set<string>, p: { key: string; adding: boolean }) => {
      const next = new Set(set);
      if (p.adding) next.add(p.key);
      else next.delete(p.key);
      return next;
    },
  );

  const has = (name: string) => keys.has(packKey(name));

  function click(name: string) {
    const key = packKey(name);
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
    <div className="flex h-full flex-col">
      {/* Công tắc điểm đến — dính trên đầu vùng cuộn, vì nó quyết định MỌI cú bấm
          bên dưới; trôi mất khỏi tầm mắt là lại thành quy tắc ngầm. */}
      <div className="sticky top-0 z-10 border-b bg-background px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-xs text-muted-foreground">Thêm vào</span>
          {/* Viết THẲNG hai nút, không `.map` trên một mảng tuple `as const`:
              bản map để `aria-pressed` đóng băng — sự kiện click tới nơi (đã đo
              bằng listener tự gắn) nhưng state không đổi. Hai nút thì rõ ràng
              hơn, và ở đây sẽ không bao giờ có nút thứ ba. */}
          <ScopeButton
            active={scope === "personal"}
            onClick={() => setScope("personal")}
            icon={User}
            label="Đồ riêng"
          />
          <ScopeButton
            active={scope === "group"}
            onClick={() => setScope("group")}
            icon={Users}
            label="Đồ chung"
          />
        </div>
      </div>

      <div className="min-h-0 flex-auto overflow-y-auto px-3 py-2.5">
        <p className="px-1 text-xs text-muted-foreground">
          Còn <strong className="font-semibold tabular-nums text-foreground">{total}</strong> món
          chưa có. Bấm để thêm, bấm lần nữa để bỏ.
        </p>

        <div className="mt-2">
          {PACK_SUGGESTIONS.map((g) => (
            <Group key={g.label} group={g} has={has} pending={pending} onClick={click} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ScopeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Users;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-foreground font-medium text-background" : "text-muted-foreground hover:bg-muted",
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}
    </button>
  );
}

// Một nhóm gợi ý, GẤP LẠI ĐƯỢC.
//
// Mở/đóng bằng `grid-template-rows: 0fr ↔ 1fr` chứ không phải `max-height` phỏng
// chừng: nội suy được nên chuyển động mượt, mà không cần đoán trước chiều cao —
// đoán hụt thì nội dung bị cắt, đoán thừa thì đóng/mở giật một quãng trống.
// Cùng kỹ thuật với chiều ngang của sidebar (`grid-template-columns`).
function Group({
  group,
  has,
  pending,
  onClick,
}: {
  group: PackGroup;
  has: (name: string) => boolean;
  pending: boolean;
  onClick: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const added = group.items.filter((i) => has(i)).length;

  return (
    <section className="border-b border-border/60 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg px-1 py-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
            !open && "-rotate-90",
          )}
          aria-hidden
        />
        <span className={cn(MICRO, "min-w-0 flex-1 truncate text-muted-foreground")}>
          {group.label}
        </span>
        {/* Đã thêm mấy món của nhóm — để gấp lại rồi vẫn biết mình lấy gì ở đâu. */}
        <span
          className={cn(
            "shrink-0 text-xs tabular-nums",
            added > 0 ? "font-semibold text-primary" : "text-muted-foreground/60",
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
                    "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    on && "text-muted-foreground",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-[1.125rem] shrink-0 place-items-center rounded-full border transition-colors",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {on && <Check className="size-3" />}
                  </span>
                  <span className="min-w-0 flex-1">{name}</span>
                  {/* Nói thẳng cú bấm tiếp theo sẽ làm gì — viên đã tick mà không
                      có chữ thì người ta tưởng nó bị khoá như bản trước. */}
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
