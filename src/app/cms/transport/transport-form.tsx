"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2 } from "@/components/icons";
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
import {
  createTransport,
  updateTransport,
  type TransportFormInput,
} from "./actions";
import { TRANSPORT_DIRECTIONS, TRANSPORT_MODES } from "./constants";

export type PlaceOption = { id: string; label: string };
export type TransportFormValues = TransportFormInput;

const EMPTY: TransportFormValues = {
  name: "",
  description: "",
  direction: "getTo",
  mode: "bus",
  placeId: "",
  fromName: "",
  duration: "",
  distanceKm: "",
  priceFrom: "",
  priceTo: "",
  currency: "VND",
  operatorName: "",
  bookingUrl: "",
  status: "draft",
  order: "",
};

export function TransportForm({
  mode,
  transportId,
  places,
  initial,
}: {
  mode: "create" | "edit";
  transportId?: string;
  places: PlaceOption[];
  initial?: Partial<TransportFormValues>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<TransportFormValues>({
    ...EMPTY,
    ...initial,
  });

  const isGetTo = values.direction === "getTo";

  function set<K extends keyof TransportFormValues>(
    key: K,
    v: TransportFormValues[K],
  ) {
    setValues((p) => ({ ...p, [key]: v }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res =
        mode === "create"
          ? await createTransport(values)
          : await updateTransport(transportId!, values);
      if (res.ok) {
        router.push("/cms/transport");
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
          title="Cơ bản"
          description="Cách di chuyển này thuộc nơi nào, hướng và phương tiện gì."
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Hướng</Label>
              <Select
                value={values.direction}
                onValueChange={(v) => set("direction", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSPORT_DIRECTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phương tiện</Label>
              <Select value={values.mode} onValueChange={(v) => set("mode", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSPORT_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Tên</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={
                isGetTo
                  ? "vd: Xe khách TP.HCM → Phan Thiết"
                  : "vd: Thuê xe máy tại Mũi Né"
              }
              required
            />
          </div>
          {isGetTo && (
            <div className="space-y-2">
              <Label htmlFor="fromName">Điểm xuất phát</Label>
              <Input
                id="fromName"
                value={values.fromName}
                onChange={(e) => set("fromName", e.target.value)}
                placeholder="vd: TP. Hồ Chí Minh, Sân bay Cam Ranh…"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả / hướng dẫn</Label>
            <Textarea
              id="description"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Hướng dẫn chi tiết, mẹo, lưu ý…"
              rows={4}
            />
          </div>
        </FormSection>

        <FormSection
          title="Thời gian & chi phí"
          description="Tùy chọn — để trống nếu không có."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="duration">Thời gian</Label>
              <Input
                id="duration"
                value={values.duration}
                onChange={(e) => set("duration", e.target.value)}
                placeholder="3–4 giờ"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="distanceKm">Khoảng cách (km)</Label>
              <Input
                id="distanceKm"
                type="number"
                step="any"
                value={values.distanceKm}
                onChange={(e) => set("distanceKm", e.target.value)}
                placeholder="200"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="priceFrom">Giá từ</Label>
              <Input
                id="priceFrom"
                type="number"
                value={values.priceFrom}
                onChange={(e) => set("priceFrom", e.target.value)}
                placeholder="120000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceTo">Giá đến</Label>
              <Input
                id="priceTo"
                type="number"
                value={values.priceTo}
                onChange={(e) => set("priceTo", e.target.value)}
                placeholder="200000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Tiền tệ</Label>
              <Input
                id="currency"
                value={values.currency}
                onChange={(e) => set("currency", e.target.value)}
                placeholder="VND"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="operatorName">Hãng / đơn vị</Label>
              <Input
                id="operatorName"
                value={values.operatorName}
                onChange={(e) => set("operatorName", e.target.value)}
                placeholder="vd: Phương Trang"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookingUrl">Link đặt vé</Label>
              <Input
                id="bookingUrl"
                value={values.bookingUrl}
                onChange={(e) => set("bookingUrl", e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Hiển thị"
          description="Trạng thái và thứ tự trong mục Di chuyển của trang Place."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select
                value={values.status}
                onValueChange={(v) => set("status", v)}
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
                placeholder="nhỏ → đứng trước"
              />
            </div>
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
          <Link href="/cms/transport">Hủy</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {mode === "create" ? "Tạo" : "Lưu thay đổi"}
        </Button>
      </div>
    </form>
  );
}
