"use client";

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Glyph } from "@/components/site/glyphs";
import { R_CARD } from "@/lib/radius";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  ResolvedItem,
  DayView,
  ItemView,
  TripPerson,
  TripNoteRow,
  TripPackRow,
  TripExpenseRow,
} from "@/lib/trip";
import { TripNotes } from "@/components/trip/trip-notes";
import { PackSuggestions, TripPacking } from "@/components/trip/trip-packing";
import { TripMoney } from "@/components/trip/trip-money";
import { formatMinutes, fmtDuration, DEFAULT_STAY_MIN } from "@/lib/trip-time";
import {
  addDay,
  moveItem,
  removeDay,
  removeItem,
  updateDay,
  updateItem,
} from "@/app/(site)/lich-trinh/actions";
import { TripMap } from "@/components/trip/trip-map";
import { stayLabel } from "@/lib/trip-time";
import { TripShell } from "@/components/trip/trip-shell";
import { TripDayStrip } from "@/components/trip/trip-day-strip";
import { TripFieldsMenu, useTripFields, type TripFields } from "@/components/trip/trip-fields";
import {
  DayHeading,
  RailItem,
  DoingRow,
  PlaceStub,
  RailLeg,
  StopRow,
  Thumb,
  Warning,
} from "@/components/trip/trip-rail";
import { TripTopbar } from "@/components/trip/trip-topbar";
import { useTripLiveSync } from "@/components/trip/trip-live-sync";
import { TripAddSearch, type AddPos, type AddTarget } from "@/components/trip/trip-add-search";
import { insertAt } from "@/lib/trip-drop";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  useDndContext,
  PointerSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DraggableAttributes,
} from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BACKLOG,
  canBeDoing,
  dayKey,
  doingsKey,
  useTripBoard,
} from "@/components/trip/trip-dnd";

type TripHeader = {
  id: string;
  title: string;
  startDate: string | null;
  partySize: number | null;
  autoTravel: boolean;
  shareId: string | null;
  visibility: "private" | "unlisted";
  place: { slug: string; name: string } | null;
  isTemplate: boolean;
  version: number;
  isOwner: boolean;
  people: TripPerson[];
};

const STAY_PRESETS = [15, 30, 45, 60, 90, 120, 180, 240, 360];

export function TripEditor({
  trip,
  days,
  backlog,
  notes,
  packing,
  expenses,
  viewerId,
}: {
  trip: TripHeader;
  days: DayView[];
  backlog: ResolvedItem[];
  notes: TripNoteRow[];
  packing: TripPackRow[];
  expenses: TripExpenseRow[];
  viewerId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const tab = pathname?.startsWith(`/lich-trinh/cua-toi/${trip.id}/`)
    ? pathname.slice(`/lich-trinh/cua-toi/${trip.id}/`.length).replace(/\/+$/, "")
    : null;
  const [pending, start] = useTransition();
  const [activeDayId, setActiveDayId] = useState(days[0]?.id ?? "");

  const [staleDays, setStaleDays] = useState<string[]>([]);
  const [addTarget, setAddTarget] = useState<AddTarget | null>(null);
  const slow = useDelayedFlag(pending, 350);
  const fields = useTripFields();

  const activeDay = days.find((d) => d.id === activeDayId) ?? days[0] ?? null;

  function pickDay(id: string) {
    setActiveDayId(id);
    document.getElementById(`day-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) {
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error ?? "Không thực hiện được.");
        return;
      }
      if (done) toast.success(done);
    });
  }

  const dnd = useTripBoard(days, backlog);

  const sync = useTripLiveSync({
    tripId: trip.id,
    version: trip.version,
    enabled: trip.people.length > 1,
    busy: pending || dnd.activeId !== null,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Cột "Làm gì" nằm TRONG một hàng lớn hơn nó nhiều: dò theo góc gần nhất thì cả hàng luôn
  // thắng, việc thả vào cột trống của nơi khác lại rơi thành hàng riêng. Chuột đang ở trong
  // cột / một việc nào thì lấy đúng cái đó trước.
  const collide: CollisionDetection = (args) => {
    const within = pointerWithin(args);
    const inside = within.filter((c) => {
      const box = dnd.containerOf(String(c.id));
      return box?.startsWith("in:") || String(c.id).startsWith("in:");
    });
    const doing = inside.find((c) => !String(c.id).startsWith("in:"));
    if (doing) return [doing];
    if (inside.length) return [inside[0]];
    // Đang kéo một VIỆC (của một nơi) qua một hàng ⇒ vào việc của hàng đó, thả đâu trên hàng
    // cũng được. Không thì trên đường kéo nó bị đổi thành hàng riêng mỗi lần lướt qua một
    // hàng, bố cục xô đi và lúc thả rơi sai chỗ.
    const active = String(args.active.id);
    const isDoing = !!dnd.byId.get(active)?.parentId || !!dnd.containerOf(active)?.startsWith("in:");
    if (isDoing) {
      const row = within.find((c) => {
        const box = dnd.containerOf(String(c.id));
        return String(c.id) !== active && (box?.startsWith("day:") || box === BACKLOG);
      });
      if (row) return [{ id: doingsKey(String(row.id)) }];
    }
    // Kéo CẢ HÀNG: hàng giờ cao (việc nằm ngay dưới nơi) nên dò theo GÓC gần nhất thì hàng to
    // luôn thấy gần chính nó nhất và không chịu đổi chỗ — lấy hàng đang nằm dưới chuột.
    const row = within.find((c) => {
      const box = dnd.containerOf(String(c.id));
      return box?.startsWith("day:") || box === BACKLOG;
    });
    if (row) return [row];
    return closestCorners(args);
  };

  function onDragStart(e: DragStartEvent) {
    dnd.beginDrag(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const over = e.over;
    if (!over) return;
    const from = dnd.containerOf(String(e.active.id));
    const to = dnd.containerOf(String(over.id));
    if (from && to && from !== to) dnd.moveLocal(String(e.active.id), String(over.id));
  }

  function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    dnd.endDrag();

    const fromDayId = dnd.byId.get(id)?.dayId ?? null;
    const at = dnd.commitMove(id, e.over ? String(e.over.id) : null);
    setStaleDays([fromDayId, at?.dayId ?? null].filter((x): x is string => !!x));
    if (at)
      run(async () => {
        const res = await moveItem(id, at.dayId, at.at, at.parentId);
        if (!res.ok) {
          dnd.resetFromProps();
          router.refresh();
        }
        return res;
      });
  }

  const activeItem = dnd.activeId ? dnd.byId.get(dnd.activeId) : null;
  // Chỉ khi đang kéo một VIỆC (thả vào nơi khác được) mới mở chỗ thả trong các nơi chưa có việc.
  // Kéo một NƠI thì không — nó không bao giờ chui vào nơi khác, mở ra chỉ làm cả ngày xô đi.
  const draggingDoing =
    !!activeItem && canBeDoing(activeItem) && (dnd.board[doingsKey(activeItem.id)]?.length ?? 0) === 0;
  // Đang kéo CẢ HÀNG (một mục gốc) ⇒ mọi hàng thu gọn còn "kèm N việc": nơi nhiều việc kéo đi
  // là một khối rất dài, cả ngày thì dài gấp mấy lần — thu lại thì chỉ còn xếp các nơi.
  const draggingRow =
    !!activeItem && !(dnd.containerOf(activeItem.id)?.startsWith("in:") ?? false);

  // Thu gọn NGAY LÚC NHẤN tay kéo của một hàng, không đợi chuột dịch đủ ngưỡng kích hoạt kéo.
  const [pressed, setPressed] = useState<string | null>(null);
  const pressAnchor = useRef<{ id: string; top: number } | null>(null);
  function pressRow(id: string) {
    const el = document.querySelector<HTMLElement>(`[data-stop-row="${id}"]`);
    pressAnchor.current = el ? { id, top: el.getBoundingClientRect().top } : null;
    setPressed(id);
  }
  useEffect(() => {
    if (!pressed) return;
    const release = () => setPressed(null);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [pressed]);
  // Các hàng phía trên thu lại thì hàng đang nhấn NHẢY LÊN, trượt khỏi con trỏ — cuộn bù đúng
  // khoảng đó để nó đứng yên dưới chuột (cũng là chỗ dnd-kit đo để bắt đầu kéo).
  useLayoutEffect(() => {
    const a = pressAnchor.current;
    if (!pressed || !a) return;
    pressAnchor.current = null;
    const el = document.querySelector<HTMLElement>(`[data-stop-row="${a.id}"]`);
    if (el) window.scrollBy(0, el.getBoundingClientRect().top - a.top);
  }, [pressed]);
  const collapseRows = draggingRow || pressed !== null;

  return (
    <DndContext
      // `id` CỐ ĐỊNH — xem chú thích cùng chỗ ở `trip-dock.tsx`.
      id="trip-dnd"
      sensors={sensors}
      collisionDetection={collide}
      // Vùng "Làm gì" trống chỉ nở ra KHI bắt đầu kéo ⇒ bố cục đổi giữa lúc kéo; đo lại liên tục
      // kẻo dnd-kit dò điểm thả theo toạ độ cũ.
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        dnd.endDrag();
        dnd.resetFromProps();
      }}
    >
    <TripShell
      banner
      header={
        <TripTopbar
          trip={trip}
          // Đi một mình thì không ai đổi gì sau lưng — nút chỉ là thêm một thứ để bấm.
          sync={trip.people.length > 1 ? sync : undefined}
          facts={[
            `${days.length} ngày`,
            `${days.reduce((s, d) => s + d.items.length, 0) + backlog.length} mục`,
          ]}
        />
      }
      navTripId={trip.id}
      {...(tab === "do-mang-theo"
        ? {
            right: <PackSuggestions tripId={trip.id} items={packing} />,
            rightTitle: "Gợi ý món hay mang",
            rightIcon: "backpack" as const,
          }
        : {})}
      {...(tab !== null
        ? {}
        : {
            asideTitle: "Chưa xếp ngày",
            asideCount: backlog.length,
            aside: (
          <>
            {/* Ô tìm ĐẦU khay — nền xám trong tấm trắng của khay. */}
            <button
              type="button"
              onClick={() => setAddTarget({ dayId: null, label: "danh sách chưa xếp" })}
              className="mb-1.5 flex h-9 w-full items-center gap-2.5 rounded-[4px] bg-muted/70 px-2.5 text-sm text-foreground/60 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Glyph name="search" className="size-4 shrink-0" />
              Tìm hoặc tự thêm mục…
            </button>
            {backlog.length === 0 ? (
              <div className="rounded-[6px] border border-dashed px-3 py-6 text-center">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Chưa có mục nào chờ xếp. Bấm{" "}
                  <strong className="font-medium text-foreground">Thêm vào lịch trình</strong> ở
                  trang địa điểm, quán ăn hay chỗ ở để gom vào đây trước, xếp ngày sau.
                </p>
                {trip.place && (
                  <div className="mt-3 grid gap-1.5">
                    <Link
                      href={`/diem-den/${trip.place.slug}/dia-diem`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Xem địa điểm ở {trip.place.name} <Glyph name="forward" className="ml-0.5 inline size-3.5 align-[-0.15em]" />
                    </Link>
                    <Link
                      href={`/diem-den/${trip.place.slug}/am-thuc`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Xem quán ăn ở {trip.place.name} <Glyph name="forward" className="ml-0.5 inline size-3.5 align-[-0.15em]" />
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <BacklogList
                ids={dnd.board[BACKLOG] ?? []}
                byId={dnd.byId}
                days={days}
                run={run}
              />
            )}

            {backlog.length > 0 && (
              <p className="mt-1.5 px-1.5 pb-0.5 text-xs text-muted-foreground">Kéo vào một ngày để xếp lịch.</p>
            )}
          </>
            ),
          })}
        main={
          <>
          <div className={cn(tab === null ? undefined : "hidden")}>
            <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/60 bg-background pb-1 pt-1">
              <div className="min-w-0 flex-1">
                <TripDayStrip days={days} activeId={activeDay?.id ?? null} onPick={pickDay} />
              </div>
              <div className="shrink-0 pb-2">
                {/* Tắt tự tính thì không có chặng nào để hiện/ẩn. */}
                <TripFieldsMenu omit={trip.autoTravel ? [] : ["leg"]} />
              </div>
            </div>

            <div className="mt-3">
              {days.map((day) => (
                <DayBlock
                  key={day.id}
                  day={day}
                  isTemplate={trip.isTemplate}
                  fields={fields}
                  itemIds={dnd.board[dayKey(day.id)] ?? []}
                  doingsOf={(id) => dnd.board[doingsKey(id)] ?? []}
                  draggingDoing={draggingDoing}
                  collapsed={collapseRows}
                  onPressRow={pressRow}
                  byId={dnd.byId}
                  stale={slow && staleDays.includes(day.id)}
                  dayCount={days.length}
                  allDays={days}
                  active={day.id === activeDay?.id}
                  onFocus={() => setActiveDayId(day.id)}
                  onAdd={(pos) => setAddTarget({ dayId: day.id, label: `Ngày ${day.index + 1}`, ...pos })}
                  run={run}
                />
              ))}

              <Button
                variant="outline"
                onClick={() => run(() => addDay(trip.id))}
                disabled={pending}
                className="mt-2 w-full rounded-[4px] border-dashed"
              >
                <Glyph name="plus" className="size-4" />
                Thêm ngày {days.length + 1}
              </Button>
            </div>
          </div>

          {/* ⚠️ Bản đồ dựng CÓ ĐIỀU KIỆN, không nấp trong `hidden` như mấy mục
              kia: Leaflet đo khung lúc khởi tạo, nằm trong `display:none` thì
              nó dựng ở 0×0 rồi ở luôn kích thước đó khi hiện ra. */}
          {tab === "ban-do" && (
            <div>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <TripDayStrip
                    days={days}
                    activeId={activeDay?.id ?? null}
                    onPick={pickDay}
                  />
                </div>
              </div>

              <div
                className={cn(
                  R_CARD,
                  "mt-4 overflow-hidden bg-muted",
                  "h-[min(calc(100dvh-13rem),46rem)] min-h-[26rem]",
                )}
              >
                <TripMap
                  key={activeDay?.id ?? "empty"}
                  dayLabel={activeDay ? `Ngày ${activeDay.index + 1}` : ""}
                  ghosts={backlog
                    .filter((i) => i.lat != null && i.lng != null)
                    .map((i) => ({
                      id: i.id,
                      name: i.name,
                      lat: i.lat as number,
                      lng: i.lng as number,
                    }))}
                  points={(activeDay?.items ?? [])
                    .filter((i) => i.lat != null && i.lng != null)
                    .map((i, idx) => ({
                      id: i.id,
                      order: idx + 1,
                      name: i.name,
                      kind: i.kind,
                      lat: i.lat as number,
                      lng: i.lng as number,
                    }))}
                />
              </div>

              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Bản đồ vẽ <strong className="font-medium text-foreground">một ngày</strong> —
                chọn ngày ở dải trên. Vòng tròn nét đứt là mục chưa xếp ngày nhưng có toạ độ.
              </p>
            </div>
          )}

          <div className={cn(tab === "ghi-chu" ? undefined : "hidden")}>
            <TripNotes tripId={trip.id} notes={notes} />
          </div>
          <div className={tab === "do-mang-theo" ? undefined : "hidden"}>
            <TripPacking tripId={trip.id} items={packing} people={trip.people} />
          </div>
          <div className={cn(tab === "chi-phi" ? undefined : "hidden")}>
            <TripMoney
              tripId={trip.id}
              expenses={expenses}
              people={trip.people}
              viewerId={viewerId}
            />
          </div>
          </>
        }
      />

      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="flex items-center gap-3 rounded-[6px] bg-card px-3 py-2 shadow-lg shadow-black/10">
            <Thumb item={activeItem} size="sm" />
            <span className="max-w-[16rem] truncate text-sm font-medium">
              {activeItem.name}
            </span>
          </div>
        ) : null}
      </DragOverlay>

      <TripAddSearch
        tripId={trip.id}
        placeName={trip.place?.name ?? null}
        target={addTarget}
        onClose={() => setAddTarget(null)}
      />
    </DndContext>
  );
}

function BacklogList({
  ids,
  byId,
  days,
  run,
}: {
  ids: string[];
  byId: Map<string, ItemView>;
  days: DayView[];
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: BACKLOG });

  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <ul
        ref={setNodeRef}
        className={cn(
          "grid min-h-[3rem] gap-0.5 rounded-[4px] transition-colors",
          isOver && "bg-primary/5 ring-1 ring-primary/20",
        )}
      >
        {ids.map((id) => {
          const item = byId.get(id);
          return item ? (
            <BacklogRow key={id} item={item} days={days} run={run} />
          ) : null;
        })}
      </ul>
    </SortableContext>
  );
}

function BacklogRow({
  item,
  days,
  run,
}: {
  item: ItemView;
  days: DayView[];
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "group relative flex min-w-0 items-center gap-2.5 rounded-[4px] px-1.5 py-1.5 transition-colors focus-within:bg-muted hover:bg-muted",
        isDragging && "opacity-40",
      )}
    >
      <span
        {...listeners}
        className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
      >
        <Thumb item={item} size="sm" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.8125rem] font-medium leading-snug">{item.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.typeLabel}</p>
      </div>

      {/* Tay kéo & nút xếp NỔI ĐÈ mép phải khi rê vào — ẩn bằng opacity mà vẫn chiếm chỗ thì tên bị
          cắt cụt cả lúc không rê. Màn cảm ứng không rê được ⇒ để trong dòng, luôn hiện. */}
      <div className="absolute inset-y-0 right-1 flex items-center bg-muted pl-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:static [@media(pointer:coarse)]:bg-transparent [@media(pointer:coarse)]:opacity-100">
      <DragGrip
        label={`Kéo ${item.name} vào một ngày`}
        attributes={attributes}
        listeners={listeners}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Xếp ${item.name} vào ngày`}
            className="grid size-6 shrink-0 place-items-center rounded-[3px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Glyph name="plus" className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Xếp vào</DropdownMenuLabel>
          {days.map((d) => (
            <DropdownMenuItem
              key={d.id}
              onSelect={() =>
                run(
                  () => moveItem(item.id, d.id, "end"),
                  `Đã xếp vào Ngày ${d.index + 1}`,
                )
              }
            >
              Ngày {d.index + 1}
              {d.dateLabel && (
                <span className="ml-auto pl-3 text-muted-foreground">{d.dateLabel}</span>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => run(() => removeItem(item.id), "Đã bỏ khỏi lịch trình")}
          >
            <Glyph name="trash" className="size-4" />
            Bỏ khỏi lịch trình
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </li>
  );
}

function DayBlock({
  day,
  isTemplate,
  fields,
  itemIds,
  doingsOf,
  draggingDoing,
  collapsed,
  onPressRow,
  byId,
  stale,
  dayCount,
  allDays,
  active,
  onFocus,
  onAdd,
  run,
}: {
  day: DayView;
  isTemplate: boolean;
  fields: TripFields;
  /** MỤC GỐC của ngày, theo bàn kéo–thả. */
  itemIds: string[];
  /** Việc của một mục gốc, theo bàn kéo–thả. */
  doingsOf: (id: string) => string[];
  /** Đang kéo một việc ⇒ các nơi chưa có việc mở chỗ thả. */
  draggingDoing: boolean;
  /** Đang kéo cả hàng ⇒ ẩn việc của mọi hàng, chỉ ghi "kèm N việc". */
  collapsed: boolean;
  /** Vừa nhấn tay kéo của một hàng (chưa chắc đã kéo). */
  onPressRow: (id: string) => void;
  byId: Map<string, ItemView>;
  stale: boolean;
  dayCount: number;
  allDays: DayView[];
  active: boolean;
  onFocus: () => void;
  onAdd: (pos?: AddPos) => void;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dayKey(day.id) });
  const listRef = useRef<HTMLOListElement | null>(null);
  const tops = itemIds.map((id) => byId.get(id)).filter((x): x is ItemView => !!x);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const nameOf = (id: string) => byId.get(id)?.name ?? "mục này";

  // Chèn ở hàng thứ k: một NƠI thành hàng mới ở đó; một VIỆC thì thuộc hàng ngay trên.
  const topPos = (k: number): AddPos => ({ ...insertAt(itemIds, k, nameOf), mode: "place" });
  // Chèn VIỆC vào trong nơi `parentId` ở vị trí `idx` của cột "Làm gì".
  const childPos = (parentId: string, idx: number): AddPos => ({
    ...insertAt(itemIds, itemIds.indexOf(parentId) + 1, nameOf),
    parent: { id: parentId, name: nameOf(parentId), at: insertAt(doingsOf(parentId), idx, nameOf).at },
    mode: "doing",
  });

  return (
    <section
      id={`day-${day.id}`}
      onFocusCapture={onFocus}
      onMouseDown={onFocus}
      className={cn(
        "group/day relative scroll-mt-28 border-t border-border/60 py-9 first:border-t-0 first:pt-5 lg:scroll-mt-24",
      )}
    >
      <DayHeading
        active={active}
        index={day.index}
        title={day.title}
        // Tên ngày & ghi chú ngày CHỈ có ở lịch trình mẫu: đó là giọng biên tập
        // ("Về tới biển", "Bình minh đồi cát"), thứ làm trang mẫu đọc ra như một
        // bài hướng dẫn thay vì bảng dữ liệu. Người tự soạn gần như không bao
        // giờ đặt tên cho ngày — để ô trống ở đó là mỗi ngày cõng ~60px không
        // khí (ẩn bằng `opacity` KHÔNG gỡ khỏi bố cục).
        titleNode={
          isTemplate ? (
            <h2>
              <InlineEdit
                value={day.title}
                placeholder="Đặt tên cho ngày này…"
                onSave={(title) => run(() => updateDay(day.id, { title }))}
                textClassName="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold leading-tight tracking-tight sm:text-[1.75rem]"
                emptyClassName="mt-1 text-lg font-normal text-muted-foreground/60 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/day:opacity-100 [@media(pointer:coarse)]:opacity-100"
              />
            </h2>
          ) : undefined
        }
        dateLabel={day.dateLabel}
        span={null}
        right={
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <StartTimePicker
                startMin={day.startMin}
                label={`Giờ bắt đầu ngày ${day.index + 1}`}
                onSet={(min) => run(() => updateDay(day.id, { startMin: min }))}
              />
              {itemIds.length > 0 && (
                <span className="whitespace-nowrap tabular-nums">
                  – {formatMinutes(day.endMin)}
                </span>
              )}
            </div>

            {dayCount > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Tuỳ chọn ngày ${day.index + 1}`}
                    className="grid size-8 place-items-center rounded-[3px] text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <Glyph name="more" className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() =>
                      run(() => removeDay(day.id), "Đã xoá ngày — các mục về lại mục Chưa xếp ngày")
                    }
                  >
                    <Glyph name="trash" className="size-4" />
                    Xoá ngày này
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        }
      />

      {isTemplate && fields.note && (
        <div className="mt-2 max-w-prose">
          <InlineEdit
            value={day.note}
            placeholder="Thêm ghi chú cho ngày này…"
            onSave={(note) => run(() => updateDay(day.id, { note }))}
            multiline
            textClassName="text-sm leading-relaxed text-muted-foreground hover:text-foreground"
            emptyClassName="text-sm text-muted-foreground/60 opacity-0 transition-opacity group-focus-within/day:opacity-100 group-hover/day:opacity-100 [@media(pointer:coarse)]:opacity-100"
          />
        </div>
      )}

      {fields.warn &&
        day.warnings.map((w) => <Warning key={w.code} warning={w} />)}

      {/* Mục kéo ở cấp ngày là CẢ HÀNG (nơi + việc của nó) — các hàng xếp dọc. Việc trong
          cột "Làm gì" có SortableContext riêng (`DoingsColumn`). */}
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <ol
          ref={(node) => {
            setNodeRef(node);
            listRef.current = node;
          }}
          className={cn(
            "relative -mx-2 min-h-[4rem] rounded-[6px] px-2 transition-colors",
            "mt-6",
            isOver && "bg-primary/5 ring-1 ring-primary/20",
          )}
        >
          {itemIds.length === 0 ? (
            <li className="flex flex-wrap items-center gap-x-2 gap-y-1 py-4 text-sm text-muted-foreground">
              {/* Ngày trống chưa có trục nên chưa có dấu + nào — lối thêm duy nhất là đây. */}
              <button
                type="button"
                onClick={() => onAdd({ mode: "place" })}
                className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-border px-2.5 font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary-ink"
              >
                <Glyph name="plus" className="size-4" />
                Thêm vào ngày {day.index + 1}
              </button>
              hoặc kéo một mục từ cột Chưa xếp ngày sang đây.
            </li>
          ) : (
            (() => {
              let num = 0;
              return tops.map((top, k) => {
                const kids = doingsOf(top.id)
                  .map((id) => byId.get(id))
                  .filter((x): x is ItemView => !!x);
                const editProps = (item: ItemView, before: AddPos, after: AddPos, lead?: ReactNode) => ({
                  stale,
                  fields,
                  stay: <StayPicker item={item} run={run} />,
                  name:
                    item.kind === "custom" ? (
                      <NameEdit
                        key={item.name}
                        itemId={item.id}
                        value={item.name}
                        onSave={(customTitle) => run(() => updateItem(item.id, { customTitle }))}
                      />
                    ) : undefined,
                  // Mục chưa có ghi chú KHÔNG giữ sẵn một dòng ẩn (bản cũ: ~22px trắng dưới MỌI mục);
                  // mở từ menu "Thêm ghi chú" thì ô gõ hiện ngay tại chỗ.
                  note:
                    item.note || noteFor === item.id ? (
                      <InlineEdit
                        key={noteFor === item.id ? "new" : "has"}
                        value={item.note}
                        placeholder="Ghi chú cho mục này…"
                        startEditing={noteFor === item.id}
                        onClose={() => setNoteFor(null)}
                        onSave={(note) => run(() => updateItem(item.id, { note }))}
                        multiline
                        textClassName="mt-1.5 text-xs italic leading-relaxed text-muted-foreground hover:text-foreground"
                        emptyClassName="mt-1.5 text-xs text-muted-foreground/60"
                      />
                    ) : null,
                  actions: (
                    <>
                      {lead}
                      <ItemActions
                        item={item}
                        day={day}
                        allDays={allDays}
                        run={run}
                        onInsertBefore={() => onAdd(before)}
                        onInsertAfter={() => onAdd(after)}
                        onAddNote={item.note ? undefined : () => setNoteFor(item.id)}
                      />
                    </>
                  ),
                });
                const isPlace = !canBeDoing(top);
                // Nút của CHÍNH hàng: chỉ thêm việc vào đúng nơi này (không thêm được nơi khác).
                const addDoing = (
                  <AddDoingButton
                    label={top.name}
                    onClick={() => onAdd({ ...childPos(top.id, kids.length), mode: "doing" })}
                  />
                );
                const no = isPlace || (top.kind === "activity" && top.atName) ? ++num : null;
                const lastItem = kids[kids.length - 1] ?? top;
                return (
                  <Fragment key={top.id}>
                    <SortableStop
                      item={top}
                      onPress={() => onPressRow(top.id)}
                      left={(h) =>
                        isPlace ? (
                          <RailItem
                            as="div"
                            item={top}
                            index={k}
                            number={no}
                            grip={h.grip}
                            handleProps={h.handleProps}
                            {...editProps(top, topPos(k), topPos(k + 1), addDoing)}
                          />
                        ) : (
                          <PlaceStub
                            name={top.kind === "activity" ? top.atName : null}
                            minute={top.arriveMin}
                            number={no}
                          />
                        )
                      }
                      hasDoings={!isPlace || kids.length > 0 || draggingDoing}
                      summary={collapsed && kids.length > 0 ? `kèm ${kids.length} việc` : null}
                      right={(h) => (
                        <>
                          <DoingsColumn
                            parentId={top.id}
                            ids={kids.map((d) => d.id)}
                            armed={draggingDoing}
                          >
                            {/* Hàng không có mục nơi: chính mục gốc đứng đầu cột "Làm gì" và
                                cầm tay kéo của CẢ HÀNG. */}
                            {!isPlace && (
                              <DoingRow
                                item={top}
                                grip={h.grip}
                                {...editProps(top, topPos(k), topPos(k + 1), addDoing)}
                              />
                            )}
                            {!collapsed && kids.map((d, idx) => (
                              <SortableDoing
                                key={d.id}
                                item={d}
                                {...editProps(d, childPos(top.id, idx), childPos(top.id, idx + 1))}
                              />
                            ))}
                          </DoingsColumn>
                        </>
                      )}
                    />
                    {fields.leg && k < tops.length - 1 && <RailLeg item={lastItem} />}
                  </Fragment>
                );
              });
            })()
          )}
          {itemIds.length > 0 && !collapsed && (
            <InsertMarks
              listRef={listRef}
              itemIds={itemIds}
              slotIndexes={itemIds.map((_, k) => k + 1)}
              onInsert={(k) => onAdd(topPos(k))}
            />
          )}
        </ol>
      </SortableContext>
    </section>
  );
}

/**
 * Dấu + để chèn, đặt ĐÚNG GIỮA hai chấm số liền nhau trên trục. Khoảng cách giữa hai
 * chấm đổi theo nội dung từng mục (ghi chú, dòng di chuyển…) nên phải ĐO, CSS không
 * tính được. Rê vào một mục (bất kỳ chỗ nào trên nó) thì hiện dấu + ngay dưới nó.
 */
function InsertMarks({
  listRef,
  itemIds,
  slotIndexes,
  onInsert,
}: {
  listRef: React.RefObject<HTMLOListElement | null>;
  itemIds: string[];
  /** Hàng thứ k (`[data-stop-row]`); chèn sau hàng đó = chỉ số `slotIndexes[k]`. */
  slotIndexes: number[];
  onInsert: (index: number) => void;
}) {
  const [slots, setSlots] = useState<{ x: number; y: number }[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  const { active } = useDndContext();
  const ids = itemIds.join(",");

  // useEffect, KHÔNG useLayoutEffect: effect bố cục của con chạy TRƯỚC khi React gắn
  // ref cho `<ol>` cha, nên lúc đó `listRef.current` còn null và không đo lại nữa.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    // Dấu + nằm GIỮA HAI HÀNG (dưới các việc của hàng trên), ngang trục — không giữa hai chấm
    // số: việc của một nơi nằm ngay dưới nó, giữa hai chấm.
    const rows = () => [...list.querySelectorAll<HTMLElement>("[data-stop-row]")];
    const measure = () => {
      const box = list.getBoundingClientRect();
      const dot = list.querySelector<HTMLElement>("[data-rail-dot]")?.getBoundingClientRect();
      if (!dot) return setSlots([]);
      const x = dot.left + dot.width / 2 - box.left;
      // Dấu + nằm GIỮA HAI CHẤM SỐ trên trục (① ↔ ②) — bấm vào chèn một nơi ngay sau hàng trên.
      // Hàng cuối: giữa chấm của nó và đáy trục.
      const rs = rows();
      const dotY = (r: HTMLElement) => {
        const d = r.querySelector<HTMLElement>("[data-rail-dot]")?.getBoundingClientRect();
        return d ? d.top + d.height / 2 : r.getBoundingClientRect().top;
      };
      const next = rs.map((r, k) => ({
        x,
        y: (k < rs.length - 1 ? (dotY(r) + dotY(rs[k + 1])) / 2 : (dotY(r) + r.getBoundingClientRect().bottom) / 2) - box.top,
      }));
      setSlots((prev) =>
        prev.length === next.length && prev.every((p, i) => p.x === next[i].x && p.y === next[i].y)
          ? prev
          : next,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);

    // Hàng k chiếm từ đỉnh của nó tới đỉnh hàng kế — trọn nơi, các việc, lẫn dòng "di chuyển".
    const onMove = (e: MouseEvent) => {
      const tops = rows().map((r) => r.getBoundingClientRect().top);
      let k = 0;
      while (k < tops.length - 1 && e.clientY >= tops[k + 1]) k++;
      setHovered(k);
    };
    const onLeave = () => setHovered(null);
    list.addEventListener("mousemove", onMove);
    list.addEventListener("mouseleave", onLeave);
    return () => {
      ro.disconnect();
      list.removeEventListener("mousemove", onMove);
      list.removeEventListener("mouseleave", onLeave);
    };
  }, [listRef, ids]);

  if (slots.length === 0 || active) return null;

  return (
    <div aria-hidden={false} className="pointer-events-none absolute inset-0">
      {slots.map((slot, i) => {
        // Chỉ hiện ở khe NGAY DƯỚI hàng đang rê.
        const shown = hovered === i;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onInsert(slotIndexes[i] ?? itemIds.length)}
            title="Chèn vào đây"
            aria-label={
              i < slots.length - 1
                ? `Chèn một mục vào giữa mục ${i + 1} và ${i + 2}`
                : `Thêm một mục sau mục ${i + 1}`
            }
            style={{ left: slot.x, top: slot.y }}
            className={cn(
              "pointer-events-auto absolute z-10 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[3px] border border-border bg-background text-muted-foreground shadow-sm transition-opacity hover:border-primary/50 hover:text-primary-ink focus-visible:opacity-100",
              shown ? "opacity-100" : "opacity-0",
            )}
          >
            <Glyph name="plus" className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}

function DragGrip({
  label,
  attributes,
  listeners,
}: {
  label: string;
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
}) {
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      title={label}
      aria-label={label}
      className="grid size-6 shrink-0 cursor-grab touch-none place-items-center rounded-[3px] text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 active:cursor-grabbing [@media(pointer:coarse)]:opacity-100"
    >
      <Glyph name="grip" className="size-4" />
    </button>
  );
}

function AddDoingButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Thêm việc ở ${label}`}
      aria-label={`Thêm việc ở ${label}`}
      className="inline-flex h-7 shrink-0 items-center gap-1 rounded-[3px] px-1.5 text-xs font-medium text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100"
    >
      <Glyph name="plus" className="size-3.5" />
      {/* Khổ hẹp chỉ còn dấu +: cụm nút bên phải tên đã chật, thêm chữ là tên nơi bị bóp xuống dòng. */}
      <span className="hidden sm:inline">Việc</span>
    </button>
  );
}

type DragHandle = { grip: ReactNode; handleProps: SyntheticListenerMap | undefined };

/** CẢ HÀNG "Ở đâu | Làm gì" là một mục kéo ở cấp ngày — kéo nơi thì việc của nó đi theo. */
function SortableStop({
  item,
  left,
  right,
  hasDoings,
  summary,
  onPress,
}: {
  item: ItemView;
  left: (h: DragHandle) => ReactNode;
  right: (h: DragHandle) => ReactNode;
  hasDoings: boolean;
  onPress: () => void;
  /** Đang thu gọn (kéo cả hàng): dòng thay cho các việc. */
  summary: string | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const press = {
    ...listeners,
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button === 0) onPress();
      listeners?.onPointerDown?.(e);
    },
  } as SyntheticListenerMap;
  const h: DragHandle = {
    grip: <DragGrip label={`Kéo để đổi chỗ ${item.name}`} attributes={attributes} listeners={press} />,
    handleProps: press,
  };
  return (
    <StopRow
      rowId={item.id}
      innerRef={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      dragging={isDragging}
      hasDoings={hasDoings}
      left={left(h)}
      right={
        <>
          {right(h)}
          {summary && <p className="-mt-2 text-xs text-muted-foreground">{summary}</p>}
        </>
      }
    />
  );
}

/** Cột "Làm gì": vùng thả riêng (`in:<id>`) để kéo việc giữa các nơi, kể cả nơi chưa có việc. */
function DoingsColumn({
  parentId,
  ids,
  armed,
  children,
}: {
  parentId: string;
  ids: string[];
  /** Đang kéo một VIỆC — chỉ khi đó nơi chưa có việc mới mở chỗ thả (lúc thường cao 0). */
  armed: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: doingsKey(parentId) });
  const { active } = useDndContext();
  const open = armed && ids.length === 0 && active?.id !== parentId;
  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <ul
        ref={setNodeRef}
        className={cn(
          "rounded-[4px] transition-colors",
          open && "my-1 min-h-9 border border-dashed border-border",
          isOver && "border-primary/40 bg-primary/5",
        )}
      >
        {children}
      </ul>
    </SortableContext>
  );
}

function SortableDoing({
  item,
  stale,
  actions,
  note,
  stay,
  name,
  fields,
}: {
  item: ItemView;
  stale: boolean;
  actions: ReactNode;
  note: ReactNode;
  stay: ReactNode;
  name?: ReactNode;
  fields: TripFields;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  return (
    <DoingRow
      item={item}
      fields={fields}
      actions={actions}
      note={note}
      stay={stay}
      name={name}
      stale={stale}
      dragging={isDragging}
      innerRef={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      grip={
        <DragGrip
          label={`Kéo để đổi chỗ ${item.name}`}
          attributes={attributes}
          listeners={listeners}
        />
      }
    />
  );
}

function ItemActions({
  item,
  day,
  allDays,
  run,
  onInsertBefore,
  onInsertAfter,
  onAddNote,
}: {
  item: ItemView;
  day: DayView;
  allDays: DayView[];
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) => void;
  onInsertBefore: () => void;
  onInsertAfter: () => void;
  /** Chỉ khi mục CHƯA có ghi chú (có rồi thì bấm thẳng vào chữ để sửa). */
  onAddNote?: () => void;
}) {
  // Việc cần làm SAU KHI menu đóng hẳn (xem chú thích ở `onCloseAutoFocus`).
  const afterClose = useRef<"note" | "rename" | null>(null);
  return (
    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Tuỳ chọn cho ${item.name}`}
            className="grid size-7 place-items-center rounded-[3px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Glyph name="more" className="size-4" />
          </button>
        </DropdownMenuTrigger>
        {/* "Thêm ghi chú" chỉ mở ô gõ SAU KHI menu đóng hẳn: lúc còn chạy hiệu ứng đóng, menu
            vẫn giữ focus trong nó — mở sớm là ô gõ (còn trống) mất focus và tự đóng ngay. */}
        <DropdownMenuContent
          align="end"
          className="w-48"
          onCloseAutoFocus={(e) => {
            const next = afterClose.current;
            if (!next) return;
            afterClose.current = null;
            e.preventDefault();
            if (next === "note") onAddNote?.();
            else
              document
                .querySelector<HTMLInputElement>(`[data-rename="${item.id}"]`)
                ?.select();
          }}
        >
          <DropdownMenuItem onSelect={onInsertBefore}>
            <Glyph name="plus" className="size-4" />
            Thêm phía trước
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onInsertAfter}>
            <Glyph name="plus" className="size-4" />
            Thêm phía sau
          </DropdownMenuItem>
          {item.kind === "custom" && (
            <DropdownMenuItem onSelect={() => (afterClose.current = "rename")}>
              <Glyph name="pencil" className="size-4" />
              Đổi tên
            </DropdownMenuItem>
          )}
          {onAddNote && (
            <DropdownMenuItem onSelect={() => (afterClose.current = "note")}>
              <Glyph name="note" className="size-4" />
              Thêm ghi chú
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Chuyển sang</DropdownMenuLabel>
          {allDays
            .filter((d) => d.id !== day.id)
            .map((d) => (
              <DropdownMenuItem
                key={d.id}
                onSelect={() =>
                  run(
                    () => moveItem(item.id, d.id, "end"),
                    `Đã chuyển sang Ngày ${d.index + 1}`,
                  )
                }
              >
                Ngày {d.index + 1}
              </DropdownMenuItem>
            ))}
          <DropdownMenuItem
            onSelect={() => run(() => moveItem(item.id, null, "start"), "Đã đưa về mục Chưa xếp ngày")}
          >
            Chưa xếp ngày
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => run(() => removeItem(item.id), "Đã bỏ khỏi lịch trình")}
          >
            <Glyph name="trash" className="size-4" />
            Bỏ khỏi lịch trình
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const START_PRESETS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((h) => h * 60);

/**
 * Giờ bắt đầu ngày, LUÔN 24 giờ. Không dùng `<input type="time">`: trình duyệt vẽ nó theo ngôn
 * ngữ của máy nên ra "02:00 PM" ngay cạnh mọi giờ khác trên trang viết "14:00".
 */
function StartTimePicker({
  startMin,
  label,
  onSet,
}: {
  startMin: number;
  label: string;
  onSet: (min: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const draftMin = fromTimeValue(draft.trim());

  function set(min: number) {
    setOpen(false);
    if (min !== startMin) onSet(min);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(toTimeValue(startMin));
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${formatMinutes(startMin)}`}
          className="inline-flex items-center gap-1.5 rounded-[3px] px-1 py-0.5 font-medium tabular-nums text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Glyph name="sunrise" className="size-4 shrink-0 text-muted-foreground" />
          {formatMinutes(startMin)}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72">
        <p className="text-sm font-semibold tracking-tight">Bắt đầu ngày lúc</p>
        <div className="mt-2.5 grid grid-cols-4 gap-1">
          {START_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => set(m)}
              className={cn(
                "rounded-[4px] py-1 text-xs tabular-nums transition-colors",
                startMin === m ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70",
              )}
            >
              {formatMinutes(m)}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draftMin != null) set(draftMin);
          }}
          className="mt-3 flex gap-2"
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            inputMode="numeric"
            placeholder="Giờ khác, vd 4:30"
            aria-label="Giờ bắt đầu khác (giờ:phút)"
            className="h-9 rounded-[4px] tabular-nums"
          />
          <Button
            type="submit"
            variant="outline"
            disabled={draftMin == null}
            className="h-9 shrink-0 rounded-[4px] px-3"
          >
            Đặt
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function StayPicker({
  item,
  run,
}: {
  item: ItemView;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  function set(min: number | null) {
    setOpen(false);
    run(() => updateItem(item.id, { stayMin: min }));
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setDraft(String(item.effectiveStayMin));
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded underline-offset-2 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Glyph name="clock" className="size-3.5" />
          {stayLabel(item)}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64">
        <p className="text-sm font-semibold tracking-tight">Ở lại bao lâu?</p>

        <div className="mt-2.5 flex flex-wrap gap-1">
          {STAY_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => set(m)}
              className={cn(
                "rounded-[4px] px-2.5 py-1 text-xs tabular-nums transition-colors",
                item.effectiveStayMin === m
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/70",
              )}
            >
              {m < 60 ? `${m}′` : fmtDuration(m)}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(draft);
            if (Number.isFinite(n) && n >= 0) set(Math.round(n));
          }}
          className="mt-3 flex gap-2"
        >
          <Input
            type="number"
            min={0}
            max={1440}
            step={5}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Số phút ở lại"
            className="h-9 rounded-[4px] tabular-nums"
          />
          <Button type="submit" variant="outline" className="h-9 shrink-0 rounded-[4px] px-3">
            Đặt
          </Button>
        </form>

        {item.stayMin != null && (
          <button
            type="button"
            onClick={() => set(null)}
            className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Về mặc định ({fmtDuration(DEFAULT_STAY_MIN[item.kind])})
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Tên mục TỰ THÊM, sửa tại chỗ: trông như chữ thường, rê vào có nền, bấm là gõ (cùng kiểu ô tên
 * chuyến ở `TripTopbar`). Ô CO THEO CHỮ để nền ôm sát tên; `size={1}` vì `<input>` mặc định rộng
 * ~20 ký tự. Tên dài thì xuống dòng không được — ô cuộn ngang khi đang gõ, lúc thường vẫn cắt gọn.
 */
function NameEdit({
  itemId,
  value,
  onSave,
}: {
  itemId: string;
  value: string;
  onSave: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  // Esc rồi blur() chạy NGAY trong cùng lượt: onBlur vẫn thấy `draft` cũ ⇒ sẽ lưu nhầm.
  const cancelled = useRef(false);
  return (
    <span className="-mx-1.5 inline-grid min-w-0 max-w-[calc(100%+0.75rem)] align-top">
      <span aria-hidden className="invisible col-start-1 row-start-1 truncate whitespace-pre px-1.5">
        {draft || " "}
      </span>
      <input
        data-rename={itemId}
        value={draft}
        size={1}
        spellCheck={false}
        draggable={false}
        aria-label={`Tên mục: ${value}`}
        title="Bấm để đổi tên"
        onChange={(e) => setDraft(e.target.value)}
        // Trong hàng kéo–thả: đừng để cú nhấn vào ô gõ bắt đầu một lượt kéo.
        onPointerDown={(e) => e.stopPropagation()}
        onBlur={() => {
          if (cancelled.current) {
            cancelled.current = false;
            setDraft(value);
            return;
          }
          const next = draft.trim();
          if (next && next !== value) onSave(next);
          else setDraft(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            cancelled.current = true;
            e.currentTarget.blur();
          }
        }}
        className={cn(
          "col-start-1 row-start-1 w-full min-w-0 cursor-text truncate rounded-[4px] bg-transparent px-1.5 caret-primary outline-none transition-[background-color,box-shadow] duration-150",
          "selection:bg-primary/20 hover:bg-muted/70",
          "focus:bg-background focus:shadow-[0_0_0_1.5px_color-mix(in_oklab,var(--color-primary)_70%,transparent),0_0_0_4px_color-mix(in_oklab,var(--color-primary)_16%,transparent)] focus:hover:bg-background",
        )}
      />
    </span>
  );
}

function InlineEdit({
  value,
  placeholder,
  onSave,
  multiline,
  textClassName,
  emptyClassName,
  startEditing = false,
  onClose,
}: {
  value: string | null;
  placeholder: string;
  onSave: (next: string | null) => void;
  multiline?: boolean;
  textClassName?: string;
  emptyClassName?: string;
  /** Mở sẵn ô gõ (thêm ghi chú từ menu). */
  startEditing?: boolean;
  onClose?: () => void;
}) {
  const [editing, setEditing] = useState(startEditing);
  const [draft, setDraft] = useState(value ?? "");

  function commit() {
    setEditing(false);
    onClose?.();
    const next = draft.trim() || null;
    if (next !== (value ?? null)) onSave(next);
  }

  if (editing) {
    const shared = {
      autoFocus: true,
      value: draft,
      placeholder,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
          setDraft(value ?? "");
          setEditing(false);
          onClose?.();
        }
        if (e.key === "Enter" && !multiline) (e.target as HTMLElement).blur();
      },
    };
    return multiline ? (
      <Textarea {...shared} rows={2} className="mt-1.5 min-h-0 resize-none text-xs" />
    ) : (
      <Input {...shared} className="mt-1 h-9 rounded-[4px]" />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value ?? "");
        setEditing(true);
      }}
      className={cn(
        "block w-full rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        value ? textClassName : emptyClassName,
      )}
    >
      {value || placeholder}
    </button>
  );
}


function toTimeValue(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function fromTimeValue(v: string): number | null {
  const m = v.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const min = Number(m[1]) * 60 + Number(m[2]);
  return min >= 0 && min < 1440 ? min : null;
}

/**
 * `true` chỉ khi `active` đã kéo dài quá `delayMs`. Dùng để KHÔNG báo "đang
 * chờ" với những thao tác trả về nhanh — một cái nháy 100ms không cho người
 * dùng thêm thông tin nào, nó chỉ làm giao diện trông giật.
 */
function useDelayedFlag(active: boolean, delayMs: number): boolean {
  const [on, setOn] = useState(false);
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    if (!active && on) setOn(false);
  }
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setOn(true), delayMs);
    return () => clearTimeout(t);
  }, [active, delayMs]);
  return on;
}
