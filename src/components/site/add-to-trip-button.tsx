"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
  redirectTo?: string;
  isAuthed?: boolean;
  variant?: "outline" | "bare";
  className?: string;
}) {
  const pathname = usePathname();
  const [added, setAdded] = useState(false);
  const [tripId, setTripId] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [pending, start] = useTransition();
  const claimed = useRef(false);
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
      tripBagChanged();

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
                  window.location.href = `/lich-trinh/cua-toi/${res.data.tripId}`;
                },
              },
        },
      );
    });
  }

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
      window.location.href = `/lich-trinh/cua-toi/${tripId}`;
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
