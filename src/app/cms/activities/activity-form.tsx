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
import { Combobox } from "@/components/ui/combobox";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import { FormSection } from "@/components/cms/form-section";
import { createActivity, updateActivity, type ActivityFormInput } from "./actions";
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_DIFFICULTIES,
  PRICE_RANGES,
} from "./constants";

export type Option = { id: string; label: string };
export type ActivityFormValues = ActivityFormInput;

const EMPTY: ActivityFormValues = {
  name: "",
  slug: "",
  description: "",
  category: "",
  placeId: "",
  difficulty: "",
  durationText: "",
  seasonText: "",
  operatorName: "",
  bookingUrl: "",
  phone: "",
  website: "",
  priceRange: "",
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
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Trải nghiệm này như thế nào…"
              rows={5}
            />
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
          description="Độ khó, thời lượng, mùa — thông tin khách luôn hỏi."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Độ khó</Label>
              <Select
                value={values.difficulty}
                onValueChange={(v) => set("difficulty", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_DIFFICULTIES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          description="Đơn vị khai thác / giá / liên hệ (nếu có)."
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
              <Label>Mức giá</Label>
              <Select
                value={values.priceRange}
                onValueChange={(v) => set("priceRange", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_RANGES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
