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
import {
  createSpecialty,
  updateSpecialty,
  type SpecialtyFormInput,
} from "./actions";
import { SPECIALTY_KINDS, PRICE_RANGES } from "./constants";

export type Option = { id: string; label: string };
export type SpecialtyFormValues = SpecialtyFormInput;

const EMPTY: SpecialtyFormValues = {
  name: "",
  slug: "",
  description: "",
  kind: "dish",
  whereToBuy: "",
  priceRange: "",
  placeId: "",
  eateryIds: [],
  tags: "",
};

export function SpecialtyForm({
  mode,
  specialtyId,
  places,
  eateries,
  initial,
}: {
  mode: "create" | "edit";
  specialtyId?: string;
  places: Option[];
  eateries: Option[];
  initial?: Partial<SpecialtyFormValues>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<SpecialtyFormValues>({
    ...EMPTY,
    ...initial,
  });
  const [slugTouched, setSlugTouched] = useState(
    mode === "edit" && Boolean(initial?.slug),
  );

  const slugPreview = slugTouched ? values.slug : slugify(values.name);
  const isProduct = values.kind === "product";

  function set<K extends keyof SpecialtyFormValues>(
    key: K,
    v: SpecialtyFormValues[K],
  ) {
    setValues((p) => ({ ...p, [key]: v }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: SpecialtyFormValues = { ...values, slug: slugPreview };
    startTransition(async () => {
      const res =
        mode === "create"
          ? await createSpecialty(payload)
          : await updateSpecialty(specialtyId!, payload);
      if (res.ok) {
        router.push(`/cms/specialties/${res.id}`);
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
          description="Món ăn hay sản vật/quà, và thuộc tỉnh/điểm đến nào."
        >
          <div className="space-y-2">
            <Label>Loại</Label>
            <Select value={values.kind} onValueChange={(v) => set("kind", v)}>
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPECIALTY_KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {isProduct
                ? "Sản vật/quà: ghi nơi mua, không gắn quán ăn."
                : "Món ăn: liên kết các quán phục vụ món này."}
            </p>
          </div>
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
        </FormSection>

        {/* Thông tin cơ bản */}
        <FormSection
          title="Thông tin cơ bản"
          description="Đặt tên ở mức món ('Chả mực Hạ Long'), gắn địa danh khi trùng."
        >
          <div className="space-y-2">
            <Label htmlFor="name">Tên</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="vd: Chả mực Hạ Long"
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
              placeholder="cha-muc-ha-long"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Đường dẫn:{" "}
              <span className="font-mono">/dac-san/{slugPreview || "…"}</span>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Món/sản vật này là gì, đặc biệt thế nào…"
              rows={5}
            />
          </div>
          <div className="space-y-2 sm:w-72">
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
        </FormSection>

        {/* Mua/ăn ở đâu */}
        {isProduct ? (
          <FormSection
            title="Mua ở đâu"
            description="Nơi mua sản vật về làm quà (chợ, cửa hàng đặc sản…)."
          >
            <div className="space-y-2">
              <Label htmlFor="whereToBuy">Nơi mua</Label>
              <Textarea
                id="whereToBuy"
                value={values.whereToBuy}
                onChange={(e) => set("whereToBuy", e.target.value)}
                placeholder="vd: Chợ Hạ Long 1, các cửa hàng đặc sản gần bến tàu…"
                rows={3}
              />
            </div>
          </FormSection>
        ) : (
          <FormSection
            title="Ăn ở đâu"
            description="Liên kết vài quán tiêu biểu phục vụ món này (đề xuất, không cần đủ hết)."
          >
            <div className="space-y-2">
              <Label>Quán phục vụ</Label>
              <MultiCombobox
                options={eateries.map((e) => ({ value: e.id, label: e.label }))}
                values={values.eateryIds}
                onChange={(v) => set("eateryIds", v)}
                placeholder="Chọn quán…"
                searchPlaceholder="Tìm quán…"
              />
            </div>
          </FormSection>
        )}

        {/* Thẻ */}
        <FormSection title="Thẻ" description="Nhãn tự do để lọc & gợi ý.">
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={values.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="hải sản, đặc sản, quà"
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
          <Link href="/cms/specialties">Hủy</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {mode === "create" ? "Tạo đặc sản" : "Lưu thay đổi"}
        </Button>
      </div>
    </form>
  );
}
