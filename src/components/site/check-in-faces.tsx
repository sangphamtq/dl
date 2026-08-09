"use client";

import { useState } from "react";
import { Footprints } from "@/components/icons";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { stanceMeta, type ReviewStance } from "@/lib/review-meta";

export type CheckInPerson = {
  id: string;
  name: string | null;
  image: string | null;
  stance?: ReviewStance | null;
};

// Pill cảm nhận: tích cực xanh, tiêu cực xám (khớp danh sách review).
function stancePill(stance: ReviewStance) {
  const { tone } = stanceMeta(stance);
  return tone === "positive" || tone === "posSoft"
    ? "bg-primary/10 text-primary"
    : "bg-muted text-muted-foreground";
}

const FACES = 5;
// Ở chế độ `dense` (hàng số liệu hero phải vừa màn 320px) chỉ hiện 3 mặt.
// Không thể cắt bằng CSS rồi giữ nguyên bong bóng "+N": số đó phải đổi theo,
// nên render CẢ HAI bong bóng và để `display` chọn cái đúng theo bề ngang.
const DENSE_FACES = 3;
const initial = (name: string | null) =>
  (name?.trim().charAt(0) || "?").toUpperCase();

// Avatar stack các Vivu-er đã check-in + mở dialog xem toàn bộ danh sách.
export function CheckInFaces({
  people,
  total,
  label = "Vivu-er đã đến",
  tone = "default",
  dense = false,
}: {
  people: CheckInPerson[];
  total: number;
  /** Nhãn cạnh avatar — hero full-bleed truyền vào dạng "128 Vivu-er". */
  label?: string;
  /** "onDark": stack nằm thẳng trên ảnh → nhãn chữ trắng. */
  tone?: "default" | "onDark";
  /**
   * Dùng khi cụm này phải nằm CHUNG MỘT HÀNG với các số liệu khác ở hero:
   * dưới `sm` thì avatar co từ 32px xuống 24px và bỏ nhãn chữ. Nguyên cụm
   * 5 avatar + nhãn "Vivu-er đã đến" rộng ~270px — một mình nó đã chiếm gần
   * hết bề ngang khả dụng của màn 320px.
   */
  dense?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (total <= 0 || people.length === 0) return null;

  const faces = people.slice(0, FACES);
  const overflow = total - faces.length;
  const denseOverflow = total - Math.min(faces.length, DENSE_FACES);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Xem ${total} Vivu-er đã đến`}
          className={cn(
            "group inline-flex items-center rounded-full text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            dense ? "gap-2 sm:gap-3" : "gap-3",
          )}
        >
          <AvatarGroup>
            {faces.map((p, i) => (
              <Avatar
                key={p.id}
                className={cn(
                  dense && "size-6 sm:size-8",
                  dense && i >= DENSE_FACES && "hidden sm:flex",
                )}
              >
                {p.image && (
                  <AvatarImage src={p.image} alt={p.name ?? "Vivu-er"} />
                )}
                <AvatarFallback>{initial(p.name)}</AvatarFallback>
              </Avatar>
            ))}
            {dense && denseOverflow > 0 && (
              <AvatarGroupCount className="size-6 text-xs sm:hidden">
                +{denseOverflow > 99 ? "99" : denseOverflow}
              </AvatarGroupCount>
            )}
            {overflow > 0 && (
              <AvatarGroupCount
                className={cn(dense && "hidden sm:flex sm:size-8 sm:text-sm")}
              >
                +{overflow > 99 ? "99" : overflow}
              </AvatarGroupCount>
            )}
          </AvatarGroup>
          <span
            className={cn(
              "text-sm transition-colors",
              dense && "hidden sm:inline",
              tone === "onDark"
                ? "text-white/70 group-hover:text-white"
                : "text-muted-foreground group-hover:text-foreground",
            )}
          >
            {label}
          </span>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Footprints className="size-5 text-primary" aria-hidden />
            {total.toLocaleString("vi-VN")} Vivu-er đã đến
          </DialogTitle>
          <DialogDescription className="sr-only">
            Danh sách thành viên Halivivu đã đánh dấu đã đến nơi này.
          </DialogDescription>
        </DialogHeader>

        <ul className="-mx-2 max-h-[60vh] space-y-0.5 overflow-y-auto">
          {people.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-lg px-2 py-2"
            >
              <Avatar>
                {p.image && (
                  <AvatarImage src={p.image} alt={p.name ?? "Vivu-er"} />
                )}
                <AvatarFallback>{initial(p.name)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {p.name ?? "Vivu-er ẩn danh"}
              </span>
              {p.stance && (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                    stancePill(p.stance),
                  )}
                >
                  {stanceMeta(p.stance).label}
                </span>
              )}
            </li>
          ))}
        </ul>

        {total > people.length && (
          <p className="text-center text-sm text-muted-foreground">
            và {(total - people.length).toLocaleString("vi-VN")} Vivu-er khác
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
