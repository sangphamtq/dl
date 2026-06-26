"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, MapPinPlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LoginDrawer } from "@/components/site/login-drawer";
import { toggleCheckIn } from "@/app/diem-den/check-in-actions";

// Ngôn ngữ nút chung với ShareButton (đồng bộ trên hero điểm đến).
const PILL_BASE =
  "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60";
const PILL_SURFACE =
  "border-border/60 bg-background/70 text-foreground backdrop-blur-sm hover:bg-muted";

export { PILL_BASE, PILL_SURFACE };

// Nút "Đã đến" trên trang chi tiết Place. Cập nhật PESSIMISTIC: chờ server xác
// nhận rồi mới đổi trạng thái + toast. Người dùng ẩn danh → mở login drawer.
export function CheckInButton({
  placeId,
  placeSlug,
  placeName,
  initialChecked,
  isAuthed,
}: {
  placeId: string;
  placeSlug: string;
  placeName: string;
  initialChecked: boolean;
  isAuthed: boolean;
}) {
  const [checked, setChecked] = useState(initialChecked);
  const [pending, startTransition] = useTransition();
  const [loginOpen, setLoginOpen] = useState(false);

  function onClick() {
    if (!isAuthed) {
      setLoginOpen(true);
      return;
    }
    startTransition(async () => {
      const res = await toggleCheckIn(placeId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setChecked(res.data.checked);
      if (res.data.checked) toast.success(`Đã đánh dấu đã đến ${placeName}`);
      else toast(`Đã bỏ đánh dấu ${placeName}`);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={checked}
        className={cn(
          PILL_BASE,
          checked
            ? "border-transparent bg-warm text-warm-foreground hover:bg-warm/90"
            : PILL_SURFACE,
        )}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : checked ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <MapPinPlus className="size-4" aria-hidden />
        )}
        {checked ? "Đã đến" : "Đánh dấu đã đến"}
      </button>

      {!isAuthed && (
        <LoginDrawer
          open={loginOpen}
          onOpenChange={setLoginOpen}
          redirectTo={`/diem-den/${placeSlug}`}
        />
      )}
    </>
  );
}
