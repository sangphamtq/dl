"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapLinkField } from "@/components/cms/map-link-field";
import { AlertCircle, Loader2 } from "@/components/icons";
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
import { Switch } from "@/components/ui/switch";
import { FormSection } from "@/components/cms/form-section";
import {
  createAccommodation,
  updateAccommodation,
  type AccommodationFormInput,
} from "./actions";
import { ACCOMMODATION_CATEGORIES } from "./constants";

export type PlaceOption = { id: string; label: string };
export type AccommodationFormValues = AccommodationFormInput;

const EMPTY: AccommodationFormValues = {
  name: "",
  slug: "",
  description: "",
  category: "",
  placeId: "",
  address: "",
  lat: "",
  lng: "",
  phone: "",
  website: "",
  bookingUrl: "",
  zalo: "",
  facebookUrl: "",
  isVerified: false,
  verifiedNote: "",
  depositPolicy: "",
  notice: "",
  tags: "",
};

export function AccommodationForm({
  mode,
  accommodationId,
  places,
  initial,
}: {
  mode: "create" | "edit";
  accommodationId?: string;
  places: PlaceOption[];
  initial?: Partial<AccommodationFormValues>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<AccommodationFormValues>({
    ...EMPTY,
    ...initial,
  });
  const [slugTouched, setSlugTouched] = useState(
    mode === "edit" && Boolean(initial?.slug),
  );

  const slugPreview = slugTouched ? values.slug : slugify(values.name);

  function set<K extends keyof AccommodationFormValues>(
    key: K,
    v: AccommodationFormValues[K],
  ) {
    setValues((p) => ({ ...p, [key]: v }));
  }

  const [snapshot] = useState(() =>
    JSON.stringify({ ...EMPTY, ...initial }),
  );
  useUnsavedChanges(!pending && JSON.stringify(values) !== snapshot);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: AccommodationFormValues = { ...values, slug: slugPreview };
    startTransition(async () => {
      const res =
        mode === "create"
          ? await createAccommodation(payload)
          : await updateAccommodation(accommodationId!, payload);
      if (res.ok) {
        router.push(`/cms/accommodations/${res.id}`);
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
        <FormSection
          title="Phân loại"
          description="Loại hình lưu trú và nơi (tỉnh/điểm đến) chứa cơ sở."
        >
          <div className="space-y-2">
            <Label>Nơi chứa (Place)</Label>
            <Combobox
              options={places.map((p) => ({ value: p.id, label: p.label }))}
              value={values.placeId}
              onChange={(v) => set("placeId", v)}
              placeholder="Chọn tỉnh / điểm đến…"
              searchPlaceholder="Tìm nơi…"
            />
          </div>
          <div className="space-y-2">
            <Label>Loại hình</Label>
            <Select
              value={values.category}
              onValueChange={(v) => set("category", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn loại hình…" />
              </SelectTrigger>
              <SelectContent>
                {ACCOMMODATION_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FormSection>

        <FormSection
          title="Thông tin cơ bản"
          description="Tên, đường dẫn và mô tả cơ sở."
        >
          <div className="space-y-2">
            <Label htmlFor="name">Tên</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="vd: Mũi Né Bay Resort"
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
              placeholder="mui-ne-bay-resort"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Đường dẫn:{" "}
              <span className="font-mono">/luu-tru/{slugPreview || "…"}</span>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Cơ sở có gì nổi bật, tiện nghi, vị trí…"
              rows={5}
            />
          </div>
        </FormSection>

        <FormSection
          title="Vị trí & đặt phòng"
          description="Địa chỉ, toạ độ, giá và liên hệ. Tùy chọn."
        >
          <div className="space-y-2">
            <Label htmlFor="address">Địa chỉ</Label>
            <Input
              id="address"
              value={values.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Số nhà, đường, khu vực…"
            />
          </div>
          <MapLinkField
            onPick={(lat, lng) => {
              set("lat", lat);
              set("lng", lng);
            }}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lat">Vĩ độ (lat)</Label>
              <Input
                id="lat"
                type="number"
                step="any"
                value={values.lat}
                onChange={(e) => set("lat", e.target.value)}
                placeholder="10.9333"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lng">Kinh độ (lng)</Label>
              <Input
                id="lng"
                type="number"
                step="any"
                value={values.lng}
                onChange={(e) => set("lng", e.target.value)}
                placeholder="108.287"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <Label htmlFor="bookingUrl">Link đặt phòng</Label>
            <Input
              id="bookingUrl"
              value={values.bookingUrl}
              onChange={(e) => set("bookingUrl", e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="zalo">Zalo (chính chủ)</Label>
              <Input
                id="zalo"
                value={values.zalo}
                onChange={(e) => set("zalo", e.target.value)}
                placeholder="SĐT hoặc link Zalo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebookUrl">Facebook (chính chủ)</Label>
              <Input
                id="facebookUrl"
                value={values.facebookUrl}
                onChange={(e) => set("facebookUrl", e.target.value)}
                placeholder="https://facebook.com/…"
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Xác minh chính chủ"
          description="Bật khi đã kiểm chứng đây là chủ thật (gọi điện, gặp trực tiếp…). Hiển thị huy hiệu “Đã xác minh” trên web."
        >
          <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
            <div className="space-y-0.5">
              <Label htmlFor="isVerified">Đã xác minh chính chủ</Label>
              <p className="text-xs text-muted-foreground">
                Khách thấy huy hiệu tin cậy ở card &amp; chi tiết.
              </p>
            </div>
            <Switch
              id="isVerified"
              checked={values.isVerified}
              onCheckedChange={(v) => set("isVerified", v)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verifiedNote">Ghi chú xác minh (nội bộ)</Label>
            <Textarea
              id="verifiedNote"
              value={values.verifiedNote}
              onChange={(e) => set("verifiedNote", e.target.value)}
              placeholder="vd: Gọi xác nhận 20/6, gặp chủ tại cơ sở…"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Chỉ hiển thị trong CMS, không công khai.
            </p>
          </div>
        </FormSection>

        <FormSection
          title="An toàn giao dịch"
          description="Chống lừa cọc — KHÔNG nhập số tài khoản tại đây."
        >
          <div className="space-y-2">
            <Label htmlFor="depositPolicy">Chính sách cọc</Label>
            <Textarea
              id="depositPolicy"
              value={values.depositPolicy}
              onChange={(e) => set("depositPolicy", e.target.value)}
              placeholder="vd: Cọc 50% qua chính chủ; số dư trả khi nhận phòng."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notice">Cảnh báo / lưu ý</Label>
            <Input
              id="notice"
              value={values.notice}
              onChange={(e) => set("notice", e.target.value)}
              placeholder="vd: Chỉ liên hệ qua kênh hiển thị tại đây."
            />
          </div>
        </FormSection>

        <FormSection title="Thẻ" description="Nhãn tự do để lọc & gợi ý.">
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={values.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="gần biển, hồ bơi, hợp gia đình"
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
          <Link href="/cms/accommodations">Hủy</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {mode === "create" ? "Tạo cơ sở" : "Lưu thay đổi"}
        </Button>
      </div>
    </form>
  );
}
