"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  GripVertical,
  MoreHorizontal,
  Plus,
  Route,
  Trash2,
  Undo2,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LoginDrawer } from "@/components/site/login-drawer";
import { applyMove, BACKLOG, dayIdOf, dayKey, type Board } from "@/components/trip/trip-dnd";
import { onTripBagChanged, tripBagChanged } from "@/components/trip/trip-bag-events";
import {
  addDay,
  createTrip,
  getTripBag,
  listMyTrips,
  moveItem,
  removeItem,
  setPlanningTrip,
  type TripBag,
  type TripBagDay,
  type TripBagItem,
} from "@/app/(site)/lich-trinh/actions";

// NÚT "LỊCH TRÌNH" — viên tròn nổi ở mọi trang công khai + ngăn kéo soạn nhanh.
//
// Vấn đề nó giải: nút "Thêm vào lịch trình" bỏ mục vào một chuyến mà người dùng
// KHÔNG nhìn thấy. Bằng chứng duy nhất là cái toast 4 giây; qua trang sau thì
// không đâu trên site nói bạn đang lên lịch cho chuyến nào và đã gom được gì.
// Ngăn kéo này biến trạng thái vô hình đó thành một vật thể thường trực.
//
// Vì sao NÚT NỔI chứ không phải một mục trong header/thanh tab: nó phải theo
// kịp lúc người ta đang LƯỚT danh sách (Ẩm thực, Lưu trú) — đúng khoảnh khắc
// gom — chứ không phải một nơi để ghé thăm. Header thì mobile đã bỏ, còn thanh
// tab dưới chỉ còn đúng một chỗ trống.
//
// Kéo–thả trong ngăn kéo dùng CHUNG `applyMove`/`BACKLOG`/`dayKey` với trình
// soạn (`trip-dnd.ts`) — phép tính chỉ số khi đổi vùng là chỗ dễ sai nhất và đã
// có `pnpm check:trip-dnd` canh, viết lại một bản thứ hai là tự chuốc lỗi.

// Khu vực riêng tư / trang tự chứa. `/lich-trinh/cua-toi` nằm đây vì trong
// trình soạn thì cả trang ĐÃ là cái túi — một nút nổi mở lại chính nó là thừa.
// Chỉ chặn NHÁNH riêng tư: `/lich-trinh` (danh sách mẫu) là trang công khai, ở
// đó nút vẫn có ích — khách xem mẫu rồi mở túi của mình ra so.
// Giữ đồng bộ với `HIDDEN_ON` của bottom-nav & install-prompt.
const HIDDEN_ON = ["/lich-trinh/cua-toi", "/cms", "/sale", "/login", "/offline"];

// Số ngày là thứ ĐỊNH VỊ, tên tự đặt chỉ là phụ đề. Bản đầu lấy `title` thay
// cho cả nhãn, nên một ngày đặt tên "Ngày ra đảo" là mất luôn dấu hiệu nó là
// ngày thứ mấy — trong khi cả lịch trình chạy theo số ngày.
function dayNo(d: { index: number }): string {
  return `Ngày ${d.index + 1}`;
}

function dayLabel(d: { index: number; title: string | null }): string {
  const t = d.title?.trim();
  return t ? `${dayNo(d)} · ${t}` : dayNo(d);
}

/**
 * Bàn kéo–thả của ngăn kéo: danh sách **id theo từng vùng** (túi + mỗi ngày),
 * giống hệt `useTripBoard` của trình soạn nhưng ăn `TripBag` (dữ liệu nhẹ) thay
 * vì `DayView`/`ResolvedItem` (dữ liệu đầy đủ có giờ, cảnh báo, toạ độ).
 *
 * Vì sao phải có bản CỤC BỘ thay vì render thẳng từ `bag`: mọi thao tác đều là
 * server action rồi nạp lại, tức `bag` chỉ đổi sau một vòng mạng. Không có bản
 * cục bộ thì mục vừa thả nhảy về chỗ cũ rồi mới nhảy tới chỗ mới.
 */
function boardOf(bag: TripBag): Board {
  const b: Board = { [BACKLOG]: bag.unscheduled.map((i) => i.id) };
  for (const d of bag.days) b[dayKey(d.id)] = d.items.map((i) => i.id);
  return b;
}

function boardSig(b: Board): string {
  return Object.keys(b)
    .sort()
    .map((k) => `${k}:${b[k].join(",")}`)
    .join("|");
}

export function TripDock({ initial }: { initial: TripBag }) {
  const pathname = usePathname() ?? "/";
  const [bag, setBag] = useState<TripBag>(initial);
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"bottom" | "right">("bottom");
  const [loginOpen, setLoginOpen] = useState(false);
  const [pending, start] = useTransition();
  const [trips, setTrips] = useState<{ id: string; title: string; count: number }[] | null>(null);
  // Số mục lần trước — để cái túi NẢY LÊN đúng lúc một mục vừa rơi vào.
  const prevCount = useRef(initial.unscheduled.length);
  const fabRef = useRef<HTMLButtonElement>(null);
  const [bump, setBump] = useState(false);

  const hidden = HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // ── Bàn kéo–thả ────────────────────────────────────────────────────────
  const [board, setBoard] = useState<Board>(() => boardOf(initial));
  const [syncedSig, setSyncedSig] = useState(() => boardSig(boardOf(initial)));
  const [activeId, setActiveId] = useState<string | null>(null);

  // Nhận lại trạng thái từ server bằng cách chỉnh state NGAY TRONG RENDER (mẫu
  // "adjusting state when props change" của React), không phải trong effect:
  // effect gọi setState là một vòng render thừa và eslint chặn đúng chỗ đó.
  // Chỉ nhận khi KHÔNG đang kéo — nếu không, mỗi lần cha render lại là bản cục
  // bộ đang kéo dở bị xoá.
  // `syncedSig` giữ chữ ký của BẢN SERVER đã tiếp nhận gần nhất — KHÔNG phải
  // chữ ký của bàn cục bộ. Lưu nhầm cái sau thì ngay sau khi thả, bản server
  // (còn cũ, vì action chưa xong) sẽ khác nó và ghi đè lại → mục nhảy về chỗ cũ.
  const serverSig = boardSig(boardOf(bag));
  if (activeId === null && serverSig !== syncedSig) {
    setSyncedSig(serverSig);
    setBoard(boardOf(bag));
  }

  const byId = new Map<string, TripBagItem>();
  for (const i of bag.unscheduled) byId.set(i.id, i);
  for (const d of bag.days) for (const i of d.items) byId.set(i.id, i);

  const sensors = useSensors(
    // Chuột: rê 6px mới tính là kéo, nếu không mọi cú bấm vào tay cầm bị nuốt.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Cảm ứng: giữ 220ms — dưới ngưỡng đó vẫn là vuốt để CUỘN danh sách. Cùng
    // con số với trình soạn (§6c).
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function containerOf(b: Board, id: string): string | null {
    if (id in b) return id; // thả vào vùng rỗng: id chính là vùng
    return Object.keys(b).find((k) => b[k].includes(id)) ?? null;
  }

  const refresh = useCallback(async () => {
    try {
      const fresh = await getTripBag();
      setBag(fresh);
      return fresh;
    } catch {
      return null; // mất mạng: giữ nguyên bản đang có, đừng xoá trắng lịch trình
    }
  }, []);

  // Nút "Thêm vào lịch trình" ở bất kỳ đâu vừa chạy xong → nạp lại túi.
  useEffect(() => onTripBagChanged(() => void refresh()), [refresh]);

  useEffect(() => {
    const n = bag.unscheduled.length;
    if (n > prevCount.current) {
      setBump(true);
      const t = setTimeout(() => setBump(false), 480);
      prevCount.current = n;
      return () => clearTimeout(t);
    }
    prevCount.current = n;
  }, [bag.unscheduled.length]);

  // Ngăn kéo trượt từ ĐÁY trên máy hẹp (ngón cái với tới), nép PHẢI từ lg —
  // ở đó cột đáy dài ngoằng phải quét mắt cả màn hình mới hết.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setSide(mq.matches ? "right" : "bottom");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  if (hidden) return null;

  const count = bag.unscheduled.length;
  const hasTrip = bag.trip !== null;
  const total = count + bag.scheduledCount;

  // `initial` chỉ đúng ở lần tải trang đầu: layout `(site)` cố ý KHÔNG dựng lại
  // khi điều hướng phía client (xem chú thích trong layout), nên qua vài trang
  // là số liệu cũ đi. Mở ngăn kéo là lúc bắt buộc phải tươi — làm ngay trong
  // handler chứ không phải một effect ăn theo `open` (effect gọi setState là
  // một vòng render thừa, và eslint chặn đúng chỗ đó).
  function show(next: boolean) {
    setOpen(next);
    if (next) void refresh();
  }

  function act(run: () => Promise<{ ok: boolean; error?: string; stale?: boolean }>) {
    start(async () => {
      const res = await run();
      if (!res.ok) {
        // `stale` = ai đó (hoặc chính mình ở tab trình soạn) vừa sửa chuyến.
        // Không phải lỗi của người bấm — nạp lại rồi mời làm lại.
        toast.error(res.stale ? "Lịch trình vừa thay đổi, thử lại nhé." : res.error);
        syncBoard(await refresh());
        return;
      }
      syncBoard(await refresh());
      tripBagChanged();
    });
  }

  /** Nhận bàn từ một bản `bag` CỤ THỂ (bản vừa tải), khỏi đọc state cũ trong closure. */
  function syncBoard(fresh: TripBag | null) {
    if (!fresh) return;
    const b = boardOf(fresh);
    setBoard(b);
    setSyncedSig(boardSig(b));
  }

  const backlogIds = board[BACKLOG] ?? [];
  const activeItem = activeId ? (byId.get(activeId) ?? null) : null;

  function moveTo(it: TripBagItem, dayId: string | null, at: number, label: string) {
    act(async () => {
      const res = await moveItem(it.id, dayId, at, bag.trip!.version);
      if (res.ok)
        toast.success(dayId ? `Đã xếp ${it.name} vào ${label}` : `Đã bỏ ${it.name} khỏi ngày`);
      return res;
    });
  }

  function addDayNow() {
    act(async () => {
      const res = await addDay(bag.trip!.id);
      if (res.ok) toast.success("Đã thêm một ngày");
      return res;
    });
  }

  function removeNow(it: TripBagItem) {
    act(async () => {
      const res = await removeItem(it.id);
      if (res.ok) toast.success(`Đã bỏ ${it.name}`);
      return res;
    });
  }

  // ── Kéo–thả: đổi vùng lúc rê, chốt vị trí lúc thả ─────────────────────
  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    if (!e.over) return;
    const a = String(e.active.id);
    const from = containerOf(board, a);
    const to = containerOf(board, String(e.over.id));
    // Chỉ dời khi ĐỔI vùng; đổi chỗ trong cùng vùng để dành lúc thả, làm ở đây
    // thì danh sách rung liên tục theo con trỏ.
    if (from && to && from !== to) setBoard((prev) => applyMove(prev, a, String(e.over!.id)));
  }

  function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    setActiveId(null);
    if (!e.over || !bag.trip) return;

    // Phải tính ĐỒNG BỘ ngay tại đây: đọc `board` ở lượt sau sẽ ra bàn CŨ vì
    // setState chưa kịp áp dụng.
    const next = applyMove(board, id, String(e.over.id));
    setBoard(next);
    // Đánh dấu bản server HIỆN TẠI là "đã xử lý" để render kế tiếp không kéo bàn
    // về bản cũ trong lúc chờ action chạy xong.
    setSyncedSig(serverSig);

    const container = Object.keys(next).find((k) => next[k].includes(id));
    if (!container) return;
    const dayId = container === BACKLOG ? null : dayIdOf(container);
    const index = next[container].indexOf(id);

    const item = byId.get(id);
    start(async () => {
      const res = await moveItem(id, dayId, index, bag.trip!.version);
      if (!res.ok) {
        // `stale` = có người vừa sửa chuyến. Không phải lỗi của người kéo — báo
        // nhẹ rồi nạp lại bản đúng, đừng để họ kẹt với bàn đã lệch.
        toast(res.stale ? "Lịch trình vừa thay đổi, thử lại nhé." : res.error);
        syncBoard(await refresh());
        return;
      }
      if (item) {
        const d = dayId ? bag.days.find((x) => x.id === dayId) : null;
        toast.success(
          d ? `Đã xếp ${item.name} vào ${dayLabel(d)}` : `Đã bỏ ${item.name} khỏi ngày`,
        );
      }
      syncBoard(await refresh());
      tripBagChanged();
    });
  }

  async function openTripPicker() {
    const res = await listMyTrips();
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setTrips(res.data.trips);
  }

  return (
    <>
      {/* Nút giữ ở mức TỐI THIỂU: một viên tròn 44px, đúng ngưỡng chạm thoải mái
          và không hơn. Bản trước là viên chữ "Lịch trình" — dễ hiểu hơn thật,
          nhưng một vật thể nổi trên MỌI trang thì mỗi pixel nó chiếm là một
          pixel vĩnh viễn lấy của nội dung, mà nội dung mới là thứ người ta tới
          để xem. Nghĩa của nút do `aria-label` + `title` gánh.

          Đặt ở GIỮA cạnh phải, không phải góc đáy–phải: dải đáy đã đông
          (`BottomNav` · `PeerBar` · `BackToTop` · lời mời cài app) nên đặt vào
          đó là phải bắt cả bốn thứ kia tránh đường. */}
      <button
        ref={fabRef}
        type="button"
        onClick={() => show(true)}
        aria-label={count > 0 ? `Lịch trình — ${count} mục chưa xếp ngày` : "Lịch trình"}
        title="Lịch trình"
        className={cn(
          "fixed right-3 top-[62%] z-40 grid size-11 place-items-center rounded-full border border-border/60 bg-background/85 text-foreground shadow-lg shadow-black/10 backdrop-blur transition-all duration-200 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:right-4",
          bump && "scale-110",
        )}
      >
        <Route className="size-5" aria-hidden />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid size-4.5 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground ring-2 ring-background">
            {count}
          </span>
        )}
      </button>

      {/* DndContext bọc từ NGOÀI `<Drawer>`, và `DragOverlay` cũng nằm ngoài
          `DrawerContent`: vaul đặt `transform` lên panel, mà `position: fixed`
          bên trong một phần tử có `transform` thì lấy chính phần tử đó làm gốc
          toạ độ — bản sao đi theo con trỏ sẽ trôi lệch hẳn khỏi con trỏ.

          `id` CỐ ĐỊNH, bắt buộc: dnd-kit sinh `aria-describedby="DndDescribedBy-N"`
          bằng một bộ đếm ở mức module; để nó tự đếm thì server và client ra số
          khác nhau ⇒ React báo lệch hydrate (đúng cái bẫy đã ghi trong
          trip-editor). */}
      <DndContext
        id="trip-dock-dnd"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setBoard(boardOf(bag));
        }}
      >
      <Drawer open={open} onOpenChange={show} direction={side}>
        <DrawerContent className="lg:max-w-md lg:rounded-l-3xl">
          <div className="flex min-h-0 flex-1 flex-col">
            {/* ── Đầu: đang lên lịch cho chuyến NÀO ─────────────────────── */}
            <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-3 lg:pt-5">
              {/* `flex-1`, không chỉ `min-w-0`: thiếu nó thì cột co theo chữ
                  "Túi lịch trình" và tên chuyến bị cắt từ giữa dù còn thừa chỗ. */}
              <div className="min-w-0 flex-1">
                <DrawerTitle className="text-base">Lịch trình</DrawerTitle>
                {/* Radix cảnh báo nếu DialogContent (vaul dựng trên đó) không có
                    mô tả. Khi đã có chuyến, chỗ của dòng mô tả bị bộ chọn chuyến
                    chiếm — nên mô tả vẫn còn, chỉ dành riêng cho trình đọc. */}
                {hasTrip ? (
                  <>
                    <DrawerDescription className="sr-only">
                      Các mục bạn đã lưu cho chuyến “{bag.trip!.title}” và chưa xếp vào
                      ngày nào.
                    </DrawerDescription>
                  <DropdownMenu
                    onOpenChange={(o) => {
                      if (o) void openTripPicker();
                    }}
                  >
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="-ml-1 mt-0.5 flex max-w-full items-center gap-1 rounded-md px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <span className="truncate">{bag.trip!.title}</span>
                        <ChevronDown className="size-3.5 shrink-0" aria-hidden />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      <DropdownMenuLabel>Đang lên lịch cho</DropdownMenuLabel>
                      {(trips ?? []).map((t) => (
                        <DropdownMenuItem
                          key={t.id}
                          onSelect={() =>
                            act(async () => {
                              const res = await setPlanningTrip(t.id);
                              if (res.ok) toast.success(`Đang lên lịch cho “${t.title}”`);
                              return res;
                            })
                          }
                        >
                          <span className="min-w-0 flex-1 truncate">{t.title}</span>
                          {t.id === bag.trip!.id ? (
                            <Check className="size-4 text-primary" aria-hidden />
                          ) : (
                            <span className="text-xs text-muted-foreground">{t.count}</span>
                          )}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() =>
                          act(async () => {
                            const res = await createTrip();
                            if (res.ok) toast.success("Đã tạo chuyến mới");
                            return res;
                          })
                        }
                      >
                        <Plus className="size-4" aria-hidden />
                        Chuyến mới
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  </>
                ) : (
                  <DrawerDescription className="mt-0.5">
                    Gom địa điểm, quán ăn, chỗ ở — xếp ngày sau.
                  </DrawerDescription>
                )}
              </div>
              {pending && (
                <Loader2 className="mt-1 size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
              )}
            </div>

            {/* ── Thân ──────────────────────────────────────────────────── */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
              {!bag.authed ? (
                <Empty
                  title="Đăng nhập để bắt đầu"
                  body="Lịch trình lưu theo tài khoản, nhờ vậy mở lại được trên điện thoại lúc đang đi."
                  action={
                    <Button
                      onClick={() => {
                        setOpen(false);
                        setLoginOpen(true);
                      }}
                    >
                      Đăng nhập
                    </Button>
                  }
                />
              ) : !hasTrip ? (
                <Empty
                  title="Chưa có chuyến nào"
                  body="Tạo một chuyến rồi bấm “Thêm vào lịch trình” ở bất kỳ địa điểm, quán ăn hay chỗ ở nào."
                  action={
                    <Button
                      disabled={pending}
                      onClick={() =>
                        act(async () => {
                          const res = await createTrip();
                          if (res.ok) toast.success("Đã tạo “Chuyến đi của tôi”");
                          return res;
                        })
                      }
                    >
                      <Plus className="size-4" aria-hidden />
                      Tạo chuyến đầu tiên
                    </Button>
                  }
                />
              ) : total === 0 ? (
                <Empty
                  title="Lịch trình đang trống"
                  body="Lướt Địa điểm · Ẩm thực · Nơi lưu trú của một điểm đến, bấm “Thêm vào lịch trình” là nó rơi vào đây."
                  action={
                    <Button variant="outline" asChild onClick={() => setOpen(false)}>
                      <Link href="/diem-den">Khám phá điểm đến</Link>
                    </Button>
                  }
                />
              ) : (
                // `data-vaul-no-drag`: không có nó thì trên điện thoại, kéo một
                // mục xuống dưới sẽ kéo luôn cả ngăn kéo đóng lại — vaul hiểu cú
                // vuốt dọc là "đóng bảng".
                <div className="pb-1" data-vaul-no-drag>
                  {/* Túi trước, ngày sau: mục chưa xếp là thứ ĐANG CHỜ mình làm
                      gì đó, còn các ngày là thứ đã yên vị. */}
                  {/* Khối này render KỂ CẢ khi rỗng: nó là đích thả để kéo một
                      mục ra khỏi ngày. Ẩn đi thì thao tác đó chỉ còn làm được
                      qua menu. */}
                  <section>
                    <GroupHeading label="Chưa xếp ngày" count={backlogIds.length} highlight />
                    <SortableContext items={backlogIds} strategy={verticalListSortingStrategy}>
                      {backlogIds.length === 0 ? (
                        <DropZone id={BACKLOG} label="Kéo vào đây để bỏ khỏi ngày" />
                      ) : (
                        <ul className="divide-y divide-border/60">
                          {backlogIds.map((id: string) => {
                            const it = byId.get(id);
                            return it ? (
                              <ItemRow
                                key={id}
                                item={it}
                                currentDayId={null}
                                days={bag.days}
                                pending={pending}
                                onNavigate={() => setOpen(false)}
                                onMove={(dayId, at, label) => moveTo(it, dayId, at, label)}
                                onAddDay={addDayNow}
                                onRemove={() => removeNow(it)}
                              />
                            ) : null;
                          })}
                        </ul>
                      )}
                    </SortableContext>
                  </section>

                  {/* CẢ lịch trình, không chỉ cái túi: mở ngăn kéo là thấy chuyến
                      đang thành hình ra sao, khỏi phải vào trình soạn mới biết. */}
                  {bag.days.map((d) => {
                    const ids = board[dayKey(d.id)] ?? [];
                    return (
                      <section key={d.id}>
                        <GroupHeading label={dayLabel(d)} count={ids.length} />
                        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                          {ids.length === 0 ? (
                            <DropZone id={dayKey(d.id)} label="Kéo một mục vào ngày này" />
                          ) : (
                            <ul className="divide-y divide-border/60">
                              {ids.map((id: string) => {
                                const it = byId.get(id);
                                return it ? (
                                  <ItemRow
                                    key={id}
                                    item={it}
                                    currentDayId={d.id}
                                    days={bag.days}
                                    pending={pending}
                                    onNavigate={() => setOpen(false)}
                                    onMove={(dayId, at, label) => moveTo(it, dayId, at, label)}
                                    onAddDay={addDayNow}
                                    onRemove={() => removeNow(it)}
                                  />
                                ) : null;
                              })}
                            </ul>
                          )}
                        </SortableContext>
                      </section>
                    );
                  })}

                  <button
                    type="button"
                    disabled={pending}
                    onClick={addDayNow}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    <Plus className="size-4" aria-hidden />
                    Thêm ngày {bag.days.length + 1}
                  </button>
                </div>
              )}
            </div>

            {/* ── Chân: đường sang trình soạn ───────────────────────────── */}
            {hasTrip && (
              <div className="border-t border-border/60 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <Button asChild className="w-full" onClick={() => setOpen(false)}>
                  <Link href={`/lich-trinh/cua-toi/${bag.trip!.id}`}>
                    Mở lịch trình
                    <ChevronRight className="size-4" aria-hidden />
                  </Link>
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {bag.days.length} ngày · {bag.scheduledCount} mục đã xếp
                </p>
              </div>
            )}
          </div>

        </DrawerContent>
      </Drawer>

      {/* Bản sao đi theo con trỏ. Không có nó thì hàng gốc mờ đi tại chỗ cũ mà
          chẳng có gì trong tay, và người kéo mất dấu thứ mình đang cầm. */}
      <DragOverlay dropAnimation={null} className="z-[60]">
        {activeItem ? (
          <div className="flex max-w-[15rem] items-center gap-3 rounded-xl border border-border/60 bg-background/95 px-3 py-2 shadow-xl backdrop-blur">
            <span className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-muted">
              {activeItem.image && (
                <Image
                  src={activeItem.image}
                  alt=""
                  fill
                  sizes="36px"
                  draggable={false}
                  className="object-cover"
                />
              )}
            </span>
            <span className="truncate text-sm font-medium">{activeItem.name}</span>
          </div>
        ) : null}
      </DragOverlay>
      </DndContext>

      <LoginDrawer
        open={loginOpen}
        onOpenChange={setLoginOpen}
        redirectTo={pathname}
        title="Đăng nhập để lên lịch trình"
        description="Đăng nhập rồi bạn quay lại đúng trang này và tiếp tục gom."
      />
    </>
  );
}

/** Vùng thả của một nhóm đang rỗng — cũng là chỗ nói cho biết là kéo được. */
function DropZone({ id, label }: { id: string; label: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <p
      ref={setNodeRef}
      className={cn(
        "mb-1 rounded-xl border border-dashed px-3 py-4 text-center text-sm transition-colors",
        isOver
          ? "border-primary bg-primary/5 text-primary"
          : "border-border/60 text-muted-foreground",
      )}
    >
      {label}
    </p>
  );
}

/** Nhãn ngăn nhóm. Dính lại khi cuộn để luôn biết đang đọc ngày nào. */
function GroupHeading({
  label,
  count,
  highlight,
}: {
  label: string;
  count: number;
  highlight?: boolean;
}) {
  return (
    <h3 className="sticky top-0 z-10 -mx-4 flex items-baseline gap-2 bg-background/95 px-4 pb-1.5 pt-3 text-xs font-semibold uppercase tracking-wide backdrop-blur">
      <span className={highlight ? "text-primary" : "text-muted-foreground"}>{label}</span>
      <span className="font-normal normal-case tracking-normal text-muted-foreground">
        {count} mục
      </span>
    </h3>
  );
}

/**
 * Một mục trong ngăn kéo. Ở CẤP MODULE chứ không định nghĩa bên trong `TripDock`:
 * component khai trong thân render là một kiểu MỚI sau mỗi lần render, nên React
 * unmount rồi mount lại cả hàng — menu chọn ngày vừa mở sẽ đóng ngay lập tức.
 */
function ItemRow({
  item,
  currentDayId,
  days,
  pending,
  onMove,
  onAddDay,
  onRemove,
  onNavigate,
}: {
  item: TripBagItem;
  /** null = đang nằm trong túi (chưa xếp ngày). */
  currentDayId: string | null;
  days: TripBagDay[];
  pending: boolean;
  /** `at` = vị trí chèn; `label` chỉ để hiện trong toast. */
  onMove: (dayId: string | null, at: number, label: string) => void;
  onAddDay: () => void;
  onRemove: () => void;
  onNavigate: () => void;
}) {
  const current = currentDayId ? days.find((d) => d.id === currentDayId) : null;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex touch-manipulation items-center gap-1.5 py-2.5",
        // Hàng gốc mờ đi trong lúc kéo — bản đi theo con trỏ là `DragOverlay`.
        isDragging && "opacity-40",
      )}
    >
      {/* Tay cầm NHÌN THẤY ĐƯỢC, không phải "cả hàng kéo được": kéo cả hàng thì
          trên cảm ứng mọi cú vuốt để cuộn đều có thể thành cú kéo, còn trên máy
          tính thì nuốt luôn thao tác bôi đen chữ. Cùng kết luận đã ghi ở §6c cho
          trình soạn. Đây cũng là tay cầm cho BÀN PHÍM (space → mũi tên → space). */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Kéo để xếp lại ${item.name}`}
        className="grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-4" aria-hidden />
      </button>

      <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-muted">
        {item.image ? (
          <Image src={item.image} alt="" fill sizes="44px" draggable={false} className="object-cover" />
        ) : (
          <CalendarDays
            className="absolute inset-0 m-auto size-4 text-muted-foreground"
            aria-hidden
          />
        )}
      </span>

      <span className="min-w-0 flex-1">
        {item.href ? (
          <Link
            href={item.href}
            onClick={onNavigate}
            draggable={false}
            className="block truncate text-sm font-medium hover:text-primary"
          >
            {item.name}
          </Link>
        ) : (
          <span className="block truncate text-sm font-medium">{item.name}</span>
        )}
        <span className="block text-xs text-muted-foreground">{item.typeLabel}</span>
      </span>

      {/* Đổi ngày ngay tại đây: đi tới trình soạn chỉ để chuyển một mục sang
          Ngày 2 là quãng đường quá dài cho một thao tác. Thứ tự TRONG ngày thì
          vẫn sửa ở trình soạn — nơi có dòng thời gian và cảnh báo giờ mở cửa. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* Hai hình dạng, vì hai việc khác nhau:
              · trong TÚI — việc đang chờ là XẾP, nên là nút chữ mời gọi;
              · trong MỘT NGÀY — mọi thứ đã yên vị, và hàng nào cũng nhắc lại
                "Ngày 1" ngay dưới cái tiêu đề đã ghi "NGÀY 1" thì chỉ là chữ
                thừa. Thu về một nút "…" gom cả chuyển ngày lẫn bỏ mục. */}
          {current ? (
            <button
              type="button"
              disabled={pending}
              aria-label={`Tuỳ chọn cho ${item.name}`}
              className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-border/60 px-2.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
            >
              Xếp ngày
              <ChevronDown className="size-3.5" aria-hidden />
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {days.map((d) => (
            <DropdownMenuItem
              key={d.id}
              disabled={d.id === currentDayId}
              onSelect={() => onMove(d.id, d.items.length, dayLabel(d))}
            >
              <span className="min-w-0 flex-1 truncate">{dayLabel(d)}</span>
              {d.id === currentDayId ? (
                <Check className="size-4 text-primary" aria-hidden />
              ) : (
                <span className="text-xs text-muted-foreground">{d.items.length}</span>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          {currentDayId && (
            <DropdownMenuItem onSelect={() => onMove(null, 0, "chưa xếp ngày")}>
              <Undo2 className="size-4" aria-hidden />
              Bỏ khỏi ngày
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={onAddDay}>
            <Plus className="size-4" aria-hidden />
            Thêm ngày mới
          </DropdownMenuItem>
          {current && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onRemove}>
                <Trash2 className="size-4" aria-hidden />
                Bỏ khỏi lịch trình
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {!current && (
        <button
          type="button"
          disabled={pending}
          aria-label={`Bỏ ${item.name} khỏi lịch trình`}
          onClick={onRemove}
          className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      )}
    </li>
  );
}

function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-2 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Route className="size-5" aria-hidden />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{body}</p>
      <div className="pt-1">{action}</div>
    </div>
  );
}
