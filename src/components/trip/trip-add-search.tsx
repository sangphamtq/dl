"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2 } from "@/components/icons";
import { Glyph, type GlyphName } from "@/components/site/glyphs";
import { R_BADGE } from "@/lib/radius";
import { cn } from "@/lib/utils";
import { fmtDuration, TASK_STAY_MIN } from "@/lib/trip-time";
import type { DropAt } from "@/lib/trip-drop";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  addCustomStop,
  addItem,
  searchTripCandidates,
  type TripCandidate,
} from "@/app/(site)/lich-trinh/actions";

const GROUPS: { kind: TripCandidate["kind"]; label: string; glyph: GlyphName }[] = [
  { kind: "spot", label: "Địa điểm", glyph: "mountain" },
  { kind: "eatery", label: "Quán ăn", glyph: "bowl" },
  { kind: "activity", label: "Trải nghiệm", glyph: "compass" },
  { kind: "accommodation", label: "Chỗ ở", glyph: "bed" },
];

// Việc hay gặp nhất khi tự lên lịch — bấm là thêm, kèm thời lượng hợp lý thay vì
// mặc định chung. Sửa được ngay trên dòng thời gian sau đó.
const TASKS: { title: string; stayMin: number }[] = [
  { title: "Đặt xe", stayMin: 15 },
  { title: "Chờ người", stayMin: 30 },
  { title: "Nghỉ trưa", stayMin: 60 },
  { title: "Thời gian tự do", stayMin: 120 },
];

const KINDS_BY_MODE: Record<"place" | "doing" | "any", TripCandidate["kind"][]> = {
  place: ["spot", "eatery", "accommodation"],
  doing: ["activity"],
  any: ["spot", "eatery", "activity", "accommodation"],
};

const fold = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/gi, "d").toLowerCase();

const tasksMatching = (term: string) =>
  term ? TASKS.filter((t) => fold(t.title).includes(fold(term))) : [];

/** Vị trí chèn: `at` cho một NƠI mới (mục gốc của ngày), `parent` cho một VIỆC (thuộc nơi đó). */
export type AddPos = {
  /** Mặc định "end". */
  at?: DropAt;
  /** "giữa A và B", "trước A"… hiện dưới tiêu đề. */
  where?: string;
  parent?: { id: string; name: string; at?: DropAt };
  /**
   * Nút ở đâu thì chỉ thêm thứ hợp chỗ đó: "place" (dấu + giữa hai hàng, ⋯ trước/sau một hàng) chỉ
   * thêm NƠI thành hàng mới; "doing" (nút "+ Việc" của một hàng) chỉ thêm VIỆC vào đúng nơi đó;
   * "any" (ô tìm ở cột Chưa xếp ngày, ngăn nổi) thêm gì cũng được.
   */
  mode?: "place" | "doing" | "any";
};

export type AddTarget = { dayId: string | null; label: string } & AddPos;

export function TripAddSearch({
  tripId,
  placeName,
  target,
  onClose,
  onAdded,
}: {
  tripId: string;
  placeName: string | null;
  /** null = đóng. */
  target: AddTarget | null;
  onClose: () => void;
  /** Cho nơi giữ dữ liệu ở client (ngăn lịch trình nổi): `revalidatePath` không chạm tới nó. */
  onAdded?: () => void;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<TripCandidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Set<string>>(() => new Set());
  const [adding, setAdding] = useState<string | null>(null);
  // cmdk chỉ tự chọn dòng đầu lúc dựng; kết quả về SAU khi gõ thì không dòng nào
  // được chọn và Enter không làm gì — nên tự giữ dòng đang chọn.
  const [selected, setSelected] = useState("");
  // Form "tự gõ đủ": null = đang ở chế độ tìm.
  const [form, setForm] = useState<{ where: string; what: string; stay: number | null } | null>(null);
  const openForm = (what: string) => setForm({ where: "", what, stay: null });
  const [, start] = useTransition();
  const seq = useRef(0);
  const open = target !== null;
  const term = q.trim();
  const mode = target?.mode ?? "any";
  const allows = (kind: TripCandidate["kind"]) => KINDS_BY_MODE[mode].includes(kind);
  const allowsDoing = mode !== "place";
  const allowsPlace = mode !== "doing";

  // Vị trí chèn TRÔI theo từng lần thêm: thêm A rồi B vào cùng một chỗ thì B phải
  // đứng SAU A, không chen lên trước nó.
  const [pos, setPos] = useState<AddPos>({ at: "end" });
  const [posFor, setPosFor] = useState<AddTarget | null>(null);
  if (target !== posFor) {
    setPosFor(target);
    setPos({ at: target?.at ?? "end", where: target?.where, parent: target?.parent });
  }

  const after = (at: DropAt | undefined, id: string): DropAt =>
    typeof at === "object" ? { afterId: id, beforeId: at.beforeId } : (at ?? "end");

  /**
   * - "place": vừa thêm một NƠI (hàng mới) ⇒ nơi kế tiếp đứng sau nó, VIỆC kế tiếp vào CHÍNH nó.
   * - "doing": vừa thêm một việc vào `parent` ⇒ việc kế tiếp đứng sau nó, cùng nơi.
   * - "row": vừa thêm một việc thành hàng riêng (chưa có nơi) ⇒ việc kế tiếp vào hàng đó.
   */
  function advance(kind: "place" | "doing" | "row", itemId: string | null, name: string) {
    if (!itemId) return;
    setPos((p) => {
      if (kind === "doing" && p.parent)
        return { ...p, parent: { ...p.parent, at: after(p.parent.at, itemId) } };
      return {
        at: after(p.at, itemId),
        where: `sau ${name}`,
        parent: { id: itemId, name, at: "end" },
      };
    });
  }

  // Gõ "đặt xe" vẫn ra "Thuê xe máy…" — kết quả có mà không ĐÚNG. Chỉ coi là khớp
  // khi tên chứa trọn cụm đã gõ; không thì việc tự thêm mới là thứ người ta muốn.
  const strong =
    term !== "" && (items ?? []).some((i) => !i.inTrip && fold(i.name).includes(fold(term)));

  useEffect(() => {
    if (!open) return;
    const mine = ++seq.current;
    const t = setTimeout(
      async () => {
        setLoading(true);
        const res = await searchTripCandidates(tripId, q);
        // Gõ nhanh thì kết quả về lệch thứ tự — chỉ nhận của lượt hỏi mới nhất.
        if (mine !== seq.current) return;
        setLoading(false);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        setItems(res.data.items);
        const t = q.trim();
        const m = target?.mode ?? "any";
        const ordered = GROUPS.filter((g) => KINDS_BY_MODE[m].includes(g.kind)).flatMap((g) =>
          res.data.items.filter((i) => i.kind === g.kind),
        );
        const hit = t
          ? ordered.find((i) => !i.inTrip && fold(i.name).includes(fold(t)))
          : ordered.find((i) => !i.inTrip);
        const task = m === "place" ? undefined : tasksMatching(t)[0];
        const typed = m === "place" ? "custom-place" : "custom";
        setSelected(hit ? `${hit.kind}:${hit.id}` : task ? `task:${task.title}` : t ? typed : "");
      },
      q ? 220 : 0,
    );
    return () => clearTimeout(t);
  }, [open, q, tripId, target?.mode]);

  function close(next: boolean) {
    if (next) return;
    onClose();
    setQ("");
    setItems(null);
    setAdded(new Set());
    setForm(null);
  }

  function addCustom(
    input: { where?: string; what?: string; stayMin?: number | null },
    key = "custom",
    done?: () => void,
  ) {
    if (!target || adding) return;
    setAdding(key);
    start(async () => {
      const parent = pos.parent ? { id: pos.parent.id, at: pos.parent.at } : null;
      const res = await addCustomStop(tripId, target.dayId, pos.at ?? "end", input, parent);
      setAdding(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const label = [input.where, input.what].filter(Boolean).join(", ");
      setQ("");
      if (res.data.placeId) advance("place", res.data.placeId, input.where ?? "");
      else advance(parent ? "doing" : "row", res.data.itemId, input.what ?? "");
      onAdded?.();
      done?.();
      toast.success(`Đã thêm “${label}” vào ${target.label}`);
    });
  }

  function add(c: TripCandidate) {
    if (!target || adding) return;
    setAdding(c.id);
    start(async () => {
      // Hoạt động là một VIỆC: vào nơi đang chọn. Còn lại là NƠI: thành hàng mới.
      const asDoing = c.kind === "activity" && pos.parent;
      const res = await addItem(
        { kind: c.kind, id: c.id },
        tripId,
        target.dayId,
        pos.at ?? "end",
        asDoing && pos.parent ? { id: pos.parent.id, at: pos.parent.at } : null,
      );
      setAdding(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setAdded((s) => new Set(s).add(c.id));
      advance(asDoing ? "doing" : c.kind === "activity" ? "row" : "place", res.data.itemId, c.name);
      onAdded?.();
      if (res.data.duplicate) toast(`${c.name} đã có trong lịch trình.`);
      else toast.success(`Đã thêm ${c.name} vào ${target.label}`);
    });
  }

  const grouped = GROUPS.filter((g) => allows(g.kind))
    .map((g) => ({ ...g, rows: (items ?? []).filter((i) => i.kind === g.kind) }))
    .filter((g) => g.rows.length > 0);

  const matchedTasks = allowsDoing ? tasksMatching(term) : [];
  // Gõ đúng tên việc mẫu thì dòng chung "Thêm “…”" chỉ là bản sao kém hơn (thiếu thời lượng).
  const exactTask = matchedTasks.some((t) => fold(t.title) === fold(term));

  const customRow = term ? (
    <CommandGroup
      heading={strong ? "Không thấy đúng thứ cần thêm?" : "Tự thêm"}
      className={cn("px-2", strong && "border-t border-border/60")}
    >
      {matchedTasks.map((t) => (
        <CommandItem
          key={t.title}
          value={`task:${t.title}`}
          onSelect={() => addCustom({ what: t.title, stayMin: t.stayMin }, `task:${t.title}`)}
          className="group gap-3 rounded-[4px] px-2 py-2"
        >
          <Thumb>
            {adding === `task:${t.title}` ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Glyph name="note" className="size-5" />
            )}
          </Thumb>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-foreground">{t.title}</span>
            <span className="truncate text-xs text-muted-foreground">Việc trong ngày, {fmtDuration(t.stayMin)}</span>
          </span>
          <AddHint />
        </CommandItem>
      ))}
      {allowsDoing && !exactTask && (
        <CommandItem
          value="custom"
          onSelect={() => addCustom({ what: term })}
          className="group gap-3 rounded-[4px] px-2 py-2"
        >
          <Thumb>
            {adding === "custom" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Glyph name="note" className="size-5" />}
          </Thumb>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-foreground">
              <span className="text-muted-foreground">Việc:</span> {term}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {pos.parent ? `Làm tại ${pos.parent.name}` : "Một dòng riêng"}, tính {fmtDuration(TASK_STAY_MIN)}
            </span>
          </span>
          <AddHint />
        </CommandItem>
      )}
      {allowsPlace && (
      <CommandItem
        value="custom-place"
        onSelect={() => addCustom({ where: term }, "custom-place")}
        className="group gap-3 rounded-[4px] px-2 py-2"
      >
        <Thumb>
          {adding === "custom-place" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Glyph name="pin" className="size-5" />}
        </Thumb>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-foreground">
            <span className="text-muted-foreground">Nơi:</span> {term}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            Một hàng mới ở cột “Ở đâu”, không tính đường đi tới đó
          </span>
        </span>
        <AddHint />
      </CommandItem>
      )}
      <FormOpener mode={mode} onSelect={() => openForm(term)} />
    </CommandGroup>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        className="top-[12vh] translate-y-0 gap-0 overflow-hidden rounded-[6px] p-0 sm:max-w-xl"
        showCloseButton={false}
      >
        <div className="border-b border-border/60 px-4 pb-1 pt-4">
          <DialogTitle className="font-[family-name:var(--font-display)] text-lg font-bold">
            {mode === "doing" && pos.parent
              ? `Thêm việc ở ${pos.parent.name}`
              : mode === "place"
                ? `Thêm nơi vào ${target?.label ?? ""}`
                : `Thêm vào ${target?.label ?? ""}`}
          </DialogTitle>
          {mode !== "doing" && pos.where && (
            <p className="mt-0.5 text-sm text-foreground">Chèn {pos.where}</p>
          )}
          <DialogDescription className="mt-0.5 text-sm text-muted-foreground">
            {form
              ? mode === "place"
                ? "Gõ tên nơi; có việc gì làm ở đó thì gõ luôn."
                : "Gõ tự do. Phần nào không cần thì bỏ trống."
              : mode === "doing"
                ? "Chọn một hoạt động, hoặc gõ một việc để tự thêm."
                : mode === "place"
                  ? "Tìm địa điểm, quán ăn, chỗ ở trên site, hoặc gõ tên một nơi."
                  : "Tìm một nơi trên site, hoặc gõ một nơi / một việc để tự thêm."}
          </DialogDescription>
        </div>

        {form ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addCustom(
                { where: form.where.trim(), what: form.what.trim(), stayMin: form.stay },
                "custom-form",
                () => setForm(null),
              );
            }}
            className="grid gap-4 px-4 py-4"
          >
            {mode !== "doing" && (
            <label className="grid gap-1.5">
              <span className="text-sm font-medium">Ở đâu</span>
              <Input
                autoFocus={!form.what}
                value={form.where}
                onChange={(e) => setForm({ ...form, where: e.target.value })}
                placeholder={
                  mode === "place" ? "Nhà bạn Minh, sân bay Cam Ranh…" : "Nhà bạn Minh, sân bay Cam Ranh… (bỏ trống được)"
                }
                className="h-10 rounded-[4px]"
              />
            </label>
            )}
            <label className="grid gap-1.5">
              <span className="text-sm font-medium">Làm gì</span>
              <Input
                autoFocus={!!form.what}
                value={form.what}
                onChange={(e) => setForm({ ...form, what: e.target.value })}
                placeholder="Ăn trưa, gửi đồ, chờ người… (bỏ trống được)"
                className="h-10 rounded-[4px]"
              />
            </label>
            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Bao lâu</span>
              <div className="flex flex-wrap gap-1.5">
                {DURATIONS.map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => setForm({ ...form, stay: d.min })}
                    aria-pressed={form.stay === d.min}
                    className={cn(
                      "h-8 rounded-[4px] border px-2.5 text-sm transition-colors",
                      form.stay === d.min
                        ? "border-primary/60 bg-primary/5 font-medium text-primary-ink"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Có <strong className="font-semibold text-foreground">ở đâu</strong> thì thành một hàng
              mới ở cột “Ở đâu”, việc nằm ngay trong hàng đó. Chỉ có{" "}
              <strong className="font-semibold text-foreground">làm gì</strong> thì là việc tại nơi
              đang đứng.
            </p>
            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="ghost" onClick={() => setForm(null)} className="rounded-[4px]">
                Quay lại tìm
              </Button>
              <Button
                type="submit"
                disabled={
                  (mode === "place" ? !form.where.trim() : !form.where.trim() && !form.what.trim()) ||
                  adding !== null
                }
                className="rounded-[4px]"
              >
                {adding === "custom-form" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Glyph name="plus" className="size-4" />}
                Thêm
              </Button>
            </div>
          </form>
        ) : (
        <Command shouldFilter={false} value={selected} onValueChange={setSelected} className="rounded-none">
          <div className="relative">
            <CommandInput
              value={q}
              onValueChange={setQ}
              placeholder="Tìm nơi, hoặc gõ một nơi / một việc…"
              className="h-12"
            />
            {loading && (
              <Loader2
                className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                aria-hidden
              />
            )}
          </div>

          <CommandList className="max-h-[min(60vh,28rem)] border-t border-border/60">
            {!term && !allowsDoing && (
              <CommandGroup className="px-2">
                <FormOpener mode={mode} onSelect={() => openForm("")} />
              </CommandGroup>
            )}
            {!term && allowsDoing && (
              <CommandGroup heading="Việc trong ngày" className="px-2">
                <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-0.5">
                  {TASKS.map((t) => (
                    <CommandItem
                      key={t.title}
                      value={`task:${t.title}`}
                      onSelect={() => addCustom({ what: t.title, stayMin: t.stayMin }, `task:${t.title}`)}
                      className="h-8 gap-1.5 rounded-[4px] border border-border px-2.5 py-0 text-sm"
                    >
                      {adding === `task:${t.title}` ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Glyph name="plus" className="size-3.5 text-muted-foreground" />
                      )}
                      {t.title}
                      <span className="tabular-nums text-xs text-muted-foreground">{fmtDuration(t.stayMin)}</span>
                    </CommandItem>
                  ))}
                </div>
                <FormOpener mode={mode} onSelect={() => openForm("")} />
              </CommandGroup>
            )}

            {!strong && customRow}

            {!term && grouped.length > 0 && placeName && (
              <p className="border-t border-border/60 px-4 pb-1 pt-3 text-xs text-muted-foreground">
                Gợi ý ở <strong className="font-semibold text-foreground">{placeName}</strong>
              </p>
            )}

            {grouped.map((g) => (
              <CommandGroup key={g.kind} heading={g.label} className="px-2">
                {g.rows.map((c) => {
                  const done = c.inTrip || added.has(c.id);
                  return (
                    <CommandItem
                      key={c.id}
                      value={`${c.kind}:${c.id}`}
                      disabled={done}
                      onSelect={() => add(c)}
                      className="group gap-3 rounded-[4px] px-2 py-2 data-[disabled=true]:opacity-100"
                    >
                      <Thumb filled>
                        {c.image ? (
                          <Image src={c.image} alt="" fill sizes="44px" className="object-cover" />
                        ) : (
                          <Glyph name={g.glyph} className="size-5" />
                        )}
                      </Thumb>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span
                          className={cn(
                            "truncate text-sm font-medium",
                            done ? "text-muted-foreground" : "text-foreground",
                          )}
                        >
                          {c.name}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">{c.context}</span>
                      </span>
                      {adding === c.id ? (
                        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                      ) : done ? (
                        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                          <Glyph name="tick" className="size-3.5" />
                          Đã có
                        </span>
                      ) : (
                        <AddHint />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}

            {strong && customRow}
          </CommandList>
        </Command>
        )}
      </DialogContent>
    </Dialog>
  );
}

// null = theo mặc định (nơi 1 giờ, việc 30 phút); 0 = không tốn thời gian.
const DURATIONS: { label: string; min: number | null }[] = [
  { label: "Tự động", min: null },
  { label: "Không tính", min: 0 },
  { label: "15 phút", min: 15 },
  { label: "30 phút", min: 30 },
  { label: "1 giờ", min: 60 },
  { label: "2 giờ", min: 120 },
  { label: "4 giờ", min: 240 },
];

function FormOpener({ onSelect, mode }: { onSelect: () => void; mode: "place" | "doing" | "any" }) {
  const label =
    mode === "doing"
      ? "Tự gõ một việc kèm thời lượng…"
      : mode === "place"
        ? "Tự gõ một nơi, kèm việc làm ở đó…"
        : "Tự gõ đủ: ở đâu, làm gì, bao lâu…";
  return (
    <CommandItem value="custom-form" onSelect={onSelect} className="group gap-3 rounded-[4px] px-2 py-2">
      <Thumb>
        <Glyph name="sliders" className="size-5" />
      </Thumb>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">{label}</span>
        <span className="truncate text-xs text-muted-foreground">Một dòng của riêng chuyến này</span>
      </span>
      <AddHint />
    </CommandItem>
  );
}

function Thumb({ filled, children }: { filled?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        R_BADGE,
        "relative grid size-11 shrink-0 place-items-center overflow-hidden text-muted-foreground",
        filled ? "bg-muted" : "border border-dashed border-border",
      )}
    >
      {children}
    </span>
  );
}

function AddHint() {
  return (
    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary-ink opacity-0 group-hover:opacity-100 group-data-[selected=true]:opacity-100 [@media(pointer:coarse)]:opacity-100">
      <Glyph name="plus" className="size-3.5" />
      Thêm
    </span>
  );
}
