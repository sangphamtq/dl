"use client";

import Image from "next/image";

import {
  Fragment,
  useEffect,
  startTransition,
  useMemo,
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
import { TOUCH_INPUT } from "@/lib/touch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
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
  MealPick,
} from "@/lib/trip";
import { TripNotes } from "@/components/trip/trip-notes";
import { PackSuggestions, TripPacking } from "@/components/trip/trip-packing";
import { TripMoney } from "@/components/trip/trip-money";
import { formatMinutes, fmtDuration, DEFAULT_STAY_MIN, isTask } from "@/lib/trip-time";
import {
  addDay,
  attachVenue,
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
  ActivityTags,
  DayHeading,
  RailItem,
  RailLeg,
  cardClass,
  lookOf,
  StopRow,
  Thumb,
  Warning,
} from "@/components/trip/trip-rail";
import { TripTopbar } from "@/components/trip/trip-topbar";
import { useTripLiveSync } from "@/components/trip/trip-live-sync";
import { TripAddSearch, type AddPos, type AddTarget } from "@/components/trip/trip-add-search";
import { insertAt, type DropAt } from "@/lib/trip-drop";
import { TRAVEL_MODES, type TravelMode } from "@/lib/trip-special";
import { TRAVEL_INK, TravelIcon } from "@/components/trip/travel-icon";
import { VenuePicker, type Venue } from "@/components/trip/trip-venue-picker";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
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

/** Kéo chỉ theo chiều dọc — danh sách một cột, lệch ngang chỉ làm thẻ chạy lung tung. */
const lockX: Modifier = ({ transform }) => ({ ...transform, x: 0 });

type TripHeader = {
  id: string;
  title: string;
  startDate: string | null;
  partySize: number | null;
  autoTravel: boolean;
  fundKeeperId: string;
  shareId: string | null;
  visibility: "private" | "unlisted";
  place: { slug: string; name: string } | null;
  isTemplate: boolean;
  version: number;
  isOwner: boolean;
  people: TripPerson[];
};

// Tám mốc hay gặp — 4 cột × 2 hàng. CÓ 0′ (ghé qua). Thời gian ở một nơi là TỔNG, gồm cả các hoạt động
// gắn thẻ ở đó. Khác thì tự chọn giờ + phút, hoặc "đến lúc".
const STAY_PRESETS = [0, 15, 30, 45, 60, 90, 120, 180];

export function TripEditor({
  trip,
  days,
  mealPicks,
  backlog,
  notes,
  packing,
  expenses,
  viewerId,
}: {
  trip: TripHeader;
  days: DayView[];
  /** Gợi ý quán cho thẻ bữa ăn chưa có quán (`getMealPicks`). */
  mealPicks: MealPick[];
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
    busy: pending,
  });

  const sensors = useSensors(
    // 3px: đủ để bấm tên / nút trong thẻ không thành kéo, mà không bắt "kéo một đoạn" mới thấy thẻ nhấc lên.
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // MỘT kiểu kéo: đổi chỗ trong CÙNG một ngày. Chính tấm thẻ đi theo tay (không có bóng kéo riêng), nên nó
  // không đổi danh sách giữa chừng được — sang ngày khác là thẻ dựng lại ở chỗ mới và nhảy. Chuyển ngày: menu ⋯.
  const collide: CollisionDetection = (args) => {
    const home = dnd.containerOf(String(args.active.id));
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((c) => dnd.containerOf(String(c.id)) === home),
    });
  };

  function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    dnd.endDrag();
    document.documentElement.removeAttribute("data-trip-dragging");
    const at = dnd.commitMove(id, e.over ? String(e.over.id) : null);
    if (!at) return;
    setStaleDays(at.dayId ? [at.dayId] : []);
    run(async () => {
      const res = await moveItem(id, at.dayId, at.at);
      if (!res.ok) {
        dnd.resetFromProps();
        router.refresh();
      }
      return res;
    });
  }

  return (
    <DndContext
      // `id` CỐ ĐỊNH — xem chú thích cùng chỗ ở `trip-dock.tsx`.
      id="trip-dnd"
      sensors={sensors}
      collisionDetection={collide}
      modifiers={[lockX]}
      // "Đang kéo" là một thuộc tính trên <html>, CSS tự ẩn những gì cần ẩn — đi qua state/`useDndContext` thì
      // mọi ngày, mọi thẻ dựng lại ở khung hình đầu và mỗi lần chuột nhích ⇒ giật.
      onDragStart={() => {
        dnd.beginDrag();
        document.documentElement.setAttribute("data-trip-dragging", "");
      }}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        dnd.endDrag();
        document.documentElement.removeAttribute("data-trip-dragging");
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
        : tab === null
          ? {
              // Ghi chú chuyến cạnh lịch: mã đặt phòng, số tài xế… là thứ hay phải tra NGAY lúc xếp lịch.
              right: <TripNotes tripId={trip.id} notes={notes} compact />,
              rightTitle: notes.length > 0 ? `Ghi chú (${notes.length})` : "Ghi chú",
              rightIcon: "note" as const,
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
              <p className="mt-1.5 px-1.5 pb-0.5 text-xs text-muted-foreground">Bấm + để xếp vào một ngày.</p>
            )}
          </>
            ),
          })}
        main={
          <>
          <div className={cn(tab === null ? undefined : "hidden")}>
            {/* Dưới lg neo ngay DƯỚI thanh chọn khung nhìn (cũng dính `top-0`) — không thì dải ngày chui xuống dưới nó. */}
            <div className="sticky top-[var(--trip-pane-bar,0px)] z-20 flex items-center gap-3 border-b border-border/60 bg-background pb-1 pt-1 lg:top-0">
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
                  tripId={trip.id}
                  mealPicks={mealPicks}
                  day={day}
                  isTemplate={trip.isTemplate}
                  fields={fields}
                  itemIds={dnd.board[dayKey(day.id)] ?? []}
                  doingsOf={(id) => dnd.board[doingsKey(id)] ?? []}
                  byId={dnd.byId}
                  stale={slow && staleDays.includes(day.id)}
                  dayCount={days.length}
                  allDays={days}
                  active={day.id === activeDay?.id}
                  // Nhấn vào một thẻ là chạy cái này NGAY trong khung hình nhấn chuột: đặt lại state ở đây dựng lại
                  // cả trang soạn (kể cả các tab ẩn) ⇒ cú kéo khựng lúc vừa cầm lên. Chỉ đặt khi ĐỔI ngày, và không gấp.
                  onFocus={() => {
                    if (day.id !== activeDayId) startTransition(() => setActiveDayId(day.id));
                  }}
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
                    .filter((i) => i.lat != null && i.lng != null && !i.nested)
                    .map((i, idx) => ({
                      id: i.id,
                      order: i.stopNo ?? idx + 1,
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
              fundKeeperId={trip.fundKeeperId}
              startDate={trip.startDate}
              dayCount={days.length}
              expenses={expenses}
              people={trip.people}
              viewerId={viewerId}
            />
          </div>
          </>
        }
      />


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
  return (
      <ul className="grid gap-0.5">
        {ids.map((id) => {
          const item = byId.get(id);
          return item ? (
            <BacklogRow key={id} item={item} days={days} run={run} />
          ) : null;
        })}
      </ul>
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
  return (
    <li className="group relative flex min-w-0 items-center gap-2.5 rounded-[4px] px-1.5 py-1.5 transition-colors focus-within:bg-muted hover:bg-muted">
      <Thumb item={item} size="sm" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.8125rem] font-medium leading-snug">{item.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.typeLabel}</p>
      </div>

      {/* Nút xếp NỔI ĐÈ mép phải khi rê vào — ẩn bằng opacity mà vẫn chiếm chỗ thì tên bị cắt cụt cả lúc
          không rê. Màn cảm ứng không rê được ⇒ để trong dòng, luôn hiện. */}
      <div className="absolute inset-y-0 right-1 flex items-center bg-muted pl-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:static [@media(pointer:coarse)]:bg-transparent [@media(pointer:coarse)]:opacity-100">
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
  tripId,
  mealPicks,
  day,
  isTemplate,
  fields,
  itemIds,
  doingsOf,
  byId,
  stale,
  dayCount,
  allDays,
  active,
  onFocus,
  onAdd,
  run,
}: {
  tripId: string;
  mealPicks: MealPick[];
  day: DayView;
  isTemplate: boolean;
  fields: TripFields;
  /** MỤC GỐC của ngày, theo bàn kéo–thả. */
  itemIds: string[];
  /** Thẻ hoạt động của một mục gốc, theo bàn kéo–thả. */
  doingsOf: (id: string) => string[];
  byId: Map<string, ItemView>;
  stale: boolean;
  dayCount: number;
  allDays: DayView[];
  active: boolean;
  onFocus: () => void;
  onAdd: (pos?: AddPos) => void;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) => void;
}) {
  const tops = itemIds.map((id) => byId.get(id)).filter((x): x is ItemView => !!x);
  const [editing, setEditing] = useState<string | null>(null);
  const nameOf = (id: string) => byId.get(id)?.name ?? "mục này";

  // Chèn một dòng có giờ ở hàng thứ k (nơi, hoạt động đứng riêng, việc tự gõ).
  const topPos = (k: number): AddPos => ({ ...insertAt(itemIds, k, nameOf), mode: "any" });
  // Thêm thẻ hoạt động cho nơi `parentId`; `at` = ngay sau nơi đó (cho việc tự gõ mở từ cùng hộp).
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

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <ol className="relative mt-6 min-h-[4rem]">
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
              hoặc xếp một mục từ cột Chưa xếp ngày.
            </li>
          ) : (
            (() => {
              let num = 0;
              return tops.map((top, k) => {
                const tags = doingsOf(top.id)
                  .map((id) => byId.get(id))
                  .filter((x): x is ItemView => !!x);
                // Hoạt động trên site chỉ gắn với ĐỊA ĐIỂM — quán ăn, chỗ ở không có thẻ.
                const isPlace = top.kind === "spot" || (top.kind === "custom" && !isTask(top));
                const no = isTask(top) ? null : ++num;
                // Hoạt động đứng riêng mà nơi của nó đã có trong ngày ⇒ gắn vào được (thành thẻ).
                // Hoạt động diễn ra ở nhiều nơi: lấy nơi GẦN NHẤT phía trên nó, không thì nơi đầu tiên phía dưới.
                const isHost = (t: ItemView) => t.kind === "spot" && top.atSpots.some((sp) => sp.id === t.spotId);
                const host =
                  top.kind === "activity"
                    ? (tops.slice(0, k).reverse().find(isHost) ?? tops.slice(k + 1).find(isHost))
                    : undefined;
                const addTag = () => onAdd(childPos(top.id, tags.length));
                return (
                  <Fragment key={top.id}>
                    <SortableStop
                      item={top}
                      // Chặng đi tiếp nằm TRONG hàng: đi theo thẻ khi các hàng trượt, không đứng yên giữa chúng.
                      after={
                        fields.leg && k < tops.length - 1 ? (
                          <RailLeg as="div" item={top} className="[[data-trip-dragging]_&]:opacity-0" />
                        ) : null
                      }
                    >
                      {(card) => (
                        <RailItem
                          as="div"
                          item={top}
                          index={k}
                          number={no}
                          card={card}
                          stale={stale}
                          fields={fields}
                          actions={
                            <>
                              {isPlace && fields.tags && tags.length === 0 && (
                                <AddTagButton label={top.name} onClick={addTag} quiet />
                              )}
                              {top.kind === "custom" && top.special === "checkin" && !top.address && (
                                  // Mục tự gõ gắn được quán / chỗ ở của site — nói thẳng ra, đừng giấu trong ✎.
                                  <button
                                    type="button"
                                    onClick={() => setEditing(top.id)}
                                    className="inline-flex h-7 shrink-0 items-center gap-1 rounded-[3px] px-1.5 text-xs font-medium text-primary-ink transition-colors hover:bg-primary/5"
                                  >
                                    <Glyph name="bed" className="size-3.5" />
                                    Chọn chỗ ở
                                  </button>
                                )}
                              <ItemActions
                                item={top}
                                day={day}
                                allDays={allDays}
                                run={run}
                                onEdit={() => setEditing(top.id)}
                                onInsertBefore={() => onAdd(topPos(k))}
                                onInsertAfter={() => onAdd(topPos(k + 1))}
                                onAddDoing={isPlace ? addTag : undefined}
                                host={host}
                              />
                            </>
                          }
                          tags={
                            top.kind === "custom" && top.special === "meal" && !top.address ? (
                              <MealPicksRow
                                picks={mealPicks}
                                onPick={(p) =>
                                  run(() => attachVenue(top.id, { kind: "eatery", id: p.id }), `Đã chọn ${p.name}`)
                                }
                                onMore={() => setEditing(top.id)}
                              />
                            ) : fields.tags && tags.length > 0 ? (
                              <ActivityTags
                                tags={tags}
                                action={(t) => (
                                  <TagActions
                                    tag={t}
                                    dayId={day.id}
                                    at={{ afterId: top.id, beforeId: itemIds[k + 1] ?? null }}
                                    run={run}
                                  />
                                )}
                                add={isPlace ? <AddTagButton label={top.name} onClick={addTag} /> : undefined}
                              />
                            ) : null
                          }
                        />
                      )}
                    </SortableStop>
                  </Fragment>
                );
              });
            })()
          )}
        </ol>
      </SortableContext>
      {itemIds.length > 0 && (
        // Lối thêm ở CUỐI ngày = MỐC KẾ TIẾP trên trục: cùng lưới với `RailItem` (cột giờ trống · ô mốc viền đứt có dấu + ·
        // chữ), cả hàng là một nút. Chèn vào giữa thì dùng "Chèn trước / sau" trong ⋯ của thẻ.
        <button
          type="button"
          onClick={() => onAdd(topPos(itemIds.length))}
          className="group/add flex w-full items-center gap-2 py-1 text-left sm:gap-3"
        >
          <span aria-hidden className="w-11 shrink-0 sm:w-16" />
          {/* Vạch đứt ngắn nối đáy trục tới ô + — ô là mốc TIẾP THEO của cùng một trục, không phải nút đứng riêng. */}
          <span className="relative flex w-5 shrink-0 justify-center before:absolute before:bottom-full before:left-1/2 before:h-2 before:-translate-x-1/2 before:border-l-2 before:border-dashed before:border-foreground/20 sm:w-6">
            <span className="grid size-[1.375rem] place-items-center rounded-[4px] border border-dashed border-foreground/35 bg-background text-muted-foreground transition-colors group-hover/add:border-solid group-hover/add:border-primary group-hover/add:bg-primary group-hover/add:text-primary-foreground">
              <Glyph name="plus" className="size-3.5" />
            </span>
          </span>
          <span className="text-[0.9375rem] font-medium text-muted-foreground transition-colors group-hover/add:text-foreground">
            Thêm vào ngày {day.index + 1}
          </span>
        </button>
      )}
      <ItemEditDialog
        tripId={tripId}
        item={editing ? (byId.get(editing) ?? null) : null}
        onClose={() => setEditing(null)}
        run={run}
      />
    </section>
  );
}

/**
 * "+ Hoạt động". Nơi đã có thẻ: ô viền đứt cuối dải thẻ. Nơi chưa có (`quiet`): nút trơn cạnh ⋯, chỉ hiện khi
 * rê vào hàng — giữ sẵn một dòng ẩn cho mọi nơi là cả ngày giãn ra; cảm ứng thì lối vào nằm trong menu ⋯.
 */
function AddTagButton({ label, onClick, quiet }: { label: string; onClick: () => void; quiet?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Thêm hoạt động ở ${label}`}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1 rounded-[3px] px-2 text-sm font-medium text-muted-foreground transition-colors",
        quiet
          ? "opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:hidden"
          : // Nền ĐỤC trắng: vô hình trên thẻ trơn, nhưng vẫn đọc được khi rơi vào vùng ảnh nền.
            "bg-background hover:bg-[color-mix(in_oklab,var(--color-foreground)_7%,var(--color-background))] hover:text-foreground",
      )}
    >
      <Glyph name="plus" className="size-3.5" />
      {/* Khổ hẹp cạnh ⋯ chỉ còn dấu + — thêm chữ là tên nơi bị bóp xuống dòng. */}
      <span className={quiet ? "hidden sm:inline" : undefined}>Hoạt động</span>
    </button>
  );
}

/** CẢ HÀNG (mục gốc + thẻ của nó) là một mục kéo ở cấp ngày; tay kéo là cả tấm thẻ. */
function SortableStop({
  item,
  after,
  children,
}: {
  item: ItemView;
  after?: ReactNode;
  children: (card: (content: ReactNode) => ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  // dnd-kit dựng lại MỌI hàng mỗi lần chuột nhích (để tính chỗ trượt), nhưng ruột thẻ không đổi — ghi nhớ lại để
  // chỉ khung hàng (`transform`) cập nhật. `attributes`/`listeners` của dnd-kit giữ nguyên tham chiếu khi trạng thái
  // không đổi; `children` là hàm dựng ở `DayBlock`, mà `DayBlock` không dựng lại trong lúc kéo.
  const body = useMemo(
    () =>
      children((content) => (
        // `setActivatorNodeRef`: Enter/Space trên nút con (✎, ⋯) không kích hoạt kéo bằng bàn phím.
        <div
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          // Thẻ CHỨA link và nút — `role="button"` mặc định của dnd-kit giấu chúng khỏi trình đọc màn hình.
          role="group"
          aria-label={`${item.name}, giữ và kéo để đổi chỗ`}
          className={cn(
            cardClass(lookOf(item)),
            isDragging && "bg-background shadow-[0_16px_32px_-12px_rgb(0_0_0/0.3)]",
            // Rê: nền ngả MỘT sắc + viền đậm một nấc — không bóng (thẻ đã có viền: mỗi khối một độ nổi), không nảy lên.
            "cursor-grab transition-[background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing",
            // Nhấn xuống là thẻ NHẤC LÊN ngay (cùng bóng với bóng kéo) — trừ khi nhấn vào nút / link bên trong.
            "[&:active:not(:has(a:active,button:active))]:bg-background [&:active:not(:has(a:active,button:active))]:shadow-[0_16px_32px_-12px_rgb(0_0_0/0.3)]",
            // Nhấn giữ để kéo trên cảm ứng: đừng để iOS bôi đen chữ / bật menu sao chép.
            "[@media(pointer:coarse)]:select-none [@media(pointer:coarse)]:[-webkit-touch-callout:none]",
          )}
        >
          {content}
        </div>
      )),
    [children, attributes, listeners, setActivatorNodeRef, isDragging, item],
  );
  return (
    <StopRow
      rowId={item.id}
      innerRef={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      dragging={isDragging}
    >
      {body}
      {after}
    </StopRow>
  );
}

/**
 * Hàng gợi ý trên THẺ BỮA ĂN chưa có quán: quán hợp ĐÚNG bữa đó ở điểm đến (`Eatery.meals[]`), bấm là gắn luôn
 * (`attachVenue`) — khỏi mở hộp nào. "Quán khác…" mở hộp sửa ở ô chọn quán.
 */
function MealPicksRow({
  picks,
  onPick,
  onMore,
}: {
  picks: MealPick[];
  onPick: (p: MealPick) => void;
  onMore: () => void;
}) {
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      {picks.length > 0 && <span className="mr-0.5 text-xs font-medium text-muted-foreground">Gợi ý</span>}
      {picks.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onPick(p)}
          className={cn(
            "inline-flex h-8 max-w-full items-center gap-1.5 rounded-[4px] pr-2.5 text-sm transition-colors bg-[color-mix(in_oklab,var(--color-foreground)_7%,var(--color-background))] hover:bg-[color-mix(in_oklab,var(--color-foreground)_11%,var(--color-background))]",
            p.image ? "pl-[3px]" : "pl-2.5",
          )}
        >
          {/* Ảnh THẬT của quán hoặc không ảnh (`getMealPicks` không rơi về ảnh stock). */}
          {p.image && (
            <span className="relative size-6 shrink-0 overflow-hidden rounded-[2px] bg-muted">
              <Image src={p.image} alt="" fill sizes="24px" className="object-cover" draggable={false} />
            </span>
          )}
          <span className="truncate">{p.name}</span>
        </button>
      ))}
      <button
        type="button"
        onClick={onMore}
        className="inline-flex h-8 items-center gap-1 rounded-[4px] px-2.5 text-sm text-muted-foreground transition-colors hover:bg-[color-mix(in_oklab,var(--color-foreground)_7%,var(--color-background))] hover:text-foreground"
      >
        <Glyph name="search" className="size-3.5" />
        {picks.length > 0 ? "Quán khác…" : "Chọn quán"}
      </button>
    </div>
  );
}

/** ⋯ cuối một thẻ hoạt động: tách thành dòng có giờ riêng, hoặc bỏ. */
function TagActions({
  tag,
  dayId,
  at,
  run,
}: {
  tag: ItemView;
  dayId: string;
  /** Ngay sau nơi của thẻ. */
  at: DropAt;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Tuỳ chọn cho ${tag.name}`}
          className="-ml-1 grid h-full w-6 place-items-center rounded-r-[3px] text-muted-foreground opacity-40 transition-[opacity,color,background-color] hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/tag:opacity-100 data-[state=open]:opacity-100 [@media(pointer:coarse)]:opacity-100"
        >
          <Glyph name="more" className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onSelect={() =>
            run(
              () => moveItem(tag.id, dayId, at),
              "Đã tách thành một dòng riêng",
            )
          }
        >
          <Glyph name="clock" className="size-4" />
          Tách thành dòng có giờ riêng
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => run(() => removeItem(tag.id), "Đã bỏ khỏi lịch trình")}
        >
          <Glyph name="trash" className="size-4" />
          Bỏ khỏi lịch trình
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ItemActions({
  item,
  day,
  allDays,
  run,
  onInsertBefore,
  onInsertAfter,
  onEdit,
  onAddDoing,
  host,
}: {
  item: ItemView;
  day: DayView;
  allDays: DayView[];
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) => void;
  onInsertBefore: () => void;
  onInsertAfter: () => void;
  /** Mở hộp sửa tên / thời gian / ghi chú. */
  onEdit: () => void;
  /** Chỉ ở một NƠI: thêm thẻ hoạt động (trên màn cảm ứng đây là lối duy nhất khi nơi chưa có thẻ). */
  onAddDoing?: () => void;
  /** Hoạt động đứng riêng: nơi của nó đang có trong ngày ⇒ gắn vào thành thẻ được. */
  host?: ItemView;
}) {
  return (
    // Viên nút NỔI trên thẻ (thẻ có ảnh nền ở đúng chỗ này): độ nổi bằng BÓNG, không viền — dark mode bóng không thấy nên
    // đổi sang vòng 1px (mỗi theme vẫn chỉ một độ nổi). Nút TRƯỢT nhẹ vào khi rê; cảm ứng luôn hiện, đứng yên.
    <div className="flex shrink-0 translate-x-1 items-center gap-px rounded-[4px] bg-background p-0.5 shadow-[0_1px_2px_rgb(0_0_0/0.08),0_3px_10px_-3px_rgb(0_0_0/0.18)] dark:shadow-none dark:ring-1 dark:ring-white/12 opacity-0 transition-[opacity,transform] duration-200 ease-out group-focus-within:translate-x-0 group-focus-within:opacity-100 group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none [@media(pointer:coarse)]:translate-x-0 [@media(pointer:coarse)]:opacity-100">
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Sửa ${item.name}`}
        title="Sửa tên, thời gian, ghi chú"
        className="grid size-7 place-items-center rounded-[3px] text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
      >
        <Glyph name="pencil" className="size-[0.9375rem]" />
      </button>
      <span aria-hidden className="h-4 w-px bg-border" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Tuỳ chọn cho ${item.name}`}
            className="grid size-7 place-items-center rounded-[3px] text-foreground/80 transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-muted"
          >
            <Glyph name="more" className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {onAddDoing && (
            <DropdownMenuItem onSelect={onAddDoing}>
              <Glyph name="plus" className="size-4" />
              Thêm hoạt động ở đây
            </DropdownMenuItem>
          )}
          {host && (
            <DropdownMenuItem
              onSelect={() =>
                run(() => moveItem(item.id, day.id, "end", host.id), `Đã gắn vào ${host.name}`)
              }
            >
              <Glyph name="pin" className="size-4" />
              Gắn vào {host.name}
            </DropdownMenuItem>
          )}
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

const QUARTERS = [0, 15, 30, 45];

/** Gõ "1930" ra "19:30" — trên điện thoại bàn phím số không có dấu ":". */
function hhmmInput(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, d.length - 2)}:${d.slice(-2)}`;
}

/** "45′", "1g", "1g30" — nhãn gọn cho nút chọn nhanh. */
function shortDur(m: number): string {
  if (m < 60) return `${m}′`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}g${String(r).padStart(2, "0")}` : `${h}g`;
}

/**
 * Giờ bắt đầu ngày, LUÔN 24 giờ (không dùng `<input type="time">`: trình duyệt vẽ theo ngôn ngữ máy, ra
 * "02:00 PM"). Chọn nhanh mà vẫn ĐỦ: lưới đủ 24 giờ + bốn mốc phút — bấm giờ là áp ngay (giữ phút đang chọn),
 * bấm phút để chỉnh; hai chạm là ra mọi giờ tròn 15 phút. Giờ lẻ hơn (4:20) thì gõ.
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
  // Giá trị đang chọn TRONG bảng — đổi ngay dưới tay, không đợi server dựng lại cả ngày.
  const [sel, setSel] = useState(startMin);
  const [draft, setDraft] = useState("");
  const draftMin = fromTimeValue(draft.trim());
  const h = Math.floor(sel / 60);
  const m = sel % 60;

  function apply(min: number) {
    setSel(min);
    if (min !== startMin) onSet(min);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setSel(startMin);
          setDraft("");
        }
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

      <PopoverContent align="end" className="w-[19rem] p-3">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold tracking-tight">Bắt đầu ngày lúc</p>
          <p className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums">
            {formatMinutes(sel)}
          </p>
        </div>

        <p className="mt-2 text-[0.6875rem] font-medium text-muted-foreground">Giờ</p>
        <div className="mt-1 grid grid-cols-6 gap-1">
          {Array.from({ length: 24 }, (_, i) => i).map((hr) => (
            <button
              key={hr}
              type="button"
              onClick={() => apply(hr * 60 + m)}
              aria-pressed={hr === h}
              className={cn(
                "h-8 rounded-[4px] text-sm tabular-nums transition-colors",
                hr === h ? "bg-primary font-semibold text-primary-foreground" : "bg-muted hover:bg-muted/70",
                // Khung giờ hay dùng (5–21h) đậm hơn — mắt tìm nhanh hơn trong lưới 24 ô.
                hr !== h && (hr < 5 || hr > 21) && "text-muted-foreground",
              )}
            >
              {String(hr).padStart(2, "0")}
            </button>
          ))}
        </div>

        <p className="mt-2.5 text-[0.6875rem] font-medium text-muted-foreground">Phút</p>
        <div className="mt-1 grid grid-cols-4 gap-1">
          {QUARTERS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => apply(h * 60 + q)}
              aria-pressed={q === m}
              className={cn(
                "h-8 rounded-[4px] text-sm tabular-nums transition-colors",
                q === m ? "bg-primary font-semibold text-primary-foreground" : "bg-muted hover:bg-muted/70",
              )}
            >
              :{String(q).padStart(2, "0")}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draftMin != null) {
              apply(draftMin);
              setOpen(false);
            }
          }}
          className="mt-3 flex gap-2 border-t border-border/60 pt-3"
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(hhmmInput(e.target.value))}
            inputMode="numeric"
            placeholder="Giờ lẻ, vd 4:20"
            aria-label="Giờ bắt đầu khác (giờ:phút)"
            className="h-9 rounded-[4px] tabular-nums"
          />
          <Button type="submit" variant="outline" disabled={draftMin == null} className="h-9 shrink-0 rounded-[4px] px-3">
            Đặt
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Ở lại bao lâu. Ba cách, theo cách người ta NGHĨ về thời lượng: một nút có sẵn (đa số) · số giờ + số phút
 * (không bắt quy ra phút) · "ở đến mấy giờ" (tự trừ giờ đến — thường là cách nghĩ thật: "chơi đến 5 giờ chiều").
 */
/**
 * Hộp SỬA một mục — mọi chỉnh sửa gom về đây (biên tập: "edit cho vào button"), thẻ trên dòng thời gian chỉ còn
 * để đọc và kéo. Một nút Lưu gửi một lượt `updateItem` với đúng các trường đã đổi.
 */
function ItemEditDialog({
  tripId,
  item,
  onClose,
  run,
}: {
  tripId: string;
  item: ItemView | null;
  onClose: () => void;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) => void;
}) {
  const [forId, setForId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [mode, setMode] = useState<TravelMode | null>(null);
  // Gắn quán / chỗ ở của site cho bữa ăn, nhận / trả phòng tự gõ — hoặc bỏ gắn với mục site đang mang vai.
  const [venue, setVenue] = useState<Venue | null>(null);
  const [detach, setDetach] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  // null = theo mặc định của loại mục.
  const [stay, setStay] = useState<number | null>(null);
  const [until, setUntil] = useState("");
  if (item && item.id !== forId) {
    setForId(item.id);
    setName(item.name);
    setAddress(item.address ?? "");
    setMode(item.travelMode);
    setVenue(null);
    setDetach(false);
    setFrom(item.travelFrom ?? "");
    setTo(item.travelTo ?? "");
    setNote(item.note ?? "");
    setStay(item.stayMin);
    setUntil("");
  }

  const shown = item ? (stay ?? (item.stayMin == null ? item.effectiveStayMin : DEFAULT_STAY_MIN[item.kind])) : 0;
  const hours = Math.floor(shown / 60);
  const mins = shown % 60;
  // Nơi thì "ở lại"; việc (hoạt động, việc tự gõ) thì "mất bao lâu" — một hoạt động không phải chỗ để ở.
  const doing = item ? canBeDoing(item) : false;
  const canUntil = !!item && item.arriveMin >= 0;
  const untilMin = fromTimeValue(until.trim());
  // "Ở đến" sớm hơn giờ đến ⇒ hiểu là qua nửa đêm (nhận phòng tối, trả phòng sáng hôm sau).
  const untilDur = item && untilMin != null && canUntil ? (untilMin - item.arriveMin + 1440) % 1440 : null;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    const patch: Parameters<typeof updateItem>[1] = {};
    if (stay !== item.stayMin) patch.stayMin = stay;
    const n = note.trim();
    if (n !== (item.note ?? "")) patch.note = n || null;
    const t = name.trim();
    if (item.kind === "custom") {
      // Mục đặc biệt: tên đang hiện có thể là tên GHÉP ("Hà Nội – Sa Pa") — chỉ ghi khi người dùng gõ khác đi.
      if (item.special ? t !== item.name : t && t !== item.name) patch.customTitle = t;
      if (item.special === "transport") {
        if (mode !== item.travelMode) patch.travelMode = mode;
        if (from.trim() !== (item.travelFrom ?? "")) patch.travelFrom = from.trim() || null;
        if (to.trim() !== (item.travelTo ?? "")) patch.travelTo = to.trim() || null;
      }
    }
    const a = address.trim();
    if (item.kind === "custom" && a !== (item.address ?? "")) patch.customAddress = a || null;
    if (venue) {
      // Gắn quán / chỗ ở ⇒ địa chỉ & tên tự gõ không còn nghĩa; giữ phần còn lại của patch.
      delete patch.customAddress;
      if (item.special !== "meal") delete patch.customTitle;
    }
    onClose();
    const id = item.id;
    const link = venue ? { kind: venue.kind, id: venue.id } : null;
    if (!venue && !detach && Object.keys(patch).length === 0) return;
    run(async () => {
      if (venue || detach) {
        const res = await attachVenue(id, link);
        if (!res.ok) return res;
      }
      return Object.keys(patch).length > 0 ? updateItem(id, patch) : { ok: true };
    }, "Đã lưu");
  }

  const chip = (on: boolean) =>
    cn(
      "h-9 rounded-[4px] text-sm tabular-nums transition-colors",
      on ? "bg-primary font-semibold text-primary-foreground" : "bg-muted hover:bg-muted/70",
    );

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="gap-0 rounded-[6px] p-0 sm:max-w-md">
        {item && (
          <form onSubmit={save}>
            <div className="border-b border-border/60 px-5 pb-3 pt-5">
              <DialogTitle className="font-[family-name:var(--font-display)] text-lg font-bold leading-snug">
                Sửa mục
              </DialogTitle>
              <DialogDescription className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                {item.kind === "custom" ? "Mục tự thêm" : `${item.typeLabel}: ${item.name}`}
                {item.arriveMin >= 0 && `, đến lúc ${formatMinutes(item.arriveMin)}`}
              </DialogDescription>
            </div>

            <div className="grid gap-5 px-5 py-4">
              {item.kind === "custom" && item.special !== "checkout" && (
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium">Tên</span>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 rounded-[4px]"
                  />
                </label>
              )}
              {item.kind === "custom" && (item.special === "meal" || item.special === "checkin") && (
                <div className="grid gap-1.5">
                  <span className="text-sm font-medium">
                    {item.special === "meal" ? "Gắn quán trên site" : "Gắn chỗ ở trên site"}{" "}
                    <span className="font-normal text-muted-foreground">(có ảnh, giờ mở cửa, đường đi)</span>
                  </span>
                  <VenuePicker
                    tripId={tripId}
                    kind={item.special === "meal" ? "eatery" : "accommodation"}
                    value={venue}
                    onChange={setVenue}
                  />
                </div>
              )}
              {item.role && (item.kind === "eatery" || item.kind === "accommodation") && (
                <div className="grid gap-2">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={detach}
                      onChange={(e) => setDetach(e.target.checked)}
                      className="size-4 accent-[var(--color-primary)]"
                    />
                    Bỏ gắn {item.kind === "eatery" ? "quán" : "chỗ ở"} này (về lại mục tự gõ)
                  </label>
                </div>
              )}
              {item.special === "transport" && (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {TRAVEL_MODES.map((m) => (
                      <button
                        key={m.mode}
                        type="button"
                        onClick={() => setMode(m.mode)}
                        aria-pressed={mode === m.mode}
                        className={cn(
                          "inline-flex h-8 items-center gap-1.5 rounded-[4px] border px-2.5 text-sm transition-colors",
                          mode === m.mode ? "border-primary/60 bg-primary/5 font-medium text-primary-ink" : "border-border hover:bg-muted",
                        )}
                      >
                        <TravelIcon mode={m.mode} className={cn("size-5", TRAVEL_INK)} />
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1.5">
                      <span className="text-sm font-medium">Từ</span>
                      <Input value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-[4px]" />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="text-sm font-medium">Đến</span>
                      <Input value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-[4px]" />
                    </label>
                  </div>
                </>
              )}
              {item.kind === "custom" && item.special !== "transport" && item.special !== "rest" && item.special !== "checkout" && (
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium">
                    Địa chỉ <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
                  </span>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Số nhà, đường, phường…"
                    className="h-10 rounded-[4px]"
                  />
                </label>
              )}

              <div className="grid gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">{doing ? "Mất bao lâu?" : "Ở lại bao lâu?"}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {stay == null ? `Mặc định, ${stayLabel({ ...item, effectiveStayMin: shown })}` : stayLabel({ ...item, effectiveStayMin: shown })}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {STAY_PRESETS.map((m) => (
                    <button key={m} type="button" onClick={() => setStay(m)} aria-pressed={stay === m} className={chip(stay === m)}>
                      {shortDur(m)}
                    </button>
                  ))}
                </div>
                {/* Giờ + phút — không bắt người dùng tự quy "2 tiếng rưỡi" ra 150 phút. */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-[4px] bg-muted">
                    <button
                      type="button"
                      onClick={() => setStay(Math.max(0, hours - 1) * 60 + mins)}
                      aria-label="Bớt một giờ"
                      className="grid size-9 place-items-center rounded-[4px] text-lg leading-none hover:bg-muted/70"
                    >
                      −
                    </button>
                    <span className="w-12 text-center text-sm font-semibold tabular-nums">{hours} giờ</span>
                    <button
                      type="button"
                      onClick={() => setStay(Math.min(23, hours + 1) * 60 + mins)}
                      aria-label="Thêm một giờ"
                      className="grid size-9 place-items-center rounded-[4px] text-lg leading-none hover:bg-muted/70"
                    >
                      +
                    </button>
                  </div>
                  <div className="grid flex-1 grid-cols-4 gap-1">
                    {QUARTERS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setStay(hours * 60 + q)}
                        aria-pressed={q === mins}
                        className={cn(
                          "h-9 rounded-[4px] text-xs tabular-nums transition-colors",
                          q === mins ? "bg-foreground font-semibold text-background" : "bg-muted hover:bg-muted/70",
                        )}
                      >
                        {q}′
                      </button>
                    ))}
                  </div>
                </div>
                {canUntil && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{doing ? "hoặc làm đến" : "hoặc ở đến"}</span>
                    <Input
                      value={until}
                      onChange={(e) => {
                        const v = hhmmInput(e.target.value);
                        setUntil(v);
                        const m = fromTimeValue(v.trim());
                        if (m != null) setStay((m - item.arriveMin + 1440) % 1440);
                      }}
                      inputMode="numeric"
                      placeholder="17:00"
                      aria-label={doing ? "Làm đến lúc (giờ:phút)" : "Ở đến lúc (giờ:phút)"}
                      className="h-9 w-20 rounded-[4px] text-center tabular-nums"
                    />
                    {untilDur != null && (
                      <span className="text-xs tabular-nums text-muted-foreground">= {fmtDuration(untilDur)}</span>
                    )}
                    {stay != null && (
                      <button
                        type="button"
                        onClick={() => {
                          setStay(null);
                          setUntil("");
                        }}
                        className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      >
                        Về mặc định
                      </button>
                    )}
                  </div>
                )}
              </div>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Ghi chú</span>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Đến sớm cho đỡ nắng, nhớ mang tiền mặt…"
                  rows={3}
                  className="resize-none rounded-[4px]"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-border/60 px-5 py-3">
              <Button type="button" variant="ghost" onClick={onClose} className="rounded-[4px]">
                Huỷ
              </Button>
              <Button type="submit" className="rounded-[4px]">
                Lưu
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
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
      <Textarea {...shared} rows={2} className={cn("mt-1.5 min-h-0 resize-none text-xs", TOUCH_INPUT)} />
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
