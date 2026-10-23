"use client";

import {
  Fragment,
  useEffect,
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
import { TripShell } from "@/components/trip/trip-shell";
import { TripDayStrip } from "@/components/trip/trip-day-strip";
import { TripFieldsMenu, useTripFields, type TripFields } from "@/components/trip/trip-fields";
import {
  DayHeading,
  RailItem,
  RailLeg,
  Thumb,
  Warning,
} from "@/components/trip/trip-rail";
import { TripTopbar } from "@/components/trip/trip-topbar";
import { useTripLiveSync } from "@/components/trip/trip-live-sync";
import { TripAddSearch, type AddTarget } from "@/components/trip/trip-add-search";
import { insertAt, type DropAt } from "@/lib/trip-drop";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  useDndContext,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
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
  dayKey,
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

  useTripLiveSync({
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
        const res = await moveItem(id, at.dayId, at.at);
        if (!res.ok) {
          dnd.resetFromProps();
          router.refresh();
        }
        return res;
      });
  }

  const activeItem = dnd.activeId ? dnd.byId.get(dnd.activeId) : null;

  return (
    <DndContext
      // `id` CỐ ĐỊNH — xem chú thích cùng chỗ ở `trip-dock.tsx`.
      id="trip-dnd"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        dnd.endDrag();
        dnd.resetFromProps();
      }}
    >
    <TripShell
      header={
        <TripTopbar
          trip={trip}
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
                      Xem địa điểm ở {trip.place.name} →
                    </Link>
                    <Link
                      href={`/diem-den/${trip.place.slug}/am-thuc`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Xem quán ăn ở {trip.place.name} →
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

            <button
              type="button"
              onClick={() => setAddTarget({ dayId: null, label: "danh sách chưa xếp" })}
              className="mt-3 flex h-9 w-full items-center gap-2 rounded-[4px] border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Glyph name="search" className="size-4 shrink-0" />
              Tìm hoặc tự thêm mục…
            </button>
          </>
            ),
          })}
        main={
          <>
          {/* Dòng thời gian là CỘT ĐỌC, không phải bảng: bỏ cột bản đồ ra rồi
              mà để tự do thì tên mục nằm mép trái còn giờ kết thúc ngày văng
              sang mép phải cách đó cả 700px. */}
          <div className={cn("lg:max-w-3xl", tab === null ? undefined : "hidden")}>
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

          {/* Mục chỉ có CHỮ: bó bề ngang cho dễ đọc — không có cột phải nào
              chặn nên để tự do là dòng dài cả nghìn pixel. */}
          <div className={cn("lg:max-w-3xl", tab === "ghi-chu" ? undefined : "hidden")}>
            <TripNotes tripId={trip.id} notes={notes} />
          </div>
          <div className={tab === "do-mang-theo" ? undefined : "hidden"}>
            <TripPacking tripId={trip.id} items={packing} people={trip.people} />
          </div>
          <div className={cn("lg:max-w-3xl", tab === "chi-phi" ? undefined : "hidden")}>
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
          "-mx-1.5 min-h-[3rem] divide-y divide-border/50 rounded-[4px] px-1.5 transition-colors",
          isOver && "bg-primary/10",
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
        "group flex min-w-0 items-center gap-2.5 py-2",
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
        <p className="line-clamp-2 text-[0.8125rem] font-medium leading-snug">
          {item.name}
        </p>
      </div>

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
    </li>
  );
}

function DayBlock({
  day,
  isTemplate,
  fields,
  itemIds,
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
  itemIds: string[];
  byId: Map<string, ItemView>;
  stale: boolean;
  dayCount: number;
  allDays: DayView[];
  active: boolean;
  onFocus: () => void;
  onAdd: (pos?: { at: DropAt; where?: string }) => void;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dayKey(day.id) });
  const listRef = useRef<HTMLOListElement | null>(null);
  const insert = (index: number) =>
    onAdd(insertAt(itemIds, index, (id) => byId.get(id)?.name ?? "mục này"));

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
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Glyph name="sunrise" className="size-4 shrink-0" />
              <input
                type="time"
                defaultValue={toTimeValue(day.startMin)}
                onChange={(e) => {
                  const min = fromTimeValue(e.target.value);
                  if (min != null) run(() => updateDay(day.id, { startMin: min }));
                }}
                aria-label={`Giờ bắt đầu ngày ${day.index + 1}`}
                className="bg-transparent font-medium tabular-nums text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {itemIds.length > 0 && (
                <span className="whitespace-nowrap tabular-nums">
                  → {formatMinutes(day.endMin)}
                </span>
              )}
            </label>

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

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <ol
          ref={(node) => {
            setNodeRef(node);
            listRef.current = node;
          }}
          className={cn(
            "relative -mx-2 mt-6 min-h-[4rem] rounded-[6px] px-2 transition-colors",
            isOver && "bg-primary/5 ring-1 ring-primary/20",
          )}
        >
          {itemIds.length === 0 ? (
            <li className="flex flex-wrap items-center gap-x-2 gap-y-1 py-4 text-sm text-muted-foreground">
              {/* Ngày trống chưa có trục nên chưa có dấu + nào — lối thêm duy nhất là đây. */}
              <button
                type="button"
                onClick={() => onAdd()}
                className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-border px-2.5 font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary-ink"
              >
                <Glyph name="plus" className="size-4" />
                Thêm vào ngày {day.index + 1}
              </button>
              hoặc kéo một mục từ cột Chưa xếp ngày sang đây.
            </li>
          ) : (
            itemIds.map((id, i) => {
              const item = byId.get(id);
              if (!item) return null;
              return (
                <Fragment key={id}>
                  <SortableRailItem
                    item={item}
                    index={i}
                    stale={stale}
                    fields={fields}
                    stay={<StayPicker item={item} run={run} />}
                    note={
                      <InlineEdit
                        value={item.note}
                        placeholder="Thêm ghi chú…"
                        onSave={(note) => run(() => updateItem(item.id, { note }))}
                        multiline
                        textClassName="mt-1.5 text-xs italic leading-relaxed text-muted-foreground hover:text-foreground"
                        emptyClassName="mt-1.5 text-xs text-muted-foreground/60 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100"
                      />
                    }
                    actions={
                      <ItemActions
                        item={item}
                        day={day}
                        allDays={allDays}
                        run={run}
                        onInsertBefore={() => insert(i)}
                        onInsertAfter={() => insert(i + 1)}
                      />
                    }
                  />
                  {fields.leg && i < itemIds.length - 1 && <RailLeg item={item} />}
                </Fragment>
              );
            })
          )}
          {itemIds.length > 0 && (
            <InsertMarks listRef={listRef} itemIds={itemIds} onInsert={insert} />
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
  onInsert,
}: {
  listRef: React.RefObject<HTMLOListElement | null>;
  itemIds: string[];
  onInsert: (index: number) => void;
}) {
  const [dots, setDots] = useState<{ x: number; y: number }[]>([]);
  // Đáy trục — chỗ đặt dấu + "thêm sau mục cuối".
  const [endY, setEndY] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const { active } = useDndContext();
  const ids = itemIds.join(",");

  // useEffect, KHÔNG useLayoutEffect: effect bố cục của con chạy TRƯỚC khi React gắn
  // ref cho `<ol>` cha, nên lúc đó `listRef.current` còn null và không đo lại nữa.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const box = list.getBoundingClientRect();
      const next = [...list.querySelectorAll<HTMLElement>("[data-rail-dot]")].map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
      });
      setEndY(box.height);
      setDots((prev) =>
        prev.length === next.length && prev.every((p, i) => p.x === next[i].x && p.y === next[i].y)
          ? prev
          : next,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);

    // Mục k chiếm từ giữa khe phía trên tới giữa khe phía dưới — trọn cả mục lẫn dòng
    // "di chuyển" của nó, không chỉ khoảng trắng.
    const onMove = (e: MouseEvent) => {
      const y = e.clientY - list.getBoundingClientRect().top;
      const centers = [...list.querySelectorAll<HTMLElement>("[data-rail-dot]")].map((el) => {
        const r = el.getBoundingClientRect();
        return r.top + r.height / 2 - list.getBoundingClientRect().top;
      });
      let k = 0;
      while (k < centers.length - 1 && y > (centers[k] + centers[k + 1]) / 2) k++;
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

  if (dots.length === 0 || active) return null;

  // Khe i nằm giữa mục i và i + 1; khe cuối nằm ở đáy trục, sau mục cuối.
  const slots = dots.map((a, i) => ({
    x: a.x,
    y: i < dots.length - 1 ? (a.y + dots[i + 1].y) / 2 : endY - 12,
  }));

  return (
    <div aria-hidden={false} className="pointer-events-none absolute inset-0">
      {slots.map((slot, i) => {
        // Chỉ hiện ở khe NGAY DƯỚI mục đang rê.
        const shown = hovered === i;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onInsert(i + 1)}
            title="Chèn vào đây"
            aria-label={
              i < dots.length - 1
                ? `Chèn một mục vào giữa mục ${i + 1} và ${i + 2}`
                : `Thêm một mục sau mục ${i + 1}`
            }
            style={{ left: slot.x, top: slot.y }}
            className={cn(
              "pointer-events-auto absolute z-10 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[3px] border border-border bg-background text-muted-foreground shadow-sm transition-opacity hover:border-primary/50 hover:text-primary-ink focus-visible:opacity-100",
              shown ? "opacity-100" : "opacity-0",
            )}
          >
            <Glyph name="plus" className="size-4" />
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

function SortableRailItem({
  item,
  index,
  stale,
  actions,
  note,
  stay,
  fields,
}: {
  item: ItemView;
  index: number;
  stale: boolean;
  actions: ReactNode;
  note: ReactNode;
  stay: ReactNode;
  fields: TripFields;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  return (
    <RailItem
      item={item}
      index={index}
      actions={actions}
      note={note}
      stay={stay}
      fields={fields}
      grip={
        <DragGrip
          label={`Kéo để đổi chỗ ${item.name}`}
          attributes={attributes}
          listeners={listeners}
        />
      }
      stale={stale}
      dragging={isDragging}
      innerRef={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      handleProps={listeners}
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
}: {
  item: ItemView;
  day: DayView;
  allDays: DayView[];
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) => void;
  onInsertBefore: () => void;
  onInsertAfter: () => void;
}) {
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
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={onInsertBefore}>
            <Glyph name="plus" className="size-4" />
            Thêm phía trước
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onInsertAfter}>
            <Glyph name="plus" className="size-4" />
            Thêm phía sau
          </DropdownMenuItem>
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
          {fmtDuration(item.effectiveStayMin)}
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

function InlineEdit({
  value,
  placeholder,
  onSave,
  multiline,
  textClassName,
  emptyClassName,
}: {
  value: string | null;
  placeholder: string;
  onSave: (next: string | null) => void;
  multiline?: boolean;
  textClassName?: string;
  emptyClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  function commit() {
    setEditing(false);
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
