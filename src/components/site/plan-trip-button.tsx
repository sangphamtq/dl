"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, Loader2, Route, Sparkles } from "@/components/icons";
import { cn } from "@/lib/utils";
import { LoginDrawer } from "@/components/site/login-drawer";
import { tripBagChanged } from "@/components/trip/trip-bag-events";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  cloneTrip,
  getPlanOptions,
  setPlanningTrip,
  startTripForPlace,
  type PlanOptions,
} from "@/app/(site)/lich-trinh/actions";

// "Lên lịch trình đi {điểm đến}" — thay cho "Thêm vào lịch trình" ở trang Place.
//
// Vì sao khác các trang chi tiết khác: một điểm đến là NƠI CHỨA các điểm dừng,
// không phải một điểm dừng — không có giờ mở cửa để cảnh báo, toạ độ chỉ là
// trọng tâm, và "ở lại Phan Thiết 2 tiếng" thì vô nghĩa (docs/lich-trinh.md §6b).
//
// Đổi lại, nút này làm được việc lớn hơn: nó đặt CHUYẾN ĐANG LÊN LỊCH TRÌNH
// ngay tại nơi người dùng quyết định "tôi muốn đi đây". Từ đó mọi nút "Thêm vào
// lịch trình" ở các trang địa điểm/quán ăn trong vùng sẽ rơi đúng chuyến.

const INTENT_KEY = "halivivu:plan-intent";

export function PlanTripButton({
  placeId,
  placeName,
  isAuthed,
  className,
}: {
  placeId: string;
  placeName: string;
  /** Bỏ trống = chưa biết; bấm rồi server báo mới mở cửa đăng nhập. */
  isAuthed?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [loginOpen, setLoginOpen] = useState(false);
  const [options, setOptions] = useState<PlanOptions | null>(null);
  const claimed = useRef(false);

  function rememberIntent() {
    try {
      sessionStorage.setItem(INTENT_KEY, placeId);
    } catch {
      /* chế độ riêng tư chặn storage — chỉ mất phần tự mở lại */
    }
  }

  function go(id: string) {
    setOptions(null);
    // Chuyến đang lên lịch vừa đổi → cái túi nổi phải đổi tên chuyến theo.
    tripBagChanged();
    router.push(`/lich-trinh/cua-toi/${id}`);
  }

  function open() {
    start(async () => {
      const res = await getPlanOptions(placeId);
      if (!res.ok) {
        if (res.error.includes("đăng nhập")) {
          rememberIntent();
          setLoginOpen(true);
          return;
        }
        toast.error(res.error);
        return;
      }

      // Chưa có gì để chọn → tạo thẳng, khỏi bắt bấm thêm một lần nữa.
      if (res.data.trips.length === 0 && res.data.templates.length === 0) {
        const made = await startTripForPlace(placeId);
        if (!made.ok) {
          toast.error(made.error);
          return;
        }
        toast.success(`Bắt đầu lên lịch trình đi ${placeName}`);
        go(made.data.id);
        return;
      }
      setOptions(res.data);
    });
  }

  // Vừa đăng nhập xong mà đang chờ đúng nơi này → mở lại luôn.
  useEffect(() => {
    if (isAuthed === false || claimed.current) return;
    let pendingId: string | null = null;
    try {
      pendingId = sessionStorage.getItem(INTENT_KEY);
    } catch {
      pendingId = null;
    }
    if (pendingId !== placeId) return;
    claimed.current = true;
    sessionStorage.removeItem(INTENT_KEY);
    open();
    // open() chỉ chạy một lần nhờ `claimed`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, placeId]);

  function onClick() {
    if (isAuthed === false) {
      rememberIntent();
      setLoginOpen(true);
      return;
    }
    open();
  }

  return (
    <>
      <Button
        onClick={onClick}
        disabled={pending}
        className={cn("rounded-lg bg-warm text-warm-foreground hover:bg-warm/90", className)}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Route className="size-4" aria-hidden />
        )}
        {/* Gói cả nhãn trong MỘT phần tử: để rời thì `gap` của Button chen vào
            giữa thành khoảng trắng đôi. Tên nơi chỉ hiện từ `sm` — "Lên lịch
            trình đi Phan Thiết" ở 320px sẽ rớt dòng. */}
        <span>
          Lên lịch trình<span className="hidden sm:inline"> đi {placeName}</span>
        </span>
      </Button>

      <Dialog open={options !== null} onOpenChange={(o) => !o && setOptions(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lên lịch trình đi {placeName}</DialogTitle>
            <DialogDescription>
              Chọn nơi bắt đầu — chuyến bạn chọn sẽ thành chuyến đang lên lịch trình.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto">
            {options && options.trips.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tiếp tục chuyến đang có
                </h3>
                <ul className="mt-2 space-y-1">
                  {options.trips.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            const res = await setPlanningTrip(t.id);
                            if (!res.ok) {
                              toast.error(res.error);
                              return;
                            }
                            go(t.id);
                          })
                        }
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted disabled:opacity-50"
                      >
                        <Route className="size-4 shrink-0 text-primary" aria-hidden />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{t.title}</span>
                          <span className="block text-xs text-muted-foreground">
                            {t.count} mục
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {options && options.templates.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Bắt đầu từ lịch trình mẫu
                </h3>
                <ul className="mt-2 space-y-1">
                  {options.templates.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            const res = await cloneTrip(t.id);
                            if (!res.ok) {
                              toast.error(res.error);
                              return;
                            }
                            toast.success(`Đã sao “${t.title}” về lịch trình của bạn`);
                            go(res.data.id);
                          })
                        }
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted disabled:opacity-50"
                      >
                        <Sparkles className="size-4 shrink-0 text-warm" aria-hidden />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{t.title}</span>
                          <span className="block text-xs text-muted-foreground">
                            {t.days} ngày · sao về rồi sửa thoải mái
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await startTripForPlace(placeId);
                  if (!res.ok) {
                    toast.error(res.error);
                    return;
                  }
                  go(res.data.id);
                })
              }
              className="flex w-full items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 text-left transition-colors hover:bg-muted disabled:opacity-50"
            >
              <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>
                <span className="block text-sm font-medium">Tạo chuyến mới</span>
                <span className="block text-xs text-muted-foreground">
                  Bắt đầu từ trang trắng cho {placeName}
                </span>
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <LoginDrawer
        open={loginOpen}
        onOpenChange={setLoginOpen}
        redirectTo={pathname ?? "/"}
        title={`Đăng nhập để lên lịch trình đi ${placeName}`}
        description="Đăng nhập rồi bạn quay lại đúng trang này và tiếp tục ngay."
      />
    </>
  );
}
