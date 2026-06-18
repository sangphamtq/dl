"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import type { Province, District, Ward } from "@/lib/locations";
import { loadDistricts, loadWards } from "../places/location-client";
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
import { createEatery, updateEatery, type EateryFormInput } from "./actions";
import type { Option as PlaceOption } from "./options";
import { EATERY_CATEGORIES, MEALS } from "./constants";

export type { PlaceOption };
export type EateryFormValues = EateryFormInput;

const EMPTY: EateryFormValues = {
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
  mapUrl: "",
  meals: [],
  notice: "",
  tags: "",
  provinceCode: "",
  provinceName: "",
  districtCode: "",
  districtName: "",
  wardCode: "",
  wardName: "",
};

export function EateryForm({
  mode,
  eateryId,
  places,
  adminProvinces,
  initial,
}: {
  mode: "create" | "edit";
  eateryId?: string;
  places: PlaceOption[];
  adminProvinces: Province[];
  initial?: Partial<EateryFormValues>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<EateryFormValues>({
    ...EMPTY,
    ...initial,
  });
  const [slugTouched, setSlugTouched] = useState(
    mode === "edit" && Boolean(initial?.slug),
  );

  // Huyện/xã của cấp trên đang chọn (nạp qua cache client → server action).
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [wardsLoading, setWardsLoading] = useState(false);

  const slugPreview = slugTouched ? values.slug : slugify(values.name);

  function set<K extends keyof EateryFormValues>(key: K, v: EateryFormValues[K]) {
    setValues((p) => ({ ...p, [key]: v }));
  }

  // Nạp huyện mỗi khi provinceCode đổi (gồm cả lần đầu khi sửa).
  useEffect(() => {
    const c = Number(values.provinceCode);
    if (!values.provinceCode || !Number.isFinite(c)) return;
    let active = true;
    void (async () => {
      setDistrictsLoading(true);
      try {
        const d = await loadDistricts(c);
        if (active) setDistricts(d);
      } finally {
        if (active) setDistrictsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [values.provinceCode]);

  // Nạp xã mỗi khi districtCode đổi.
  useEffect(() => {
    const c = Number(values.districtCode);
    if (!values.districtCode || !Number.isFinite(c)) return;
    let active = true;
    void (async () => {
      setWardsLoading(true);
      try {
        const w = await loadWards(c);
        if (active) setWards(w);
      } finally {
        if (active) setWardsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [values.districtCode]);

  // Chọn Nơi chứa → tự điền vị trí hành chính theo địa điểm cha (vẫn sửa được).
  function onPlaceChange(placeId: string) {
    const p = places.find((x) => x.id === placeId);
    setDistricts([]);
    setWards([]);
    setValues((prev) => ({
      ...prev,
      placeId,
      provinceCode: p?.provinceCode != null ? String(p.provinceCode) : "",
      provinceName: p?.provinceName ?? "",
      districtCode: p?.districtCode != null ? String(p.districtCode) : "",
      districtName: p?.districtName ?? "",
      wardCode: p?.wardCode != null ? String(p.wardCode) : "",
      wardName: p?.wardName ?? "",
    }));
  }

  function onProvinceChange(c: string) {
    const p = adminProvinces.find((x) => String(x.code) === c);
    setDistricts([]);
    setWards([]);
    setValues((prev) => ({
      ...prev,
      provinceCode: c,
      provinceName: p?.name ?? "",
      districtCode: "",
      districtName: "",
      wardCode: "",
      wardName: "",
    }));
  }

  function onDistrictChange(c: string) {
    const d = districts.find((x) => String(x.code) === c);
    setWards([]);
    setValues((prev) => ({
      ...prev,
      districtCode: c,
      districtName: d?.name ?? "",
      wardCode: "",
      wardName: "",
    }));
  }

  function onWardChange(c: string) {
    const w = wards.find((x) => String(x.code) === c);
    setValues((prev) => ({
      ...prev,
      wardCode: c,
      wardName: w?.name ?? "",
    }));
  }

  function toggleMeal(m: string) {
    setValues((p) => ({
      ...p,
      meals: p.meals.includes(m)
        ? p.meals.filter((x) => x !== m)
        : [...p.meals, m],
    }));
  }

  const [snapshot] = useState(() =>
    JSON.stringify({ ...EMPTY, ...initial }),
  );
  useUnsavedChanges(!pending && JSON.stringify(values) !== snapshot);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: EateryFormValues = { ...values, slug: slugPreview };
    startTransition(async () => {
      const res =
        mode === "create"
          ? await createEatery(payload)
          : await updateEatery(eateryId!, payload);
      if (res.ok) {
        router.push(`/cms/eateries/${res.id}`);
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
          description="Kiểu quán và nơi (tỉnh/điểm đến) chứa quán."
        >
          <div className="space-y-2">
            <Label>Nơi chứa (Place)</Label>
            <Combobox
              options={places.map((p) => ({ value: p.id, label: p.label }))}
              value={values.placeId}
              onChange={onPlaceChange}
              placeholder="Chọn tỉnh / điểm đến…"
              searchPlaceholder="Tìm nơi…"
            />
            <p className="text-xs text-muted-foreground">
              Chọn nơi sẽ tự điền địa chỉ hành chính bên dưới.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Kiểu quán</Label>
            <Select
              value={values.category}
              onValueChange={(v) => set("category", v)}
            >
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="Chọn kiểu…" />
              </SelectTrigger>
              <SelectContent>
                {EATERY_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Bữa phù hợp</Label>
            <div className="flex flex-wrap gap-2">
              {MEALS.map((m) => {
                const active = values.meals.includes(m.value);
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => toggleMeal(m.value)}
                    className={cn(
                      "rounded-full px-3 py-1 text-sm transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70",
                    )}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Khách lọc quán theo bữa — chọn các bữa quán phục vụ.
            </p>
          </div>
        </FormSection>

        {/* Thông tin cơ bản */}
        <FormSection
          title="Thông tin cơ bản"
          description="Tên, đường dẫn và mô tả quán."
        >
          <div className="space-y-2">
            <Label htmlFor="name">Tên</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="vd: Quán Cô Ba"
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
              placeholder="quan-co-ba-ha-long"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Đường dẫn:{" "}
              <span className="font-mono">/quan-an/{slugPreview || "…"}</span>
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Quán có gì đặc biệt, món nên gọi…"
              rows={5}
            />
          </div>
        </FormSection>

        {/* Vị trí & thực địa */}
        <FormSection
          title="Vị trí & thông tin thực địa"
          description="Địa chỉ hành chính (tự điền theo nơi chứa), địa chỉ chi tiết, toạ độ, giờ/giá và lưu ý. Tùy chọn."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Tỉnh / Thành phố</Label>
              <Combobox
                options={adminProvinces.map((p) => ({
                  value: String(p.code),
                  label: p.name,
                }))}
                value={values.provinceCode}
                onChange={onProvinceChange}
                placeholder="Chọn tỉnh/thành…"
                searchPlaceholder="Tìm tỉnh/thành…"
                emptyText={
                  adminProvinces.length === 0
                    ? "Không tải được danh sách."
                    : "Không tìm thấy."
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Quận / Huyện</Label>
              <Combobox
                options={districts.map((d) => ({
                  value: String(d.code),
                  label: d.name,
                }))}
                value={values.districtCode}
                onChange={onDistrictChange}
                disabled={!values.provinceCode || districtsLoading}
                placeholder={
                  districtsLoading
                    ? "Đang tải…"
                    : !values.provinceCode
                      ? "Chọn tỉnh trước"
                      : "Chọn quận/huyện…"
                }
                searchPlaceholder="Tìm quận/huyện…"
              />
            </div>
            <div className="space-y-2">
              <Label>Phường / Xã</Label>
              <Combobox
                options={wards.map((w) => ({
                  value: String(w.code),
                  label: w.name,
                }))}
                value={values.wardCode}
                onChange={onWardChange}
                disabled={!values.districtCode || wardsLoading}
                placeholder={
                  wardsLoading
                    ? "Đang tải…"
                    : !values.districtCode
                      ? "Chọn huyện trước"
                      : "Chọn phường/xã…"
                }
                searchPlaceholder="Tìm phường/xã…"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Địa chỉ chi tiết</Label>
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
                placeholder="6:00 – 22:00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notice">Lưu ý / cảnh báo</Label>
            <Input
              id="notice"
              value={values.notice}
              onChange={(e) => set("notice", e.target.value)}
              placeholder="Nghỉ thứ 2, hết sớm, chỉ bán sáng…"
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bookingUrl">Link đặt bàn</Label>
              <Input
                id="bookingUrl"
                value={values.bookingUrl}
                onChange={(e) => set("bookingUrl", e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mapUrl">Link bản đồ</Label>
              <Input
                id="mapUrl"
                value={values.mapUrl}
                onChange={(e) => set("mapUrl", e.target.value)}
                placeholder="https://maps.google.com/…"
              />
            </div>
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
              placeholder="nổi tiếng, giá rẻ, view đẹp"
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
          <Link href="/cms/eateries">Hủy</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {mode === "create" ? "Tạo quán" : "Lưu thay đổi"}
        </Button>
      </div>
    </form>
  );
}
