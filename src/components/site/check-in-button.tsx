"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, MapPinCheckInside, MapPinPlus } from "@/components/icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoginDrawer } from "@/components/site/login-drawer";
import { toggleCheckIn } from "@/app/diem-den/check-in-actions";
import { ReviewForm } from "@/components/site/place-reviews";

type TargetKind = "place" | "spot";

// Pill mờ cho các nút chia sẻ ngoài hero (StaySeek, ShareMap…). Hero điểm đến
// KHÔNG dùng nữa — ở đó nút là hành động editorial trần (xem className bên dưới).
const PILL_BASE =
  "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60";
const PILL_SURFACE =
  "border-border/60 bg-background/70 text-foreground backdrop-blur-sm hover:bg-muted";

export { PILL_BASE, PILL_SURFACE };

// Hành động editorial trần — phân cấp bằng màu/độ đậm, không bằng hộp. Đồng bộ
// với link "‹ quay lại" trên cùng hero; nền hero là ảnh blur + phủ sáng nên chữ đọc rõ.
const ACTION_BASE =
  "group inline-flex items-center gap-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60";

// Nút "Đã đến" cho điểm đến HOẶC địa điểm.
// - Chưa đến: bấm → mở form đánh giá (đánh giá = xác nhận đã đến). Huỷ/bỏ qua → KHÔNG đánh dấu.
// - Đã đến: bấm → hỏi xác nhận → bỏ đánh dấu.
export function CheckInButton({
  targetKind,
  targetId,
  targetName,
  targetImage,
  redirectTo,
  initialChecked,
  isAuthed,
  reviewable = true,
}: {
  targetKind: TargetKind;
  targetId: string;
  targetName: string;
  targetImage?: string | null;
  redirectTo: string;
  initialChecked: boolean;
  isAuthed: boolean;
  // Có đánh giá được không (điểm đến lớn & spot = true; tỉnh = false → toggle trực tiếp).
  reviewable?: boolean;
}) {
  const [checked, setChecked] = useState(initialChecked);
  const [pending, startTransition] = useTransition();
  const [loginOpen, setLoginOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [openKey, setOpenKey] = useState(0);

  // Review được gửi (từ form này hoặc từ section) → đã đến.
  useEffect(() => {
    function onCheckedin(e: Event) {
      if ((e as CustomEvent<{ id: string }>).detail?.id !== targetId) return;
      setChecked(true);
    }
    window.addEventListener("halivivu:checkedin", onCheckedin);
    return () => window.removeEventListener("halivivu:checkedin", onCheckedin);
  }, [targetId]);

  function onClick() {
    if (!isAuthed) {
      setLoginOpen(true);
      return;
    }
    if (!checked) {
      if (reviewable) {
        // Đánh dấu đã đến = viết đánh giá trước (huỷ → không đánh dấu).
        setOpenKey((k) => k + 1);
        setReviewOpen(true);
      } else {
        // Tỉnh: đánh dấu trực tiếp.
        startTransition(async () => {
          const res = await toggleCheckIn({ kind: targetKind, id: targetId });
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          setChecked(res.data.checked);
          if (res.data.checked)
            toast.success(`Đã đánh dấu đã đến ${targetName}`);
        });
      }
      return;
    }
    // Bỏ đánh dấu — mở popup xác nhận.
    setConfirmOpen(true);
  }

  function doUncheck() {
    startTransition(async () => {
      const res = await toggleCheckIn({ kind: targetKind, id: targetId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setChecked(false);
      window.dispatchEvent(
        new CustomEvent("halivivu:uncheckin", { detail: { id: targetId } }),
      );
      toast(`Đã bỏ đánh dấu ${targetName}`);
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
          ACTION_BASE,
          checked ? "text-warm hover:text-warm/80" : "text-foreground hover:text-warm",
        )}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : checked ? (
          <MapPinCheckInside className="size-4" aria-hidden />
        ) : (
          <MapPinPlus className="size-4 transition-transform group-hover:-translate-y-0.5" aria-hidden />
        )}
        {checked ? "Đã đến" : "Đánh dấu đã đến"}
      </button>

      {isAuthed && reviewable && (
        <ReviewForm
          key={openKey}
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          defaultExpanded={false}
          target={{
            kind: targetKind,
            id: targetId,
            name: targetName,
            image: targetImage,
          }}
          initial={null}
        />
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Bỏ đánh dấu đã đến?</DialogTitle>
            <DialogDescription>
              {reviewable
                ? `Bỏ đánh dấu đã đến ${targetName} sẽ ẩn đánh giá của bạn khỏi công khai (đánh dấu lại để hiện lại).`
                : `Bỏ đánh dấu đã đến ${targetName}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Huỷ</Button>
            </DialogClose>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                doUncheck();
              }}
              className="bg-warm text-warm-foreground hover:bg-warm/90"
            >
              Bỏ đánh dấu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isAuthed && (
        <LoginDrawer
          open={loginOpen}
          onOpenChange={setLoginOpen}
          redirectTo={redirectTo}
        />
      )}
    </>
  );
}
