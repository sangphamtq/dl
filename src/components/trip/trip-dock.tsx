"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Trash2,
  Undo2,
  XIcon,
} from "@/components/icons";
import { NavIcon } from "@/components/site/nav-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
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
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LoginDrawer } from "@/components/site/login-drawer";
import { useCollapsedDays } from "@/components/trip/trip-collapse";
import { FabSlot } from "@/components/site/fab-stack";
import { FAB_BTN } from "@/lib/fab-ui";
import { MENU_CONTENT, MENU_ITEM, MENU_ITEM_DANGER, MENU_LABEL, MENU_SEP } from "@/lib/menu-ui";
import { Glyph } from "@/components/site/glyphs";
import { TripAddSearch, type AddTarget } from "@/components/trip/trip-add-search";
import { applyMove, BACKLOG, dayIdOf, dayKey, type Board } from "@/components/trip/trip-dnd";
import { dropAt, insertAt, type DropAt } from "@/lib/trip-drop";
import { onTripBagChanged, tripBagChanged } from "@/components/trip/trip-bag-events";
import {
  addDay,
  getTripBag,
  listMyTrips,
  moveItem,
  removeItem,
  setPlanningTrip,
  type TripBag,
  type TripBagDay,
  type TripBagItem,
} from "@/app/(site)/lich-trinh/actions";

const HIDDEN_ON = [
  "/lich-trinh/cua-toi",
  "/ban-do",
  "/cms",
  "/sale",
  "/login",
  "/offline",
];

const lockX: Modifier = ({ transform }) => ({ ...transform, x: 0 });

function dayNo(d: { index: number }): string {
  return `Ngày ${d.index + 1}`;
}

function dayLabel(d: { index: number; title: string | null }): string {
  const t = d.title?.trim();
  return t ? `${dayNo(d)}  ${t}` : dayNo(d);
}

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
  const prevCount = useRef(initial.unscheduled.length);
  const fabRef = useRef<HTMLButtonElement>(null);
  const [bump, setBump] = useState(false);
  const [addTarget, setAddTarget] = useState<AddTarget | null>(null);
  const router = useRouter();
  // Tạo chuyến là một TRANG riêng (thông tin cơ bản trước) — đóng ngăn rồi sang đó.
  const newTrip = () => {
    setOpen(false);
    router.push("/lich-trinh/cua-toi/tao");
  };

  // Thu gọn từng nhóm (Chưa xếp ngày = "backlog", mỗi ngày = id ngày) — khoá riêng `dock:` để không đụng trang soạn.
  const [collapsed, setCollapsed] = useCollapsedDays(`dock:${bag.trip?.id ?? "none"}`);

  const hidden = HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const [board, setBoard] = useState<Board>(() => boardOf(initial));
  const [syncedSig, setSyncedSig] = useState(() => boardSig(boardOf(initial)));
  const [activeId, setActiveId] = useState<string | null>(null);

  const serverSig = boardSig(boardOf(bag));
  if (activeId === null && serverSig !== syncedSig) {
    setSyncedSig(serverSig);
    setBoard(boardOf(bag));
  }

  const byId = new Map<string, TripBagItem>();
  for (const i of bag.unscheduled) byId.set(i.id, i);
  for (const d of bag.days) for (const i of d.items) byId.set(i.id, i);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function containerOf(b: Board, id: string): string | null {
    if (id in b) return id;
    return Object.keys(b).find((k) => b[k].includes(id)) ?? null;
  }

  const refresh = useCallback(async () => {
    try {
      const fresh = await getTripBag();
      setBag(fresh);
      return fresh;
    } catch {
      return null;
    }
  }, []);

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
        toast.error(res.error);
        syncBoard(await refresh());
        return;
      }
      syncBoard(await refresh());
      tripBagChanged();
    });
  }

  function syncBoard(fresh: TripBag | null) {
    if (!fresh) return;
    const b = boardOf(fresh);
    setBoard(b);
    setSyncedSig(boardSig(b));
  }

  const backlogIds = board[BACKLOG] ?? [];

  function moveTo(it: TripBagItem, dayId: string | null, at: DropAt, label: string) {
    act(async () => {
      const res = await moveItem(it.id, dayId, at);
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

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  // Kéo CHỈ đổi thứ tự trong CÙNG một ngày (hoặc trong "Chưa xếp ngày"): dò va chạm chỉ trong vùng của mục đang kéo,
  // nên không có bước "đổi vùng giữa chừng" (thứ làm danh sách nhảy). Chuyển ngày dùng menu "Xếp ngày" / ⋯.
  const collide: CollisionDetection = (args) => {
    const home = containerOf(board, String(args.active.id));
    const mates = home ? board[home] : [];
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((c) => mates.includes(String(c.id))),
    });
  };

  function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    setActiveId(null);
    if (!e.over || !bag.trip) return;

    const container = containerOf(board, id);
    if (!container || containerOf(board, String(e.over.id)) !== container || e.over.id === id) return;

    const next = applyMove(board, id, String(e.over.id));
    setBoard(next);
    setSyncedSig(serverSig);
    const dayId = container === BACKLOG ? null : dayIdOf(container);

    // Đổi thứ tự là việc nhỏ: KHÔNG toast (bản cũ báo "Đã xếp … vào …" sau mỗi lần thả — ồn).
    start(async () => {
      const res = await moveItem(id, dayId, dropAt(next[container], id));
      if (!res.ok) {
        toast(res.error);
        syncBoard(await refresh());
        return;
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
      <FabSlot order={10}>
        <button
          ref={fabRef}
          type="button"
          onClick={() => show(true)}
          aria-label={count > 0 ? `Lịch trình — ${count} mục chưa xếp ngày` : "Lịch trình"}
          title="Lịch trình"
          // Nằm trong CỤM NÚT NỔI góc dưới–phải (`FabSlot`), cùng khuôn `FAB_BTN` với nút lên đầu trang.
          className={cn(FAB_BTN, "transition-transform duration-200 hover:-translate-y-0.5", bump && "scale-110")}
        >
          <NavIcon name="route" active={false} className="size-5" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-[5px] bg-primary px-1 text-[0.625rem] font-semibold tabular-nums leading-none text-primary-foreground ring-2 ring-background">
              {count}
            </span>
          )}
        </button>
      </FabSlot>

      {/* `id` CỐ ĐỊNH: dnd-kit tự sinh id tăng dần cho `aria-describedby`, số
          trên server và trên client lệch nhau → hydration mismatch. */}
      <DndContext
        id="trip-dock-dnd"
        sensors={sensors}
        collisionDetection={collide}
        modifiers={[lockX]}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setBoard(boardOf(bag));
        }}
      >
      <Drawer open={open} onOpenChange={show} direction={side}>
        {/* Từ lg: tấm NỔI cách mép 12px, bo 16px (không dán sát cạnh phải); dưới lg trượt từ đáy, bo 16px. */}
        <DrawerContent className="border-0 shadow-[0_24px_64px_-16px_rgb(0_0_0/0.35)] data-[vaul-drawer-direction=bottom]:rounded-t-[16px] data-[vaul-drawer-direction=right]:inset-y-3 data-[vaul-drawer-direction=right]:right-3 data-[vaul-drawer-direction=right]:rounded-[16px] lg:max-w-[26rem] dark:ring-1 dark:ring-white/10">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-3 lg:pt-5">
              <div className="min-w-0 flex-1">
                <DrawerTitle className="text-xs font-medium text-muted-foreground">
                  {hasTrip ? "Đang lên lịch" : "Lịch trình"}
                </DrawerTitle>
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
                        // Tên chuyến LÀ tiêu đề (chữ lớn), bấm để đổi chuyến.
                        className="-ml-1.5 mt-0.5 flex max-w-full items-center gap-1.5 rounded-[6px] px-1.5 py-0.5 text-left transition-colors hover:bg-foreground/[0.05]"
                      >
                        <span className="truncate font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
                          {bag.trip!.title}
                        </span>
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" sideOffset={6} className={cn("w-64", MENU_CONTENT)}>
                      <DropdownMenuLabel className={MENU_LABEL}>Đang lên lịch cho</DropdownMenuLabel>
                      {(trips ?? []).map((t) => (
                        <DropdownMenuItem className={MENU_ITEM}
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
                          {t.id === bag.trip!.id && <Check className="size-4 text-primary" aria-hidden />}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator className={MENU_SEP} />
                      <DropdownMenuItem className={MENU_ITEM} onSelect={newTrip}>
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
              <div className="flex shrink-0 items-center gap-1">
                {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />}
                <DrawerClose
                  aria-label="Đóng"
                  className="grid size-9 place-items-center rounded-[10px] bg-foreground/[0.05] text-foreground/70 transition-colors hover:bg-foreground/[0.1] hover:text-foreground"
                >
                  <XIcon className="size-[1.125rem]" />
                </DrawerClose>
              </div>
            </div>

            {hasTrip && (
              <div className="px-5 pb-3">
                <button
                  type="button"
                  onClick={() => setAddTarget({ dayId: null, label: "danh sách chưa xếp" })}
                  className="flex h-10 w-full items-center gap-2.5 rounded-[10px] bg-foreground/[0.05] px-3 text-sm text-muted-foreground transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
                >
                  <Glyph name="search" className="size-4 shrink-0" />
                  <span className="min-w-0 truncate">Tìm hoặc tự thêm mục…</span>
                </button>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">
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
                      onClick={newTrip}
                    >
                      <Plus className="size-4" aria-hidden />
                      Tạo chuyến đầu tiên
                    </Button>
                  }
                />
              ) : (
                <div className="pb-1" data-vaul-no-drag>
                  {total === 0 && (
                    <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
                      Chưa có mục nào. Tìm ở ô phía trên để thêm.
                    </p>
                  )}
                  <section>
                    <GroupHeading
                      label="Chưa xếp ngày"
                      count={backlogIds.length}
                      highlight
                      open={!collapsed.has("backlog")}
                      onToggle={() => setCollapsed("backlog", !collapsed.has("backlog"))}
                      onAdd={() => setAddTarget({ dayId: null, label: "danh sách chưa xếp" })}
                    />
                    {!collapsed.has("backlog") && (
                    <SortableContext items={backlogIds} strategy={verticalListSortingStrategy}>
                      {backlogIds.length === 0 ? (
                        <EmptyGroup label="Không còn mục nào chờ xếp." />
                      ) : (
                        <ul className="space-y-0.5">
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
                                onRemove={() => removeNow(it)}
                              />
                            ) : null;
                          })}
                        </ul>
                      )}
                    </SortableContext>
                    )}
                  </section>

                  {bag.days.map((d) => {
                    const ids = board[dayKey(d.id)] ?? [];
                    return (
                      <section key={d.id}>
                        <GroupHeading
                          label={dayLabel(d)}
                          count={ids.length}
                          open={!collapsed.has(d.id)}
                          onToggle={() => setCollapsed(d.id, !collapsed.has(d.id))}
                          onAdd={() => setAddTarget({ dayId: d.id, label: dayNo(d) })}
                        />
                        {!collapsed.has(d.id) && (
                        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                          {ids.length === 0 ? (
                            <EmptyGroup label="Chưa có mục nào. Bấm + để thêm." />
                          ) : (
                            <ul className="space-y-0.5">
                              {ids.map((id: string, idx: number) => {
                                const it = byId.get(id);
                                return it ? (
                                  <ItemRow
                                    key={id}
                                    item={it}
                                    currentDayId={d.id}
                                    days={bag.days}
                                    pending={pending}
                                    onNavigate={() => setOpen(false)}
                                    onInsert={(offset) =>
                                      setAddTarget({
                                        dayId: d.id,
                                        label: dayNo(d),
                                        ...insertAt(ids, idx + offset, (x) => byId.get(x)?.name ?? "mục này"),
                                      })
                                    }
                                    onMove={(dayId, at, label) => moveTo(it, dayId, at, label)}
                                        onRemove={() => removeNow(it)}
                                  />
                                ) : null;
                              })}
                            </ul>
                          )}
                        </SortableContext>
                        )}
                      </section>
                    );
                  })}

                  <button
                    type="button"
                    disabled={pending}
                    onClick={addDayNow}
                    className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-foreground/20 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/35 hover:text-foreground disabled:opacity-50"
                  >
                    <Plus className="size-4" aria-hidden />
                    Thêm ngày {bag.days.length + 1}
                  </button>
                </div>
              )}
            </div>

            {hasTrip && (
              <div className="border-t border-border/60 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <Button asChild className="h-11 w-full rounded-[10px] text-[0.9375rem]" onClick={() => setOpen(false)}>
                  <Link href={`/lich-trinh/cua-toi/${bag.trip!.id}`}>
                    Mở lịch trình đầy đủ
                    <ChevronRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              </div>
            )}
          </div>

        </DrawerContent>
      </Drawer>

      </DndContext>

      {bag.trip && (
        <TripAddSearch
          tripId={bag.trip.id}
          placeName={bag.trip.placeName}
          target={addTarget}
          onClose={() => setAddTarget(null)}
          onAdded={tripBagChanged}
        />
      )}

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

function EmptyGroup({ label }: { label: string }) {
  return <p className="mb-1 rounded-[10px] bg-foreground/[0.03] px-3 py-3.5 text-center text-sm text-muted-foreground">{label}</p>;
}

function GroupHeading({
  label,
  count,
  highlight,
  open,
  onToggle,
  onAdd,
}: {
  label: string;
  count: number;
  highlight?: boolean;
  open: boolean;
  onToggle: () => void;
  onAdd?: () => void;
}) {
  return (
    // Tiêu đề nhóm = nút thu gọn / mở (cả dòng bấm được, ▾ xoay khi gập); "+" bên phải vẫn là nút riêng.
    <h3 className="sticky top-0 z-10 -mx-5 flex items-center gap-1 bg-background/95 px-5 pb-1.5 pt-4 backdrop-blur">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="-ml-1.5 flex min-w-0 flex-1 items-center gap-2 rounded-[6px] px-1.5 py-1 text-left transition-colors hover:bg-foreground/[0.04]"
      >
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", !open && "-rotate-90")}
          aria-hidden
        />
        {highlight && count > 0 && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-warm" />}
        <span className="truncate text-sm font-semibold">{label}</span>
      </button>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Thêm vào ${label}`}
          title={`Thêm vào ${label}`}
          className="-mr-1.5 grid size-8 shrink-0 place-items-center rounded-[6px] text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      )}
    </h3>
  );
}

function ItemRow({
  item,
  currentDayId,
  days,
  pending,
  onMove,
  onRemove,
  onNavigate,
  onInsert,
}: {
  item: TripBagItem;
  currentDayId: string | null;
  days: TripBagDay[];
  pending: boolean;
  onMove: (dayId: string | null, at: DropAt, label: string) => void;
  onRemove: () => void;
  onNavigate: () => void;
  /** 0 = phía trước, 1 = phía sau. Chỉ có ở mục đã xếp ngày — trong danh sách chưa xếp thứ tự không mang nghĩa gì. */
  onInsert?: (offset: 0 | 1) => void;
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
        // Hàng không vạch ngăn: rê vào thì nền nhạt + tay cầm hiện (cảm ứng: tay cầm luôn hiện).
        "group/row relative -mx-2 flex touch-manipulation items-center gap-1.5 rounded-[10px] px-1.5 py-2 transition-colors hover:bg-foreground/[0.035]",
        // Không DragOverlay: chính hàng đi theo tay (trục dọc), nhấc lên bằng nền + bóng.
        isDragging && "z-20 bg-background shadow-[0_12px_32px_-10px_rgb(0_0_0/0.3)]",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Kéo để xếp lại ${item.name}`}
        className="grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded-[6px] text-muted-foreground/40 transition-colors group-hover/row:text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-4" aria-hidden />
      </button>

      <span className="relative size-11 shrink-0 overflow-hidden rounded-[8px] bg-muted">
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
            className="block truncate text-[0.9375rem] font-medium transition-colors hover:text-primary-ink"
          >
            {item.name}
          </Link>
        ) : (
          <span className="block truncate text-[0.9375rem] font-medium">{item.name}</span>
        )}
        {/* Dòng loại chỉ cho mục KHÔNG ảnh (tự thêm, di chuyển…) — mục có ảnh thì ảnh đã nói; bỏ cả "kèm N hoạt động". */}
        {!item.image && <span className="block text-xs text-muted-foreground">{item.typeLabel}</span>}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {current ? (
            <button
              type="button"
              disabled={pending}
              aria-label={`Tuỳ chọn cho ${item.name}`}
              className="grid size-8 shrink-0 place-items-center rounded-[6px] text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground disabled:opacity-50 data-[state=open]:bg-foreground/[0.06]"
            >
              <MoreHorizontal className="size-4" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              className="flex h-8 shrink-0 items-center gap-1 rounded-[6px] bg-foreground/[0.05] px-2.5 text-xs font-medium transition-colors hover:bg-foreground/[0.09] disabled:opacity-50 data-[state=open]:bg-foreground/[0.09]"
            >
              Xếp ngày
              <ChevronDown className="size-3.5" aria-hidden />
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className={cn("w-60", MENU_CONTENT)}>
          {onInsert && (
            <>
              <DropdownMenuItem className={MENU_ITEM} onSelect={() => onInsert(0)}>
                <Plus className="size-4" aria-hidden />
                Thêm phía trước
              </DropdownMenuItem>
              <DropdownMenuItem className={MENU_ITEM} onSelect={() => onInsert(1)}>
                <Plus className="size-4" aria-hidden />
                Thêm phía sau
              </DropdownMenuItem>
              <DropdownMenuSeparator className={MENU_SEP} />
              <DropdownMenuLabel className={MENU_LABEL}>Chuyển sang</DropdownMenuLabel>
            </>
          )}
          {days.map((d) => (
            <DropdownMenuItem className={MENU_ITEM}
              key={d.id}
              disabled={d.id === currentDayId}
              onSelect={() => onMove(d.id, "end", dayLabel(d))}
            >
              <span className="min-w-0 flex-1 truncate">{dayLabel(d)}</span>
              {d.id === currentDayId && <Check className="size-4 text-primary" aria-hidden />}
            </DropdownMenuItem>
          ))}
          {/* "Thêm ngày mới" đã bỏ khỏi menu — nút "Thêm ngày N" ở cuối ngăn đã làm việc đó. */}
          {currentDayId && (
            <>
              <DropdownMenuSeparator className={MENU_SEP} />
              <DropdownMenuItem className={MENU_ITEM} onSelect={() => onMove(null, "start", "chưa xếp ngày")}>
                <Undo2 className="size-4" aria-hidden />
                Bỏ khỏi ngày
              </DropdownMenuItem>
            </>
          )}
          {/* Xoá nằm TRONG menu cho cả mục chưa xếp ngày (không còn nút thùng rác riêng ở hàng). */}
          <DropdownMenuSeparator className={MENU_SEP} />
          <DropdownMenuItem variant="destructive" className={MENU_ITEM_DANGER} onSelect={onRemove}>
            <Trash2 className="size-4" aria-hidden />
            Bỏ khỏi lịch trình
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
      <NavIcon name="route" active={false} className="size-7 text-muted-foreground/60" />
      <p className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">{title}</p>
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{body}</p>
      <div className="pt-1">{action}</div>
    </div>
  );
}
