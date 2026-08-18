"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/app/(site)/blog/actions";

// Server actions của Lịch trình. Mọi mutation đều kiểm CHỦ SỞ HỮU — lịch trình
// là dữ liệu cá nhân, không có khái niệm "ai cũng sửa được".
// Thiết kế: docs/lich-trinh.md.

const ACTIVE_TRIP_COOKIE = "halivivu_trip";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 ngày

const MAX_TITLE = 120;
const MAX_NOTE = 500;
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

/** Nạp lịch trình và chắc chắn người đang thao tác là chủ sở hữu. */
async function ownedTrip(tripId: string) {
  const userId = await requireUserId();
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true, ownerId: true, isTemplate: true, slug: true },
  });
  if (!trip) throw new Error("Không tìm thấy lịch trình.");
  if (trip.ownerId !== userId) throw new Error("Lịch trình này không phải của bạn.");
  return { trip, userId };
}

function refresh(tripId: string, slug?: string | null) {
  revalidatePath("/lich-trinh");
  revalidatePath(`/lich-trinh/${tripId}`);
  if (slug) revalidatePath(`/lich-trinh/mau/${slug}`);
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
    await ownedTrip(tripId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  await rememberPlanning(tripId);
  revalidatePath("/lich-trinh");
  return { ok: true };
}

/**
 * Mở trình soạn một chuyến ⇒ coi như đang lên lịch cho chuyến đó.
 * Tách khỏi `setPlanningTrip` vì cố ý KHÔNG revalidate: đây là hiệu ứng phụ của
 * việc mở trang, revalidate ở đây sẽ làm trang tự làm mới ngay sau khi mở.
 */
export async function markTripPlanning(tripId: string): Promise<ActionResult> {
  try {
    await ownedTrip(tripId);
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
      where: { id: planningId, ownerId: userId, isTemplate: false },
      select: { id: true },
    });
    if (owned) return owned.id;
  }

  const latest = await prisma.trip.findFirst({
    where: { ownerId: userId, isTemplate: false },
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
  revalidatePath("/lich-trinh");
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
    ({ trip: { slug } } = await ownedTrip(tripId));
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

  await prisma.trip.update({ where: { id: tripId }, data });
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

  revalidatePath("/lich-trinh");
  return { ok: true };
}

// ── Ngày ─────────────────────────────────────────────────────────────────

export async function addDay(tripId: string): Promise<ActionResult> {
  try {
    await ownedTrip(tripId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const count = await prisma.tripDay.count({ where: { tripId } });
  if (count >= MAX_DAYS) return { ok: false, error: `Tối đa ${MAX_DAYS} ngày một chuyến.` };

  await prisma.tripDay.create({ data: { tripId, index: count } });
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
    await ownedTrip(day.tripId);
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
    await ownedTrip(day.tripId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const data: Record<string, unknown> = {};
  if (patch.startMin !== undefined)
    data.startMin = Math.min(1439, Math.max(0, Math.round(patch.startMin)));
  if (patch.title !== undefined) data.title = patch.title ? clip(patch.title, MAX_TITLE) : null;
  if (patch.note !== undefined) data.note = patch.note ? clip(patch.note, MAX_NOTE) : null;

  await prisma.tripDay.update({ where: { id: dayId }, data });
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
      await ownedTrip(tripId);
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
        prisma.trip.count({ where: { ownerId: userId, isTemplate: false } }),
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
    prisma.trip.count({ where: { ownerId: userId, isTemplate: false } }),
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
): Promise<ActionResult<{ tripTitle: string }>> {
  const item = await prisma.tripItem.findUnique({
    where: { id: itemId },
    select: { id: true, tripId: true },
  });
  if (!item) return { ok: false, error: "Không tìm thấy mục." };

  let title: string;
  try {
    await ownedTrip(item.tripId); // chuyến nguồn
    const { trip } = await ownedTrip(tripId); // chuyến đích
    title = (await prisma.trip.findUnique({ where: { id: trip.id }, select: { title: true } }))!.title;
  } catch (e) {
    return { ok: false, error: (e as Error).message };
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
    await ownedTrip(item.tripId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  await prisma.tripItem.delete({ where: { id: itemId } });
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
    await ownedTrip(item.tripId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const data: Record<string, unknown> = {};
  if (patch.stayMin !== undefined)
    data.stayMin =
      patch.stayMin == null ? null : Math.min(24 * 60, Math.max(0, Math.round(patch.stayMin)));
  if (patch.note !== undefined) data.note = patch.note ? clip(patch.note, MAX_NOTE) : null;

  await prisma.tripItem.update({ where: { id: itemId }, data });
  refresh(item.tripId);
  return { ok: true };
}

/**
 * Chuyển một mục sang ngày khác (hoặc về danh sách chưa xếp khi `dayId` = null) và đặt vào
 * vị trí `toIndex`. Đánh số lại cả hai bên để `order` luôn liền mạch 0..n-1.
 */
export async function moveItem(
  itemId: string,
  dayId: string | null,
  toIndex: number,
): Promise<ActionResult> {
  const item = await prisma.tripItem.findUnique({
    where: { id: itemId },
    select: { id: true, tripId: true, dayId: true },
  });
  if (!item) return { ok: false, error: "Không tìm thấy mục." };
  try {
    await ownedTrip(item.tripId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
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

    await tx.tripItem.update({ where: { id: itemId }, data: { dayId } });
    for (let i = 0; i < ids.length; i++) {
      await tx.tripItem.update({ where: { id: ids[i] }, data: { order: i } });
    }

    // Dồn lại danh sách nguồn nếu mục vừa rời khỏi đó.
    if (item.dayId !== dayId) {
      const source = await tx.tripItem.findMany({
        where: { tripId: item.tripId, dayId: item.dayId },
        orderBy: { order: "asc" },
        select: { id: true },
      });
      for (let i = 0; i < source.length; i++) {
        await tx.tripItem.update({ where: { id: source[i].id }, data: { order: i } });
      }
    }
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
      days: { orderBy: { index: "asc" }, select: { id: true, index: true, startMin: true, title: true, note: true } },
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
    source.isTemplate || source.visibility === "unlisted" || source.ownerId === userId;
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
    return trip.id;
  });

  await rememberPlanning(created);
  revalidatePath("/lich-trinh");
  return { ok: true, data: { id: created } };
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
    where: { ownerId: userId, isTemplate: false },
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
        ownerId: userId,
        isTemplate: false,
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
  revalidatePath("/lich-trinh");
  return { ok: true, data: { id: trip.id } };
}
