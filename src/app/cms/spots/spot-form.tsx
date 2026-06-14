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
import { FormSection } from "@/components/cms/form-section";
import { createSpot, updateSpot, type SpotFormInput } from "./actions";
import { SPOT_CATEGORIES, PRICE_RANGES } from "./constants";

export type PlaceOption = { id: string; label: string };
export type SpotFormValues = SpotFormInput;

const EMPTY: SpotFormValues = {
  name: "",
  slug: "",
  description: "",
  category: "",
  placeId: "",
  address: "",
  lat: "",
  lng: "",
  openingHours: "",
  phone: "",
  website: "",
  bookingUrl: "",
  priceRange: "",
  bestTime: "",
  ticketInfo: "",
  notice: "",
  tags: "",
};

export function SpotForm({
  mode,
  spotId,
  places,
  initial,
}: {
  mode: "create" | "edit";
  spotId?: string;
  places: PlaceOption[];
  initial?: Partial<SpotFormValues>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<SpotFormValues>({ ...EMPTY, ...initial });
  const [slugTouched, setSlugTouched] = useState(
    mode === "edit" && Boolean(initial?.slug),
  );

  const slugPreview = slugTouched ? values.slug : slugify(values.name);

  function set<K extends keyof SpotFormValues>(key: K, v: SpotFormValues[K]) {
    setValues((p) => ({ ...p, [key]: v }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: SpotFormValues = { ...values, slug: slugPreview };
    startTransition(async () => {
      const res =
        mode === "create"
          ? await createSpot(payload)
          : await updateSpot(spotId!, payload);
      if (res.ok) {
        router.push(`/cms/spots/${res.id}`);
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
        {/* Phân loại & nơi chứa */}
        <FormSection
          title="Phân loại"
          description="Loại địa hình và nơi (tỉnh/điểm đến) chứa địa điểm này."
        >
          <div className="space-y-2">
            <Label>Nơi chứa (Place)</Label>
            <Combobox
              options={places.map((p) => ({ value: p.id, label: p.label }))}
              value={values.placeId}
              onChange={(v) => set("placeId", v)}
              placeholder="Chọn tỉnh / điểm đến…"
              searchPlaceholder="Tìm nơi…"
              emptyText="Không tìm thấy."
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
                {SPOT_CATEGORIES.map((c) => (
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
          description="Tên, đường dẫn và mô tả địa điểm."
        >
          <div className="space-y-2">
            <Label htmlFor="name">Tên</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="vd: Hang Sửng Sốt"
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
              placeholder="hang-sung-sot"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Đường dẫn:{" "}
              <span className="font-mono">/dia-diem/{slugPreview || "…"}</span>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Giới thiệu về địa điểm…"
              rows={5}
            />
          </div>
        </FormSection>

        {/* Vị trí & cơ sở */}
        <FormSection
          title="Vị trí & thông tin thực địa"
          description="Địa chỉ, toạ độ bản đồ, giờ/vé và lưu ý. Tùy chọn."
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lat">Vĩ độ (lat)</Label>
              <Input
                id="lat"
                type="number"
                step="any"
                value={values.lat}
                onChange={(e) => set("lat", e.target.value)}
                placeholder="20.9101"
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
                placeholder="107.1839"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="openingHours">Giờ mở cửa</Label>
              <Input
                id="openingHours"
                value={values.openingHours}
                onChange={(e) => set("openingHours", e.target.value)}
                placeholder="7:00 – 17:00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticketInfo">Vé</Label>
              <Input
                id="ticketInfo"
                value={values.ticketInfo}
                onChange={(e) => set("ticketInfo", e.target.value)}
                placeholder="120k/người, trẻ em miễn phí"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bestTime">Thời điểm đẹp</Label>
              <Input
                id="bestTime"
                value={values.bestTime}
                onChange={(e) => set("bestTime", e.target.value)}
                placeholder="sáng sớm, mùa thu…"
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="notice">Lưu ý / cảnh báo</Label>
            <Input
              id="notice"
              value={values.notice}
              onChange={(e) => set("notice", e.target.value)}
              placeholder="Tạm đóng cửa, cần xin phép…"
            />
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
            <Label htmlFor="bookingUrl">Link đặt vé/đặt chỗ</Label>
            <Input
              id="bookingUrl"
              value={values.bookingUrl}
              onChange={(e) => set("bookingUrl", e.target.value)}
              placeholder="https://…"
            />
          </div>
        </FormSection>

        {/* Thẻ */}
        <FormSection
          title="Thẻ"
          description="Nhãn tự do để lọc & gợi ý."
        >
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={values.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="view đẹp, check-in, hợp gia đình"
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
          <Link href="/cms/spots">Hủy</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {mode === "create" ? "Tạo địa điểm" : "Lưu thay đổi"}
        </Button>
      </div>
    </form>
  );
}
