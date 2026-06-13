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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createPlace,
  updatePlace,
  type PlaceFormInput,
} from "./actions";

type ProvinceOption = { id: string; name: string };

export type PlaceFormValues = PlaceFormInput;

const EMPTY: PlaceFormValues = {
  name: "",
  slug: "",
  kind: "province",
  parentId: null,
  tagline: "",
  description: "",
  tags: "",
  status: "draft",
  isFeatured: false,
  order: "",
};

export function PlaceForm({
  mode,
  placeId,
  provinces,
  initial,
}: {
  mode: "create" | "edit";
  placeId?: string;
  provinces: ProvinceOption[];
  initial?: Partial<PlaceFormValues>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<PlaceFormValues>({
    ...EMPTY,
    ...initial,
  });
  // slug tự suy từ name cho tới khi người dùng tự sửa slug
  const [slugTouched, setSlugTouched] = useState(
    mode === "edit" && Boolean(initial?.slug),
  );

  const slugPreview = slugTouched ? values.slug : slugify(values.name);

  function set<K extends keyof PlaceFormValues>(key: K, v: PlaceFormValues[K]) {
    setValues((p) => ({ ...p, [key]: v }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: PlaceFormValues = {
      ...values,
      slug: slugPreview,
      parentId: values.kind === "destination" ? values.parentId : null,
    };
    startTransition(async () => {
      const res =
        mode === "create"
          ? await createPlace(payload)
          : await updatePlace(placeId!, payload);
      if (res.ok) {
        router.push("/cms/places");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {/* Loại */}
      <div className="space-y-2">
        <Label>Loại</Label>
        <Select
          value={values.kind}
          onValueChange={(v) => set("kind", v as PlaceFormValues["kind"])}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="province">Tỉnh / Thành phố</SelectItem>
            <SelectItem value="destination">Điểm đến lớn</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {values.kind === "province"
            ? "Tỉnh là node gốc, không thuộc nơi nào."
            : "Điểm đến lớn (Sa Pa, Hội An…) phải thuộc một tỉnh."}
        </p>
      </div>

      {/* Tỉnh cha — chỉ khi là điểm đến */}
      {values.kind === "destination" && (
        <div className="space-y-2">
          <Label>Tỉnh cha</Label>
          <Select
            value={values.parentId ?? ""}
            onValueChange={(v) => set("parentId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn tỉnh…" />
            </SelectTrigger>
            <SelectContent>
              {provinces.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  Chưa có tỉnh nào — tạo tỉnh trước.
                </div>
              ) : (
                provinces.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Tên */}
      <div className="space-y-2">
        <Label htmlFor="name">Tên</Label>
        <Input
          id="name"
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="vd: Hạ Long"
          required
        />
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <Label htmlFor="slug">Slug (URL)</Label>
        <Input
          id="slug"
          value={slugPreview}
          onChange={(e) => {
            setSlugTouched(true);
            set("slug", e.target.value);
          }}
          placeholder="ha-long"
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">
          Đường dẫn: <span className="font-mono">/diem-den/{slugPreview || "…"}</span>
          {!slugTouched && " (tự tạo từ tên)"}
        </p>
      </div>

      {/* Tagline */}
      <div className="space-y-2">
        <Label htmlFor="tagline">Tagline</Label>
        <Input
          id="tagline"
          value={values.tagline}
          onChange={(e) => set("tagline", e.target.value)}
          placeholder="vd: Vịnh di sản giữa trùng khơi"
        />
        <p className="text-xs text-muted-foreground">
          Câu slogan ngắn hiển thị dưới tên (khác mô tả).
        </p>
      </div>

      {/* Mô tả */}
      <div className="space-y-2">
        <Label htmlFor="description">Mô tả</Label>
        <Textarea
          id="description"
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Giới thiệu ngắn về nơi này…"
          rows={5}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          value={values.tags}
          onChange={(e) => set("tags", e.target.value)}
          placeholder="biển, view đẹp, hợp gia đình"
        />
        <p className="text-xs text-muted-foreground">
          Phân tách bằng dấu phẩy.
        </p>
      </div>

      {/* Trạng thái + Thứ tự */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Trạng thái</Label>
          <Select
            value={values.status}
            onValueChange={(v) => set("status", v as PlaceFormValues["status"])}
          >
            <SelectTrigger>
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
            type="number"
            value={values.order}
            onChange={(e) => set("order", e.target.value)}
            placeholder="vd: 1 (nhỏ → đứng trước)"
          />
        </div>
      </div>

      {/* Nổi bật */}
      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <Label htmlFor="featured" className="cursor-pointer">
            Nổi bật
          </Label>
          <p className="text-xs text-muted-foreground">
            Ưu tiên hiển thị ở đầu danh sách & trang chủ.
          </p>
        </div>
        <Switch
          id="featured"
          checked={values.isFeatured}
          onCheckedChange={(v) => set("isFeatured", v)}
        />
      </div>

      {/* Hành động */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {mode === "create" ? "Tạo" : "Lưu thay đổi"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          asChild
          className={cn(pending && "pointer-events-none opacity-50")}
        >
          <Link href="/cms/places">Hủy</Link>
        </Button>
      </div>
    </form>
  );
}
