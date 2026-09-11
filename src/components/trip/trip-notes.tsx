"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Check, Loader2, NotebookPen, Pencil, Pin, PinOff, Trash2, X } from "@/components/icons";
import { cn } from "@/lib/utils";
import { initials, timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

  const row = (n: TripNoteRow) => (
    <li key={n.id} className="group/note py-5 first:pt-0">
      {editing === n.id ? (
        <NoteForm
          initial={n.body}
          pending={pending}
          submitLabel="Lưu"
          onCancel={() => setEditing(null)}
          onSubmit={(body) => run(() => updateNote(n.id, body), () => setEditing(null))}
        />
      ) : (
        <>
          <p className="whitespace-pre-wrap break-words text-base leading-[1.7]">
            {linkify(n.body)}
          </p>

          <div className="mt-3 flex items-center gap-2.5 text-xs">
            <Avatar className="size-5 shrink-0">
              {n.author?.image && <AvatarImage src={n.author.image} alt="" />}
              <AvatarFallback className="text-[0.6rem]">
                {initials(n.author?.name ?? null)}
              </AvatarFallback>
            </Avatar>
            {/* Tên và giờ KHÔNG có dấu ngăn: khác sắc độ + một khoảng trống là đủ. */}
            <span className="min-w-0 truncate font-medium text-foreground/70">
              {n.author?.name ?? "Đã rời chuyến"}
            </span>
            <span suppressHydrationWarning className="shrink-0 text-muted-foreground">
              {n.updatedAt.getTime() - n.createdAt.getTime() > 1000
                ? `đã sửa ${timeAgo(n.updatedAt)}`
                : timeAgo(n.createdAt)}
            </span>

            <span className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/note:opacity-100 [@media(pointer:coarse)]:opacity-100">
              <IconBtn
                label={n.isPinned ? "Bỏ ghim" : "Ghim lên đầu"}
                onClick={() => run(() => setNotePinned(n.id, !n.isPinned))}
                disabled={pending}
              >
                {n.isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
              </IconBtn>
              <IconBtn label="Sửa" onClick={() => setEditing(n.id)} disabled={pending}>
                <Pencil className="size-4" />
              </IconBtn>
              <IconBtn
                label="Xoá"
                danger
                onClick={() => run(() => deleteNote(n.id))}
                disabled={pending}
              >
                <Trash2 className="size-4" />
              </IconBtn>
            </span>
          </div>
        </>
      )}
    </li>
  );

  return (
    <div className="mx-auto max-w-[44rem]">
      <h1 className="sr-only">Ghi chú của chuyến</h1>

      <Composer tripId={tripId} pending={pending} run={run} />

      {notes.length === 0 ? (
        <div className="mt-10">
          <p className="text-base font-medium">Chưa có ghi chú nào</p>
          <p className="mt-1.5 text-sm text-muted-foreground">Chỗ này hợp để ghi:</p>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
            {[
              "mã đặt phòng, số hiệu chuyến bay, biển số xe thuê",
              "số điện thoại chủ nhà, tài xế",
              "dặn dò cả nhóm trước giờ khởi hành",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <span aria-hidden className="mt-2.5 size-1 shrink-0 rounded-full bg-warm" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-9">
          {pinned.length > 0 && (
            <section>
              {rest.length > 0 && (
                <h2 className={cn(MICRO, "flex items-center gap-1.5 pb-4 text-warm")}>
                  <Pin className="size-3.5" aria-hidden />
                  Đã ghim
                </h2>
              )}
              <ul className="divide-y divide-border/60">{pinned.map(row)}</ul>
            </section>
          )}

          {rest.length > 0 && (
            <section className={cn(pinned.length > 0 && "mt-7 border-t pt-7")}>
              {pinned.length > 0 && (
                <h2 className={cn(MICRO, "pb-4 text-muted-foreground")}>Gần đây</h2>
              )}
              <ul className="divide-y divide-border/60">{rest.map(row)}</ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Composer({
  tripId,
  pending,
  run,
}: {
  tripId: string;
  pending: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, done?: () => void) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-border px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-foreground/25 hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <NotebookPen className="size-4 shrink-0" aria-hidden />
        Ghi gì đó cho cả nhóm…
      </button>
    );

  return (
    <NoteForm
      initial=""
      pending={pending}
      submitLabel="Thêm ghi chú"
      onCancel={() => setOpen(false)}
      onSubmit={(body) => run(() => addNote(tripId, body), () => setOpen(false))}
    />
  );
}

function NoteForm({
  initial,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: string;
  pending: boolean;
  submitLabel: string;
  onSubmit: (body: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const body = value.trim();
  const dirty = body.length > 0 && body !== initial.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty) onSubmit(body);
      }}
    >
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, MAX))}
        rows={4}
        autoFocus
        placeholder="Mã đặt phòng, số chủ nhà, dặn dò cả nhóm…"
        aria-label="Nội dung ghi chú"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && dirty) onSubmit(body);
          if (e.key === "Escape") onCancel();
        }}
        className="resize-y rounded-xl text-base leading-[1.7]"
      />
      <div className="mt-2.5 flex items-center gap-3">
        <span className="text-xs tabular-nums text-muted-foreground">
          {value.length > MAX - 200 ? `${value.length}/${MAX}` : ""}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={pending}
            className="h-9 rounded-lg"
          >
            <X className="size-4" aria-hidden />
            Huỷ
          </Button>
          <Button type="submit" disabled={pending || !dirty} className="h-9 rounded-lg">
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Check className="size-4" aria-hidden />
            )}
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
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
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        danger ? "hover:text-destructive" : "hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
