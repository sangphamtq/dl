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

const ACTIVE_TRIP_COOKIE = "halivivu_trip";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

const MAX_TITLE = 120;
const MAX_NOTE = 500;
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

function myTripsWhere(userId: string): Prisma.TripWhereInput {
  return {
    isTemplate: false,
    OR: [{ ownerId: userId }, { members: { some: { userId } } }],
  };
}

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

  if (expectedVersion != null && expectedVersion !== trip.version)
    throw new StaleError();

  return { trip, userId };
}

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

class StaleError extends Error {
  constructor() {
    super("Có người vừa sửa lịch trình này. Đã cập nhật lại.");
  }
}

function fail(e: unknown): { ok: false; error: string; stale?: boolean } {
  const msg = (e as Error).message;
  return e instanceof StaleError ? { ok: false, error: msg, stale: true } : { ok: false, error: msg };
}

function bump(tripId: string) {
  return prisma.trip.update({
    where: { id: tripId },
    data: { version: { increment: 1 } },
    select: { version: true },
  });
}

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

async function createTripRow(ownerId: string, title: string): Promise<string> {
  const trip = await prisma.trip.create({
    data: {
      ownerId,
      title,
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
    startDate?: string | null;
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

function targetData(target: ItemTarget): Record<string, unknown> {
  switch (target.kind) {
    case "spot": return { spotId: target.id };
    case "eatery": return { eateryId: target.id };
    case "accommodation": return { accommodationId: target.id };
    case "activity": return { activityId: target.id };
    case "custom": return { customTitle: clip(target.title, MAX_TITLE) };
  }
}

export async function addItem(
  target: ItemTarget,
  tripId?: string,
): Promise<
  ActionResult<{
    tripId: string;
    tripTitle: string;
    itemId: string | null;
    duplicate: boolean;
    tripCount: number;
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
    await editableTrip(item.tripId, expectedVersion);
    const { trip } = await editableTrip(tripId);
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

    await tx.$executeRaw`
      UPDATE "TripItem" AS t
      SET "order" = v.ord, "dayId" = ${dayId}::text
      FROM (VALUES ${Prisma.join(
        ids.map((id, i) => Prisma.sql`(${id}::text, ${i}::int)`),
      )}) AS v(id, ord)
      WHERE t.id = v.id`;

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

function refreshNotes(tripId: string) {
  refreshTripPaths(tripId);
}

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
    if (patch.scope !== undefined) {
      data.scope = patch.scope;
      if (patch.scope === "personal") data.assigneeId = null;
    }
    if (patch.isReady !== undefined) data.isReady = patch.isReady;
    if (patch.isPacked !== undefined) data.isPacked = patch.isPacked;
    if (patch.assigneeId !== undefined) {
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

const MAX_AMOUNT = 2_000_000_000;

function refreshMoney(tripId: string) {
  refreshTripPaths(tripId);
}

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

export type PlanOptions = {
  placeName: string;
  trips: { id: string; title: string; count: number }[];
  templates: { id: string; slug: string | null; title: string; days: number }[];
};

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

export async function startTripFromRoute(
  slugs: string[],
): Promise<ActionResult<{ id: string }>> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập để lưu chuyến." };
  }

  const clean = [...new Set(slugs)].slice(0, 12);
  if (clean.length < 2) {
    return { ok: false, error: "Chọn ít nhất hai nơi để tạo chuyến." };
  }

  const found = await prisma.place.findMany({
    where: { slug: { in: clean }, status: "published" },
    select: { id: true, slug: true, name: true },
  });
  const bySlug = new Map(found.map((p) => [p.slug, p] as const));
  const ordered = clean
    .map((s) => bySlug.get(s))
    .filter((p): p is NonNullable<typeof p> => !!p);
  if (ordered.length < 2) {
    return { ok: false, error: "Không tìm thấy điểm đến." };
  }

  const names = ordered.map((p) => p.name);
  const title =
    names.length <= 3
      ? `Đi ${names.join(" – ")}`
      : `Đi ${names[0]} và ${names.length - 1} nơi khác`;

  const trip = await prisma.trip.create({
    data: {
      ownerId: userId,
      placeId: ordered[0].id,
      title,
      days: {
        create: ordered.map((p, i) => ({ index: i, title: p.name })),
      },
    },
    select: { id: true },
  });

  await rememberPlanning(trip.id);
  revalidatePath("/lich-trinh/cua-toi");
  return { ok: true, data: { id: trip.id } };
}

export type TripMemberRow = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  isOwner: boolean;
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

export type TripBagItem = {
  id: string;
  name: string;
  typeLabel: string;
  image: string | null;
  href: string | null;
};

export type TripBagDay = {
  id: string;
  index: number;
  title: string | null;
  items: TripBagItem[];
};

export type TripBag = {
  authed: boolean;
  trip: { id: string; title: string; version: number } | null;
  days: TripBagDay[];
  unscheduled: TripBagItem[];
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
