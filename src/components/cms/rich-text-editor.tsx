"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExt from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Style chung cho nội dung rich text khi HIỂN THỊ (chi tiết CMS & công khai) —
// và cũng dùng làm style cho vùng soạn thảo Tiptap (WYSIWYG khớp lúc xem).
export const proseClass =
  "max-w-none break-words leading-7 text-foreground/90 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_a]:text-primary [&_a]:underline [&_a]:break-words [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg [&_iframe]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:my-4 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2";

function TBtn({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      // Giữ vùng chọn trong editor khi bấm nút toolbar.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-8 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40",
        active && "bg-primary/10 text-primary",
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-border/60" aria-hidden />;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  simple = false,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  simple?: boolean;
}) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
      ImageExt.configure({ inline: false }),
      Placeholder.configure({ placeholder: placeholder ?? "Viết nội dung…" }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: cn(
          proseClass,
          simple ? "min-h-[180px]" : "min-h-[300px]",
          "max-h-[60vh] overflow-y-auto px-3.5 py-2.5 focus:outline-none",
        ),
      },
    },
    onUpdate: ({ editor }) => onChangeRef.current(editor.getHTML()),
  });

  // Đồng bộ khi value đổi từ ngoài (vd nạp dữ liệu) mà không đang gõ.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div
        className={cn(
          "rounded-lg border border-input bg-background",
          simple ? "min-h-[220px]" : "min-h-[340px]",
        )}
      />
    );
  }

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/editor-upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json?.url)
        editor.chain().focus().setImage({ src: json.url, alt: file.name }).run();
    } finally {
      setUploading(false);
    }
  };

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Liên kết (để trống để bỏ):", prev ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="rounded-lg border border-input bg-background">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 p-1">
        <TBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          label="In đậm"
        >
          <Bold className="size-4" />
        </TBtn>
        <TBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          label="In nghiêng"
        >
          <Italic className="size-4" />
        </TBtn>
        {!simple && (
          <>
            <TBtn
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive("underline")}
              label="Gạch chân"
            >
              <Underline className="size-4" />
            </TBtn>
            <TBtn
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive("strike")}
              label="Gạch ngang"
            >
              <Strikethrough className="size-4" />
            </TBtn>
          </>
        )}

        {!simple && (
          <>
            <Sep />
            <TBtn
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              active={editor.isActive("heading", { level: 2 })}
              label="Tiêu đề 2"
            >
              <Heading2 className="size-4" />
            </TBtn>
            <TBtn
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              active={editor.isActive("heading", { level: 3 })}
              label="Tiêu đề 3"
            >
              <Heading3 className="size-4" />
            </TBtn>
          </>
        )}

        <Sep />
        <TBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          label="Danh sách"
        >
          <List className="size-4" />
        </TBtn>
        {!simple && (
          <>
            <TBtn
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive("orderedList")}
              label="Danh sách số"
            >
              <ListOrdered className="size-4" />
            </TBtn>
            <TBtn
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive("blockquote")}
              label="Trích dẫn"
            >
              <Quote className="size-4" />
            </TBtn>
          </>
        )}

        <Sep />
        <TBtn onClick={setLink} active={editor.isActive("link")} label="Liên kết">
          <Link2 className="size-4" />
        </TBtn>
        <TBtn
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          label="Chèn ảnh"
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
        </TBtn>

        {!simple && (
          <>
            <Sep />
            <TBtn
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              active={editor.isActive({ textAlign: "left" })}
              label="Căn trái"
            >
              <AlignLeft className="size-4" />
            </TBtn>
            <TBtn
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
              active={editor.isActive({ textAlign: "center" })}
              label="Căn giữa"
            >
              <AlignCenter className="size-4" />
            </TBtn>
            <TBtn
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              active={editor.isActive({ textAlign: "right" })}
              label="Căn phải"
            >
              <AlignRight className="size-4" />
            </TBtn>
          </>
        )}

        <span className="ml-auto" />
        <TBtn
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          label="Hoàn tác"
        >
          <Undo2 className="size-4" />
        </TBtn>
        <TBtn
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          label="Làm lại"
        >
          <Redo2 className="size-4" />
        </TBtn>
      </div>

      <EditorContent editor={editor} />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadImage(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
