"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "@/components/icons";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  togglePublish,
  toggleFeatured,
  toggleTreatAsDestination,
  updateOrder,
} from "./actions";

// Điều khiển nhanh AdminFields ở trang chi tiết (không đụng nội dung):
// trạng thái xuất bản · nổi bật · thứ tự. Mỗi thay đổi lưu ngay.
export function PlaceAdminControls({
  id,
  status,
  isFeatured,
  order,
  kind,
  treatAsDestination,
}: {
  id: string;
  status: "draft" | "published";
  isFeatured: boolean;
  order: number | null;
  kind: "province" | "destination";
  treatAsDestination: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [orderValue, setOrderValue] = useState(order?.toString() ?? "");

  function onPublish(next: boolean) {
    startTransition(async () => {
      await togglePublish(id, next);
    });
  }

  function onFeatured(next: boolean) {
    startTransition(async () => {
      await toggleFeatured(id, next);
    });
  }

  function onTreatAsDestination(next: boolean) {
    startTransition(async () => {
      await toggleTreatAsDestination(id, next);
    });
  }

  function onOrderBlur() {
    if (orderValue === (order?.toString() ?? "")) return;
    startTransition(async () => {
      await updateOrder(id, orderValue);
    });
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Quản trị</h3>
        {pending && (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="mt-4 space-y-4">
        {/* Xuất bản */}
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
            onCheckedChange={onPublish}
            disabled={pending}
          />
        </div>

        {/* Nổi bật */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="adm-featured" className="cursor-pointer text-sm">
              Nổi bật
            </Label>
            <p className="text-xs text-muted-foreground">
              Ưu tiên ở đầu danh sách & trang chủ.
            </p>
          </div>
          <Switch
            id="adm-featured"
            checked={isFeatured}
            onCheckedChange={onFeatured}
            disabled={pending}
          />
        </div>

        {/* Tự nó là điểm đến — CHỈ hiện với tỉnh. Với một điểm đến thì câu
            hỏi này vô nghĩa, mà một công tắc luôn tắt và không bao giờ dùng tới
            chỉ làm người biên tập phải đọc thêm một dòng. */}
        {kind === "province" && (
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label htmlFor="adm-self" className="cursor-pointer text-sm">
                Tự nó là điểm đến
              </Label>
              <p className="text-xs text-muted-foreground">
                Bật khi người ta nói &quot;đi Ninh Bình&quot; chứ không phải đi
                một nơi nào đó trong tỉnh. Tỉnh sẽ đứng chung dải thẻ với các
                điểm đến.
              </p>
            </div>
            <Switch
              id="adm-self"
              checked={treatAsDestination}
              onCheckedChange={onTreatAsDestination}
              disabled={pending}
            />
          </div>
        )}

        {/* Thứ tự */}
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
            onBlur={onOrderBlur}
            disabled={pending}
            placeholder="—"
            className="h-9 w-20 text-right"
          />
        </div>
      </div>
    </div>
  );
}
