"use client";

import { Plus, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ExtraFeeInput } from "@/lib/tickets";

export function ExtraFeesEditor({
  value,
  onChange,
  context = "spot",
}: {
  value: ExtraFeeInput[];
  onChange: (rows: ExtraFeeInput[]) => void;
  context?: "spot" | "activity";
}) {
  function update<K extends keyof ExtraFeeInput>(
    index: number,
    key: K,
    v: ExtraFeeInput[K],
  ) {
    onChange(value.map((r, i) => (i === index ? { ...r, [key]: v } : r)));
  }

  return (
    <div className="space-y-3">
      {value.map((r, i) => (
        <div key={i} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-start gap-2">
            <Input
              value={r.label}
              onChange={(e) => update(i, "label", e.target.value)}
              placeholder={
                context === "activity" ? "Thuê áo phao" : "Gửi xe máy"
              }
              className="flex-1"
              aria-label="Tên khoản chi phí"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              aria-label="Xóa khoản chi phí"
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                value={r.price}
                onChange={(e) => update(i, "price", e.target.value)}
                type="number"
                min="0"
                step="1000"
                placeholder="Thoả thuận"
                className="pr-7"
                aria-label="Giá (VND)"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                đ
              </span>
            </div>
            <span className="shrink-0 text-sm text-muted-foreground">đến</span>
            <div className="relative flex-1">
              <Input
                value={r.priceTo}
                onChange={(e) => update(i, "priceTo", e.target.value)}
                type="number"
                min="0"
                step="1000"
                placeholder="(nếu là khoảng)"
                className="pr-7"
                aria-label="Giá đến (VND)"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                đ
              </span>
            </div>
            <Input
              value={r.unit}
              onChange={(e) => update(i, "unit", e.target.value)}
              placeholder="/xe"
              className="w-24 shrink-0"
              aria-label="Đơn vị tính"
            />
          </div>

          <div className="flex items-center gap-3">
            <Input
              value={r.note}
              onChange={(e) => update(i, "note", e.target.value)}
              placeholder="Ghi chú: chốt giá trước, chỉ tiền mặt…"
              className="flex-1"
              aria-label="Ghi chú"
            />
            <div className="flex shrink-0 items-center gap-2">
              <Switch
                id={`fee-required-${i}`}
                checked={r.required}
                onCheckedChange={(v) => update(i, "required", v)}
              />
              <Label
                htmlFor={`fee-required-${i}`}
                className="whitespace-nowrap text-xs font-normal text-muted-foreground"
              >
                Bắt buộc
              </Label>
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([
            ...value,
            {
              label: "",
              price: "",
              priceTo: "",
              unit: "",
              required: false,
              note: "",
            },
          ])
        }
      >
        <Plus className="size-4" aria-hidden />
        Thêm khoản chi phí
      </Button>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Để trống giá nghĩa là <strong>thoả thuận tại chỗ</strong>. Ô thứ hai chỉ
        điền khi giá là một khoảng. Nên có đơn vị (/xe, /người, /lượt, /nhóm) —
        thiếu nó thì con số không nói được là tính cho ai. Bật{" "}
        <strong>Bắt buộc</strong>{" "}
        cho khoản gần như không tránh được (gửi xe),
        phần điều kiện thì viết ở ghi chú (&ldquo;nếu đi xe máy&rdquo;).
      </p>
    </div>
  );
}
