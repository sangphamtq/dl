"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";

// Jodit truy cập window/document → chỉ tải ở client.
const JoditEditor = dynamic(() => import("jodit-react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[440px] items-center justify-center rounded-lg border text-sm text-muted-foreground">
      Đang tải trình soạn thảo…
    </div>
  ),
});

// Style chung cho nội dung rich text khi HIỂN THỊ (chi tiết CMS & blog công khai).
// Jodit lưu căn lề / kích thước ảnh bằng inline style nên giữ nguyên khi render;
// class này lo phần tiêu đề / danh sách / ảnh / trích dẫn.
export const proseClass =
  "max-w-none break-words leading-7 text-foreground/90 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_a]:text-primary [&_a]:underline [&_a]:break-words [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg [&_iframe]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:my-4 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2";

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  // Giữ value ban đầu ổn định (uncontrolled) để Jodit không nhảy con trỏ khi gõ.
  const [initialValue] = useState(value);

  const config = useMemo(
    () => ({
      readonly: false,
      height: 440,
      language: "vi",
      placeholder: placeholder ?? "Viết nội dung…",
      toolbarAdaptive: false,
      statusbar: false,
      askBeforePasteHTML: false,
      askBeforePasteFromWord: false,
      // Ảnh chèn/kéo-thả/dán → tải lên UploadThing (route /api/jodit-upload),
      // chèn URL vào nội dung (không nhúng base64).
      uploader: {
        insertImageAsBase64URI: false,
        url: "/api/jodit-upload",
        format: "json",
      },
    }),
    [placeholder],
  );

  return (
    <JoditEditor
      value={initialValue}
      config={config}
      onChange={(html: string) => onChange(html)}
    />
  );
}
