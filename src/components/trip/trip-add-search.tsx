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
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
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

const fold = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/gi, "d").toLowerCase();

const tasksMatching = (term: string) =>
  term ? TASKS.filter((t) => fold(t.title).includes(fold(term))) : [];

export type AddTarget = {
  dayId: string | null;
  label: string;
  /** Mặc định "end". */
  at?: DropAt;
  /** "giữa A và B", "trước A"… hiện dưới tiêu đề. */
  where?: string;
};

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
  const [, start] = useTransition();
  const seq = useRef(0);
  const open = target !== null;
  const term = q.trim();

  // Vị trí chèn TRÔI theo từng lần thêm: thêm A rồi B vào cùng một chỗ thì B phải
  // đứng SAU A, không chen lên trước nó.
  const [pos, setPos] = useState<{ at: DropAt; where?: string }>({ at: "end" });
  const [posFor, setPosFor] = useState<AddTarget | null>(null);
  if (target !== posFor) {
    setPosFor(target);
    setPos({ at: target?.at ?? "end", where: target?.where });
  }

  function advance(itemId: string | null, name: string) {
    if (!itemId) return;
    setPos((p) =>
      typeof p.at === "object"
        ? { at: { afterId: itemId, beforeId: p.at.beforeId }, where: `sau ${name}` }
        : { at: p.at, where: p.where ? `sau ${name}` : undefined },
    );
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
        const ordered = GROUPS.flatMap((g) => res.data.items.filter((i) => i.kind === g.kind));
        const hit = t
          ? ordered.find((i) => !i.inTrip && fold(i.name).includes(fold(t)))
          : ordered.find((i) => !i.inTrip);
        const task = tasksMatching(t)[0];
        setSelected(
          hit ? `${hit.kind}:${hit.id}` : task ? `task:${task.title}` : t ? "custom" : "",
        );
      },
      q ? 220 : 0,
    );
    return () => clearTimeout(t);
  }, [open, q, tripId]);

  function close(next: boolean) {
    if (next) return;
    onClose();
    setQ("");
    setItems(null);
    setAdded(new Set());
  }

  function addCustom(title: string, stayMin?: number, key = "custom") {
    if (!target || adding) return;
    setAdding(key);
    start(async () => {
      const res = await addItem({ kind: "custom", title, stayMin }, tripId, target.dayId, pos.at);
      setAdding(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setQ("");
      advance(res.data.itemId, title);
      onAdded?.();
      toast.success(`Đã thêm “${title}” vào ${target.label}`);
    });
  }

  function add(c: TripCandidate) {
    if (!target || adding) return;
    setAdding(c.id);
    start(async () => {
      const res = await addItem({ kind: c.kind, id: c.id }, tripId, target.dayId, pos.at);
      setAdding(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setAdded((s) => new Set(s).add(c.id));
      advance(res.data.itemId, c.name);
      onAdded?.();
      if (res.data.duplicate) toast(`${c.name} đã có trong lịch trình.`);
      else toast.success(`Đã thêm ${c.name} vào ${target.label}`);
    });
  }

  const grouped = GROUPS.map((g) => ({
    ...g,
    rows: (items ?? []).filter((i) => i.kind === g.kind),
  })).filter((g) => g.rows.length > 0);

  const matchedTasks = tasksMatching(term);
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
          onSelect={() => addCustom(t.title, t.stayMin, `task:${t.title}`)}
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
      {!exactTask && (
      <CommandItem value="custom" onSelect={() => addCustom(term)} className="group gap-3 rounded-[4px] px-2 py-2">
        <Thumb>
          {adding === "custom" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Glyph name="note" className="size-5" />}
        </Thumb>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-foreground">Thêm “{term}”</span>
          <span className="truncate text-xs text-muted-foreground">
            Việc hoặc nơi chưa có trên site, tính {fmtDuration(TASK_STAY_MIN)}, sửa được sau
          </span>
        </span>
        <AddHint />
      </CommandItem>
      )}
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
            Thêm vào {target?.label ?? ""}
          </DialogTitle>
          {pos.where && (
            <p className="mt-0.5 text-sm font-medium text-foreground">Chèn {pos.where}</p>
          )}
          <DialogDescription className="mt-0.5 text-sm text-muted-foreground">
            Tìm một nơi trên site, hoặc gõ một việc (đặt xe, chờ người…) để tự thêm.
          </DialogDescription>
        </div>

        <Command shouldFilter={false} value={selected} onValueChange={setSelected} className="rounded-none">
          <div className="relative">
            <CommandInput
              value={q}
              onValueChange={setQ}
              placeholder="Tìm nơi, hoặc gõ một việc…"
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
            {!term && (
              <CommandGroup heading="Việc trong ngày" className="px-2">
                <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-0.5">
                  {TASKS.map((t) => (
                    <CommandItem
                      key={t.title}
                      value={`task:${t.title}`}
                      onSelect={() => addCustom(t.title, t.stayMin, `task:${t.title}`)}
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
      </DialogContent>
    </Dialog>
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
