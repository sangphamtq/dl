"use client";

import { Fragment, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  GripVertical,
  Clock,
  Loader2,
  MoreHorizontal,
  Plus,
  Sunrise,
  Trash2,
} from "@/components/icons";
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
  addItem,
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
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
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
  shareId: string | null;
  visibility: "private" | "unlisted";
  /** Nơi bấm "Lên lịch trình đi X" — dùng làm đường quay lại khi chuyến còn trống. */
  place: { slug: string; name: string } | null;
  /** Mẫu do biên tập soạn. CHỈ mẫu mới có tên ngày & ghi chú ngày — xem DayBlock. */
  isTemplate: boolean;
  /** Khoá lạc quan, gửi lại khi kéo–thả (docs/lich-trinh-cong-tac.md §3). */
  version: number;
  /** Chủ chuyến mới được xoá chuyến / bật chia sẻ / quản lý thành viên. */
  isOwner: boolean;
  /** Chủ chuyến + người đã tham gia — cụm avatar chồng cạnh nút Chia sẻ. */
  people: TripPerson[];
};

const STAY_PRESETS = [15, 30, 45, 60, 90, 120, 180, 240, 360];

// Bố cục hai cột giống map-explorer: trái là dòng thời gian, phải là bản đồ.
// Dưới `lg` chỉ hiện một bên, đổi bằng cặp nút "Lịch trình / Bản đồ".
// Trình soạn giữ CẢ BỐN MỤC đã render sẵn (lịch trình · ghi chú · đồ mang theo
// · chi phí) và chuyển mục hoàn toàn ở client:
//
//   • Sidebar đổi URL bằng `history.pushState` (Next hỗ trợ shallow routing —
//     `usePathname` cập nhật theo) chứ KHÔNG điều hướng: không vòng server nào
//     giữa hai cú bấm, chuyển mục là tức thì.
//   • Mục đang mở chọn bằng CSS `hidden` chứ không unmount, nên trạng thái dở
//     tay (ô soạn ghi chú đang mở, nhóm gợi ý đang bung) giữ nguyên khi đảo qua
//     đảo lại.
//   • Deep-link/F5 vẫn chạy: route `[muc]` render đúng component này.
//
// Đổi lại, trang đầu nạp dữ liệu của cả bốn mục một lượt — ba mục kia đều nhẹ
// (vài chục dòng DB), phần nặng duy nhất (ORS cho các chặng) vốn đã phải trả
// cho mục Lịch trình.
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
  // Token mục đang mở, suy từ URL — pushState của sidebar đổi được nó mà không
  // cần vòng server.
  const tab = pathname?.startsWith(`/lich-trinh/${trip.id}/`)
    ? pathname.slice(`/lich-trinh/${trip.id}/`.length).replace(/\/+$/, "")
    : null;
  const [pending, start] = useTransition();
  const [activeDayId, setActiveDayId] = useState(days[0]?.id ?? "");
  const fields = useTripFields();

  const activeDay = days.find((d) => d.id === activeDayId) ?? days[0] ?? null;

  // Bấm viên ngày: đổi ngày cho bản đồ VÀ cuộn tới khối ngày đó. Chỉ đổi bản đồ
  // thôi thì ở chuyến dài, người dùng bấm xong chẳng thấy gì động đậy.
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

  // ── Kéo–thả ────────────────────────────────────────────────────────────
  const dnd = useTripBoard(days, backlog);

  const sensors = useSensors(
    // Chuột: phải rê 6px mới coi là kéo, nếu không thì mọi cú bấm vào nút tròn
    // đều bị nuốt thành thao tác kéo.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Cảm ứng: giữ 220ms mới kéo — dưới ngưỡng đó vẫn là vuốt để CUỘN trang,
    // nếu không người dùng không cuộn nổi danh sách trên điện thoại.
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
    // Chỉ dời khi ĐỔI vùng chứa; đổi chỗ trong cùng vùng để dành cho lúc thả,
    // gọi ở đây sẽ làm danh sách rung liên tục theo con trỏ.
    if (from && to && from !== to) dnd.moveLocal(String(e.active.id), String(over.id));
  }

  function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    dnd.endDrag();

    const at = dnd.commitMove(id, e.over ? String(e.over.id) : null);
    // Gửi kèm phiên bản client đang thấy: thao tác này theo VỊ TRÍ, người khác
    // vừa sửa là chỉ số trỏ sai chỗ. Lệch ⇒ server từ chối.
    //
    // Khi đó phải `router.refresh()` chứ KHÔNG chỉ `resetFromProps()`: props
    // hiện tại chính là bản cũ đã lệch, dựng lại bàn từ đó thì vẫn sai. Và vì
    // action bị từ chối TRƯỚC khi ghi, nó không `revalidatePath` — không tự
    // làm mới thì người dùng kẹt với dữ liệu cũ, thao tác nào cũng bị chối.
    if (at)
      run(async () => {
        const res = await moveItem(id, at.dayId, at.index, trip.version);
        if (!res.ok && res.stale) {
          dnd.resetFromProps();
          router.refresh();
          // Báo NHẸ, không phải toast đỏ: người dùng không làm gì sai, chỉ là
          // có người khác nhanh tay hơn. Trả `ok` để `run` khỏi báo lỗi lần nữa.
          toast(res.error);
          return { ok: true };
        }
        return res;
      });
  }

  const activeItem = dnd.activeId ? dnd.byId.get(dnd.activeId) : null;

  return (
    <DndContext
      // id CỐ ĐỊNH, bắt buộc: dnd-kit sinh `aria-describedby="DndDescribedBy-N"`
      // bằng một bộ đếm ở mức module (useUniqueId). Server đếm một lần, client
      // ở chế độ Strict lại chạy thân component hai lần nên đếm tới 1 — ra lệch
      // 0 vs 1 và React báo hydration mismatch. Truyền id thì nó dùng thẳng
      // chuỗi này, hai bên khớp nhau.
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
              <div className="rounded-xl border border-dashed px-3 py-6 text-center">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Chưa có mục nào chờ xếp. Bấm{" "}
                  <strong className="font-medium text-foreground">Thêm vào lịch trình</strong> ở
                  trang địa điểm, quán ăn hay chỗ ở để gom vào đây trước, xếp ngày sau.
                </p>
                {/* Chuyến tạo từ trang điểm đến thì biết đường quay về đúng nơi
                    đó — lời mời chung chung ở trên không nói được đi đâu. */}
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

            <CustomItemForm
              onAdd={(title) =>
                run(() => addItem({ kind: "custom", title }, trip.id), "Đã thêm vào danh sách chưa xếp")
              }
              pending={pending}
            />
          </>
            ),
          })}
        main={
          <>
          {/* Bốn mục render SẴN, ẩn/hiện bằng display — xem chú thích đầu component. */}
          <div className={tab === null ? undefined : "hidden"}>
            <div className="sticky top-0 z-20 -mx-4 flex items-center gap-3 border-b bg-background/90 px-4 pt-2 backdrop-blur sm:-mx-6 sm:px-6">
              <div className="min-w-0 flex-1">
                <TripDayStrip days={days} activeId={activeDay?.id ?? null} onPick={pickDay} />
              </div>
              <div className="shrink-0 pb-2">
                <TripFieldsMenu />
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
                  stale={pending}
                  dayCount={days.length}
                  allDays={days}
                  active={day.id === activeDay?.id}
                  onFocus={() => setActiveDayId(day.id)}
                  run={run}
                />
              ))}

              <Button
                variant="outline"
                onClick={() => run(() => addDay(trip.id))}
                disabled={pending}
                className="mt-2 w-full rounded-xl border-dashed"
              >
                <Plus className="size-4" aria-hidden />
                Thêm ngày {days.length + 1}
              </Button>
            </div>
          </div>

          <div className={tab === "ghi-chu" ? undefined : "hidden"}>
            <TripNotes tripId={trip.id} notes={notes} />
          </div>
          <div className={tab === "do-mang-theo" ? undefined : "hidden"}>
            <TripPacking tripId={trip.id} items={packing} people={trip.people} />
          </div>
          <div className={tab === "chi-phi" ? undefined : "hidden"}>
            <TripMoney
              tripId={trip.id}
              expenses={expenses}
              people={trip.people}
              viewerId={viewerId}
            />
          </div>
          </>
        }
        {...(tab !== null
          ? {}
          : {
              map: (
          <TripMap
            key={activeDay?.id ?? "empty"}
            dayLabel={activeDay ? `Ngày ${activeDay.index + 1}` : ""}
            ghosts={backlog
              .filter((i) => i.lat != null && i.lng != null)
              .map((i) => ({ id: i.id, name: i.name, lat: i.lat as number, lng: i.lng as number }))}
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
              ),
            })}
      />

      {/* Bản nổi theo con trỏ — không có nó thì mục đang kéo biến mất khỏi
          danh sách và người dùng mất dấu thứ mình đang cầm. */}
      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2 shadow-lg shadow-black/10">
            <Thumb item={activeItem} size="sm" />
            <span className="max-w-[16rem] truncate text-sm font-medium">
              {activeItem.name}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// ── Chưa xếp ngày: vùng THẢ + danh sách kéo được ────────────────────────────────

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
          "-mx-2 min-h-[3rem] rounded-xl px-2 transition-colors",
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
        "group flex items-center gap-2 border-b border-border/60 py-2.5 last:border-b-0",
        isDragging && "opacity-40",
      )}
    >
      {/* Ảnh là tay cầm phụ (chỉ listeners) — tín hiệu nhìn thấy được là grip. */}
      <span
        {...listeners}
        className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
      >
        <Thumb item={item} size="sm" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-snug">{item.name}</p>
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
            className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Xếp vào</DropdownMenuLabel>
          {days.map((d) => (
            <DropdownMenuItem
              key={d.id}
              onSelect={() =>
                run(
                  () => moveItem(item.id, d.id, d.items.length),
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
            <Trash2 className="size-4" aria-hidden />
            Bỏ khỏi lịch trình
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

// ── Một ngày ─────────────────────────────────────────────────────────────
// Ngày ngăn nhau bằng hairline + khoảng trống rộng; ngày đang chọn có vạch CAM
// mảnh bên trái. Danh sách mục là một vùng THẢ, kể cả khi rỗng.

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
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dayKey(day.id) });

  return (
    <section
      id={`day-${day.id}`}
      onFocusCapture={onFocus}
      onMouseDown={onFocus}
      className={cn(
        "group/day relative scroll-mt-28 border-t border-border/60 py-9 first:border-t-0 first:pt-1 lg:scroll-mt-24",
        // Ngày mà BẢN ĐỒ đang vẽ. Một vạch NGẮN ngang tầm tiêu đề, nằm trong lề
        // trái — KHÔNG phải viền chạy hết chiều cao khối như bản trước. Vạch
        // full-height là mảng màu đậm nhất màn hình trong khi nó chỉ nhắc lại
        // điều dải chọn ngày (dính trên đầu, luôn thấy) đã nói bằng chữ cam +
        // gạch chân; tệ hơn, nó dán sát mép cột trái nên đọc ra như đường viền
        // của sidebar chứ không phải dấu của ngày.
        active &&
          "before:absolute before:-left-3 before:top-9 before:h-7 before:w-1 before:rounded-full before:bg-warm first:before:top-1 sm:before:-left-5",
      )}
    >
      <DayHeading
        index={day.index}
        title={day.title}
        // Tên ngày & ghi chú ngày CHỈ có ở lịch trình mẫu: đó là giọng biên tập
        // ("Về tới biển", "Bình minh đồi cát"), thứ làm trang mẫu đọc ra như một
        // bài hướng dẫn thay vì bảng dữ liệu. Người tự soạn gần như không bao
        // giờ đặt tên cho ngày — để ô trống ở đó là mỗi ngày cõng ~60px không
        // khí (ẩn bằng `opacity` KHÔNG gỡ khỏi bố cục).
        titleNode={
          isTemplate ? (
            // Vẫn phải là <h2>: bản chỉ-đọc dùng h2 cho tên ngày.
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
        // `span` để trống: giờ bắt đầu–kết thúc gộp vào chính ô chọn bên dưới.
        // Bản trước hiện "14:00 – 19:51" ngay cạnh ô chọn đang để "14:00" —
        // cùng một con số xuất hiện hai lần, một chỗ sửa được một chỗ không,
        // nhìn không ra là hai thứ hay một thứ.
        span={null}
        right={
          <div className="flex items-center gap-1">
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Sunrise className="size-4 shrink-0" aria-hidden />
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
                    className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <MoreHorizontal className="size-4" aria-hidden />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() =>
                      run(() => removeDay(day.id), "Đã xoá ngày — các mục về lại mục Chưa xếp ngày")
                    }
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Xoá ngày này
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        }
      />

      {isTemplate && (
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

      {day.warnings.map((w) => (
        <Warning key={w.code} warning={w} />
      ))}

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <ol
          ref={setNodeRef}
          className={cn(
            "-mx-2 mt-6 min-h-[4rem] rounded-xl px-2 transition-colors",
            isOver && "bg-primary/5 ring-1 ring-primary/20",
          )}
        >
          {itemIds.length === 0 ? (
            <li className="py-4 text-sm text-muted-foreground">
              Kéo một mục từ cột Chưa xếp ngày sang đây.
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
                      <ItemActions item={item} day={day} allDays={allDays} run={run} />
                    }
                  />
                  {fields.leg && i < itemIds.length - 1 && <RailLeg item={item} />}
                </Fragment>
              );
            })
          )}
        </ol>
      </SortableContext>
    </section>
  );
}

// Tay cầm kéo NHÌN THẤY ĐƯỢC.
//
// Bản trước chỉ lấy nút tròn đánh số làm tay cầm, không có dấu hiệu gì: trên
// máy tính chỉ đổi con trỏ khi rê trúng, còn trên cảm ứng thì KHÔNG có tín hiệu
// nào — khách không thể biết là kéo được. Tối giản đến mức giấu mất tính năng
// thì không phải tối giản.
//
// Hiện theo đúng luật đã dùng cho hàng nút thao tác: rê chuột / tab tới mới
// hiện, còn máy cảm ứng (`pointer: coarse`) thì luôn hiện.
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
      className="grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 active:cursor-grabbing [@media(pointer:coarse)]:opacity-100"
    >
      <GripVertical className="size-4" aria-hidden />
    </button>
  );
}

/** RailItem + khả năng kéo. */
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
      // Nút tròn là tay cầm PHỤ (chỉ listeners — attributes nằm ở grip nên bàn
      // phím chỉ có một tab stop).
      handleProps={listeners}
    />
  );
}

// ── Thao tác trên một mục ────────────────────────────────────────────────
// Chỉ HIỆN KHI RÊ CHUỘT hoặc tab tới (`group-hover` / `group-focus-within` của
// RailItem). Đây là cùng bài học đã ghi ở thẻ lưu trú: một hàng nút LUÔN hiện
// trên mỗi dòng thì với chuyến 8 mục là 24 nút xám nằm chờ, đọc ra thành nhiễu
// chứ không thành công cụ. Máy cảm ứng không có hover nên vẫn hiện — dò bằng
// `pointer: coarse`, đúng cách đã dùng ở thẻ lưu trú.

function ItemActions({
  item,
  day,
  allDays,
  run,
}: {
  item: ItemView;
  day: DayView;
  allDays: DayView[];
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, done?: string) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Tuỳ chọn cho ${item.name}`}
            className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Hàng preset "Ở lại" đã chuyển ra StayPicker — đặt ngay trên con số
              đang hiển thị, nơi người dùng thật sự đi tìm nó. */}
          <DropdownMenuLabel>Chuyển sang</DropdownMenuLabel>
          {allDays
            .filter((d) => d.id !== day.id)
            .map((d) => (
              <DropdownMenuItem
                key={d.id}
                onSelect={() =>
                  run(
                    () => moveItem(item.id, d.id, d.items.length),
                    `Đã chuyển sang Ngày ${d.index + 1}`,
                  )
                }
              >
                Ngày {d.index + 1}
              </DropdownMenuItem>
            ))}
          <DropdownMenuItem
            onSelect={() => run(() => moveItem(item.id, null, 0), "Đã đưa về mục Chưa xếp ngày")}
          >
            Chưa xếp ngày
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => run(() => removeItem(item.id), "Đã bỏ khỏi lịch trình")}
          >
            <Trash2 className="size-4" aria-hidden />
            Bỏ khỏi lịch trình
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ── Thời gian ở lại ─────────────────────────────────────────────────────
// Đặt NGAY TRÊN con số đang hiển thị ("🕐 30 phút"), không chôn trong menu "…".
// Bản trước để hàng preset trong menu đó: không ai tìm ra, và cũng KHÔNG có
// cách nhập một số bất kỳ — chỉ chọn được trong chín mốc dựng sẵn.
//
// Popover có cả hai: preset cho nhanh, ô nhập phút cho những trường hợp preset
// không với tới (75 phút, 20 phút…). Và một lối về mặc định, vì mặc định là con
// số suy theo loại chứ không phải người dùng đặt (xem DEFAULT_STAY_MIN).
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
          <Clock className="size-3.5" aria-hidden />
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
                "rounded-full px-2.5 py-1 text-xs tabular-nums transition-colors",
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
            className="h-9 rounded-lg tabular-nums"
          />
          {/* h-9 cho cả hai: Button size="sm" là h-8, đứng cạnh Input h-9 là lệch. */}
          <Button type="submit" variant="outline" className="h-9 shrink-0 rounded-lg px-3">
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

// ── Sửa TẠI CHỖ ─────────────────────────────────────────────────────────
// Dùng cho ghi chú của mục, tên ngày và ghi chú ngày.
//
// Lúc nghỉ chỉ là CHỮ, không phải ô nhập: cả cột đã dày chữ rồi, mà một cột
// toàn khung input thì đọc ra là biểu mẫu khai báo chứ không phải một lịch
// trình. Bấm vào mới thành ô. Khi chưa có nội dung thì mời bằng một dòng mờ,
// hiện theo đúng luật của hàng nút thao tác: rê chuột / tab tới mới hiện, máy
// cảm ứng thì luôn hiện.
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
        // Enter lưu ở ô một dòng; ô nhiều dòng cần Enter để xuống dòng.
        if (e.key === "Enter" && !multiline) (e.target as HTMLElement).blur();
      },
    };
    return multiline ? (
      <Textarea {...shared} rows={2} className="mt-1.5 min-h-0 resize-none text-xs" />
    ) : (
      <Input {...shared} className="mt-1 h-9 rounded-lg" />
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


function CustomItemForm({
  onAdd,
  pending,
}: {
  onAdd: (title: string) => void;
  pending: boolean;
}) {
  const [title, setTitle] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = title.trim();
        if (!t) return;
        onAdd(t);
        setTitle("");
      }}
      className="mt-3 flex gap-2"
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Tự thêm: chuyến bay, nhà người quen…"
        aria-label="Tên mục tự thêm"
        className="h-9 rounded-lg"
      />
      {/* KHÔNG dùng size="sm": nút đó cao h-8 còn Input là h-9, đứng cạnh nhau
          là lệch 4px. Ép cùng h-9 và cùng bo góc rounded-lg. */}
      <Button
        type="submit"
        variant="outline"
        disabled={pending || !title.trim()}
        className="h-9 shrink-0 rounded-lg px-3"
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
        Thêm
      </Button>
    </form>
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
