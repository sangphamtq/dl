"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Loader2 } from "@/components/icons";
import { Glyph } from "@/components/site/glyphs";
import { cn } from "@/lib/utils";
import { initials, timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MICRO } from "@/components/trip/trip-rail";
import { addNote, deleteNote, setNotePinned, updateNote } from "@/app/(site)/lich-trinh/actions";
import type { TripNoteRow } from "@/lib/trip";

const MAX = 2000;

// Link bấm được — dựng bằng JSX chứ KHÔNG `dangerouslySetInnerHTML`, nên chữ
// của người dùng được React tự escape và không có mặt phẳng XSS nào để nhớ.
const URL_RE = /https?:\/\/[^\s]+/g;

function linkify(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const at = m.index ?? 0;
    let url = m[0];
    const trail = url.match(/[.,;:!?)\]]+$/)?.[0] ?? "";
    if (trail) url = url.slice(0, -trail.length);
    out.push(text.slice(last, at));
    out.push(
      <a
        key={at}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-primary decoration-primary/40 underline underline-offset-[3px] transition-colors hover:decoration-primary"
      >
        {url}
      </a>,
    );
    if (trail) out.push(trail);
    last = at + m[0].length;
  }
  out.push(text.slice(last));
  return out;
}

export function TripNotes({ tripId, notes }: { tripId: string; notes: TripNoteRow[] }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, done?: () => void) {
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error ?? "Không thực hiện được.");
        return;
      }
      done?.();
    });
  }

  const pinned = notes.filter((n) => n.isPinned);
  const rest = notes.filter((n) => !n.isPinned);

  const card = (n: TripNoteRow) => (
    <NoteCard
      key={n.id}
      note={n}
      editing={editing === n.id}
      pending={pending}
      onEdit={() => setEditing(n.id)}
      onCancel={() => setEditing(null)}
      onSave={(body) => run(() => updateNote(n.id, body), () => setEditing(null))}
      onPin={() => run(() => setNotePinned(n.id, !n.isPinned))}
      onDelete={() => run(() => deleteNote(n.id), () => toast("Đã xoá ghi chú"))}
    />
  );

  return (
    <div className="pt-6">
      <header className="flex items-baseline gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight sm:text-[1.75rem]">
          Ghi chú
        </h1>
        {notes.length > 0 && (
          <span className="text-sm tabular-nums text-muted-foreground">{notes.length}</span>
        )}
      </header>
      <p className="mt-1 text-sm text-muted-foreground">
        Ghi chú của cả chuyến, ai trong nhóm cũng xem và sửa được. Ghi chú của từng điểm thì ghi ngay
        dưới điểm đó ở tab Lịch trình.
      </p>

      <Composer tripId={tripId} pending={pending} run={run} />

      {notes.length === 0 ? (
        <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
          Chưa có ghi chú nào. Hợp nhất để ghi mã đặt phòng, số hiệu chuyến bay, số điện thoại chủ nhà
          hay tài xế, và những lời dặn cả nhóm trước giờ đi.
        </p>
      ) : (
        <>
          {pinned.length > 0 && (
            <section className="mt-8">
              <h2 className={cn(MICRO, "mb-3 flex items-center gap-1.5 text-muted-foreground")}>
                <Glyph name="pushpin" className="size-3.5" />
                Đã ghim
              </h2>
              <ul className={GRID}>{pinned.map(card)}</ul>
            </section>
          )}
          {rest.length > 0 && (
            <section className="mt-8">
              {pinned.length > 0 && (
                <h2 className={cn(MICRO, "mb-3 text-muted-foreground")}>Khác</h2>
              )}
              <ul className={GRID}>{rest.map(card)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// `items-start`: thẻ cao theo nội dung của chính nó, không kéo giãn theo thẻ cao nhất hàng.
const GRID = "grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3";

function NoteCard({
  note: n,
  editing,
  pending,
  onEdit,
  onCancel,
  onSave,
  onPin,
  onDelete,
}: {
  note: TripNoteRow;
  editing: boolean;
  pending: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (body: string) => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  if (editing)
    return (
      <li className="sm:col-span-2 xl:col-span-3">
        <NoteForm initial={n.body} pending={pending} submitLabel="Lưu" onCancel={onCancel} onSubmit={onSave} />
      </li>
    );

  const edited = n.updatedAt.getTime() - n.createdAt.getTime() > 1000;
  return (
    // Thẻ KHÔNG bấm được (sửa qua menu ⋯) ⇒ khai bằng NỀN, không viền — chữ bôi đen chép được.
    <li className="group/note flex flex-col rounded-[6px] bg-band">
      <p className="whitespace-pre-wrap break-words px-4 pt-3.5 text-[0.9375rem] leading-relaxed">
        {linkify(n.body)}
      </p>

      <div className="mt-auto flex items-center gap-2 px-4 pb-3 pt-3 text-xs">
        <Avatar className="size-5 shrink-0">
          {n.author?.image && <AvatarImage src={n.author.image} alt="" />}
          <AvatarFallback className="text-[0.6rem]">{initials(n.author?.name ?? null)}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 truncate font-medium text-foreground/75">
          {n.author?.name ?? "Đã rời chuyến"}
        </span>
        <span suppressHydrationWarning className="shrink-0 text-muted-foreground">
          {edited ? `sửa ${timeAgo(n.updatedAt)}` : timeAgo(n.createdAt)}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={pending}
              aria-label="Tuỳ chọn ghi chú"
              className="-mr-1.5 ml-auto grid size-7 shrink-0 place-items-center rounded-[3px] text-muted-foreground opacity-0 transition-[opacity,background-color] hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/note:opacity-100 data-[state=open]:opacity-100 [@media(pointer:coarse)]:opacity-100"
            >
              <Glyph name="more" className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={onPin}>
              <Glyph name="pushpin" className="size-4" />
              {n.isPinned ? "Bỏ ghim" : "Ghim lên đầu"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onEdit}>
              <Glyph name="pencil" className="size-4" />
              Sửa
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Glyph name="trash" className="size-4" />
              Xoá
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

/** Ô viết LUÔN mở: một dòng lúc nghỉ, giãn theo chữ khi gõ; nút chỉ hiện khi có chữ hoặc đang gõ. */
function Composer({
  tripId,
  pending,
  run,
}: {
  tripId: string;
  pending: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, done?: () => void) => void;
}) {
  const [key, setKey] = useState(0);
  return (
    <div className="mt-5">
      <NoteForm
        key={key}
        initial=""
        pending={pending}
        submitLabel="Thêm ghi chú"
        compact
        onCancel={() => setKey((k) => k + 1)}
        onSubmit={(body) => run(() => addNote(tripId, body), () => setKey((k) => k + 1))}
      />
    </div>
  );
}

function NoteForm({
  initial,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
  compact = false,
}: {
  initial: string;
  pending: boolean;
  submitLabel: string;
  onSubmit: (body: string) => void;
  onCancel: () => void;
  /** Ô viết mới: chưa gõ gì thì gọn một dòng, không hiện nút. */
  compact?: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [focused, setFocused] = useState(!compact);
  const body = value.trim();
  const dirty = body.length > 0 && body !== initial.trim();
  const open = !compact || focused || value.length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty) onSubmit(body);
      }}
      className={cn(
        "rounded-[6px] border bg-background transition-[border-color,box-shadow]",
        open
          ? "border-primary/50 shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-primary)_12%,transparent)]"
          : "border-border hover:border-foreground/25",
      )}
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, MAX))}
        onFocus={(e) => {
          setFocused(true);
          // Sửa ghi chú cũ: con trỏ về CUỐI chữ (mặc định nó đứng đầu — gõ thêm là chen vào trước).
          if (!compact) e.currentTarget.setSelectionRange(value.length, value.length);
        }}
        onBlur={() => setFocused(false)}
        autoFocus={!compact}
        rows={1}
        placeholder="Ghi gì đó cho cả nhóm…"
        aria-label="Nội dung ghi chú"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && dirty) onSubmit(body);
          if (e.key === "Escape") {
            setValue(initial);
            e.currentTarget.blur();
            if (!compact) onCancel();
          }
        }}
        className={cn(
          "block w-full resize-none bg-transparent px-4 py-3 text-[0.9375rem] leading-relaxed outline-none [field-sizing:content] placeholder:text-muted-foreground",
          open ? "min-h-24" : "min-h-0",
        )}
      />
      {open && (
        <div className="flex items-center gap-3 border-t border-border/60 px-2 py-2 pl-4">
          <span className="text-xs tabular-nums text-muted-foreground">
            {value.length > MAX - 200 ? (
              `${value.length}/${MAX}`
            ) : (
              <span className="hidden sm:inline">
                Ctrl/⌘ + Enter để lưu
              </span>
            )}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              // Nhấn chuột không lấy focus ⇒ ô gõ không blur trước khi bấm (mất khung "đang mở").
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setValue(initial);
                onCancel();
              }}
              disabled={pending}
              className="h-8 rounded-[4px] px-3"
            >
              Huỷ
            </Button>
            <Button
              type="submit"
              onMouseDown={(e) => e.preventDefault()}
              disabled={pending || !dirty}
              className="h-8 rounded-[4px] px-3"
            >
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {submitLabel}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
