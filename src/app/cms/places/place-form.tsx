"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import type { Province, District, Ward } from "@/lib/locations";
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
import {
  createPlace,
  updatePlace,
  type PlaceFormInput,
} from "./actions";
import { loadDistricts, loadWards } from "./location-client";

type ProvinceOption = { id: string; name: string };

export type PlaceFormValues = PlaceFormInput;

const EMPTY: PlaceFormValues = {
  name: "",
  slug: "",
  kind: "province",
  parentId: null,
  tagline: "",
  description: "",
  provinceCode: "",
  provinceName: "",
  districtCode: "",
  districtName: "",
  wardCode: "",
  wardName: "",
  tags: "",
};

export function PlaceForm({
  mode,
  placeId,
  provinces,
  adminProvinces,
  initial,
}: {
  mode: "create" | "edit";
  placeId?: string;
  provinces: ProvinceOption[];
  adminProvinces: Province[];
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

  // Huyện/xã của cấp trên đang chọn (nạp qua cache client → server action).
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [wardsLoading, setWardsLoading] = useState(false);

  const slugPreview = slugTouched ? values.slug : slugify(values.name);

  function set<K extends keyof PlaceFormValues>(key: K, v: PlaceFormValues[K]) {
    setValues((p) => ({ ...p, [key]: v }));
  }

  // Nạp huyện mỗi khi provinceCode đổi (gồm cả lần đầu khi sửa).
  useEffect(() => {
    const code = Number(values.provinceCode);
    if (!values.provinceCode || !Number.isFinite(code)) return;
    let active = true;
    void (async () => {
      setDistrictsLoading(true);
      try {
        const d = await loadDistricts(code);
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
    const code = Number(values.districtCode);
    if (!values.districtCode || !Number.isFinite(code)) return;
    let active = true;
    void (async () => {
      setWardsLoading(true);
      try {
        const w = await loadWards(code);
        if (active) setWards(w);
      } finally {
        if (active) setWardsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [values.districtCode]);

  function onProvinceChange(code: string) {
    const p = adminProvinces.find((x) => String(x.code) === code);
    setDistricts([]);
    setWards([]);
    setValues((prev) => {
      const next = {
        ...prev,
        provinceCode: code,
        provinceName: p?.name ?? "",
        districtCode: "",
        districtName: "",
        wardCode: "",
        wardName: "",
      };
      // Tỉnh: tên địa điểm chính là tên tỉnh, slug tự tạo theo tên đó.
      if (prev.kind === "province" && p) next.name = p.name;
      return next;
    });
    if (values.kind === "province") setSlugTouched(false);
  }

  function onDistrictChange(code: string) {
    const d = districts.find((x) => String(x.code) === code);
    setWards([]);
    setValues((prev) => ({
      ...prev,
      districtCode: code,
      districtName: d?.name ?? "",
      wardCode: "",
      wardName: "",
    }));
  }

  function onWardChange(code: string) {
    const w = wards.find((x) => String(x.code) === code);
    setValues((prev) => ({
      ...prev,
      wardCode: code,
      wardName: w?.name ?? "",
    }));
  }

  function onKindChange(kind: PlaceFormValues["kind"]) {
    // Tỉnh chỉ giữ vị trí cấp tỉnh — xóa huyện/xã đã chọn; nếu đã chọn tỉnh thì
    // lấy luôn tên tỉnh làm tên địa điểm.
    if (kind === "province") {
      setValues((prev) => ({
        ...prev,
        kind,
        districtCode: "",
        districtName: "",
        wardCode: "",
        wardName: "",
        name: prev.provinceName || prev.name,
      }));
      if (values.provinceName) setSlugTouched(false);
    } else {
      set("kind", kind);
    }
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
        router.push(`/cms/places/${res.id}`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  const isProvince = values.kind === "province";

  return (
    <form onSubmit={onSubmit}>
      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div className="divide-y">
        {/* Phân loại & quan hệ */}
        <FormSection
          title="Phân loại"
          description="Đây là tỉnh gốc hay một điểm đến lớn thuộc tỉnh?"
        >
          <div className="space-y-2">
            <Label>Loại</Label>
            <Select
              value={values.kind}
              onValueChange={(v) => onKindChange(v as PlaceFormValues["kind"])}
            >
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="province">Tỉnh / Thành phố</SelectItem>
                <SelectItem value="destination">Điểm đến lớn</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {isProvince
                ? "Tỉnh là node gốc, không thuộc nơi nào."
                : "Điểm đến lớn (Sa Pa, Hội An…) phải thuộc một tỉnh."}
            </p>
          </div>

          {!isProvince && (
            <div className="space-y-2">
              <Label>Tỉnh cha</Label>
              <Select
                value={values.parentId ?? ""}
                onValueChange={(v) => set("parentId", v)}
              >
                <SelectTrigger className="w-full sm:w-72">
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
        </FormSection>

        {/* Vị trí hành chính */}
        <FormSection
          title="Vị trí"
          description={
            isProvince
              ? "Đơn vị hành chính cũ — tỉnh chỉ chọn cấp tỉnh. Tùy chọn."
              : "Đơn vị hành chính cũ (tỉnh → quận/huyện → phường/xã). Tùy chọn."
          }
        >
          <div
            className={cn(
              "grid grid-cols-1 gap-4",
              !isProvince && "sm:grid-cols-3",
            )}
          >
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

            {!isProvince && (
              <>
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
              </>
            )}
          </div>
        </FormSection>

        {/* Thông tin cơ bản */}
        <FormSection
          title="Thông tin cơ bản"
          description="Tên hiển thị, đường dẫn và câu slogan ngắn."
        >
          <div className="space-y-2">
            <Label htmlFor="name">Tên</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={isProvince ? "Chọn tỉnh ở mục Vị trí" : "vd: Hạ Long"}
              required
            />
            {isProvince && (
              <p className="text-xs text-muted-foreground">
                Tự lấy theo tỉnh đã chọn ở mục Vị trí (vẫn sửa được).
              </p>
            )}
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
              placeholder="ha-long"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Đường dẫn:{" "}
              <span className="font-mono">/diem-den/{slugPreview || "…"}</span>
              {!slugTouched && " (tự tạo từ tên)"}
            </p>
          </div>

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
        </FormSection>

        {/* Mô tả */}
        <FormSection
          title="Mô tả"
          description="Giới thiệu tổng quan, hiển thị ở hero trang chi tiết."
        >
          <div className="space-y-2">
            <Label htmlFor="description">Nội dung</Label>
            <Textarea
              id="description"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Giới thiệu ngắn về nơi này…"
              rows={6}
            />
          </div>
        </FormSection>

        {/* Thẻ */}
        <FormSection
          title="Thẻ"
          description="Nhãn tự do để lọc & gợi ý (vd: biển, view đẹp)."
        >
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
        </FormSection>
      </div>

      {/* Thanh hành động — dính đáy khi cuộn */}
      <div className="sticky bottom-0 z-10 mt-2 flex items-center justify-end gap-3 border-t bg-background/90 py-4 backdrop-blur">
        <Button
          type="button"
          variant="ghost"
          asChild
          className={cn(pending && "pointer-events-none opacity-50")}
        >
          <Link href="/cms/places">Hủy</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {mode === "create" ? "Tạo địa điểm" : "Lưu thay đổi"}
        </Button>
      </div>
    </form>
  );
}
