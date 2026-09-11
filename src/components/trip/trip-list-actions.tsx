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

export function TripCardMenu({
  tripId,
  title,
  isPlanning,
  className,
}: {
  tripId: string;
  title: string;
  isPlanning: boolean;
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
