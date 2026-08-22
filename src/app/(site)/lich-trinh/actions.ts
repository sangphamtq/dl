"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { coverUrl } from "@/lib/place-image";
import type { TripPackScope } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "@/app/(site)/blog/actions";

/**
 * Như `ActionResult` nhưng có thêm `stale`: thao tác bị từ chối vì lịch trình đã
 * đổi kể từ lúc client đọc. KHÔNG phải lỗi của người dùng — client chỉ cần làm
 * mới rồi thao tác lại. Khai riêng vì `ActionResult` dùng chung với blog.
 */
export type TripActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string; stale?: boolean };

// Server actions của Lịch trình. Mọi mutation đều kiểm CHỦ SỞ HỮU — lịch trình
// là dữ liệu cá nhân, không có khái niệm "ai cũng sửa được".
// Thiết kế: docs/lich-trinh.md.

const ACTIVE_TRIP_COOKIE = "halivivu_trip";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 ngày

const MAX_TITLE = 120;
const MAX_NOTE = 500;
// Ghi chú của cả chuyến dài hơn note của một mục: người ta dán vào đó cả một xác
// nhận đặt phòng. Hằng RIÊNG, đừng nới MAX_NOTE — nó đang giữ cho note của mục
// ngắn đúng một dòng rưỡi trên thẻ.
const MAX_TRIP_NOTE = 2000;
const MAX_DAYS = 30;

// Đích của một mục — đúng 1 loại (exclusive arc ở tầng dữ liệu).
// KHÔNG có "place": điểm đến là nơi CHỨA các mục, không phải một mục. Trang
// điểm đến dùng nút "Lên lịch trình đi X" (startTripForPlace) thay cho nút này.
export type ItemTarget =
  | { kind: "spot" | "eatery" | "accommodation" | "activity"; id: string }
  | { kind: "custom"; title: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Bạn cần đăng nhập.");
  return id;
}

// ── Quyền ────────────────────────────────────────────────────────────────
// HAI mức, cố ý tách bạch (docs/lich-trinh-cong-tac.md §4a):
//   · editableTrip  — chủ chuyến HOẶC người được mời cùng sửa. Dùng cho mọi
//                     thao tác lên NỘI DUNG (ngày, mục, ghi chú).
//   · ownedTrip     — CHỈ chủ chuyến. Dùng cho: xoá chuyến, bật/tắt chia sẻ,
//                     quản lý thành viên. Hạ mấy cái này xuống cho editor là
//                     người được mời xoá được chuyến của người mời.

// "Chuyến của tôi" = mình sở hữu HOẶC được mời cùng sửa. Dùng CHUNG cho mọi
// truy vấn danh sách — sót một chỗ là thành viên không thấy chuyến được mời.
function myTripsWhere(userId: string): Prisma.TripWhereInput {
  return {
    isTemplate: false,
    OR: [{ ownerId: userId }, { members: { some: { userId } } }],
  };
}

/** Chủ chuyến hoặc người được mời cùng sửa. */
async function editableTrip(tripId: string, expectedVersion?: number) {
  const userId = await requireUserId();
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      ownerId: true,
      isTemplate: true,
      slug: true,
      version: true,
      members: { where: { userId }, select: { role: true } },
    },
  });
  if (!trip) throw new Error("Không tìm thấy lịch trình.");
  if (trip.ownerId !== userId && trip.members.length === 0)
    throw new Error("Bạn không có quyền sửa lịch trình này.");

  // Khoá lạc quan: client gửi số nó đang thấy. Lệch ⇒ có người vừa sửa, và mọi
  // thao tác THEO VỊ TRÍ (kéo–thả) của client này đang tính trên bàn đã cũ.
  if (expectedVersion != null && expectedVersion !== trip.version)
    throw new StaleError();

  return { trip, userId };
}

/** CHỈ chủ chuyến. */
async function ownedTrip(tripId: string) {
  const userId = await requireUserId();
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true, ownerId: true, isTemplate: true, slug: true, version: true },
  });
  if (!trip) throw new Error("Không tìm thấy lịch trình.");
  if (trip.ownerId !== userId) throw new Error("Lịch trình này không phải của bạn.");
  return { trip, userId };
}

/** Lệch phiên bản — client phải làm mới rồi thử lại, không phải lỗi của họ. */
class StaleError extends Error {
  constructor() {
    super("Có người vừa sửa lịch trình này. Đã cập nhật lại.");
  }
}

function fail(e: unknown): { ok: false; error: string; stale?: boolean } {
  const msg = (e as Error).message;
  return e instanceof StaleError ? { ok: false, error: msg, stale: true } : { ok: false, error: msg };
}

/** Tăng version — gọi trong MỌI mutation chạm nội dung chuyến. */
function bump(tripId: string) {
  return prisma.trip.update({
    where: { id: tripId },
    data: { version: { increment: 1 } },
    select: { version: true },
  });
}

// Cả bốn mục render sẵn trong MỘT trang (TripWorkspace) từ cả hai route, nên
// mutation của mục nào cũng phải revalidate đủ bốn đường dẫn — người dùng có
// thể đã deep-load bất kỳ mục nào rồi chuyển qua lại bằng pushState.
function refreshTripPaths(tripId: string) {
  for (const seg of ["", "/ghi-chu", "/do-mang-theo", "/chi-phi"])
    revalidatePath(`/lich-trinh/cua-toi/${tripId}${seg}`);
}

function refresh(tripId: string, slug?: string | null) {
  revalidatePath("/lich-trinh/cua-toi");
  refreshTripPaths(tripId);
  if (slug) revalidatePath(`/lich-trinh/${slug}`);
}

function clip(s: string, max: number): string {
  return s.trim().slice(0, max);
}

// ── Chuyến ĐANG LÊN LỊCH TRÌNH (cookie) ─────────────────────────────────
// Một người có thể có nhiều chuyến, nhưng tại một thời điểm chỉ đang lên lịch
// cho MỘT chuyến. Đó là đích mặc định của nút "Thêm vào lịch trình" ở mọi trang
// chi tiết — nhờ vậy bấm một cái là xong, không phải chọn chuyến mỗi lần
// (docs/lich-trinh.md §4).
//
// Cố ý KHÔNG gọi là "chuyến đang mở": "Đang mở" trong sản phẩm này đã mang nghĩa
// "quán còn mở cửa" (xem lib/opening-hours + màn hình Ẩm thực).

export async function getPlanningTripId(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACTIVE_TRIP_COOKIE)?.value ?? null;
}

export async function setPlanningTrip(tripId: string): Promise<ActionResult> {
  try {
    await editableTrip(tripId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  await rememberPlanning(tripId);
  revalidatePath("/lich-trinh/cua-toi");
  return { ok: true };
}

/**
 * Mở trình soạn một chuyến ⇒ coi như đang lên lịch cho chuyến đó.
 * Tách khỏi `setPlanningTrip` vì cố ý KHÔNG revalidate: đây là hiệu ứng phụ của
 * việc mở trang, revalidate ở đây sẽ làm trang tự làm mới ngay sau khi mở.
 */
export async function markTripPlanning(tripId: string): Promise<ActionResult> {
  try {
    await editableTrip(tripId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  await rememberPlanning(tripId);
  return { ok: true };
}

/** Chuyến đang lên lịch, hoặc chuyến sửa gần nhất, hoặc tạo mới. Luôn trả về một id. */
async function resolveTargetTrip(userId: string): Promise<string> {
  const planningId = await getPlanningTripId();
  if (planningId) {
    const owned = await prisma.trip.findFirst({
      where: { id: planningId, ...myTripsWhere(userId) },
      select: { id: true },
    });
    if (owned) return owned.id;
  }

  const latest = await prisma.trip.findFirst({
    where: myTripsWhere(userId),
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (latest) {
    await rememberPlanning(latest.id);
    return latest.id;
  }

  const created = await createTripRow(userId, "Chuyến đi của tôi");
  await rememberPlanning(created);
  return created;
}

async function rememberPlanning(tripId: string) {
  const store = await cookies();
  store.set(ACTIVE_TRIP_COOKIE, tripId, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

// ── Chuyến ───────────────────────────────────────────────────────────────

async function createTripRow(ownerId: string, title: string): Promise<string> {
  const trip = await prisma.trip.create({
    data: {
      ownerId,
      title,
      // Chuyến mới luôn có sẵn Ngày 1 — trang trống hoàn toàn thì không biết bắt đầu từ đâu.
      days: { create: [{ index: 0 }] },
    },
    select: { id: true },
  });
  return trip.id;
}

export async function createTrip(title?: string): Promise<ActionResult<{ id: string }>> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập để tạo lịch trình." };
  }
  const id = await createTripRow(userId, clip(title || "", MAX_TITLE) || "Chuyến đi của tôi");
  await rememberPlanning(id);
  revalidatePath("/lich-trinh/cua-toi");
  return { ok: true, data: { id } };
}

export async function updateTrip(
  tripId: string,
  patch: {
    title?: string;
    summary?: string | null;
    startDate?: string | null; // "YYYY-MM-DD" | "" = xoá ngày
    partySize?: number | null;
  },
): Promise<ActionResult> {
  let slug: string | null | undefined;
  try {
    ({ trip: { slug } } = await editableTrip(tripId));
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const data: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const title = clip(patch.title, MAX_TITLE);
    if (!title) return { ok: false, error: "Tên lịch trình không được để trống." };
    data.title = title;
  }
  if (patch.summary !== undefined)
    data.summary = patch.summary ? clip(patch.summary, MAX_NOTE) : null;
  if (patch.startDate !== undefined) {
    if (!patch.startDate) data.startDate = null;
    else {
      const d = new Date(`${patch.startDate}T00:00:00Z`);
      if (Number.isNaN(d.getTime())) return { ok: false, error: "Ngày không hợp lệ." };
      data.startDate = d;
    }
  }
  if (patch.partySize !== undefined)
    data.partySize =
      patch.partySize == null ? null : Math.min(99, Math.max(1, Math.round(patch.partySize)));

  await prisma.trip.update({
    where: { id: tripId },
    data: { ...data, version: { increment: 1 } },
  });
  refresh(tripId, slug);
  return { ok: true };
}

export async function deleteTrip(tripId: string): Promise<ActionResult> {
  try {
    await ownedTrip(tripId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  await prisma.trip.delete({ where: { id: tripId } });

  const store = await cookies();
  if (store.get(ACTIVE_TRIP_COOKIE)?.value === tripId) store.delete(ACTIVE_TRIP_COOKIE);

  revalidatePath("/lich-trinh/cua-toi");
  return { ok: true };
}

// ── Ngày ─────────────────────────────────────────────────────────────────

export async function addDay(tripId: string): Promise<ActionResult> {
  try {
    await editableTrip(tripId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const count = await prisma.tripDay.count({ where: { tripId } });
  if (count >= MAX_DAYS) return { ok: false, error: `Tối đa ${MAX_DAYS} ngày một chuyến.` };

  await prisma.tripDay.create({ data: { tripId, index: count } });
  await bump(tripId);
  refresh(tripId);
  return { ok: true };
}

export async function removeDay(dayId: string): Promise<ActionResult> {
  const day = await prisma.tripDay.findUnique({
    where: { id: dayId },
    select: { id: true, tripId: true, index: true },
  });
  if (!day) return { ok: false, error: "Không tìm thấy ngày." };
  try {
    await editableTrip(day.tripId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  await prisma.$transaction(async (tx) => {
    // Mục trong ngày bị xoá KHÔNG mất — về mục Chưa xếp ngày (dayId = null qua SetNull).
    await tx.tripItem.updateMany({ where: { dayId }, data: { dayId: null } });
    await tx.tripDay.delete({ where: { id: dayId } });
    // Dồn lại index cho liền mạch.
    const rest = await tx.tripDay.findMany({
      where: { tripId: day.tripId },
      orderBy: { index: "asc" },
      select: { id: true },
    });
    for (let i = 0; i < rest.length; i++) {
      await tx.tripDay.update({ where: { id: rest[i].id }, data: { index: i } });
    }
  });

  await bump(day.tripId);
  refresh(day.tripId);
  return { ok: true };
}

export async function updateDay(
  dayId: string,
  patch: { startMin?: number; title?: string | null; note?: string | null },
): Promise<ActionResult> {
  const day = await prisma.tripDay.findUnique({
    where: { id: dayId },
    select: { tripId: true },
  });
  if (!day) return { ok: false, error: "Không tìm thấy ngày." };
  try {
    await editableTrip(day.tripId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const data: Record<string, unknown> = {};
  if (patch.startMin !== undefined)
    data.startMin = Math.min(1439, Math.max(0, Math.round(patch.startMin)));
  if (patch.title !== undefined) data.title = patch.title ? clip(patch.title, MAX_TITLE) : null;
  if (patch.note !== undefined) data.note = patch.note ? clip(patch.note, MAX_NOTE) : null;

  await prisma.tripDay.update({ where: { id: dayId }, data });
  await bump(day.tripId);
  refresh(day.tripId);
  return { ok: true };
}

// ── Mục ──────────────────────────────────────────────────────────────────

function targetData(target: ItemTarget): Record<string, unknown> {
  switch (target.kind) {
    case "spot": return { spotId: target.id };
    case "eatery": return { eateryId: target.id };
    case "accommodation": return { accommodationId: target.id };
    case "activity": return { activityId: target.id };
    case "custom": return { customTitle: clip(target.title, MAX_TITLE) };
  }
}

/**
 * Thêm một mục vào danh sách chưa xếp ngày. `tripId` bỏ trống → dùng chuyến đang lên lịch (tạo mới nếu
 * chưa có chuyến nào) — nhờ vậy nút ở trang chi tiết chỉ cần một cú bấm.
 */
export async function addItem(
  target: ItemTarget,
  tripId?: string,
): Promise<
  ActionResult<{
    tripId: string;
    tripTitle: string;
    itemId: string | null; // null khi mục đã có sẵn trong chuyến
    duplicate: boolean;
    tripCount: number; // >1 thì UI mới mời "Đổi chuyến"
  }>
> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập để lưu vào lịch trình." };
  }

  let targetTripId: string;
  if (tripId) {
    try {
      await editableTrip(tripId);
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
    targetTripId = tripId;
  } else {
    targetTripId = await resolveTargetTrip(userId);
  }

  const data = targetData(target);

  // Đã có trong chuyến rồi thì báo, đừng tạo bản trùng.
  if (target.kind !== "custom") {
    const existing = await prisma.tripItem.findFirst({
      where: { tripId: targetTripId, ...data },
      select: { id: true },
    });
    if (existing) {
      const [trip, tripCount] = await Promise.all([
        prisma.trip.findUnique({ where: { id: targetTripId }, select: { title: true } }),
        prisma.trip.count({ where: myTripsWhere(userId) }),
      ]);
      return {
        ok: true,
        data: {
          tripId: targetTripId,
          tripTitle: trip?.title ?? "",
          itemId: null,
          duplicate: true,
          tripCount,
        },
      };
    }
  }

  const last = await prisma.tripItem.findFirst({
    where: { tripId: targetTripId, dayId: null },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const [item, trip, tripCount] = await Promise.all([
    prisma.tripItem.create({
      data: { tripId: targetTripId, order: (last?.order ?? -1) + 1, ...data },
      select: { id: true },
    }),
    prisma.trip.update({
      where: { id: targetTripId },
      data: { updatedAt: new Date() },
      select: { title: true },
    }),
    prisma.trip.count({ where: myTripsWhere(userId) }),
  ]);

  refresh(targetTripId);
  return {
    ok: true,
    data: {
      tripId: targetTripId,
      tripTitle: trip.title,
      itemId: item.id,
      duplicate: false,
      tripCount,
    },
  };
}

/**
 * Chuyển một mục sang CHUYẾN khác (khác `moveItem` — cái đó đổi ngày trong cùng
 * chuyến). Dùng cho nút "Đổi chuyến" ngay sau khi thêm: bấm nhầm chuyến là
 * chuyện thường, mà bắt vào tận trình soạn để sửa thì quá phiền.
 * Chuyến đích cũng thành chuyến đang lên lịch — lần thêm sau đi thẳng vào đó.
 */
export async function moveItemToTrip(
  itemId: string,
  tripId: string,
  expectedVersion?: number,
): Promise<TripActionResult<{ tripTitle: string }>> {
  const item = await prisma.tripItem.findUnique({
    where: { id: itemId },
    select: { id: true, tripId: true },
  });
  if (!item) return { ok: false, error: "Không tìm thấy mục." };

  let title: string;
  try {
    // Kiểm quyền trên CẢ HAI chuyến — mục rời khỏi chuyến này và rơi vào chuyến kia.
    await editableTrip(item.tripId, expectedVersion); // chuyến nguồn
    const { trip } = await editableTrip(tripId); // chuyến đích
    title = (await prisma.trip.findUnique({ where: { id: trip.id }, select: { title: true } }))!.title;
  } catch (e) {
    return fail(e);
  }

  const last = await prisma.tripItem.findFirst({
    where: { tripId, dayId: null },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await prisma.tripItem.update({
    where: { id: itemId },
    // Về danh sách chưa xếp ngày của chuyến đích — ngày của chuyến cũ không có ý nghĩa ở đây.
    data: { tripId, dayId: null, order: (last?.order ?? -1) + 1 },
  });

  await Promise.all([bump(item.tripId), bump(tripId)]);
  await rememberPlanning(tripId);
  refresh(item.tripId);
  refresh(tripId);
  return { ok: true, data: { tripTitle: title } };
}

export async function removeItem(itemId: string): Promise<ActionResult> {
  const item = await prisma.tripItem.findUnique({
    where: { id: itemId },
    select: { tripId: true },
  });
  if (!item) return { ok: false, error: "Không tìm thấy mục." };
  try {
    await editableTrip(item.tripId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  await prisma.tripItem.delete({ where: { id: itemId } });
  await bump(item.tripId);
  refresh(item.tripId);
  return { ok: true };
}

export async function updateItem(
  itemId: string,
  patch: { stayMin?: number | null; note?: string | null },
): Promise<ActionResult> {
  const item = await prisma.tripItem.findUnique({
    where: { id: itemId },
    select: { tripId: true },
  });
  if (!item) return { ok: false, error: "Không tìm thấy mục." };
  try {
    await editableTrip(item.tripId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const data: Record<string, unknown> = {};
  if (patch.stayMin !== undefined)
    data.stayMin =
      patch.stayMin == null ? null : Math.min(24 * 60, Math.max(0, Math.round(patch.stayMin)));
  if (patch.note !== undefined) data.note = patch.note ? clip(patch.note, MAX_NOTE) : null;

  await prisma.tripItem.update({ where: { id: itemId }, data });
  await bump(item.tripId);
  refresh(item.tripId);
  return { ok: true };
}

/**
 * Chuyển một mục sang ngày khác (hoặc về danh sách chưa xếp khi `dayId` = null) và đặt vào
 * vị trí `toIndex`. Đánh số lại cả hai bên để `order` luôn liền mạch 0..n-1.
 */
/**
 * Đổi chỗ / chuyển ngày cho một mục.
 *
 * `expectedVersion` là phiên bản chuyến mà CLIENT đang thấy. Đây là một trong
 * hai thao tác THEO VỊ TRÍ (cùng `moveItemToTrip`) — "đặt ở chỉ số 2" chỉ có
 * nghĩa so với một bàn cụ thể, nên nếu người khác vừa sửa thì chỉ số đó trỏ vào
 * chỗ khác và thao tác âm thầm sai. Các action còn lại khoá theo id của thực thể
 * nên không cần: ghi đè một trường cụ thể thì "ai ghi sau thắng" là chấp nhận được.
 */
export async function moveItem(
  itemId: string,
  dayId: string | null,
  toIndex: number,
  expectedVersion?: number,
): Promise<TripActionResult> {
  const item = await prisma.tripItem.findUnique({
    where: { id: itemId },
    select: { id: true, tripId: true, dayId: true },
  });
  if (!item) return { ok: false, error: "Không tìm thấy mục." };
  try {
    await editableTrip(item.tripId, expectedVersion);
  } catch (e) {
    return fail(e);
  }

  if (dayId) {
    const day = await prisma.tripDay.findFirst({
      where: { id: dayId, tripId: item.tripId },
      select: { id: true },
    });
    if (!day) return { ok: false, error: "Ngày không thuộc lịch trình này." };
  }

  await prisma.$transaction(async (tx) => {
    const siblings = await tx.tripItem.findMany({
      where: { tripId: item.tripId, dayId },
      orderBy: { order: "asc" },
      select: { id: true },
    });

    const ids = siblings.map((s) => s.id).filter((id) => id !== itemId);
    const at = Math.min(Math.max(0, Math.round(toIndex)), ids.length);
    ids.splice(at, 0, itemId);

    // MỘT câu lệnh đánh số lại cả vùng, không phải một vòng lặp `update`.
    // Bản trước chạy `tx.tripItem.update` cho TỪNG mục: một ngày 8 mục là 8
    // lượt đi–về CSDL nối đuôi nhau bên trong transaction, cộng thêm chừng ấy
    // nữa khi phải dồn lại ngày nguồn. Ở máy dev (Postgres localhost, ping
    // 1ms) đó là ~24ms nên không ai để ý; trên CSDL đặt xa thì mỗi lượt là
    // một vòng mạng, và cùng phép tính đó thành gần nửa giây.
    // `dayId` set cho cả vùng cũng không sao: mọi mục trong danh sách này vốn
    // đã thuộc đúng ngày đó, trừ mục vừa chuyển tới.
    await tx.$executeRaw`
      UPDATE "TripItem" AS t
      SET "order" = v.ord, "dayId" = ${dayId}::text
      FROM (VALUES ${Prisma.join(
        ids.map((id, i) => Prisma.sql`(${id}::text, ${i}::int)`),
      )}) AS v(id, ord)
      WHERE t.id = v.id`;

    // Dồn lại danh sách nguồn nếu mục vừa rời khỏi đó.
    if (item.dayId !== dayId) {
      const source = await tx.tripItem.findMany({
        where: { tripId: item.tripId, dayId: item.dayId },
        orderBy: { order: "asc" },
        select: { id: true },
      });
      if (source.length > 0) {
        await tx.$executeRaw`
          UPDATE "TripItem" AS t
          SET "order" = v.ord
          FROM (VALUES ${Prisma.join(
            source.map((row, i) => Prisma.sql`(${row.id}::text, ${i}::int)`),
          )}) AS v(id, ord)
          WHERE t.id = v.id`;
      }
    }

    await tx.trip.update({
      where: { id: item.tripId },
      data: { version: { increment: 1 } },
    });
  });

  refresh(item.tripId);
  return { ok: true };
}

// ── Chia sẻ ──────────────────────────────────────────────────────────────

// Chuỗi ngẫu nhiên khó đoán cho link chia sẻ (không dùng cuid để id nội bộ
// không lộ ra ngoài, và để đổi link được khi cần thu hồi).
function makeShareId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export async function setSharing(
  tripId: string,
  on: boolean,
): Promise<ActionResult<{ shareId: string | null }>> {
  try {
    await ownedTrip(tripId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  if (!on) {
    await prisma.trip.update({
      where: { id: tripId },
      data: { visibility: "private" },
    });
    refresh(tripId);
    return { ok: true, data: { shareId: null } };
  }

  const current = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { shareId: true },
  });
  const shareId = current?.shareId ?? makeShareId();

  await prisma.trip.update({
    where: { id: tripId },
    data: { visibility: "unlisted", shareId },
  });
  refresh(tripId);
  return { ok: true, data: { shareId } };
}

// ── Nhân bản (dùng lịch trình mẫu / bản được chia sẻ) ─────────────────────

export async function cloneTrip(
  sourceId: string,
): Promise<ActionResult<{ id: string }>> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập để lưu lịch trình này." };
  }

  const source = await prisma.trip.findUnique({
    where: { id: sourceId },
    select: {
      id: true, title: true, summary: true, ownerId: true, isTemplate: true, visibility: true,
      members: { where: { userId }, select: { id: true } },
      days: { orderBy: { index: "asc" }, select: { id: true, index: true, startMin: true, title: true, note: true } },
      notes: { orderBy: { createdAt: "asc" }, select: { body: true, isPinned: true } },
      packing: { orderBy: { createdAt: "asc" }, select: { name: true } },
      items: {
        orderBy: { order: "asc" },
        select: {
          dayId: true, order: true, stayMin: true, note: true,
          spotId: true, eateryId: true, accommodationId: true, activityId: true,
          customTitle: true, customLat: true, customLng: true,
        },
      },
    },
  });
  if (!source) return { ok: false, error: "Không tìm thấy lịch trình." };

  // Chỉ nhân bản được thứ mình được phép xem: mẫu đã xuất bản, bản chia sẻ, hoặc chuyến của chính mình.
  const readable =
    source.isTemplate ||
    source.visibility === "unlisted" ||
    source.ownerId === userId ||
    source.members.length > 0;
  if (!readable) return { ok: false, error: "Lịch trình này không được chia sẻ." };

  const created = await prisma.$transaction(async (tx) => {
    const trip = await tx.trip.create({
      data: {
        ownerId: userId,
        title: source.isTemplate ? source.title : `${source.title} (bản sao)`,
        summary: source.summary,
        // Bản sao KHÔNG kế thừa: ngày khởi hành, cờ template, slug, link chia sẻ.
      },
      select: { id: true },
    });

    const dayIdMap = new Map<string, string>();
    for (const d of source.days) {
      const day = await tx.tripDay.create({
        data: {
          tripId: trip.id,
          index: d.index,
          startMin: d.startMin,
          // KHÔNG chép `title`/`note` của ngày: đó là giọng biên tập của lịch
          // trình mẫu, mà chuyến cá nhân KHÔNG có ô sửa hai trường này (xem
          // DayBlock). Chép sang thì thành chữ người dùng không thấy, không sửa
          // được, không xoá được — nhưng vẫn hiện ra khi họ chia sẻ chuyến. Tệ
          // hơn nữa là nó mô tả một ngày mà họ vừa xếp lại hoàn toàn.
        },
        select: { id: true },
      });
      dayIdMap.set(d.id, day.id);
    }

    for (const it of source.items) {
      await tx.tripItem.create({
        data: {
          tripId: trip.id,
          dayId: it.dayId ? (dayIdMap.get(it.dayId) ?? null) : null,
          order: it.order, stayMin: it.stayMin, note: it.note,
          spotId: it.spotId, eateryId: it.eateryId,
          accommodationId: it.accommodationId, activityId: it.activityId,
          customTitle: it.customTitle, customLat: it.customLat, customLng: it.customLng,
        },
      });
    }
    // Ghi chú thì CHÉP — khác `title`/`note` của ngày ở trên. Lý do bên đó là
    // "chữ người dùng không thấy, không sửa, không xoá được"; ở đây ngược lại,
    // mục Ghi chú cho họ đủ cả ba. Mẹo thực địa của một mẫu ("xe khách cuối tuần
    // hết vé sớm") chính là thứ đáng mang theo. Tác giả để trống: người chép
    // không viết ra nó, mà tác giả gốc thì không có mặt trong chuyến mới.
    for (const n of source.notes) {
      await tx.tripNote.create({
        data: { tripId: trip.id, body: n.body, isPinned: n.isPinned },
      });
    }
    // Danh sách đồ cũng chép — mẫu Tà Xùa ghi "áo ấm, giày bám" là tri thức thực
    // địa, đúng thứ đáng thừa kế. Nhưng KHÔNG chép `assigneeId` (người trong
    // chuyến mới khác hẳn) và KHÔNG chép `isDone` (chuyến mới thì chưa xếp gì).
    for (const it of source.packing) {
      await tx.tripPackItem.create({ data: { tripId: trip.id, name: it.name } });
    }
    return trip.id;
  });

  await rememberPlanning(created);
  revalidatePath("/lich-trinh/cua-toi");
  return { ok: true, data: { id: created } };
}

// ── Ghi chú của chuyến ───────────────────────────────────────────────────
//
// Ai trong chuyến cũng thêm/sửa/xoá được MỌI mẩu, kể cả của người khác. Đây là
// tính nhất quán chứ không phải dễ dãi: thành viên ĐÃ xoá được điểm dừng của
// người khác trong lịch trình, nên dựng riêng một luật chặt hơn cho ghi chú thì
// hai mục cạnh nhau hành xử khác nhau mà không giải thích được. `TripMember`
// chính là ranh giới tin cậy.
//
// KHÔNG `bump()` version: version chặn đụng độ THEO VỊ TRÍ khi kéo–thả, còn ghi
// chú thì không có vị trí nào để đụng. Bump ở đây chỉ khiến mỗi lần gõ ghi chú
// lại làm mới cả trang lịch trình.

function refreshNotes(tripId: string) {
  refreshTripPaths(tripId);
}

/** Tìm mẩu ghi chú + kiểm quyền sửa chuyến chứa nó. */
async function editableNote(noteId: string) {
  const note = await prisma.tripNote.findUnique({
    where: { id: noteId },
    select: { id: true, tripId: true },
  });
  if (!note) throw new Error("Không tìm thấy ghi chú.");
  await editableTrip(note.tripId);
  return note;
}

export async function addNote(
  tripId: string,
  rawBody: string,
): Promise<ActionResult<{ id: string }>> {
  const body = clip(rawBody.trim(), MAX_TRIP_NOTE);
  if (!body) return { ok: false, error: "Ghi chú đang trống." };
  try {
    const { userId } = await editableTrip(tripId);
    const note = await prisma.tripNote.create({
      data: { tripId, body, authorId: userId },
      select: { id: true },
    });
    refreshNotes(tripId);
    return { ok: true, data: { id: note.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function updateNote(noteId: string, rawBody: string): Promise<ActionResult> {
  const body = clip(rawBody.trim(), MAX_TRIP_NOTE);
  if (!body) return { ok: false, error: "Ghi chú đang trống." };
  try {
    const note = await editableNote(noteId);
    await prisma.tripNote.update({ where: { id: noteId }, data: { body } });
    refreshNotes(note.tripId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteNote(noteId: string): Promise<ActionResult> {
  try {
    const note = await editableNote(noteId);
    await prisma.tripNote.delete({ where: { id: noteId } });
    refreshNotes(note.tripId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setNotePinned(noteId: string, pinned: boolean): Promise<ActionResult> {
  try {
    const note = await editableNote(noteId);
    await prisma.tripNote.update({ where: { id: noteId }, data: { isPinned: pinned } });
    refreshNotes(note.tripId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ── Đồ mang theo ─────────────────────────────────────────────────────────
//
// Cùng luật quyền với ghi chú: ai trong chuyến cũng thêm/sửa/gán/xoá được mọi
// món. Không `bump()` version (không có thao tác theo vị trí nào ở đây).

function refreshPacking(tripId: string) {
  refreshTripPaths(tripId);
}

async function editablePackItem(itemId: string) {
  const item = await prisma.tripPackItem.findUnique({
    where: { id: itemId },
    select: { id: true, tripId: true },
  });
  if (!item) throw new Error("Không tìm thấy món đồ.");
  await editableTrip(item.tripId);
  return item;
}

export async function addPackItem(
  tripId: string,
  rawName: string,
  scope: TripPackScope = "group",
): Promise<ActionResult<{ id: string }>> {
  const name = clip(rawName.trim(), MAX_TITLE);
  if (!name) return { ok: false, error: "Chưa nhập tên món đồ." };
  try {
    await editableTrip(tripId);
    const item = await prisma.tripPackItem.create({
      data: { tripId, name, scope },
      select: { id: true },
    });
    refreshPacking(tripId);
    return { ok: true, data: { id: item.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function updatePackItem(
  itemId: string,
  patch: {
    name?: string;
    scope?: TripPackScope;
    isReady?: boolean;
    isPacked?: boolean;
    assigneeId?: string | null;
  },
): Promise<ActionResult> {
  try {
    const item = await editablePackItem(itemId);

    const data: {
      name?: string;
      scope?: TripPackScope;
      isReady?: boolean;
      isPacked?: boolean;
      assigneeId?: string | null;
    } = {};
    if (patch.name !== undefined) {
      const name = clip(patch.name.trim(), MAX_TITLE);
      if (!name) return { ok: false, error: "Tên món đồ đang trống." };
      data.name = name;
    }
    // Đổi sang `personal` thì bỏ luôn người nhận: đồ ai cũng phải mang thì
    // không có chuyện "Minh mang hộ".
    if (patch.scope !== undefined) {
      data.scope = patch.scope;
      if (patch.scope === "personal") data.assigneeId = null;
    }
    if (patch.isReady !== undefined) data.isReady = patch.isReady;
    if (patch.isPacked !== undefined) data.isPacked = patch.isPacked;
    if (patch.assigneeId !== undefined) {
      // Chỉ gán được cho người THỰC SỰ ở trong chuyến — nếu không thì một id bất
      // kỳ gửi lên sẽ hiện thành "ai đó" không rõ danh tính trên danh sách.
      if (patch.assigneeId) {
        const t = await prisma.trip.findUnique({
          where: { id: item.tripId },
          select: { ownerId: true, members: { where: { userId: patch.assigneeId }, select: { id: true } } },
        });
        const inTrip = t?.ownerId === patch.assigneeId || (t?.members.length ?? 0) > 0;
        if (!inTrip) return { ok: false, error: "Người này không ở trong chuyến." };
      }
      data.assigneeId = patch.assigneeId;
    }

    await prisma.tripPackItem.update({ where: { id: itemId }, data });
    refreshPacking(item.tripId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Tick/bỏ tick món ĐỒ RIÊNG — trạng thái của CHÍNH NGƯỜI ĐANG ĐĂNG NHẬP, không
 * phải của cả nhóm. Bản ghi chỉ được tạo khi có người tick lần đầu (upsert), nên
 * chuyến 5 người × 30 món không sinh 150 dòng rỗng.
 */
export async function setMyPackCheck(
  itemId: string,
  patch: { isReady?: boolean; isPacked?: boolean },
): Promise<ActionResult> {
  try {
    const item = await prisma.tripPackItem.findUnique({
      where: { id: itemId },
      select: { id: true, tripId: true, scope: true },
    });
    if (!item) return { ok: false, error: "Không tìm thấy món đồ." };
    if (item.scope !== "personal")
      return { ok: false, error: "Món này là đồ chung của nhóm." };
    const { userId } = await editableTrip(item.tripId);

    await prisma.tripPackCheck.upsert({
      where: { itemId_userId: { itemId, userId } },
      create: { itemId, userId, ...patch },
      update: patch,
    });
    refreshPacking(item.tripId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deletePackItem(itemId: string): Promise<ActionResult> {
  try {
    const item = await editablePackItem(itemId);
    await prisma.tripPackItem.delete({ where: { id: itemId } });
    refreshPacking(item.tripId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ── Chi phí ──────────────────────────────────────────────────────────────
//
// Số tiền do NGƯỜI DÙNG GÕ, không bao giờ suy ra từ danh mục — xem chú thích ở
// model `TripExpense` và docs/lich-trinh.md §9.3.

const MAX_AMOUNT = 2_000_000_000; // 2 tỉ: đủ cho mọi chuyến, chặn số gõ nhầm

function refreshMoney(tripId: string) {
  refreshTripPaths(tripId);
}

/** Lọc danh sách id chỉ giữ người THỰC SỰ ở trong chuyến. */
async function peopleInTrip(tripId: string, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const t = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { ownerId: true, members: { select: { userId: true } } },
  });
  if (!t) return [];
  const inTrip = new Set([t.ownerId, ...t.members.map((m) => m.userId)]);
  return [...new Set(ids)].filter((id) => inTrip.has(id));
}

export async function addExpense(
  tripId: string,
  input: { title: string; amount: number; paidById: string | null; shareIds: string[] },
): Promise<ActionResult<{ id: string }>> {
  const title = clip(input.title.trim(), MAX_TITLE);
  if (!title) return { ok: false, error: "Chưa nhập tên khoản chi." };
  const amount = Math.round(input.amount);
  if (!Number.isFinite(amount) || amount <= 0)
    return { ok: false, error: "Số tiền không hợp lệ." };
  if (amount > MAX_AMOUNT) return { ok: false, error: "Số tiền lớn bất thường." };

  try {
    await editableTrip(tripId);
    const [payer] = await peopleInTrip(tripId, input.paidById ? [input.paidById] : []);
    const shareIds = await peopleInTrip(tripId, input.shareIds);
    if (shareIds.length === 0) return { ok: false, error: "Chưa chọn ai chia khoản này." };

    const expense = await prisma.tripExpense.create({
      data: {
        tripId,
        title,
        amount,
        paidById: payer ?? null,
        shares: { create: shareIds.map((userId) => ({ userId })) },
      },
      select: { id: true },
    });
    refreshMoney(tripId);
    return { ok: true, data: { id: expense.id } };
  } catch (e) {
    return fail(e);
  }
}

/**
 * XOÁ MỀM — khoản chi chuyển vào mục "Đã xoá" kèm tên người xoá, khôi phục
 * được. Không có đường xoá thật nào từ giao diện: sổ tiền chung mà xoá được
 * lặng lẽ thì một người có thể rút hoá đơn khỏi sổ không ai biết. Xem comment
 * ở model `TripExpense`.
 */
export async function deleteExpense(expenseId: string): Promise<ActionResult> {
  try {
    const ex = await prisma.tripExpense.findUnique({
      where: { id: expenseId },
      select: { tripId: true, deletedAt: true },
    });
    if (!ex) return { ok: false, error: "Không tìm thấy khoản chi." };
    if (ex.deletedAt) return { ok: false, error: "Khoản này đã xoá rồi." };
    const { userId } = await editableTrip(ex.tripId);
    await prisma.tripExpense.update({
      where: { id: expenseId },
      data: { deletedAt: new Date(), deletedById: userId },
    });
    refreshMoney(ex.tripId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function restoreExpense(expenseId: string): Promise<ActionResult> {
  try {
    const ex = await prisma.tripExpense.findUnique({
      where: { id: expenseId },
      select: { tripId: true, deletedAt: true },
    });
    if (!ex) return { ok: false, error: "Không tìm thấy khoản chi." };
    if (!ex.deletedAt) return { ok: false, error: "Khoản này chưa bị xoá." };
    await editableTrip(ex.tripId);
    await prisma.tripExpense.update({
      where: { id: expenseId },
      data: { deletedAt: null, deletedById: null },
    });
    refreshMoney(ex.tripId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ── Danh sách chuyến (dùng cho popup "đổi chuyến") ───────────────────────

export async function listMyTrips(): Promise<
  ActionResult<{ trips: { id: string; title: string; count: number }[] }>
> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }
  const rows = await prisma.trip.findMany({
    where: myTripsWhere(userId),
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, _count: { select: { items: true } } },
  });
  return {
    ok: true,
    data: { trips: rows.map((r) => ({ id: r.id, title: r.title, count: r._count.items })) },
  };
}

// ── Lên lịch trình cho một ĐIỂM ĐẾN ──────────────────────────────────────
// Trang điểm đến KHÔNG có nút "Thêm vào lịch trình": một Place là nơi CHỨA các
// điểm dừng, không phải một điểm dừng (xem docs/lich-trinh.md §6b). Thay vào đó
// là "Lên lịch trình đi X" — vừa đúng ngữ nghĩa, vừa biến trang điểm đến thành
// CỬA TRƯỚC của cả tính năng: nó đặt "chuyến đang lên lịch trình" TRƯỚC khi
// người dùng đi gom, thay vì đoán SAU khi đã gom.

export type PlanOptions = {
  placeName: string;
  /** Chuyến đang có của tôi CÓ liên quan tới nơi này (để khỏi đẻ chuyến trùng). */
  trips: { id: string; title: string; count: number }[];
  templates: { id: string; slug: string | null; title: string; days: number }[];
};

// Nơi này + các điểm đến con: đứng ở trang tỉnh Bình Thuận mà đã có chuyến
// Phan Thiết thì phải nhận ra, đừng mời tạo chuyến mới.
async function placeScope(placeId: string) {
  const place = await prisma.place.findUnique({
    where: { id: placeId },
    select: { id: true, name: true, children: { select: { id: true } } },
  });
  if (!place) return null;
  return { name: place.name, ids: [place.id, ...place.children.map((c) => c.id)] };
}

export async function getPlanOptions(placeId: string): Promise<ActionResult<PlanOptions>> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập để lên lịch trình." };
  }

  const scope = await placeScope(placeId);
  if (!scope) return { ok: false, error: "Không tìm thấy điểm đến." };
  const inScope = { in: scope.ids };

  const [trips, templates] = await Promise.all([
    prisma.trip.findMany({
      where: {
        ...myTripsWhere(userId),
        // "Chuyến về nơi này" suy từ NỘI DUNG chứ không chỉ từ Trip.placeId:
        // chuyến vẫn là chuyến Phan Thiết chừng nào còn mục ở Phan Thiết, kể cả
        // khi nó được tạo từ chỗ khác.
        OR: [
          { placeId: inScope },
          { items: { some: { spot: { placeId: inScope } } } },
          { items: { some: { eatery: { placeId: inScope } } } },
          { items: { some: { accommodation: { placeId: inScope } } } },
          { items: { some: { activity: { placeId: inScope } } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, title: true, _count: { select: { items: true } } },
    }),
    prisma.trip.findMany({
      where: { isTemplate: true, status: "published", placeId: inScope },
      orderBy: [{ isFeatured: "desc" }, { order: "asc" }],
      take: 4,
      select: { id: true, slug: true, title: true, _count: { select: { days: true } } },
    }),
  ]);

  return {
    ok: true,
    data: {
      placeName: scope.name,
      trips: trips.map((t) => ({ id: t.id, title: t.title, count: t._count.items })),
      templates: templates.map((t) => ({
        id: t.id,
        slug: t.slug,
        title: t.title,
        days: t._count.days,
      })),
    },
  };
}

/** Tạo chuyến trống cho một điểm đến và đặt làm chuyến đang lên lịch trình. */
export async function startTripForPlace(
  placeId: string,
): Promise<ActionResult<{ id: string }>> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập để lên lịch trình." };
  }

  const place = await prisma.place.findUnique({
    where: { id: placeId },
    select: { id: true, name: true },
  });
  if (!place) return { ok: false, error: "Không tìm thấy điểm đến." };

  const trip = await prisma.trip.create({
    data: {
      ownerId: userId,
      placeId: place.id,
      title: `Đi ${place.name}`,
      days: { create: [{ index: 0 }] },
    },
    select: { id: true },
  });

  await rememberPlanning(trip.id);
  revalidatePath("/lich-trinh/cua-toi");
  return { ok: true, data: { id: trip.id } };
}

// ── Thành viên cùng sửa ──────────────────────────────────────────────────
// Mời bằng EMAIL. Site chỉ đăng nhập bằng OAuth nên không gửi mail xác thực
// riêng: nếu email đã có tài khoản thì thành thành viên ngay; chưa có thì giữ
// lời mời ở `TripInvite`, và lần đầu người đó đăng nhập bằng đúng email này sẽ
// tự được nhận vào (xem `claimTripInvites`, gọi ở sự kiện signIn trong auth.ts).
//
// CHỈ CHỦ CHUYẾN mới mời/gỡ được — người được mời mà mời tiếp thì chủ chuyến
// mất kiểm soát danh sách của chính mình.

export type TripMemberRow = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  isOwner: boolean;
  /** true = mới là lời mời, người này chưa có tài khoản. */
  pending: boolean;
};

export async function listTripMembers(
  tripId: string,
): Promise<ActionResult<{ members: TripMemberRow[] }>> {
  try {
    await editableTrip(tripId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const [trip, invites] = await Promise.all([
    prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        owner: { select: { id: true, name: true, email: true, image: true } },
        members: {
          orderBy: { createdAt: "asc" },
          select: { user: { select: { id: true, name: true, email: true, image: true } } },
        },
      },
    }),
    prisma.tripInvite.findMany({
      where: { tripId },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true },
    }),
  ]);
  if (!trip) return { ok: false, error: "Không tìm thấy lịch trình." };

  return {
    ok: true,
    data: {
      members: [
        { ...trip.owner, isOwner: true, pending: false },
        ...trip.members.map((m) => ({ ...m.user, isOwner: false, pending: false })),
        ...invites.map((i) => ({
          id: i.id,
          name: null,
          email: i.email,
          image: null,
          isOwner: false,
          pending: true,
        })),
      ],
    },
  };
}

export async function inviteToTrip(
  tripId: string,
  rawEmail: string,
): Promise<ActionResult<{ pending: boolean }>> {
  let userId: string;
  try {
    ({ userId } = await ownedTrip(tripId));
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "Email không hợp lệ." };

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (me?.email?.toLowerCase() === email)
    return { ok: false, error: "Đây là email của chính bạn." };

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (user) {
    await prisma.tripMember.upsert({
      where: { tripId_userId: { tripId, userId: user.id } },
      create: { tripId, userId: user.id, addedById: userId },
      update: {},
    });
    // Dọn lời mời treo nếu trước đó đã mời email này lúc họ chưa có tài khoản.
    await prisma.tripInvite.deleteMany({ where: { tripId, email } });
    // Báo cho người được mời. Site chỉ đăng nhập OAuth nên KHÔNG gửi được email
    // — chuông thông báo là kênh duy nhất họ biết mình vừa được mời.
    const t = await prisma.trip.findUnique({ where: { id: tripId }, select: { title: true } });
    await notify({
      userId: user.id,
      actorId: userId,
      type: "trip_invite",
      url: `/lich-trinh/cua-toi/${tripId}`,
      excerpt: t?.title,
    });
    refresh(tripId);
    return { ok: true, data: { pending: false } };
  }

  await prisma.tripInvite.upsert({
    where: { tripId_email: { tripId, email } },
    create: { tripId, email, invitedById: userId },
    update: {},
  });
  refresh(tripId);
  return { ok: true, data: { pending: true } };
}

/** Gỡ một thành viên, hoặc huỷ một lời mời còn treo. */
export async function removeFromTrip(
  tripId: string,
  target: { kind: "member"; userId: string } | { kind: "invite"; inviteId: string },
): Promise<ActionResult> {
  try {
    await ownedTrip(tripId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  if (target.kind === "member") {
    await prisma.tripMember.deleteMany({ where: { tripId, userId: target.userId } });
  } else {
    await prisma.tripInvite.deleteMany({ where: { id: target.inviteId, tripId } });
  }
  refresh(tripId);
  return { ok: true };
}

/** Tự rời khỏi một chuyến được mời (chủ chuyến thì không rời được chuyến mình). */
export async function leaveTrip(tripId: string): Promise<ActionResult> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }
  const deleted = await prisma.tripMember.deleteMany({ where: { tripId, userId } });
  if (deleted.count === 0) return { ok: false, error: "Bạn không ở trong lịch trình này." };

  const store = await cookies();
  if (store.get(ACTIVE_TRIP_COOKIE)?.value === tripId) store.delete(ACTIVE_TRIP_COOKIE);

  revalidatePath("/lich-trinh/cua-toi");
  return { ok: true };
}

// ── TÚI LỊCH TRÌNH (dock nổi ở mọi trang) ────────────────────────────────
// Nút "Thêm vào lịch trình" ở trang chi tiết bỏ mục vào một chuyến mà người
// dùng KHÔNG nhìn thấy: bằng chứng duy nhất là cái toast 4 giây. `TripDock`
// (components/trip/trip-dock.tsx) biến chuyến đang lên lịch thành một vật thể
// thường trực — và `getTripBag` là dữ liệu của nó.
//
// Cố ý KHÁC `getTrip` ở lib/trip.ts: cái đó nạp cả cây (ngày → mục → 5 entity
// đích + toạ độ + giờ mở cửa) để dựng dòng thời gian. Túi chỉ cần ẢNH + TÊN +
// LOẠI của các mục CHƯA XẾP NGÀY, nên có select riêng gọn hơn hẳn — nó chạy
// một lần trên MỌI trang công khai, không được phép nặng.
//
// ⚠️ TUYỆT ĐỐI KHÔNG ghi cookie trong hàm này. Nó được gọi thẳng từ
// `(site)/layout.tsx` lúc render Server Component, mà `cookies().set` ở đó thì
// Next ném lỗi. Vì vậy nó chỉ ĐỌC chuyến đang lên lịch, không "ghi nhớ" như
// `resolveTargetTrip`.

export type TripBagItem = {
  id: string; // id của TripItem
  name: string;
  typeLabel: string;
  image: string | null;
  href: string | null; // null: quán ăn (chỉ có popup) & mục tự thêm
};

/** Một ngày của chuyến, KÈM các mục trong nó. */
export type TripBagDay = {
  id: string;
  index: number;
  title: string | null;
  items: TripBagItem[];
};

export type TripBag = {
  authed: boolean;
  trip: { id: string; title: string; version: number } | null;
  /**
   * CẢ lịch trình theo ngày, không chỉ danh sách ngày để chọn: ngăn kéo phải
   * cho thấy chuyến đang thành hình ra sao, nếu không nó chỉ là một cái giỏ
   * hàng và người dùng vẫn phải mở trình soạn mới biết mình đã xếp những gì.
   */
  days: TripBagDay[];
  unscheduled: TripBagItem[];
  /** Số mục ĐÃ xếp vào ngày — dòng tóm tắt ở chân ngăn kéo. */
  scheduledCount: number;
  tripCount: number;
};

const EMPTY_BAG: TripBag = {
  authed: false,
  trip: null,
  days: [],
  unscheduled: [],
  scheduledCount: 0,
  tripCount: 0,
};

const bagImages = { where: { isCover: true }, take: 1, select: { url: true, isCover: true } } as const;

export async function getTripBag(): Promise<TripBag> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return EMPTY_BAG;

  const [cookieId, tripCount] = await Promise.all([
    getPlanningTripId(),
    prisma.trip.count({ where: myTripsWhere(userId) }),
  ]);
  if (tripCount === 0) return { ...EMPTY_BAG, authed: true };

  // Cookie trỏ chuyến không còn quyền (bị gỡ khỏi chuyến, chuyến đã xoá) thì
  // rơi về chuyến sửa gần nhất — giống `resolveTargetTrip`, chỉ khác là không
  // ghi lại cookie và không đẻ chuyến mới.
  const trip =
    (cookieId
      ? await prisma.trip.findFirst({
          where: { id: cookieId, ...myTripsWhere(userId) },
          select: bagSelect,
        })
      : null) ??
    (await prisma.trip.findFirst({
      where: myTripsWhere(userId),
      orderBy: { updatedAt: "desc" },
      select: bagSelect,
    }));

  if (!trip) return { ...EMPTY_BAG, authed: true, tripCount };

  // Một truy vấn lấy MỌI mục rồi chia theo ngày ở JS — rẻ hơn nạp `items` lồng
  // trong từng `days` (Prisma sẽ chạy một truy vấn cho mỗi quan hệ lồng).
  const byDay = new Map<string, TripBagItem[]>();
  const unscheduled: TripBagItem[] = [];
  for (const row of trip.items) {
    const item = bagItem(row);
    if (!row.dayId) {
      unscheduled.push(item);
      continue;
    }
    const list = byDay.get(row.dayId);
    if (list) list.push(item);
    else byDay.set(row.dayId, [item]);
  }

  const days = trip.days.map((d) => ({
    id: d.id,
    index: d.index,
    title: d.title,
    items: byDay.get(d.id) ?? [],
  }));

  return {
    authed: true,
    trip: { id: trip.id, title: trip.title, version: trip.version },
    days,
    unscheduled,
    scheduledCount: trip.items.length - unscheduled.length,
    tripCount,
  };
}

const bagSelect = {
  id: true,
  title: true,
  version: true,
  days: {
    orderBy: { index: "asc" },
    select: { id: true, index: true, title: true },
  },
  items: {
    // KHÔNG lọc `dayId: null` nữa: ngăn kéo hiển thị cả lịch trình theo ngày.
    orderBy: { order: "asc" },
    select: {
      id: true,
      dayId: true,
      customTitle: true,
      spot: { select: { slug: true, name: true, images: bagImages } },
      eatery: { select: { slug: true, name: true, images: bagImages } },
      accommodation: { select: { slug: true, name: true, images: bagImages } },
      activity: { select: { slug: true, name: true, images: bagImages } },
    },
  },
} satisfies Prisma.TripSelect;

type BagRow = Prisma.TripGetPayload<{ select: typeof bagSelect }>["items"][number];

function bagItem(item: BagRow): TripBagItem {
  if (item.spot)
    return {
      id: item.id,
      name: item.spot.name,
      typeLabel: "Địa điểm",
      image: coverUrl(item.spot.images, item.spot.slug, 120, 120),
      href: `/dia-diem/${item.spot.slug}`,
    };
  if (item.eatery)
    return {
      id: item.id,
      name: item.eatery.name,
      typeLabel: "Quán ăn",
      image: coverUrl(item.eatery.images, item.eatery.slug, 120, 120),
      href: null, // quán ăn cố ý không có trang riêng (xem CLAUDE.md — popup)
    };
  if (item.accommodation)
    return {
      id: item.id,
      name: item.accommodation.name,
      typeLabel: "Nơi ở",
      image: coverUrl(item.accommodation.images, item.accommodation.slug, 120, 120),
      href: `/luu-tru/${item.accommodation.slug}`,
    };
  if (item.activity)
    return {
      id: item.id,
      name: item.activity.name,
      typeLabel: "Hoạt động",
      image: coverUrl(item.activity.images, item.activity.slug, 120, 120),
      href: `/hoat-dong/${item.activity.slug}`,
    };
  return {
    id: item.id,
    name: item.customTitle ?? "Mục tự thêm",
    typeLabel: "Tự thêm",
    image: null,
    href: null,
  };
}
