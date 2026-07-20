"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bold, ImagePlus, Italic, Loader2, Smile, X } from "@/components/icons";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { useUploadThing } from "@/lib/uploadthing";
import { COMPOSER_THREAD_TYPES, type ThreadTypeValue } from "@/lib/community";
import { threadTypeIcon } from "./thread-type-badge";
import { createThread } from "@/app/cong-dong/actions";

export type PlaceOption = { id: string; name: string };

const EMOJIS = [
  "😀", "😄", "😁", "😆", "😅", "😂", "🙂", "😉", "😍", "😘",
  "😎", "🤩", "🥳", "😋", "🤔", "😴", "😮", "😢", "😭", "😡",
  "👍", "👏", "🙏", "💪", "🤝", "❤️", "🔥", "✨", "🎉", "💯",
  "☀️", "🌧️", "🏖️", "⛰️", "🏝️", "🗺️", "✈️", "🚗", "🏍️", "🚆",
  "🍜", "🦐", "☕", "🍺", "📸", "💰", "📍", "🧳", "🌅", "🌊",
];

const stripLen = (html: string) =>
  html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim().length;

export function PostComposer({
  isAuthed,
  currentUserName = null,
  places,
  fixedPlaceId,
  fixedSpotId,
  defaultType = "discussion",
  canPostSale = false,
}: {
  isAuthed: boolean;
  currentUserName?: string | null;
  places?: PlaceOption[];
  fixedPlaceId?: string;
  fixedSpotId?: string;
  defaultType?: ThreadTypeValue;
  canPostSale?: boolean;
}) {
  // CTV đã duyệt được thêm lựa chọn "Rao dịch vụ".
  const typeOptions = canPostSale
    ? [...COMPOSER_THREAD_TYPES, { value: "sale", label: "Rao dịch vụ" }]
    : COMPOSER_THREAD_TYPES;
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const submitting = useRef(false); // khoá chống đăng trùng (double-click)
  const [expanded, setExpanded] = useState(false);
  const [html, setHtml] = useState("");
  const [type, setType] = useState<ThreadTypeValue>(defaultType);
  const [placeId, setPlaceId] = useState(fixedPlaceId ?? "");
  const [departDate, setDepartDate] = useState("");
  const [slots, setSlots] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const { startUpload, isUploading } = useUploadThing("communityImage", {
    onClientUploadComplete: (res) => {
      const got = res.map((r) => r.serverData?.url ?? r.ufsUrl).filter(Boolean);
      setUrls((prev) => [...prev, ...got].slice(0, 6));
      setError(null);
    },
    onUploadError: (e) => setError(e.message),
  });

  if (!isAuthed) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">
        <Link
          href="/login?callbackUrl=/cong-dong"
          className="font-medium text-primary hover:underline"
        >
          Đăng nhập
        </Link>{" "}
        để chia sẻ, hỏi đáp và rủ bạn đồng hành.
      </div>
    );
  }

  const sync = () => setHtml(editorRef.current?.innerHTML ?? "");

  const reset = () => {
    if (editorRef.current) editorRef.current.innerHTML = "";
    setHtml("");
    setUrls([]);
    setType(defaultType);
    setDepartDate("");
    setSlots("");
    setShowEmoji(false);
    setExpanded(false);
    setError(null);
  };

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    sync();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    sync();
  };

  const onPick = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = 6 - urls.length;
    if (room <= 0) return;
    startUpload(Array.from(files).slice(0, room));
  };

  const submit = () => {
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    startTransition(async () => {
      try {
        const res = await createThread({
          body: html,
          type,
          placeId: placeId || null,
          spotId: fixedSpotId ?? null,
          imageUrls: urls,
          departDate: type === "trip" && departDate ? departDate : null,
          slots: type === "trip" && slots ? Number(slots) : null,
        });
        if (res.ok) {
          reset();
          router.refresh();
        } else {
          setError(res.error);
        }
      } finally {
        submitting.current = false;
      }
    });
  };

  const isEmpty = stripLen(html) === 0;
  const canSubmit = (!isEmpty || urls.length > 0) && !pending && !isUploading;

  // ── Thu gọn ──────────────────────────────────────────────
  if (!expanded) {
    const open = () => {
      setExpanded(true);
      requestAnimationFrame(() => editorRef.current?.focus());
    };
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
          >
            {initials(currentUserName)}
          </span>
          <button
            type="button"
            onClick={open}
            className="h-10 flex-1 rounded-full bg-muted/50 px-4 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            Chia sẻ trải nghiệm, hỏi đáp hay rủ nhau đi…
          </button>
        </div>
      </div>
    );
  }

  // ── Mở rộng ──────────────────────────────────────────────
  const addBtn =
    "grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      {/* Người đăng */}
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
        >
          {initials(currentUserName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">
            {currentUserName ?? "Bạn"}
          </p>
          <p className="text-xs text-muted-foreground">Đăng công khai</p>
        </div>
      </div>

      {/* Chọn loại bài — pill có icon */}
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {typeOptions.map((t) => {
          const Icon = threadTypeIcon(t.value);
          const active = type === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value as ThreadTypeValue)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Ô nhập WYSIWYG */}
      <div className="relative mt-3">
        {isEmpty && (
          <span className="pointer-events-none absolute left-0 top-0 text-[0.95rem] text-muted-foreground">
            Bạn muốn chia sẻ điều gì?
          </span>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          onInput={sync}
          onPaste={onPaste}
          className="min-h-[5.5rem] w-full whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed outline-none [&_a]:text-primary [&_b]:font-semibold [&_em]:italic [&_i]:italic [&_strong]:font-semibold"
        />
      </div>

      {/* Ảnh đã chọn */}
      {urls.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {urls.map((u, i) => (
            <div key={u} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
              <Image src={u} alt="" fill sizes="80px" className="object-cover" />
              <button
                type="button"
                onClick={() => setUrls((prev) => prev.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label="Bỏ ảnh"
              >
                <X className="size-3" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Gắn điểm đến (chỉ ở feed tổng) */}
      {places && places.length > 0 && (
        <select
          value={placeId}
          onChange={(e) => setPlaceId(e.target.value)}
          className="mt-3 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
        >
          <option value="">📍 Gắn điểm đến (tùy chọn)</option>
          {places.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      {/* Bài "Tìm bạn đồng hành": ngày khởi hành + số chỗ (tùy chọn) */}
      {type === "trip" && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            📅 Ngày khởi hành
            <input
              type="date"
              value={departDate}
              onChange={(e) => setDepartDate(e.target.value)}
              className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            👥 Số chỗ cần tìm
            <input
              type="number"
              min={1}
              max={99}
              value={slots}
              onChange={(e) => setSlots(e.target.value)}
              placeholder="vd 2"
              className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
            />
          </label>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {/* Thanh "Thêm vào bài" */}
      <div className="relative mt-3 flex items-center justify-between rounded-xl border border-border/60 px-3 py-1.5">
        <span className="text-sm font-medium text-muted-foreground">
          Thêm vào bài
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec("bold")}
            className={addBtn}
            aria-label="In đậm"
          >
            <Bold className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec("italic")}
            className={addBtn}
            aria-label="In nghiêng"
          >
            <Italic className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowEmoji((v) => !v)}
            className={cn(addBtn, showEmoji && "text-primary")}
            aria-label="Cảm xúc"
          >
            <Smile className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isUploading || urls.length >= 6}
            className={cn(addBtn, "disabled:opacity-50")}
            aria-label="Thêm ảnh"
          >
            {isUploading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="size-4" aria-hidden />
            )}
          </button>
        </div>

        {showEmoji && (
          <div className="absolute right-2 top-12 z-20 grid w-[17rem] grid-cols-10 gap-0.5 rounded-xl border border-border/60 bg-popover p-2 shadow-lg shadow-black/10">
            {EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  exec("insertText", em);
                  setShowEmoji(false);
                }}
                className="grid size-6 place-items-center rounded text-lg hover:bg-muted"
              >
                {em}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hành động */}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="inline-flex items-center rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Đang đăng…" : "Đăng"}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => onPick(e.target.files)}
      />
    </div>
  );
}
