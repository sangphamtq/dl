"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2 } from "@/components/icons";
import { Glyph, type GlyphName } from "@/components/site/glyphs";
import { R_BADGE } from "@/lib/radius";
import { cn } from "@/lib/utils";
import { TOUCH_INPUT } from "@/lib/touch";
import { fmtDuration } from "@/lib/trip-time";
import {
  REST_PRESETS,
  SPECIALS,
  SPECIAL_LABEL,
  TRAVEL_MODES,
  specialTitle,
  type TravelMode,
  type TripSpecial,
} from "@/lib/trip-special";
import type { DropAt } from "@/lib/trip-drop";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { TRAVEL_INK, TravelIcon } from "@/components/trip/travel-icon";
import { VenuePicker, type Venue } from "@/components/trip/trip-venue-picker";
import {
  addCustomStop,
  addItem,
  updateItem,
  type VenueRole,
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
// Nghỉ trưa / thời gian tự do giờ là MỤC ĐẶC BIỆT "Nghỉ" (nhóm riêng bên dưới).
const TASKS: { title: string; stayMin: number }[] = [
  { title: "Đặt xe", stayMin: 15 },
  { title: "Chờ người", stayMin: 30 },
];

type CustomForm = {
  special: TripSpecial | null;
  title: string;
  address: string;
  stay: number | null;
  mode: TravelMode | null;
  from: string;
  to: string;
  /** Quán / chỗ ở của site cho bữa ăn, nhận / trả phòng — có thì thêm MỤC SITE mang vai, không thêm mục tự gõ. */
  venue: Venue | null;
};

const KINDS_BY_MODE: Record<"place" | "doing" | "any", TripCandidate["kind"][]> = {
  place: ["spot", "eatery", "accommodation"],
  doing: ["activity"],
  any: ["spot", "eatery", "activity", "accommodation"],
};

const fold = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/gi, "d").toLowerCase();

const tasksMatching = (term: string) =>
  term ? TASKS.filter((t) => fold(t.title).includes(fold(term))) : [];

/** Vị trí chèn: `at` cho một dòng mới (mục gốc của ngày), `parent` cho một THẺ hoạt động của nơi đó. */
export type AddPos = {
  /** Mặc định "end". */
  at?: DropAt;
  /** "giữa A và B", "trước A"… hiện dưới tiêu đề. */
  where?: string;
  parent?: { id: string; name: string; at?: DropAt };
  /**
   * Nút ở đâu thì chỉ thêm thứ hợp chỗ đó: "place" (dấu + giữa hai hàng, ⋯ trước/sau một hàng) chỉ
   * thêm NƠI thành hàng mới; "doing" ("+ Hoạt động" của một nơi) thêm thẻ hoạt động cho nơi đó;
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
  // Form tự thêm (tiêu đề · địa chỉ · bao lâu): null = đang ở chế độ tìm.
  const [form, setForm] = useState<CustomForm | null>(null);
  const openForm = (title: string, special: TripSpecial | null = null) =>
    setForm({
      special,
      title,
      address: "",
      stay: null,
      mode: special === "transport" ? "bus" : null,
      from: "",
      to: "",
      venue: null,
    });
  const [, start] = useTransition();
  const seq = useRef(0);
  const open = target !== null;
  const term = q.trim();
  const mode = target?.mode ?? "any";
  const allows = (kind: TripCandidate["kind"]) => KINDS_BY_MODE[mode].includes(kind);

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

  /** Thẻ kế tiếp đứng sau thẻ vừa thêm (cùng nơi); dòng kế tiếp đứng sau dòng vừa thêm. */
  function advance(itemId: string | null, name: string, tag: boolean) {
    if (!itemId) return;
    setPos((p) =>
      tag && p.parent
        ? { ...p, parent: { ...p.parent, at: after(p.parent.at, itemId) } }
        : { ...p, at: after(p.at, itemId), where: `sau ${name}` },
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
        const res = await searchTripCandidates(
          tripId,
          q,
          target?.mode === "doing" ? target.parent?.id : undefined,
        );
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
        const task = tasksMatching(t)[0];
        setSelected(hit ? `${hit.kind}:${hit.id}` : task ? `task:${task.title}` : t ? "custom" : "");
      },
      q ? 220 : 0,
    );
    return () => clearTimeout(t);
  }, [open, q, tripId, target?.mode, target?.parent?.id]);

  function close(next: boolean) {
    if (next) return;
    onClose();
    setQ("");
    setItems(null);
    setAdded(new Set());
    setForm(null);
  }

  function addCustom(
    input: {
      title: string;
      address?: string | null;
      stayMin?: number | null;
      special?: TripSpecial | null;
      travelMode?: TravelMode | null;
      travelFrom?: string | null;
      travelTo?: string | null;
    },
    key = "custom",
    done?: () => void,
  ) {
    if (!target || adding) return;
    setAdding(key);
    start(async () => {
      // Mục tự thêm luôn là DÒNG RIÊNG có giờ — kể cả mở từ "làm gì ở đây": `pos.at` khi đó đã là
      // ngay sau nơi đó, và trôi theo từng lần thêm nên hai mục liền nhau giữ đúng thứ tự.
      const res = await addCustomStop(tripId, target.dayId, pos.at ?? "end", input);
      setAdding(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const label = input.special
        ? specialTitle({
            special: input.special,
            title: input.title,
            travelMode: input.travelMode,
            travelFrom: input.travelFrom,
            travelTo: input.travelTo,
          })
        : input.title;
      setQ("");
      advance(res.data.itemId, label, false);
      onAdded?.();
      done?.();
      toast.success(`Đã thêm “${label}” vào ${target.label}`);
    });
  }

  function add(c: TripCandidate) {
    if (!target || adding) return;
    setAdding(c.id);
    start(async () => {
      // Mở từ "làm gì ở đây" ⇒ hoạt động thành thẻ của nơi đó. Còn lại server tự gắn hoạt động
      // vào nơi của nó nếu nơi đó đã có trong ngày.
      const asDoing = mode === "doing" && c.kind === "activity" && pos.parent;
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
      advance(res.data.itemId, c.name, !!asDoing);
      onAdded?.();
      toast.success(`Đã thêm ${c.name} vào ${target.label}`);
    });
  }

  /** Bữa ăn / nhận / trả phòng gắn quán / chỗ ở của site: thêm MỤC SITE mang vai. */
  function addVenue(venue: Venue, role: VenueRole, stayMin: number | null, done: () => void) {
    if (!target || adding) return;
    setAdding("custom-form");
    start(async () => {
      const res = await addItem({ kind: venue.kind, id: venue.id }, tripId, target.dayId, pos.at ?? "end", null, role);
      setAdding(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.data.itemId && stayMin != null) await updateItem(res.data.itemId, { stayMin });
      advance(res.data.itemId, venue.name, false);
      onAdded?.();
      done();
      toast.success(`Đã thêm ${venue.name} vào ${target.label}`);
    });
  }

  const grouped = GROUPS.filter((g) => allows(g.kind))
    .map((g) => ({ ...g, rows: (items ?? []).filter((i) => i.kind === g.kind) }))
    .filter((g) => g.rows.length > 0);

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
          onSelect={() => addCustom({ title: t.title, stayMin: t.stayMin }, `task:${t.title}`)}
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
            <span className="truncate text-xs text-muted-foreground">Mục hay dùng, {fmtDuration(t.stayMin)}</span>
          </span>
          <AddHint />
        </CommandItem>
      ))}
      {!exactTask && (
        <CommandItem
          value="custom"
          onSelect={() => addCustom({ title: term })}
          className="group gap-3 rounded-[4px] px-2 py-2"
        >
          <Thumb>
            {adding === "custom" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Glyph name="plus" className="size-5" />}
          </Thumb>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-foreground">Thêm “{term}”</span>
            <span className="truncate text-xs text-muted-foreground">
              {mode === "doing" && pos.parent ? `Dòng riêng ngay sau ${pos.parent.name}` : "Mục tự thêm"}, chưa có địa chỉ
            </span>
          </span>
          <AddHint />
        </CommandItem>
      )}
      <FormOpener onSelect={() => openForm(term)} />
    </CommandGroup>
  ) : null;

  const results = grouped.map((g) => (
              <CommandGroup key={g.kind} heading={g.label} className="px-2">
                {g.rows.map((c) => {
                  // Đã có trong chuyến VẪN thêm được (sáng & chiều cùng một bãi, một quán hai bữa) — chỉ ghi chú cho biết.
                  const done = c.inTrip || added.has(c.id);
                  return (
                    <CommandItem
                      key={c.id}
                      value={`${c.kind}:${c.id}`}
                      onSelect={() => add(c)}
                      className="group gap-3 rounded-[4px] px-2 py-2"
                    >
                      <Thumb filled>
                        {c.image ? (
                          <Image src={c.image} alt="" fill sizes="44px" className="object-cover" />
                        ) : (
                          <Glyph name={g.glyph} className="size-5" />
                        )}
                      </Thumb>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium text-foreground">{c.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {done ? (
                            <span className="inline-flex items-center gap-1">
                              <Glyph name="tick" className="size-3 shrink-0" />
                              Đã có trong chuyến
                            </span>
                          ) : (
                            c.context
                          )}
                        </span>
                      </span>
                      {adding === c.id ? (
                        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                      ) : (
                        <AddHint again={done} />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ));

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        className="top-[12vh] translate-y-0 gap-0 overflow-hidden rounded-[6px] p-0 sm:max-w-xl"
        showCloseButton={false}
      >
        <div className="border-b border-border/60 px-4 pb-1 pt-4">
          <DialogTitle className="font-[family-name:var(--font-display)] text-lg font-bold">
            {mode === "doing" && pos.parent
              ? `Làm gì ở ${pos.parent.name}`
              : `Thêm vào ${target?.label ?? ""}`}
          </DialogTitle>
          {mode !== "doing" && pos.where && (
            <p className="mt-0.5 text-sm text-foreground">Chèn {pos.where}</p>
          )}
          <DialogDescription className="mt-0.5 text-sm text-muted-foreground">
            {form
              ? form.special
                ? `${SPECIAL_LABEL[form.special]}: điền phần cần, bỏ trống phần không cần.`
                : "Một mục của riêng chuyến này. Có địa chỉ thì nó được đánh số như một điểm dừng."
              : mode === "doing"
                ? "Hoạt động thành thẻ của nơi này, không tính giờ riêng. Mục tự thêm thành một dòng có giờ ngay sau."
                : "Tìm địa điểm, quán ăn, chỗ ở trên site, hoặc gõ để tự thêm một mục."}
          </DialogDescription>
        </div>

        {form ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = form;
              if (f.venue && (f.special === "meal" || f.special === "checkin" || f.special === "checkout")) {
                addVenue(f.venue, { special: f.special, title: f.title.trim() || null }, f.stay, () => setForm(null));
                return;
              }
              addCustom(
                {
                  title: f.title.trim(),
                  address: f.address.trim() || null,
                  stayMin: f.stay,
                  special: f.special,
                  travelMode: f.mode,
                  travelFrom: f.from.trim() || null,
                  travelTo: f.to.trim() || null,
                },
                "custom-form",
                () => setForm(null),
              );
            }}
            className="grid gap-4 px-4 py-4"
          >
            {form.special === "transport" ? (
              <>
                <div className="grid gap-1.5">
                  <span className="text-sm font-medium">Phương tiện</span>
                  <div className="flex flex-wrap gap-1.5">
                    {TRAVEL_MODES.map((m) => (
                      <button
                        key={m.mode}
                        type="button"
                        onClick={() => setForm({ ...form, mode: m.mode })}
                        aria-pressed={form.mode === m.mode}
                        className={cn(CHOICE, form.mode === m.mode ? CHOICE_ON : CHOICE_OFF)}
                      >
                        <TravelIcon mode={m.mode} className={cn("size-5", TRAVEL_INK)} />
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1.5">
                    <span className="text-sm font-medium">Từ</span>
                    <Input
                      autoFocus
                      value={form.from}
                      onChange={(e) => setForm({ ...form, from: e.target.value })}
                      placeholder="Hà Nội"
                      className="h-10 rounded-[4px]"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-sm font-medium">Đến</span>
                    <Input
                      value={form.to}
                      onChange={(e) => setForm({ ...form, to: e.target.value })}
                      placeholder="Sa Pa"
                      className="h-10 rounded-[4px]"
                    />
                  </label>
                </div>
              </>
            ) : (
              <>
                {(form.special === "meal" || form.special === "checkin") && (
                  <div className="grid gap-1.5">
                    <span className="text-sm font-medium">
                      {form.special === "meal" ? "Quán" : "Chỗ ở"}{" "}
                      <span className="font-normal text-muted-foreground">(chọn trên site, hoặc gõ tay bên dưới)</span>
                    </span>
                    <VenuePicker
                      tripId={tripId}
                      kind={form.special === "meal" ? "eatery" : "accommodation"}
                      value={form.venue}
                      onChange={(venue) => setForm({ ...form, venue })}
                    />
                  </div>
                )}
                {form.special === "rest" && (
                  <div className="flex flex-wrap gap-1.5">
                    {REST_PRESETS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm({ ...form, title: t })}
                        aria-pressed={form.title === t}
                        className={cn(CHOICE, form.title === t ? CHOICE_ON : CHOICE_OFF)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
                {/* Đã chọn quán / chỗ ở: tên là tên của nơi đó — ô tiêu đề chỉ là bản lặp. */}
                {!form.venue && form.special !== "checkout" && (
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium">
                    {form.special === "checkin" ? "Hoặc gõ tên chỗ ở" : "Tiêu đề"}
                    {form.special && <span className="font-normal text-muted-foreground"> (không bắt buộc)</span>}
                  </span>
                  <Input
                    autoFocus
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder={
                      form.special === "checkin"
                        ? "Nhận phòng Sunny House…"
                        : form.special
                          ? SPECIAL_LABEL[form.special]
                          : "Nhà bạn Minh, ra sân bay, chờ xe…"
                    }
                    className="h-10 rounded-[4px]"
                  />
                </label>
                )}
                {form.special !== "rest" && form.special !== "checkout" && !form.venue && (
                  <label className="grid gap-1.5">
                    <span className="text-sm font-medium">
                      Địa chỉ <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
                    </span>
                    <Input
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="Số nhà, đường, phường…"
                      className="h-10 rounded-[4px]"
                    />
                  </label>
                )}
              </>
            )}
            <div className="grid gap-1.5">
              <span className="text-sm font-medium">{form.special === "transport" ? "Đi mất bao lâu" : "Bao lâu"}</span>
              <div className="flex flex-wrap gap-1.5">
                {(form.special === "transport" ? TRAVEL_DURATIONS : DURATIONS).map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => setForm({ ...form, stay: d.min })}
                    aria-pressed={form.stay === d.min}
                    className={cn(CHOICE, form.stay === d.min ? CHOICE_ON : CHOICE_OFF)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="ghost" onClick={() => setForm(null)} className="rounded-[4px]">
                Quay lại tìm
              </Button>
              <Button
                type="submit"
                disabled={(!form.special && !form.title.trim()) || adding !== null}
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
              placeholder="Tìm trên site, hoặc gõ để tự thêm…"
              className={cn("h-12", TOUCH_INPUT)}
            />
            {loading && (
              <Loader2
                className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                aria-hidden
              />
            )}
          </div>

          <CommandList className="max-h-[min(60vh,28rem)] border-t border-border/60">
            {mode === "doing" && results}
            {!term && (
              <CommandGroup heading="Hay dùng" className="px-2">
                <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-0.5">
                  {TASKS.map((t) => (
                    <CommandItem
                      key={t.title}
                      value={`task:${t.title}`}
                      onSelect={() => addCustom({ title: t.title, stayMin: t.stayMin }, `task:${t.title}`)}
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
                <FormOpener onSelect={() => openForm("")} />
              </CommandGroup>
            )}
            {!term && (
              <CommandGroup heading="Mục đặc biệt" className="px-2">
                <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-0.5">
                  {SPECIALS.map((sp) => (
                    <CommandItem
                      key={sp.special}
                      value={`special:${sp.special}`}
                      onSelect={() => openForm("", sp.special)}
                      className="h-9 gap-1.5 rounded-[4px] border border-border px-2.5 py-0 text-sm"
                    >
                      <Glyph name={sp.glyph} className="size-4 text-muted-foreground" />
                      {sp.label}
                    </CommandItem>
                  ))}
                </div>
              </CommandGroup>
            )}

            {!strong && customRow}

            {mode !== "doing" && !term && grouped.length > 0 && placeName && (
              <p className="border-t border-border/60 px-4 pb-1 pt-3 text-xs text-muted-foreground">
                Gợi ý ở <strong className="font-semibold text-foreground">{placeName}</strong>
              </p>
            )}

            {mode !== "doing" && results}

            {strong && customRow}
          </CommandList>
        </Command>
        )}
      </DialogContent>
    </Dialog>
  );
}

const CHOICE = "inline-flex h-8 items-center gap-1.5 rounded-[4px] border px-2.5 text-sm transition-colors";
const CHOICE_ON = "border-primary/60 bg-primary/5 font-medium text-primary-ink";
const CHOICE_OFF = "border-border hover:bg-muted";

// Di chuyển tính theo THỜI LƯỢNG (biên tập chọn, không neo giờ vé) — mốc dài hơn hẳn mục thường.
const TRAVEL_DURATIONS: { label: string; min: number | null }[] = [
  { label: "Tự động", min: null },
  { label: "30 phút", min: 30 },
  { label: "1 giờ", min: 60 },
  { label: "2 giờ", min: 120 },
  { label: "4 giờ", min: 240 },
  { label: "6 giờ", min: 360 },
  { label: "8 giờ", min: 480 },
  { label: "10 giờ", min: 600 },
];

// null = theo mặc định (có địa chỉ 1 giờ, không có 30 phút; mục đặc biệt theo loại); 0 = không tốn thời gian.
const DURATIONS: { label: string; min: number | null }[] = [
  { label: "Tự động", min: null },
  { label: "Không tính", min: 0 },
  { label: "15 phút", min: 15 },
  { label: "30 phút", min: 30 },
  { label: "1 giờ", min: 60 },
  { label: "2 giờ", min: 120 },
  { label: "4 giờ", min: 240 },
];

function FormOpener({ onSelect }: { onSelect: () => void }) {
  return (
    <CommandItem value="custom-form" onSelect={onSelect} className="group gap-3 rounded-[4px] px-2 py-2">
      <Thumb>
        <Glyph name="sliders" className="size-5" />
      </Thumb>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">Tự thêm kèm địa chỉ, thời lượng…</span>
        <span className="truncate text-xs text-muted-foreground">Một mục của riêng chuyến này</span>
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

function AddHint({ again }: { again?: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary-ink opacity-0 group-hover:opacity-100 group-data-[selected=true]:opacity-100 [@media(pointer:coarse)]:opacity-100">
      <Glyph name="plus" className="size-3.5" />
      {again ? "Thêm lần nữa" : "Thêm"}
    </span>
  );
}
