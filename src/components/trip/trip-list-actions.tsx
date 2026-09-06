"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, MoreHorizontal, Pin, Plus, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createTrip,
  deleteTrip,
  setPlanningTrip,
} from "@/app/(site)/lich-trinh/actions";

// Nút "Tạo lịch trình" — CTA cam duy nhất của trang danh sách.
export function NewTripButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      onClick={() =>
        start(async () => {
          const res = await createTrip();
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          router.push(`/lich-trinh/cua-toi/${res.data.id}`);
        })
      }
      disabled={pending}
      // Mép vuông + nhãn nhỏ in hoa, cùng vật liệu nút của bộ biên tập. Giữ
      // nền CAM: đây vẫn là hành động chính duy nhất của trang.
      className="h-11 rounded-[4px] bg-warm px-5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-warm-foreground hover:bg-warm/90"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Plus className="size-4" aria-hidden />
      )}
      Tạo lịch trình
    </Button>
  );
}

// Menu "..." của một chuyến. Dù đặt ở đâu cũng cần z-index vượt lớp phủ link
// `after:inset-0` của tiêu đề — nếu không, bấm vào menu sẽ mở luôn chuyến.
export function TripCardMenu({
  tripId,
  title,
  isPlanning,
  className,
}: {
  tripId: string;
  title: string;
  /** Chuyến đang lên lịch trình — đích mặc định của nút Thêm vào lịch trình. */
  isPlanning: boolean;
  /** Lớp cho nút mở menu. Mặc định là bản NỔI TRÊN ẢNH; danh sách dạng hàng
   *  truyền lớp riêng để nút nằm thẳng hàng trong hàng, không phải neo tuyệt đối. */
  className?: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Tuỳ chọn cho ${title}`}
            // Nút chỉ-ICON nên giữ hình tròn — cùng ranh giới đã dùng ở trang
            // điểm đến: nút có chữ thì vuông, nút chỉ icon thì tròn.
            className={cn(
              "z-10 grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              className ??
                "absolute right-2 top-2 bg-background/85 shadow-sm backdrop-blur-sm hover:bg-background",
            )}
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={isPlanning}
            onSelect={() =>
              start(async () => {
                const res = await setPlanningTrip(tripId);
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success(`Đang lên lịch trình cho “${title}”`);
              })
            }
          >
            {isPlanning ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <Pin className="size-4" aria-hidden />
            )}
            {isPlanning ? "Đang lên lịch trình" : "Lên lịch trình cho chuyến này"}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Xoá lịch trình
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Xoá “{title}”?</DialogTitle>
            <DialogDescription>
              Mọi ngày và mục trong lịch trình này sẽ bị xoá. Không khôi phục được.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Huỷ</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await deleteTrip(tripId);
                  if (!res.ok) {
                    toast.error(res.error);
                    return;
                  }
                  setConfirmOpen(false);
                  toast(`Đã xoá “${title}”`);
                })
              }
            >
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
