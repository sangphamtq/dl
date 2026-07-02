"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bold, ImagePlus, Italic, Loader2, Smile, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { useUploadThing } from "@/lib/uploadthing";
import { COMPOSER_THREAD_TYPES, type ThreadTypeValue } from "@/lib/community";
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
  defaultType = "discussion",
  canPostSale = false,
}: {
  isAuthed: boolean;
  currentUserName?: string | null;
  places?: PlaceOption[];
  fixedPlaceId?: string;
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
  const [expanded, setExpanded] = useState(false);
  const [html, setHtml] = useState("");
  const [type, setType] = useState<ThreadTypeValue>(defaultType);
  const [placeId, setPlaceId] = useState(fixedPlaceId ?? "");
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
    setError(null);
    startTransition(async () => {
      const res = await createThread({
        body: html,
        type,
        placeId: placeId || null,
        imageUrls: urls,
      });
      if (res.ok) {
        reset();
        router.refresh();
      } else {
        setError(res.error);
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
        <div className="mt-2 flex items-center gap-1 border-t border-border/50 pt-2">
          <button
            type="button"
            onClick={open}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
          >
            <ImagePlus className="size-4" aria-hidden />
            Ảnh
          </button>
          <button
            type="button"
            onClick={open}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
          >
            <Smile className="size-4" aria-hidden />
            Cảm xúc
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
      {/* Người đăng + loại */}
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
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ThreadTypeValue)}
            className="mt-0.5 rounded-md bg-muted/60 px-2 py-0.5 text-xs font-medium text-foreground outline-none transition-colors hover:bg-muted focus:ring-2 focus:ring-primary/15"
          >
            {typeOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
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
