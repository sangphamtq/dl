"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
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
import { Combobox } from "@/components/ui/combobox";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import { Switch } from "@/components/ui/switch";
import { FormSection } from "@/components/cms/form-section";
import { RichTextEditor } from "@/components/cms/rich-text-editor";
import {
  createActivity,
  updateActivity,
  type ActivityFormInput,
  type TicketTierInput,
} from "./actions";
import { ACTIVITY_CATEGORIES } from "./constants";

export type Option = { id: string; label: string };
export type ActivityFormValues = ActivityFormInput;

const EMPTY: ActivityFormValues = {
  name: "",
  slug: "",
  description: "",
  content: "",
  kind: "common",
  category: "",
  placeId: "",
  durationText: "",
  seasonText: "",
  operatorName: "",
  bookingUrl: "",
  phone: "",
  website: "",
  ticketFree: false,
  ticketTiers: [],
  spotIds: [],
  tags: "",
};

export function ActivityForm({
  mode,
  activityId,
  places,
  spots,
  initial,
}: {
  mode: "create" | "edit";
  activityId?: string;
  places: Option[];
  spots: Option[];
  initial?: Partial<ActivityFormValues>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<ActivityFormValues>({
    ...EMPTY,
    ...initial,
  });
  const [slugTouched, setSlugTouched] = useState(
    mode === "edit" && Boolean(initial?.slug),
  );

  const slugPreview = slugTouched ? values.slug : slugify(values.name);

  function set<K extends keyof ActivityFormValues>(
    key: K,
    v: ActivityFormValues[K],
  ) {
    setValues((p) => ({ ...p, [key]: v }));
  }

  function addTier() {
    setValues((p) => ({
      ...p,
      ticketTiers: [...p.ticketTiers, { label: "", price: "", note: "" }],
    }));
  }

  function removeTier(index: number) {
    setValues((p) => ({
      ...p,
      ticketTiers: p.ticketTiers.filter((_, i) => i !== index),
    }));
  }

  function updateTier(
    index: number,
    key: keyof TicketTierInput,
    value: string,
  ) {
    setValues((p) => ({
      ...p,
      ticketTiers: p.ticketTiers.map((t, i) =>
        i === index ? { ...t, [key]: value } : t,
      ),
    }));
  }

  const [snapshot] = useState(() =>
    JSON.stringify({ ...EMPTY, ...initial }),
  );
  useUnsavedChanges(!pending && JSON.stringify(values) !== snapshot);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: ActivityFormValues = { ...values, slug: slugPreview };
    startTransition(async () => {
      const res =
        mode === "create"
          ? await createActivity(payload)
          : await updateActivity(activityId!, payload);
      if (res.ok) {
        router.push(`/cms/activities/${res.id}`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit}>
      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div className="divide-y">
        {/* Phân loại & nơi */}
        <FormSection
          title="Phân loại"
          description="Loại trải nghiệm và nơi (tỉnh/điểm đến) của hoạt động."
        >
          <div className="space-y-2">
            <Label>Nơi (Place)</Label>
            <Combobox
              options={places.map((p) => ({ value: p.id, label: p.label }))}
              value={values.placeId}
              onChange={(v) => set("placeId", v)}
              placeholder="Chọn tỉnh / điểm đến…"
              searchPlaceholder="Tìm nơi…"
            />
          </div>
          <div className="space-y-2">
            <Label>Mức độ</Label>
            <Select value={values.kind} onValueChange={(v) => set("kind", v)}>
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="Chọn mức độ…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="experience">
                  Trải nghiệm / dịch vụ (tour, lớp học)
                </SelectItem>
                <SelectItem value="common">
                  Hoạt động chung (lặp ở nhiều địa điểm)
                </SelectItem>
                <SelectItem value="spot">
                  Đặc trưng địa điểm (chỉ 1 nơi, ẩn ở cấp điểm đến)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Loại</Label>
            <Select
              value={values.category}
              onValueChange={(v) => set("category", v)}
            >
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="Chọn loại…" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FormSection>

        {/* Thông tin cơ bản */}
        <FormSection
          title="Thông tin cơ bản"
          description="Đặt tên ở mức trải nghiệm (vd 'Chèo kayak'), không nhúng tên địa điểm."
        >
          <div className="space-y-2">
            <Label htmlFor="name">Tên</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="vd: Chèo kayak"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              value={slugPreview}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value);
              }}
              placeholder="cheo-kayak"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Đường dẫn:{" "}
              <span className="font-mono">/hoat-dong/{slugPreview || "…"}</span>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả ngắn</Label>
            <Textarea
              id="description"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Giới thiệu ngắn gọn (hiển thị ở card, meta SEO, dưới hero)…"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              2–5 câu. Dùng cho card, kết quả tìm kiếm và đoạn dẫn dưới hero.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Nội dung chi tiết</Label>
            <RichTextEditor
              value={values.content}
              onChange={(html) => set("content", html)}
            />
            <p className="text-xs text-muted-foreground">
              Tùy chọn. Bài viết dày dặn (tiêu đề, danh sách, ảnh…) hiển thị ở
              đầu trang hoạt động. Để trống thì trang dùng mô tả ngắn ở trên.
            </p>
          </div>
        </FormSection>

        {/* Địa điểm diễn ra (M:N) */}
        <FormSection
          title="Diễn ra ở đâu"
          description="Liên kết các Địa điểm nhỏ mà hoạt động này diễn ra (M:N)."
        >
          <div className="space-y-2">
            <Label>Địa điểm liên kết</Label>
            <MultiCombobox
              options={spots.map((s) => ({ value: s.id, label: s.label }))}
              values={values.spotIds}
              onChange={(v) => set("spotIds", v)}
              placeholder="Chọn địa điểm…"
              searchPlaceholder="Tìm địa điểm…"
            />
            <p className="text-xs text-muted-foreground">
              Để trống nếu hoạt động không gắn điểm cụ thể (vd thủy phi cơ).
            </p>
          </div>
        </FormSection>

        {/* Chi tiết trải nghiệm */}
        <FormSection
          title="Chi tiết trải nghiệm"
          description="Thời lượng, mùa — thông tin khách luôn hỏi."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="durationText">Thời lượng</Label>
              <Input
                id="durationText"
                value={values.durationText}
                onChange={(e) => set("durationText", e.target.value)}
                placeholder="nửa ngày, 2N1Đ"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seasonText">Mùa / thời điểm</Label>
              <Input
                id="seasonText"
                value={values.seasonText}
                onChange={(e) => set("seasonText", e.target.value)}
                placeholder="tháng 9–11"
              />
            </div>
          </div>
        </FormSection>

        {/* Đơn vị & đặt chỗ */}
        <FormSection
          title="Đơn vị & đặt chỗ"
          description="Đơn vị khai thác / giá vé / liên hệ (nếu có)."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="operatorName">Đơn vị khai thác</Label>
              <Input
                id="operatorName"
                value={values.operatorName}
                onChange={(e) => set("operatorName", e.target.value)}
                placeholder="vd: Công ty du thuyền X"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Điện thoại</Label>
              <Input
                id="phone"
                value={values.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={values.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookingUrl">Link đặt chỗ</Label>
              <Input
                id="bookingUrl"
                value={values.bookingUrl}
                onChange={(e) => set("bookingUrl", e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>

          {/* Giá vé / phí tham gia */}
          <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
            <div className="space-y-0.5">
              <Label htmlFor="ticketFree">Miễn phí tham gia</Label>
              <p className="text-xs text-muted-foreground">
                Bật nếu không thu phí. Khi bật sẽ ẩn bảng giá.
              </p>
            </div>
            <Switch
              id="ticketFree"
              checked={values.ticketFree}
              onCheckedChange={(v) => set("ticketFree", v)}
            />
          </div>

          {!values.ticketFree && (
            <div className="space-y-2">
              <Label>Giá vé</Label>
              {values.ticketTiers.length > 0 && (
                <div className="space-y-2">
                  {values.ticketTiers.map((t, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Input
                        value={t.label}
                        onChange={(e) => updateTier(i, "label", e.target.value)}
                        placeholder="Người lớn"
                        className="flex-1"
                        aria-label="Tên loại vé"
                      />
                      <div className="relative w-32 shrink-0 sm:w-40">
                        <Input
                          value={t.price}
                          onChange={(e) =>
                            updateTier(i, "price", e.target.value)
                          }
                          type="number"
                          min="0"
                          step="1000"
                          placeholder="Miễn phí"
                          className="pr-7"
                          aria-label="Giá vé (VND)"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          đ
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTier(i)}
                        aria-label="Xóa loại vé"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTier}
              >
                <Plus className="size-4" aria-hidden />
                Thêm loại vé
              </Button>
              <p className="text-xs text-muted-foreground">
                Để trống giá nghĩa là miễn phí cho loại vé đó.
              </p>
            </div>
          )}
        </FormSection>

        {/* Thẻ */}
        <FormSection title="Thẻ" description="Nhãn tự do để lọc & gợi ý.">
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={values.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="mạo hiểm, hợp gia đình"
            />
            <p className="text-xs text-muted-foreground">
              Phân tách bằng dấu phẩy.
            </p>
          </div>
        </FormSection>
      </div>

      <div className="sticky bottom-0 z-10 mt-2 flex items-center justify-end gap-3 border-t bg-background/90 py-4 backdrop-blur">
        <Button
          type="button"
          variant="ghost"
          asChild
          className={cn(pending && "pointer-events-none opacity-50")}
        >
          <Link href="/cms/activities">Hủy</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {mode === "create" ? "Tạo hoạt động" : "Lưu thay đổi"}
        </Button>
      </div>
    </form>
  );
}
