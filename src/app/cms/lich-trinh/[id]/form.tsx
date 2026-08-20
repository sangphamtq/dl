"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTemplate } from "../actions";

type Initial = {
  title: string;
  slug: string;
  summary: string;
  placeId: string;
  status: string;
  isFeatured: boolean;
  order: string;
};

const NO_PLACE = "__none__";

export function TemplateForm({
  id,
  initial,
  places,
}: {
  id: string;
  initial: Initial;
  places: { id: string; name: string; kind: string }[];
}) {
  const [form, setForm] = useState(initial);
  const [pending, start] = useTransition();

  function set<K extends keyof Initial>(key: K, value: Initial[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateTemplate(id, form);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success("Đã lưu");
        });
      }}
      className="space-y-5 rounded-2xl border p-5"
    >
      <div className="space-y-2">
        <Label htmlFor="title">Tên lịch trình</Label>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Hạ Long 3N2Đ"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={form.slug}
          onChange={(e) => set("slug", e.target.value)}
          placeholder="ha-long-3n2d"
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">
          Bỏ trống sẽ tự tạo từ tên. URL công khai: /lich-trinh/{form.slug || "…"}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="summary">Tóm tắt</Label>
        <Textarea
          id="summary"
          value={form.summary}
          onChange={(e) => set("summary", e.target.value)}
          rows={2}
          placeholder="Một câu mô tả — hiện trên thẻ và dùng cho SEO."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="place">Gắn với điểm đến</Label>
        <Select
          value={form.placeId || NO_PLACE}
          onValueChange={(v) => set("placeId", v === NO_PLACE ? "" : v)}
        >
          <SelectTrigger id="place">
            <SelectValue placeholder="Không gắn" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_PLACE}>Không gắn</SelectItem>
            {places.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
                <span className="text-muted-foreground">
                  {p.kind === "province" ? " · Tỉnh" : " · Điểm đến"}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Gắn nơi nào thì mẫu này hiện ở trang điểm đến đó.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="status">Trạng thái</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Bản nháp</SelectItem>
              <SelectItem value="published">Đã xuất bản</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="order">Thứ tự</Label>
          <Input
            id="order"
            value={form.order}
            onChange={(e) => set("order", e.target.value)}
            placeholder="Nhỏ → đứng trước"
            inputMode="numeric"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-3">
        <Label htmlFor="featured" className="cursor-pointer">
          Nổi bật
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
            Đưa lên đầu danh sách gợi ý.
          </span>
        </Label>
        <Switch
          id="featured"
          checked={form.isFeatured}
          onCheckedChange={(v) => set("isFeatured", v)}
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Lưu
      </Button>
    </form>
  );
}
