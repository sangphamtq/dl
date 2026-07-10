"use client";

import { useEffect, useRef, useState } from "react";
import {
  useEditor,
  EditorContent,
  Node,
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronLeft,
  ChevronRight,
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
  Trash2,
  Underline,
  Undo2,
} from "@/components/icons";
import { cn } from "@/lib/utils";

// Style chung cho nội dung rich text khi HIỂN THỊ (chi tiết CMS & công khai) —
// và cũng dùng làm style cho vùng soạn thảo Tiptap (WYSIWYG khớp lúc xem).
export const proseClass =
  "max-w-none break-words leading-7 text-foreground/90 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_a]:text-primary [&_a]:underline [&_a]:break-words [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg [&_iframe]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:my-4 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2";

type GalleryImage = { src: string; alt: string };

// Tải nhiều ảnh lên UploadThing (qua /api/editor-upload), trả về [{src,alt}].
async function uploadFiles(files: File[]): Promise<GalleryImage[]> {
  const out: GalleryImage[] = [];
  for (const file of files) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/editor-upload", { method: "POST", body: fd });
    const json = await res.json();
    if (json?.url) out.push({ src: json.url, alt: file.name });
  }
  return out;
}

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

/* ── Thư viện ảnh: 1..N ảnh rộng bằng nhau trên một hàng (tự xuống hàng) ──
   Lưu danh sách ảnh trong 1 attribute; thêm/bớt/đổi thứ tự bằng nút. */
function GalleryView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const images = (node.attrs.images ?? []) as GalleryImage[];
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const addFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const added = await uploadFiles(files);
      if (added.length) updateAttributes({ images: [...images, ...added] });
    } finally {
      setUploading(false);
    }
  };
  const removeAt = (i: number) => {
    if (images.length <= 1) {
      deleteNode();
      return;
    }
    updateAttributes({ images: images.filter((_, j) => j !== i) });
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = images.slice();
    [next[i], next[j]] = [next[j], next[i]];
    updateAttributes({ images: next });
  };

  return (
    <NodeViewWrapper
      className={cn(
        "my-3 rounded-lg",
        selected && "outline outline-2 outline-offset-2 outline-primary",
      )}
    >
      <div className="flex flex-wrap gap-2">
        {images.map((im, i) => (
          <div key={i} className="relative min-w-[8rem] flex-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={im.src}
              alt={im.alt}
              draggable={false}
              className="block aspect-[3/2] w-full rounded-lg object-cover"
            />
            {selected && (
              <div
                contentEditable={false}
                className="absolute inset-x-1 top-1 flex items-center justify-between"
              >
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Chuyển trái"
                    className="grid size-6 place-items-center rounded-md bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background disabled:opacity-40"
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => move(i, 1)}
                    disabled={i === images.length - 1}
                    aria-label="Chuyển phải"
                    className="grid size-6 place-items-center rounded-md bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background disabled:opacity-40"
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => removeAt(i)}
                  aria-label="Xoá ảnh"
                  className="grid size-6 place-items-center rounded-md bg-background/90 text-destructive shadow-sm backdrop-blur transition-colors hover:bg-destructive hover:text-white"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {selected && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          Thêm ảnh
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          if (files.length) addFiles(files);
          e.target.value = "";
        }}
      />
    </NodeViewWrapper>
  );
}

// Node thư viện: atom (không con), chứa danh sách ảnh trong attribute.
// parseHTML nhận cả div[data-gallery] MỚI, div[data-image-group] CŨ, và <img> lẻ.
const Gallery = Node.create({
  name: "gallery",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      images: {
        default: [] as GalleryImage[],
        parseHTML: (el) => {
          const node = el as HTMLElement;
          if (node.tagName === "IMG") {
            const im = node as HTMLImageElement;
            const src = im.getAttribute("src");
            return src ? [{ src, alt: im.getAttribute("alt") ?? "" }] : [];
          }
          return Array.from(node.querySelectorAll("img"))
            .map((i) => ({
              src: i.getAttribute("src") ?? "",
              alt: i.getAttribute("alt") ?? "",
            }))
            .filter((x) => x.src);
        },
      },
    };
  },
  parseHTML() {
    return [
      { tag: "div[data-gallery]" },
      { tag: "div[data-image-group]" },
      { tag: "img" },
    ];
  },
  renderHTML({ node }) {
    const images = (node.attrs.images ?? []) as GalleryImage[];
    return [
      "div",
      { "data-gallery": "" },
      ...images.map((im) => ["img", { src: im.src, alt: im.alt || "" }]),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(GalleryView);
  },
});

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
      Gallery,
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

  // TipTap v3: useEditor KHÔNG tự re-render khi selection đổi → trạng thái nút
  // active bị "đứng". Ép re-render theo selectionUpdate/transaction.
  const [, forceRerender] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const rerender = () => forceRerender((n) => n + 1);
    editor.on("selectionUpdate", rerender);
    editor.on("transaction", rerender);
    return () => {
      editor.off("selectionUpdate", rerender);
      editor.off("transaction", rerender);
    };
  }, [editor]);

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

  // Chèn thư viện ảnh (1..N ảnh) tại con trỏ.
  const insertGallery = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const images = await uploadFiles(files);
      if (images.length)
        editor
          .chain()
          .focus()
          .insertContent({ type: "gallery", attrs: { images } })
          .run();
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
        multiple
        hidden
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          if (files.length) insertGallery(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
