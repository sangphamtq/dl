"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapLinkField } from "@/components/cms/map-link-field";
import { AlertCircle, Loader2, Plus, Trash2 } from "@/components/icons";
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
import { Switch } from "@/components/ui/switch";
import { FormSection } from "@/components/cms/form-section";
import { RichTextEditor } from "@/components/cms/rich-text-editor";
import {
  createSpot,
  updateSpot,
  type SpotFormInput,
  type TicketTierInput,
  type HighlightInput,
} from "./actions";
import { SPOT_CATEGORIES } from "./constants";

export type PlaceOption = { id: string; label: string };
export type SpotFormValues = SpotFormInput;

const EMPTY: SpotFormValues = {
  name: "",
  slug: "",
  tagline: "",
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
  bestTime: "",
  bestTimeNote: "",
  ticketFree: false,
  ticketTiers: [],
  ticketInfo: "",
  notice: "",
  gettingThere: "",
  tips: "",
  highlights: [],
  activityContent: [],
  tags: "",
  provinceCode: "",
  provinceName: "",
  districtCode: "",
  districtName: "",
  wardCode: "",
  wardName: "",
};

export function SpotForm({
  mode,
  spotId,
  places,
  adminProvinces,
  initial,
}: {
  mode: "create" | "edit";
  spotId?: string;
  places: PlaceOption[];
  adminProvinces: Province[];
  initial?: Partial<SpotFormValues>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<SpotFormValues>({ ...EMPTY, ...initial });
  const [slugTouched, setSlugTouched] = useState(
    mode === "edit" && Boolean(initial?.slug),
  );

  // Huyện/xã của cấp trên đang chọn (nạp qua cache client → server action).
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [wardsLoading, setWardsLoading] = useState(false);

  const slugPreview = slugTouched ? values.slug : slugify(values.name);

  function set<K extends keyof SpotFormValues>(key: K, v: SpotFormValues[K]) {
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

  function addHighlight() {
    setValues((p) => ({
      ...p,
      highlights: [...p.highlights, { title: "", body: "" }],
    }));
  }

  function removeHighlight(index: number) {
    setValues((p) => ({
      ...p,
      highlights: p.highlights.filter((_, i) => i !== index),
    }));
  }

  function updateHighlight(
    index: number,
    key: keyof HighlightInput,
    value: string,
  ) {
    setValues((p) => ({
      ...p,
      highlights: p.highlights.map((h, i) =>
        i === index ? { ...h, [key]: value } : h,
      ),
    }));
  }

  function updateActivityContent(
    index: number,
    key: "blurb" | "imageUrl" | "imageAlt",
    value: string,
  ) {
    setValues((p) => ({
      ...p,
      activityContent: p.activityContent.map((c, i) =>
        i === index ? { ...c, [key]: value } : c,
      ),
    }));
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

  const [snapshot] = useState(() =>
    JSON.stringify({ ...EMPTY, ...initial }),
  );
  useUnsavedChanges(!pending && JSON.stringify(values) !== snapshot);

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

        {/* Vị trí */}
        <FormSection
          title="Vị trí"
          description="Đơn vị hành chính, địa chỉ, toạ độ và link bản đồ. Tùy chọn."
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

          <MapLinkField
            value={values.mapUrl}
            onValueChange={(v) => set("mapUrl", v)}
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
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={values.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              placeholder="vd: Đồi cát đổi màu theo ánh nắng"
            />
            <p className="text-xs text-muted-foreground">
              Câu slogan ngắn hiển thị dưới tên (khác mô tả).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả ngắn / mở bài</Label>
            <Textarea
              id="description"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Giới thiệu ngắn gọn (hiển thị ở card, meta SEO, dưới hero)…"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              2–5 câu. Dùng cho card, kết quả tìm kiếm, đoạn dẫn dưới hero và mục
              &ldquo;Giới thiệu&rdquo; trên trang.
            </p>
          </div>
        </FormSection>

        {/* Điểm nhấn — tiêu đề + mô tả rich text, sắp theo thứ tự */}
        <FormSection
          title="Điểm nhấn"
          description="Những điều đặc biệt của địa điểm — mỗi mục có tiêu đề và mô tả ngắn."
        >
          {values.highlights.length > 0 && (
            <div className="space-y-4">
              {values.highlights.map((h, i) => (
                <div
                  key={i}
                  className="space-y-3 rounded-lg border p-4"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      value={h.title}
                      onChange={(e) =>
                        updateHighlight(i, "title", e.target.value)
                      }
                      placeholder="Tiêu đề điểm nhấn"
                      className="flex-1 font-medium"
                      aria-label="Tiêu đề điểm nhấn"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeHighlight(i)}
                      aria-label="Xóa điểm nhấn"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                  <RichTextEditor
                    value={h.body}
                    onChange={(html) => updateHighlight(i, "body", html)}
                  />
                </div>
              ))}
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={addHighlight}>
            <Plus className="size-4" aria-hidden />
            Thêm điểm nhấn
          </Button>
        </FormSection>

        {/* Khi nào đẹp · Mẹo · Cách đến */}
        <FormSection
          title="Thời điểm, mẹo & cách đến"
          description="Khi nào đẹp nhất, kinh nghiệm thực tế và hướng dẫn đường đi cho địa điểm này."
        >
          <div className="space-y-2">
            <Label htmlFor="bestTimeNote">Khi nào đẹp nhất (chi tiết)</Label>
            <Textarea
              id="bestTimeNote"
              value={values.bestTimeNote}
              onChange={(e) => set("bestTimeNote", e.target.value)}
              placeholder="Diễn giải thời điểm đẹp: mùa nào, giờ nào, vì sao…"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Đoạn văn cho mục &ldquo;Khi nào đẹp nhất&rdquo;. Ô &ldquo;Thời điểm
              đẹp&rdquo; ở trên chỉ là cụm ngắn hiển thị ở hero.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tips">Kinh nghiệm / mẹo</Label>
            <Textarea
              id="tips"
              value={values.tips}
              onChange={(e) => set("tips", e.target.value)}
              placeholder={"Mỗi dòng một mẹo, vd:\nĐi sáng sớm để tránh nắng\nMang theo nước và mũ"}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Mỗi dòng là một gạch đầu dòng.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gettingThere">Cách đến</Label>
            <Textarea
              id="gettingThere"
              value={values.gettingThere}
              onChange={(e) => set("gettingThere", e.target.value)}
              placeholder="Hướng dẫn đường đi, phương tiện, gửi xe…"
              rows={3}
            />
          </div>
        </FormSection>

        {/* Nội dung hoạt động theo địa điểm (mục "Làm gì ở đây") */}
        <FormSection
          title="Làm gì ở đây"
          description="Nội dung RIÊNG của từng hoạt động tại địa điểm này. Liên kết hoạt động được quản ở phần Hoạt động."
        >
          {values.activityContent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có hoạt động nào liên kết tới địa điểm này. Vào phần Hoạt động
              để gắn hoạt động vào đây, rồi quay lại viết mô tả riêng.
            </p>
          ) : (
            <div className="space-y-4">
              {values.activityContent.map((c, i) => (
                <div key={c.activityId} className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-medium">{c.name}</p>
                  <Textarea
                    value={c.blurb}
                    onChange={(e) =>
                      updateActivityContent(i, "blurb", e.target.value)
                    }
                    placeholder={`Mô tả "${c.name}" tại chính địa điểm này…`}
                    rows={2}
                    aria-label={`Mô tả ${c.name} tại địa điểm`}
                  />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px]">
                    <Input
                      value={c.imageUrl}
                      onChange={(e) =>
                        updateActivityContent(i, "imageUrl", e.target.value)
                      }
                      placeholder="Link ảnh riêng (tùy chọn)"
                      aria-label={`Link ảnh ${c.name}`}
                    />
                    <Input
                      value={c.imageAlt}
                      onChange={(e) =>
                        updateActivityContent(i, "imageAlt", e.target.value)
                      }
                      placeholder="Mô tả ảnh (alt)"
                      aria-label={`Alt ảnh ${c.name}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </FormSection>

        {/* Vé vào cửa */}
        <FormSection
          title="Vé vào cửa"
          description="Miễn phí, hoặc liệt kê giá theo từng loại vé."
        >
          <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
            <div className="space-y-0.5">
              <Label htmlFor="ticketFree">Miễn phí vào cửa</Label>
              <p className="text-xs text-muted-foreground">
                Bật nếu không bán vé. Khi bật sẽ ẩn bảng giá.
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
              <Label>Các loại vé</Label>
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

          <div className="space-y-2">
            <Label htmlFor="ticketInfo">Ghi chú vé</Label>
            <Input
              id="ticketInfo"
              value={values.ticketInfo}
              onChange={(e) => set("ticketInfo", e.target.value)}
              placeholder="Giờ bán vé, ưu đãi nhóm…"
            />
          </div>
        </FormSection>

        {/* Thông tin thực địa */}
        <FormSection
          title="Thông tin thực địa"
          description="Giờ mở cửa, thời điểm đẹp, liên hệ và lưu ý. Tùy chọn."
        >
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
              <Label htmlFor="bestTime">Thời điểm đẹp</Label>
              <Input
                id="bestTime"
                value={values.bestTime}
                onChange={(e) => set("bestTime", e.target.value)}
                placeholder="sáng sớm, mùa thu…"
              />
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
