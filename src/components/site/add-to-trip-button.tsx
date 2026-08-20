"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Plus } from "@/components/icons";
import { cn } from "@/lib/utils";
import { LoginDrawer } from "@/components/site/login-drawer";
import { tripBagChanged } from "@/components/trip/trip-bag-events";
import {
  addItem,
  listMyTrips,
  moveItemToTrip,
  type ItemTarget,
} from "@/app/(site)/lich-trinh/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Nút "Thêm vào lịch trình" — đặt ở TRANG CHI TIẾT và POPUP, cố ý CHƯA đưa vào
// lưới thẻ (docs/lich-trinh.md §6: thẻ lưu trú đã qua ba vòng cắt gọt, thêm nút
// vào đó là đi ngược lại; lưới là lúc so sánh, chưa phải lúc chọn).
//
// Vì lịch trình bắt đăng nhập, nút này là một BỨC TƯỜNG. Nếu bấm mà văng sang
// /login rồi quay về tay trắng thì tính năng chết ngay tại đây. Nên:
//   1. chưa đăng nhập → mở LoginDrawer TẠI CHỖ (không điều hướng thẳng)
//   2. ghi ý định vào sessionStorage + quay lại đúng trang cũ
//   3. quay về → tự thêm, báo "đã thêm vào lịch trình"

const INTENT_KEY = "halivivu:trip-intent";

type PendingIntent = { kind: ItemTarget["kind"]; id: string };

export function AddToTripButton({
  target,
  name,
  redirectTo,
  isAuthed,
  variant = "outline",
  className,
}: {
  target: Exclude<ItemTarget, { kind: "custom" }>;
  name: string;
  /** Đường quay lại sau khi đăng nhập. Bỏ trống → dùng URL đang xem. */
  redirectTo?: string;
  /**
   * Biết trước đã đăng nhập hay chưa thì truyền vào để bấm phát ăn ngay.
   * KHÔNG truyền cũng chạy đúng: bấm → gọi thử → server báo cần đăng nhập →
   * mở LoginDrawer. Nhờ vậy nút dùng được trong popup (Quán ăn, Lưu trú) mà
   * không phải luồn `isAuthed` qua ba lớp component client.
   */
  isAuthed?: boolean;
  /** "outline" = nút viền đứng cạnh CTA khác · "bare" = hành động trần trên ảnh */
  variant?: "outline" | "bare";
  className?: string;
}) {
  const pathname = usePathname();
  const [added, setAdded] = useState(false);
  const [tripId, setTripId] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [pending, start] = useTransition();
  const claimed = useRef(false);
  // Bộ chọn "Đổi chuyến": mở từ toast ngay sau khi thêm.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [trips, setTrips] = useState<{ id: string; title: string; count: number }[]>([]);
  const lastItemId = useRef<string | null>(null);

  const backTo = redirectTo ?? pathname ?? "/";

  function rememberIntent() {
    try {
      sessionStorage.setItem(
        INTENT_KEY,
        JSON.stringify({ kind: target.kind, id: target.id } satisfies PendingIntent),
      );
    } catch {
      /* chế độ riêng tư chặn storage — vẫn đăng nhập được, chỉ mất tự-thêm */
    }
  }

  async function openPicker() {
    const res = await listMyTrips();
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setTrips(res.data.trips);
    setPickerOpen(true);
  }

  function switchTo(id: string, title: string) {
    const itemId = lastItemId.current;
    if (!itemId) return;
    start(async () => {
      const res = await moveItemToTrip(itemId, id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setTripId(id);
      setPickerOpen(false);
      tripBagChanged();
      toast.success(`Đã chuyển ${name} sang “${title}”`);
    });
  }

  function save() {
    start(async () => {
      const res = await addItem(target);
      if (!res.ok) {
        // Chưa đăng nhập → không quăng lỗi đỏ, mở luôn cửa đăng nhập.
        if (res.error.includes("đăng nhập")) {
          rememberIntent();
          setLoginOpen(true);
          return;
        }
        toast.error(res.error);
        return;
      }
      setAdded(true);
      setTripId(res.data.tripId);
      lastItemId.current = res.data.itemId;
      // Báo cho TÚI LỊCH TRÌNH (nút nổi ở mọi trang) nạp lại — nếu không, cái
      // túi vẫn hiện con số cũ và người dùng lại rơi vào đúng cảnh "thêm rồi mà
      // không thấy đâu" mà cái túi sinh ra để chấm dứt.
      tripBagChanged();

      // Có nhiều chuyến thì lời mời hữu ích nhất là ĐỔI CHUYẾN: người dùng không
      // nhìn thấy mình đang lên lịch cho chuyến nào cho tới đúng khoảnh khắc này.
      // Chỉ có một chuyến thì đổi cũng chẳng để làm gì.
      const canSwitch = res.data.tripCount > 1 && res.data.itemId != null;
      toast.success(
        res.data.duplicate
          ? `${name} đã có trong “${res.data.tripTitle}”`
          : `Đã thêm vào “${res.data.tripTitle}”`,
        {
          action: canSwitch
            ? { label: "Đổi chuyến", onClick: () => void openPicker() }
            : {
                label: "Xem lịch trình",
                onClick: () => {
                  window.location.href = `/lich-trinh/${res.data.tripId}`;
                },
              },
        },
      );
    });
  }

  // Vừa đăng nhập xong và có ý định đang chờ đúng mục này → thêm luôn.
  // isAuthed === false nghĩa là CHẮC CHẮN chưa đăng nhập → khỏi thử.
  useEffect(() => {
    if (isAuthed === false || claimed.current) return;
    let intent: PendingIntent | null = null;
    try {
      const raw = sessionStorage.getItem(INTENT_KEY);
      intent = raw ? (JSON.parse(raw) as PendingIntent) : null;
    } catch {
      intent = null;
    }
    if (!intent || intent.id !== target.id || intent.kind !== target.kind) return;

    claimed.current = true;
    sessionStorage.removeItem(INTENT_KEY);
    save();
    // save() ổn định trong phạm vi lần mount này; chỉ chạy đúng một lần nhờ `claimed`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, target.id, target.kind]);

  function onClick() {
    if (isAuthed === false) {
      rememberIntent();
      setLoginOpen(true);
      return;
    }
    if (added && tripId) {
      window.location.href = `/lich-trinh/${tripId}`;
      return;
    }
    save();
  }

  const label = added ? "Đã thêm vào lịch trình" : "Thêm vào lịch trình";

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={cn(
          "group inline-flex h-9 items-center gap-1.5 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
          variant === "outline" &&
            "border border-border/60 bg-background/70 px-4 backdrop-blur-sm hover:bg-muted",
          added && variant === "outline" && "border-primary/40 text-primary",
          variant === "bare" && (added ? "text-primary" : "text-foreground hover:text-primary"),
          className,
        )}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : added ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Plus className="size-4 transition-transform group-hover:rotate-90" aria-hidden />
        )}
        {label}
      </button>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Chuyển sang chuyến nào?</DialogTitle>
            <DialogDescription>
              {name} sẽ vào chuyến bạn chọn, và bạn chuyển sang lên lịch
              trình cho chuyến đó.
            </DialogDescription>
          </DialogHeader>
          <ul className="-mx-2 max-h-72 overflow-y-auto">
            {trips.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  disabled={pending || t.id === tripId}
                  onClick={() => switchTo(t.id, t.title)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{t.title}</span>
                    <span className="block text-xs text-muted-foreground">{t.count} mục</span>
                  </span>
                  {t.id === tripId && (
                    <Check className="size-4 shrink-0 text-primary" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      <LoginDrawer
        open={loginOpen}
        onOpenChange={setLoginOpen}
        redirectTo={backTo}
        title="Đăng nhập để lưu vào lịch trình"
        description={`Đăng nhập rồi ${name} sẽ được thêm vào lịch trình ngay.`}
      />
    </>
  );
}

// Link tiện cho toast/nơi khác muốn dẫn thẳng tới lịch trình.
export function TripLink({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Link href={`/lich-trinh/${id}`} className="font-medium text-primary hover:underline">
      {children}
    </Link>
  );
}
