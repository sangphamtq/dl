"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSection } from "@/components/cms/form-section";
import { RichTextEditor } from "@/components/cms/rich-text-editor";
import { createPost, updatePost, type PostFormInput } from "./actions";
import { POST_CATEGORIES } from "./constants";

export type PostFormValues = PostFormInput;

const EMPTY: PostFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: "",
  tags: "",
};

export function PostForm({
  mode,
  postId,
  initial,
}: {
  mode: "create" | "edit";
  postId?: string;
  initial?: Partial<PostFormValues>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<PostFormValues>({ ...EMPTY, ...initial });
  const [slugTouched, setSlugTouched] = useState(
    mode === "edit" && Boolean(initial?.slug),
  );

  const slugPreview = slugTouched ? values.slug : slugify(values.title);

  function set<K extends keyof PostFormValues>(key: K, v: PostFormValues[K]) {
    setValues((p) => ({ ...p, [key]: v }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: PostFormValues = { ...values, slug: slugPreview };
    startTransition(async () => {
      const res =
        mode === "create"
          ? await createPost(payload)
          : await updatePost(postId!, payload);
      if (res.ok) {
        router.push(`/cms/posts/${res.id}`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {/* Tiêu đề + nội dung */}
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="title">Tiêu đề</Label>
          <Input
            id="title"
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="vd: Cẩm nang du lịch Hạ Long 3 ngày 2 đêm"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Nội dung</Label>
          <RichTextEditor
            value={values.content}
            onChange={(html) => set("content", html)}
            placeholder="Viết nội dung bài…"
          />
        </div>
      </div>

      <div className="divide-y border-t">
        {/* Tóm tắt */}
        <FormSection
          title="Tóm tắt"
          description="Đoạn mô tả ngắn hiển thị ở card blog & kết quả tìm kiếm."
        >
          <div className="space-y-2">
            <Label htmlFor="excerpt">Tóm tắt (excerpt)</Label>
            <Textarea
              id="excerpt"
              value={values.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
              placeholder="Tóm tắt 1–2 câu, hấp dẫn để tăng lượt bấm."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {values.excerpt.length} ký tự · nên 120–160.
            </p>
          </div>
        </FormSection>

        {/* Search engine listing */}
        <FormSection
          title="Hiển thị trên công cụ tìm kiếm"
          description="Xem trước cách bài hiển thị trên Google & tinh chỉnh đường dẫn."
        >
          {/* Preview kiểu Google SERP */}
          <div className="rounded-lg border bg-card p-4">
            <p className="truncate text-xs text-[#006621] dark:text-emerald-400">
              hanhtrinhviet.vn › blog › {slugPreview || "duong-dan"}
            </p>
            <p className="mt-1 line-clamp-1 text-lg text-[#1a0dab] dark:text-blue-400">
              {values.title || "Tiêu đề bài viết"}
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {values.excerpt ||
                "Đoạn mô tả ngắn sẽ hiển thị ở đây. Hãy viết hấp dẫn để tăng lượt bấm."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Đường dẫn (slug)</Label>
            <Input
              id="slug"
              value={slugPreview}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value);
              }}
              placeholder="cam-nang-ha-long"
              className="font-mono"
            />
          </div>
        </FormSection>

        {/* Phân loại & thẻ */}
        <FormSection
          title="Phân loại & thẻ"
          description="Giúp lọc và gợi ý bài liên quan."
        >
          <div className="space-y-2">
            <Label>Phân loại</Label>
            <Select
              value={values.category}
              onValueChange={(v) => set("category", v)}
            >
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="Chọn phân loại…" />
              </SelectTrigger>
              <SelectContent>
                {POST_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={values.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="hạ long, lịch trình, tiết kiệm"
            />
            <p className="text-xs text-muted-foreground">
              Phân tách bằng dấu phẩy.
            </p>
          </div>
        </FormSection>
      </div>

      <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t bg-background/90 py-4 backdrop-blur">
        <Button
          type="button"
          variant="ghost"
          asChild
          className={cn(pending && "pointer-events-none opacity-50")}
        >
          <Link href="/cms/posts">Hủy</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {mode === "create" ? "Tạo bài viết" : "Lưu thay đổi"}
        </Button>
      </div>
    </form>
  );
}
