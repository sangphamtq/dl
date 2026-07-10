"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "@/components/icons";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { togglePublish, toggleFeatured, updateOrder } from "./actions";

export function SpotAdminControls({
  id,
  status,
  isFeatured,
  order,
}: {
  id: string;
  status: "draft" | "published";
  isFeatured: boolean;
  order: number | null;
}) {
  const [pending, startTransition] = useTransition();
  const [orderValue, setOrderValue] = useState(order?.toString() ?? "");

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Quản trị</h3>
        {pending && (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="adm-status" className="cursor-pointer text-sm">
              Xuất bản
            </Label>
            <p className="text-xs text-muted-foreground">
              {status === "published" ? "Đang hiển thị công khai." : "Đang ẩn (nháp)."}
            </p>
          </div>
          <Switch
            id="adm-status"
            checked={status === "published"}
            onCheckedChange={(v) =>
              startTransition(async () => {
                await togglePublish(id, v);
              })
            }
            disabled={pending}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="adm-featured" className="cursor-pointer text-sm">
              Nổi bật
            </Label>
            <p className="text-xs text-muted-foreground">
              Ưu tiên ở đầu danh sách.
            </p>
          </div>
          <Switch
            id="adm-featured"
            checked={isFeatured}
            onCheckedChange={(v) =>
              startTransition(async () => {
                await toggleFeatured(id, v);
              })
            }
            disabled={pending}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="adm-order" className="cursor-pointer text-sm">
              Thứ tự
            </Label>
            <p className="text-xs text-muted-foreground">Nhỏ → đứng trước.</p>
          </div>
          <Input
            id="adm-order"
            type="number"
            value={orderValue}
            onChange={(e) => setOrderValue(e.target.value)}
            onBlur={() => {
              if (orderValue === (order?.toString() ?? "")) return;
              startTransition(async () => {
                await updateOrder(id, orderValue);
              });
            }}
            disabled={pending}
            placeholder="—"
            className="h-9 w-20 text-right"
          />
        </div>
      </div>
    </div>
  );
}
