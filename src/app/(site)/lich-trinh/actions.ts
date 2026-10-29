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
import { placeAt, type DropAt } from "@/lib/trip-drop";
import { isCatalogGroup, packGroupOf } from "@/lib/packing-suggestions";
import { vnDayMinute } from "@/lib/trip-money";
import { defaultTripTitle } from "@/lib/trip-title";
import { resolveTripPlaceId } from "@/lib/trip";
import { SPECIALS, TRAVEL_MODES, type TravelMode, type TripSpecial } from "@/lib/trip-special";

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
// điểm đến dùng nút "Lên lịch trình đi X" (mở bước tạo chuyến với nơi đến điền sẵn) thay cho nút này.
export type ItemTarget =
  | { kind: "spot" | "eatery" | "accommodation" | "activity"; id: string }
  | { kind: "custom"; title: string; stayMin?: number };

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

  // Lối tạo NGẦM khi bấm "Thêm vào lịch trình" mà chưa có chuyến nào — không chen bước hỏi thông tin vào giữa
  // lúc người ta đang lưu một địa điểm; sửa sau ở thanh đầu trang soạn.
  const created = await prisma.trip.create({
    data: { ownerId: userId, title: "Chuyến đi của tôi", days: { create: [{ index: 0 }] } },
    select: { id: true },
  });
  await rememberPlanning(created.id);
  return created.id;
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

/** Thông tin cơ bản hỏi ở bước tạo chuyến — phần nào cũng bỏ trống được. */
export type NewTripInput = {
  title?: string;
  placeId?: string | null;
  /** "YYYY-MM-DD". */
  startDate?: string | null;
  /** Số ngày dựng sẵn (1–14). */
  days?: number;
  partySize?: number | null;
};

const MAX_NEW_DAYS = 14;

function cleanDate(v: string | null | undefined): Date | null | "bad" {
  if (!v) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? "bad" : d;
}

export async function createTrip(input: NewTripInput = {}): Promise<ActionResult<{ id: string }>> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập để tạo lịch trình." };
  }

  const place = input.placeId
    ? await prisma.place.findUnique({ where: { id: input.placeId }, select: { id: true, name: true } })
    : null;
  if (input.placeId && !place) return { ok: false, error: "Không tìm thấy nơi đến." };
  const startDate = cleanDate(input.startDate);
  if (startDate === "bad") return { ok: false, error: "Ngày đi không hợp lệ." };
  const days = Math.min(MAX_NEW_DAYS, Math.max(1, Math.round(input.days ?? 1)));

  const trip = await prisma.trip.create({
    data: {
      ownerId: userId,
      title: clip(input.title ?? "", MAX_TITLE) || defaultTripTitle(place?.name, days),
      placeId: place?.id ?? null,
      startDate,
      partySize: input.partySize == null ? null : Math.min(99, Math.max(1, Math.round(input.partySize))),
      days: { create: Array.from({ length: days }, (_, index) => ({ index })) },
    },
    select: { id: true },
  });
  await rememberPlanning(trip.id);
  revalidatePath("/lich-trinh/cua-toi");
  return { ok: true, data: { id: trip.id } };
}

export type TripDestination = {
  id: string;
  name: string;
  /** Tỉnh chứa nó (điểm đến con), null với tỉnh. */
  province: string | null;
  isProvince: boolean;
  image: string | null;
};

/**
 * Nơi chọn được ở bước "nơi đến": MỌI điểm đến và MỌI tỉnh đã xuất bản. Thứ tự theo dải `/diem-den` (điểm đến + tỉnh
 * bật `treatAsDestination` trước), các tỉnh còn lại xếp sau theo tên — đi Quảng Ninh cũng là một chuyến hợp lệ.
 */
export async function getTripDestinations(): Promise<TripDestination[]> {
  const rows = await prisma.place.findMany({
    where: { status: "published" },
    orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      kind: true,
      treatAsDestination: true,
      parent: { select: { name: true } },
      images: { where: { isCover: true }, take: 1, select: { url: true, isCover: true } },
    },
  });
  const lead = (r: (typeof rows)[number]) => r.kind === "destination" || r.treatAsDestination;
  return [...rows.filter(lead), ...rows.filter((r) => !lead(r)).sort((x, y) => x.name.localeCompare(y.name, "vi"))].map(
    (r) => ({
      id: r.id,
      name: r.name,
      province: r.kind === "province" ? null : (r.parent?.name ?? null),
      isProvince: r.kind === "province",
      image: r.images.length ? coverUrl(r.images, r.slug, 96, 96) : null,
    }),
  );
}

export async function updateTrip(
  tripId: string,
  patch: {
    title?: string;
    summary?: string | null;
    startDate?: string | null;
    partySize?: number | null;
    autoTravel?: boolean;
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
  if (patch.autoTravel !== undefined) data.autoTravel = Boolean(patch.autoTravel);

  // Lỗi ghi ném ra từ server action là sập CẢ TRANG sang màn lỗi — trả về để client báo nhẹ.
  try {
    await prisma.trip.update({
      where: { id: tripId },
      data: { ...data, version: { increment: 1 } },
    });
  } catch (e) {
    console.error("updateTrip", e);
    return { ok: false, error: "Chưa lưu được, thử lại sau ít phút." };
  }
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
    case "custom":
      return {
        customTitle: clip(target.title, MAX_TITLE),
        ...(target.stayMin != null
          ? { stayMin: Math.min(24 * 60, Math.max(0, Math.round(target.stayMin))) }
          : {}),
      };
  }
}

/** Vai của một mục site trong lịch: chỉ chỗ ở được nhận / trả phòng, chỉ quán được làm một bữa ăn. */
export type VenueRole = { special: "checkin" | "checkout" | "meal"; title?: string | null };

function roleOf(target: ItemTarget, role: VenueRole | null): { special: TripSpecial; title: string | null } | null {
  if (!role) return null;
  if (target.kind === "accommodation" && (role.special === "checkin" || role.special === "checkout"))
    return { special: role.special, title: null };
  if (target.kind === "eatery" && role.special === "meal")
    return { special: "meal", title: null };
  return null;
}

/**
 * "Chọn quán" / "Chọn chỗ ở" cho một mục tự gõ (bữa ăn, nhận / trả phòng): biến nó thành mục SITE giữ nguyên vai, chỗ
 * đứng, giờ, ghi chú — có ảnh, toạ độ, giờ mở cửa. Ngược lại (`venue = null`) thì về lại mục tự gõ.
 */
export async function attachVenue(
  itemId: string,
  venue: { kind: "eatery" | "accommodation"; id: string } | null,
): Promise<ActionResult> {
  const item = await prisma.tripItem.findUnique({
    where: { id: itemId },
    select: {
      tripId: true, special: true, customTitle: true,
      eatery: { select: { name: true } }, accommodation: { select: { name: true } },
    },
  });
  if (!item) return { ok: false, error: "Không tìm thấy mục." };
  try {
    await editableTrip(item.tripId);
  } catch (e) {
    return fail(e);
  }
  const fits =
    item.special === "meal" ? "eatery" : item.special === "checkin" || item.special === "checkout" ? "accommodation" : null;
  if (!fits) return { ok: false, error: "Chỉ bữa ăn, nhận / trả phòng mới gắn quán hay chỗ ở được." };

  let data: Prisma.TripItemUpdateInput;
  if (venue) {
    if (venue.kind !== fits) return { ok: false, error: fits === "eatery" ? "Bữa ăn chỉ gắn với quán ăn." : "Chỉ gắn chỗ ở." };
    const exists =
      venue.kind === "eatery"
        ? await prisma.eatery.findFirst({ where: { id: venue.id, status: "published" }, select: { id: true } })
        : await prisma.accommodation.findFirst({ where: { id: venue.id, status: "published" }, select: { id: true } });
    if (!exists) return { ok: false, error: "Không tìm thấy nơi này." };
    data = {
      eatery: venue.kind === "eatery" ? { connect: { id: venue.id } } : { disconnect: true },
      accommodation: venue.kind === "accommodation" ? { connect: { id: venue.id } } : { disconnect: true },
      // Bữa ăn giữ nhãn bữa ở `customTitle`; nhận / trả phòng thì tên là tên chỗ ở.
      customTitle: item.special === "meal" ? item.customTitle || "Bữa ăn" : null,
      customAddress: null,
      customPlace: false,
      customLat: null,
      customLng: null,
    };
  } else {
    data = {
      eatery: { disconnect: true },
      accommodation: { disconnect: true },
      customTitle: item.special === "meal" ? item.customTitle || "Bữa ăn" : (item.accommodation?.name ?? ""),
    };
  }
  await prisma.tripItem.update({ where: { id: itemId }, data });
  await bump(item.tripId);
  refresh(item.tripId);
  return { ok: true };
}

export async function addItem(
  target: ItemTarget,
  tripId?: string,
  dayId?: string | null,
  at: DropAt = "end",
  /** Hoạt động: thành THẺ của nơi này. Thứ khác: đứng ngay sau nơi này. Chỉ khi có `tripId`. */
  parent: { id: string; at?: DropAt } | null = null,
  /** VAI của mục site: nhận / trả phòng (chỗ ở), bữa ăn (quán — `title` = "Ăn trưa"…). */
  role: VenueRole | null = null,
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

  // Chống trùng CHỈ cho nút "Thêm vào lịch trình" ở trang chi tiết (không có `tripId`): bấm lại là báo "đã có", không
  // nhân đôi. Trang soạn (có `tripId`) thì cho thêm lại — cùng một bãi biển sáng & chiều, cùng một quán hai bữa là bình thường.
  if (target.kind !== "custom" && !tripId) {
    // Trùng = cùng nơi VÀ cùng vai: nhận phòng + trả phòng cùng một chỗ ở là HAI mốc hợp lệ.
    const existing = await prisma.tripItem.findFirst({
      where: { tripId: targetTripId, ...data, special: roleOf(target, role)?.special ?? null },
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

  // `dayId` chỉ có nghĩa khi chỉ rõ `tripId` (thêm từ trang soạn): chuyến tự chọn
  // theo cookie thì client không biết ngày nào thuộc nó.
  const intoDay = tripId && dayId ? dayId : null;
  if (intoDay) {
    const day = await prisma.tripDay.findFirst({
      where: { id: intoDay, tripId: targetTripId },
      select: { id: true },
    });
    if (!day) return { ok: false, error: "Ngày này vừa bị người khác xoá." };
  }

  let scope: Scope = { dayId: intoDay, parentId: null };
  let pos = at;
  if (tripId && parent) {
    const ps = await parentScope(targetTripId, parent.id);
    if (typeof ps === "string") return { ok: false, error: ps };
    if (target.kind === "activity") {
      scope = ps;
      pos = parent.at ?? "end";
    } else {
      // Chỉ HOẠT ĐỘNG mới là thẻ của một nơi; thứ khác có giờ riêng nên đứng ngay sau nơi đó.
      scope = { dayId: ps.dayId, parentId: null };
      pos = await afterItem(targetTripId, ps.dayId, parent.id);
    }
  } else if (tripId && intoDay && target.kind === "activity") {
    // Hoạt động diễn ra ở một nơi ĐÃ có trong ngày ⇒ tự thành thẻ của nơi đó.
    const host = await prisma.tripItem.findFirst({
      where: {
        tripId: targetTripId,
        dayId: intoDay,
        parentId: null,
        spot: { activityLinks: { some: { activityId: target.id } } },
      },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    if (host) {
      scope = { dayId: intoDay, parentId: host.id };
      pos = "end";
    }
  }

  const [item, trip, tripCount] = await Promise.all([
    prisma.$transaction(async (tx) => {
      const r = roleOf(target, role);
      const created = await tx.tripItem.create({
        data: {
          tripId: targetTripId,
          dayId: scope.dayId,
          parentId: scope.parentId,
          order: await nextOrder(tx, targetTripId, scope),
          ...data,
          // Nhãn bữa ("Ăn trưa") nằm ở `customTitle` — tên hiện ra vẫn là tên quán (`resolveItem`).
          ...(r ? { special: r.special, customTitle: r.special === "meal" ? r.title : null } : {}),
        },
        select: { id: true },
      });
      // Tạo ở cuối rồi mới dời: `placeAt` cần thấy danh sách hiện có trên server.
      if (pos !== "end") await placeItem(tx, targetTripId, scope, created.id, pos);
      return created;
    }),
    prisma.trip.update({
      where: { id: targetTripId },
      data: { updatedAt: new Date(), version: { increment: 1 } },
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

export type TripCandidate = {
  kind: "spot" | "eatery" | "activity" | "accommodation";
  id: string;
  name: string;
  context: string;
  image: string | null;
  inTrip: boolean;
  local: boolean;
};

const CANDIDATE_TABLES = [
  { kind: "spot", table: "Spot", fk: "spotId" },
  { kind: "eatery", table: "Eatery", fk: "eateryId" },
  { kind: "activity", table: "Activity", fk: "activityId" },
  { kind: "accommodation", table: "Accommodation", fk: "accommodationId" },
] as const;

/**
 * Tìm thứ thêm được vào lịch trình ngay trong trang soạn. Ô trống ⇒ gợi ý ở điểm
 * đến của chuyến (cả điểm đến con). Có chữ ⇒ tìm toàn site nhưng nơi thuộc điểm
 * đến của chuyến đứng trước.
 */
export async function searchTripCandidates(
  tripId: string,
  rawQ: string,
  /** "Làm gì ở X": ô trống thì gợi ý đúng các hoạt động diễn ra ở nơi X. */
  forItemId?: string,
): Promise<TripActionResult<{ items: TripCandidate[] }>> {
  let placeId: string | null;
  try {
    await editableTrip(tripId);
    placeId =
      (await prisma.trip.findUnique({ where: { id: tripId }, select: { placeId: true } }))
        ?.placeId ?? null;
  } catch (e) {
    return fail(e);
  }

  // Chuyến không gắn điểm đến ⇒ suy từ mục site đã có trong chuyến (`resolveTripPlaceId`).
  if (!placeId) placeId = await resolveTripPlaceId(tripId);

  const q = rawQ.trim().slice(0, 80);
  if (!q && forItemId) {
    const host = await prisma.tripItem.findFirst({
      where: { id: forItemId, tripId },
      select: { spotId: true, spot: { select: { name: true } } },
    });
    if (host?.spotId) {
      const links = await prisma.spotActivity.findMany({
        where: { spotId: host.spotId, activity: { status: "published" } },
        orderBy: { order: "asc" },
        select: {
          activity: {
            select: {
              id: true,
              name: true,
              images: { where: { kind: "gallery" }, orderBy: [{ isCover: "desc" }, { order: "asc" }], take: 1, select: { url: true } },
              tripItems: { where: { tripId }, select: { id: true }, take: 1 },
            },
          },
        },
      });
      return {
        ok: true,
        data: {
          items: links.map(({ activity: a }) => ({
            kind: "activity" as const,
            id: a.id,
            name: a.name,
            context: `tại ${host.spot!.name}`,
            image: a.images[0]?.url ?? null,
            inTrip: a.tripItems.length > 0,
            local: true,
          })),
        },
      };
    }
  }
  if (!q && !placeId) return { ok: true, data: { items: [] } };
  const like = `%${q}%`;
  const perKind = q ? 6 : 4;

  const parts = CANDIDATE_TABLES.map(
    ({ kind, table, fk }) => Prisma.sql`
    SELECT ${kind}::text AS kind, x.id, x.name, pl.name AS "placeName",
           prov.name AS "provName", pl.kind::text AS "placeKind",
           (pl.id = ${placeId} OR pl."parentId" = ${placeId}) IS TRUE AS local,
           x."isFeatured" AS featured, x.popularity,
           (SELECT i.url FROM "Image" i
             WHERE i.${Prisma.raw(`"${fk}"`)} = x.id AND i.kind::text = 'gallery'
             ORDER BY i."isCover" DESC, i."order" ASC LIMIT 1) AS image,
           EXISTS (SELECT 1 FROM "TripItem" ti
             WHERE ti."tripId" = ${tripId} AND ti.${Prisma.raw(`"${fk}"`)} = x.id) AS "inTrip"
    FROM ${Prisma.raw(`"${table}"`)} x
    JOIN "Place" pl ON x."placeId" = pl.id
    LEFT JOIN "Place" prov ON pl."parentId" = prov.id
    WHERE x.status::text = 'published'
      AND ${
        q
          ? Prisma.sql`unaccent(x.name) ILIKE unaccent(${like})`
          : Prisma.sql`(pl.id = ${placeId} OR pl."parentId" = ${placeId})`
      }`,
  );

  const rows = await prisma.$queryRaw<
    {
      kind: TripCandidate["kind"];
      id: string;
      name: string;
      placeName: string;
      provName: string | null;
      placeKind: string;
      local: boolean;
      image: string | null;
      inTrip: boolean;
    }[]
  >`
    SELECT * FROM (
      SELECT u.*, ROW_NUMBER() OVER (
        PARTITION BY u.kind ORDER BY u.local DESC, u.featured DESC, u.popularity DESC, u.name ASC
      ) AS rn
      FROM (${Prisma.join(parts, " UNION ALL ")}) u
    ) r
    WHERE r.rn <= ${perKind}
    ORDER BY r.local DESC, r.rn ASC`;

  return {
    ok: true,
    data: {
      items: rows.map((r) => ({
        kind: r.kind,
        id: r.id,
        name: r.name,
        context:
          r.placeKind === "destination" && r.provName ? `${r.placeName}, ${r.provName}` : r.placeName,
        image: r.image,
        inTrip: r.inTrip,
        local: r.local,
      })),
    },
  };
}

const MAX_ADDRESS = 200;
const MAX_CODE = 60;

type SpecialFields = {
  special?: TripSpecial | null;
  travelMode?: TravelMode | null;
  travelFrom?: string | null;
  travelTo?: string | null;
  bookingCode?: string | null;
};

/** Chỉ nhận giá trị trong tập cho phép; trường của Di chuyển chỉ giữ khi đúng là Di chuyển. */
function cleanSpecial(i: SpecialFields) {
  const special = SPECIALS.some((s) => s.special === i.special) ? (i.special as TripSpecial) : null;
  const transport = special === "transport";
  return {
    special,
    travelMode: transport && TRAVEL_MODES.some((m) => m.mode === i.travelMode) ? (i.travelMode as TravelMode) : null,
    travelFrom: transport ? clip(i.travelFrom ?? "", MAX_TITLE) || null : null,
    travelTo: transport ? clip(i.travelTo ?? "", MAX_TITLE) || null : null,
    bookingCode: special && special !== "meal" && special !== "rest" ? clip(i.bookingCode ?? "", MAX_CODE) || null : null,
  };
}

/**
 * Một mục TỰ THÊM: tiêu đề + địa chỉ (không bắt buộc) + bao lâu. KHÔNG còn chia "nơi / việc" ở giao diện: có địa chỉ
 * ⇒ `customPlace` (một NƠI, lấy số mốc), không có ⇒ một việc (đặt xe, chờ người). Không bao giờ là mục con.
 */
export async function addCustomStop(
  tripId: string,
  dayId: string | null,
  at: DropAt,
  input: { title: string; address?: string | null; stayMin?: number | null } & SpecialFields,
): Promise<TripActionResult<{ itemId: string }>> {
  const title = clip(input.title ?? "", MAX_TITLE);
  const special = cleanSpecial(input);
  // Mục đặc biệt tự có tên (nhãn loại, hoặc "Hà Nội – Sa Pa") nên tiêu đề để trống được.
  if (!title && !special.special) return { ok: false, error: "Gõ tiêu đề cho mục này." };
  // Di chuyển không có "một địa chỉ" — nó đi từ nơi này tới nơi khác.
  const address = special.special === "transport" ? null : clip(input.address ?? "", MAX_ADDRESS) || null;
  const stay =
    input.stayMin == null ? null : Math.min(24 * 60, Math.max(0, Math.round(input.stayMin)));

  try {
    await editableTrip(tripId);
    if (dayId) {
      const day = await prisma.tripDay.findFirst({ where: { id: dayId, tripId }, select: { id: true } });
      if (!day) return { ok: false, error: "Ngày này vừa bị người khác xoá." };
    }
  } catch (e) {
    return fail(e);
  }

  const itemId = await prisma.$transaction(async (tx) => {
    const scope: Scope = { dayId, parentId: null };
    const item = await tx.tripItem.create({
      data: {
        tripId,
        dayId,
        order: await nextOrder(tx, tripId, scope),
        // "" chứ không null: `customTitle != null` là dấu hiệu "mục tự thêm" ở nhiều chỗ (vd. `updateItem`).
        customTitle: title,
        customAddress: address,
        customPlace: address != null,
        stayMin: stay,
        ...special,
      },
      select: { id: true },
    });
    if (at !== "end") await placeItem(tx, tripId, scope, item.id, at);
    await tx.trip.update({ where: { id: tripId }, data: { version: { increment: 1 } } });
    return item.id;
  });

  refresh(tripId);
  return { ok: true, data: { itemId } };
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
    where: { tripId, dayId: null, parentId: null },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await prisma.$transaction([
    prisma.tripItem.update({
      where: { id: itemId },
      data: { tripId, dayId: null, parentId: null, order: (last?.order ?? -1) + 1 },
    }),
    // Việc của nơi này sang chuyến mới cùng nó.
    prisma.tripItem.updateMany({ where: { parentId: itemId }, data: { tripId, dayId: null } }),
  ]);

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

  await prisma.$transaction(async (tx) => {
    const full = await tx.tripItem.findUnique({
      where: { id: itemId },
      select: { dayId: true, parentId: true, doings: { orderBy: { order: "asc" }, select: { id: true } } },
    });
    if (!full) return;
    // Bỏ một nơi KHÔNG bỏ theo thẻ hoạt động của nó: chúng đứng ra thành mục gốc (lấy lại giờ
    // mặc định) ngay chỗ nơi đó vừa đứng.
    if (full.doings.length > 0) {
      await tx.tripItem.updateMany({ where: { parentId: itemId }, data: { stayMin: null } });
      const scope: Scope = { dayId: full.dayId, parentId: null };
      const tops = (
        await tx.tripItem.findMany({ where: scopeWhere(item.tripId, scope), orderBy: { order: "asc" }, select: { id: true } })
      ).map((r) => r.id);
      const at = tops.indexOf(itemId);
      tops.splice(at < 0 ? tops.length : at, 1, ...full.doings.map((d) => d.id));
      await tx.tripItem.delete({ where: { id: itemId } });
      await writeOrder(tx, tops, scope);
    } else {
      await tx.tripItem.delete({ where: { id: itemId } });
    }
  });
  await bump(item.tripId);
  refresh(item.tripId);
  return { ok: true };
}

export async function updateItem(
  itemId: string,
  patch: { stayMin?: number | null; note?: string | null; customTitle?: string; customAddress?: string | null } & SpecialFields,
): Promise<ActionResult> {
  const item = await prisma.tripItem.findUnique({
    where: { id: itemId },
    select: { tripId: true, customTitle: true, special: true },
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
  if (patch.customTitle !== undefined) {
    // Chỉ mục TỰ NHẬP mới đổi tên được — tên của mục site là tên của địa điểm đó.
    if (item.customTitle == null) return { ok: false, error: "Chỉ đổi tên được mục tự thêm." };
    const title = clip(patch.customTitle, MAX_TITLE);
    if (!title && !item.special) return { ok: false, error: "Tên không được để trống." };
    data.customTitle = title;
  }
  if (patch.customAddress !== undefined) {
    if (item.customTitle == null) return { ok: false, error: "Chỉ sửa địa chỉ được ở mục tự thêm." };
    const address = clip(patch.customAddress ?? "", MAX_ADDRESS) || null;
    data.customAddress = address;
    // Có địa chỉ là một NƠI (lấy số mốc, tính chặng); bỏ địa chỉ thì về lại một việc.
    data.customPlace = address != null;
  }
  if (
    patch.travelMode !== undefined ||
    patch.travelFrom !== undefined ||
    patch.travelTo !== undefined ||
    patch.bookingCode !== undefined
  ) {
    if (!item.special) return { ok: false, error: "Mục này không phải mục đặc biệt." };
    const clean = cleanSpecial({ ...patch, special: item.special });
    if (patch.travelMode !== undefined) data.travelMode = clean.travelMode;
    if (patch.travelFrom !== undefined) data.travelFrom = clean.travelFrom;
    if (patch.travelTo !== undefined) data.travelTo = clean.travelTo;
    if (patch.bookingCode !== undefined) data.bookingCode = clean.bookingCode;
  }

  await prisma.tripItem.update({ where: { id: itemId }, data });
  await bump(item.tripId);
  refresh(item.tripId);
  return { ok: true };
}

/**
 * Vùng xếp chỗ: các mục GỐC của một ngày (`dayId`, null = chưa xếp), hoặc các VIỆC của một nơi
 * (`parentId`). `order` đếm riêng trong từng vùng.
 */
type Scope = { dayId: string | null; parentId: string | null };

function scopeWhere(tripId: string, scope: Scope): Prisma.TripItemWhereInput {
  return scope.parentId
    ? { tripId, parentId: scope.parentId }
    : { tripId, dayId: scope.dayId, parentId: null };
}

async function writeOrder(tx: Prisma.TransactionClient, ids: string[], scope: Scope) {
  if (ids.length === 0) return;
  await tx.$executeRaw`
    UPDATE "TripItem" AS t
    SET "order" = v.ord, "dayId" = ${scope.dayId}::text, "parentId" = ${scope.parentId}::text
    FROM (VALUES ${Prisma.join(
      ids.map((id, i) => Prisma.sql`(${id}::text, ${i}::int)`),
    )}) AS v(id, ord)
    WHERE t.id = v.id`;
}

/** Đặt `itemId` vào `scope` theo ý định `at`, đánh số lại cả vùng. */
async function placeItem(
  tx: Prisma.TransactionClient,
  tripId: string,
  scope: Scope,
  itemId: string,
  at: DropAt,
) {
  const siblings = await tx.tripItem.findMany({
    where: scopeWhere(tripId, scope),
    orderBy: { order: "asc" },
    select: { id: true },
  });
  const ids = siblings.map((s) => s.id).filter((id) => id !== itemId);
  ids.splice(placeAt(ids, at), 0, itemId);
  await writeOrder(tx, ids, scope);
}

async function nextOrder(tx: Prisma.TransactionClient, tripId: string, scope: Scope) {
  const last = await tx.tripItem.findFirst({
    where: scopeWhere(tripId, scope),
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return (last?.order ?? -1) + 1;
}

/** Vị trí ngay sau mục gốc `id` trong ngày của nó. */
async function afterItem(
  tripId: string,
  dayId: string | null,
  id: string,
  db: Prisma.TransactionClient = prisma,
): Promise<DropAt> {
  const ids = (
    await db.tripItem.findMany({
      where: scopeWhere(tripId, { dayId, parentId: null }),
      orderBy: { order: "asc" },
      select: { id: true },
    })
  ).map((r) => r.id);
  const i = ids.indexOf(id);
  if (i < 0) return "end";
  return { afterId: id, beforeId: ids[i + 1] ?? null };
}

/** Nơi để gắn thẻ hoạt động vào: phải cùng chuyến và là mục GỐC (đúng 2 mức). Trả về ngày của nó. */
async function parentScope(tripId: string, parentId: string): Promise<Scope | string> {
  const p = await prisma.tripItem.findFirst({
    where: { id: parentId, tripId },
    select: { dayId: true, parentId: true, activityId: true, customTitle: true, customPlace: true, customLat: true },
  });
  if (!p) return "Nơi này vừa bị người khác bỏ khỏi lịch trình.";
  if (p.parentId) return "Không gắn vào một thẻ khác được.";
  // Chỉ một NƠI mới có thẻ "làm gì ở đây" — không phải một hoạt động hay một việc tự gõ.
  if (p.activityId || (p.customTitle != null && !p.customPlace && p.customLat == null))
    return "Chỉ gắn hoạt động vào một nơi được.";
  return { dayId: p.dayId, parentId };
}

export async function moveItem(
  itemId: string,
  dayId: string | null,
  at: DropAt,
  /** Đặt thành VIỆC của nơi này (dayId bị bỏ qua — lấy theo nơi). null = mục gốc của ngày. */
  parentId: string | null = null,
): Promise<TripActionResult> {
  const item = await prisma.tripItem.findUnique({
    where: { id: itemId },
    select: {
      id: true, tripId: true, dayId: true, parentId: true, activityId: true,
      _count: { select: { doings: true } },
    },
  });
  if (!item) return { ok: false, error: "Mục này vừa bị người khác bỏ khỏi lịch trình." };
  try {
    await editableTrip(item.tripId);
  } catch (e) {
    return fail(e);
  }

  let to: Scope = { dayId, parentId: null };
  if (parentId) {
    if (parentId === itemId) return { ok: false, error: "Không đặt một mục vào chính nó được." };
    if (!item.activityId) return { ok: false, error: "Chỉ hoạt động mới gắn vào một nơi được." };
    if (item._count.doings > 0)
      return { ok: false, error: "Nơi này đang có việc riêng — không đặt vào trong nơi khác được." };
    const scope = await parentScope(item.tripId, parentId);
    if (typeof scope === "string") return { ok: false, error: scope };
    to = scope;
  } else if (dayId) {
    const day = await prisma.tripDay.findFirst({
      where: { id: dayId, tripId: item.tripId },
      select: { id: true },
    });
    if (!day) return { ok: false, error: "Ngày này vừa bị người khác xoá." };
  }
  const from: Scope = { dayId: item.dayId, parentId: item.parentId };

  await prisma.$transaction(async (tx) => {
    await placeItem(tx, item.tripId, to, itemId, at);
    // Thẻ ra thành mục riêng thì lấy lại giờ mặc định — 0 phút chỉ là dấu "không tính giờ" của thẻ.
    if (from.parentId && !to.parentId)
      await tx.tripItem.update({ where: { id: itemId }, data: { stayMin: null } });
    // Thẻ của nơi này đi theo nơi sang ngày mới.
    if (item._count.doings > 0 && to.dayId !== item.dayId)
      await tx.tripItem.updateMany({ where: { parentId: itemId }, data: { dayId: to.dayId } });

    if (from.dayId !== to.dayId || from.parentId !== to.parentId) {
      const rest = await tx.tripItem.findMany({
        where: scopeWhere(item.tripId, from),
        orderBy: { order: "asc" },
        select: { id: true },
      });
      await writeOrder(tx, rest.map((r) => r.id), from);
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
      id: true, title: true, summary: true, ownerId: true, isTemplate: true, visibility: true, originName: true,
      members: { where: { userId }, select: { id: true } },
      days: { orderBy: { index: "asc" }, select: { id: true, index: true, startMin: true, title: true, note: true } },
      notes: { orderBy: { createdAt: "asc" }, select: { body: true, isPinned: true } },
      packing: { orderBy: { createdAt: "asc" }, select: { name: true, scope: true, groupName: true } },
      items: {
        orderBy: { order: "asc" },
        select: {
          id: true, parentId: true,
          dayId: true, order: true, stayMin: true, note: true,
          spotId: true, eateryId: true, accommodationId: true, activityId: true,
          customTitle: true, customLat: true, customLng: true, customPlace: true, customAddress: true,
          special: true, travelMode: true, travelFrom: true, travelTo: true, bookingCode: true,
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
        originName: source.originName,
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

    // Mục gốc trước, việc sau — việc cần id MỚI của nơi nó thuộc về.
    const itemIdMap = new Map<string, string>();
    const ordered = [...source.items].sort((a, b) => Number(!!a.parentId) - Number(!!b.parentId));
    for (const it of ordered) {
      const copy = await tx.tripItem.create({
        select: { id: true },
        data: {
          tripId: trip.id,
          parentId: it.parentId ? (itemIdMap.get(it.parentId) ?? null) : null,
          dayId: it.dayId ? (dayIdMap.get(it.dayId) ?? null) : null,
          order: it.order, stayMin: it.stayMin, note: it.note,
          spotId: it.spotId, eateryId: it.eateryId,
          accommodationId: it.accommodationId, activityId: it.activityId,
          customTitle: it.customTitle, customLat: it.customLat, customLng: it.customLng,
          customPlace: it.customPlace, customAddress: it.customAddress,
          special: it.special, travelMode: it.travelMode, travelFrom: it.travelFrom, travelTo: it.travelTo,
          bookingCode: it.bookingCode,
        },
      });
      itemIdMap.set(it.id, copy.id);
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
      await tx.tripPackItem.create({
        data: { tripId: trip.id, name: it.name, scope: it.scope, groupName: it.groupName },
      });
    }
    return trip.id;
  });

  await rememberPlanning(created);
  revalidatePath("/lich-trinh/cua-toi");
  return { ok: true, data: { id: created } };
}

async function refreshNotes(tripId: string) {
  await bump(tripId);
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
    await refreshNotes(tripId);
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
    await refreshNotes(note.tripId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteNote(noteId: string): Promise<ActionResult> {
  try {
    const note = await editableNote(noteId);
    await prisma.tripNote.delete({ where: { id: noteId } });
    await refreshNotes(note.tripId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setNotePinned(noteId: string, pinned: boolean): Promise<ActionResult> {
  try {
    const note = await editableNote(noteId);
    await prisma.tripNote.update({ where: { id: noteId }, data: { isPinned: pinned } });
    await refreshNotes(note.tripId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

async function refreshPacking(tripId: string, { silent = false } = {}) {
  // Tick đồ CÁ NHÂN không đổi gì trên màn hình người khác — tăng version là bắt
  // cả nhóm làm mới vô cớ.
  if (!silent) await bump(tripId);
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
  /** Thêm từ ô của một nhóm đồ riêng. null/bỏ trống ⇒ suy theo tên (không khớp thì vào "Khác"). */
  rawGroup: string | null = null,
): Promise<ActionResult<{ id: string }>> {
  const name = clip(rawName.trim(), MAX_TITLE);
  if (!name) return { ok: false, error: "Chưa nhập tên món đồ." };
  const groupName = scope === "personal" && rawGroup ? clip(rawGroup, MAX_TITLE) || null : null;
  try {
    await editableTrip(tripId);
    const item = await prisma.tripPackItem.create({
      data: { tripId, name, scope, groupName },
      select: { id: true },
    });
    await refreshPacking(tripId);
    return { ok: true, data: { id: item.id } };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Đổi tên một nhóm ĐỒ RIÊNG: mọi món đang hiện trong nhóm `from` mang tên mới. Nhóm "Khác" là nơi
 * rơi của món không khớp danh mục — đổi tên xong thì nó trống, món tự gõ sau đó lại tạo "Khác" mới.
 */
export async function renamePackGroup(
  tripId: string,
  from: string,
  rawTo: string,
): Promise<ActionResult> {
  const to = clip(rawTo, MAX_TITLE);
  if (!to) return { ok: false, error: "Tên nhóm không được để trống." };
  if (isCatalogGroup(from)) return { ok: false, error: "Nhóm có sẵn không đổi tên được." };
  try {
    await editableTrip(tripId);
    const rows = await prisma.tripPackItem.findMany({
      where: { tripId, scope: "personal" },
      select: { id: true, name: true, groupName: true },
    });
    const ids = rows.filter((r) => packGroupOf(r) === from).map((r) => r.id);
    if (ids.length === 0) return { ok: false, error: "Nhóm này vừa trống — có người đã sửa trước." };
    await prisma.tripPackItem.updateMany({ where: { id: { in: ids } }, data: { groupName: to } });
    await refreshPacking(tripId);
    return { ok: true };
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
    await refreshPacking(item.tripId);
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
    await refreshPacking(item.tripId, { silent: true });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deletePackItem(itemId: string): Promise<ActionResult> {
  try {
    const item = await editablePackItem(itemId);
    await prisma.tripPackItem.delete({ where: { id: itemId } });
    await refreshPacking(item.tripId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const MAX_AMOUNT = 2_000_000_000;

async function refreshMoney(tripId: string) {
  await bump(tripId);
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

export type ExpenseInput = {
  title: string;
  amount: number;
  paidById: string | null;
  shareIds: string[];
  fromFund?: boolean;
  /** Chia không đều: đồng/người, tổng phải đúng bằng `amount`. Bỏ trống = chia đều. */
  shareAmounts?: Record<string, number> | null;
  /** Ngày chi "YYYY-MM-DD" (giờ VN) + phút trong ngày (null = không nhớ giờ). Bỏ trống = lúc ghi. */
  spentOn?: string | null;
  spentMin?: number | null;
};

/**
 * Kiểm & chuẩn hoá một khoản chi — DÙNG CHUNG cho ghi mới và sửa, để hai đường không bao giờ lệch luật.
 * Trả về dữ liệu ghi được, hoặc câu lỗi.
 */
async function cleanExpense(tripId: string, input: ExpenseInput) {
  const title = clip(input.title.trim(), MAX_TITLE);
  if (!title) return "Chưa nhập tên khoản chi.";
  const amount = Math.round(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) return "Số tiền không hợp lệ.";
  if (amount > MAX_AMOUNT) return "Số tiền lớn bất thường.";

  const [payer] = await peopleInTrip(tripId, input.paidById ? [input.paidById] : []);
  const shareIds = await peopleInTrip(tripId, input.shareIds);
  if (shareIds.length === 0) return "Chưa chọn ai chia khoản này.";

  let custom: Map<string, number> | null = null;
  if (input.shareAmounts) {
    custom = new Map(shareIds.map((id) => [id, Math.round(Number(input.shareAmounts![id] ?? 0))] as const));
    const values = [...custom.values()];
    if (values.some((v) => !Number.isFinite(v) || v < 0)) return "Số tiền từng người không hợp lệ.";
    // Kiểm ở SERVER: phần cộng lệch tổng thì số dư cả nhóm lệch khỏi 0, "ai trả ai" sai lặng lẽ.
    if (values.reduce((n, v) => n + v, 0) !== amount) return "Tổng các phần chưa bằng số tiền của khoản.";
    for (const [id, v] of custom) if (v === 0) custom.delete(id);
  }

  return {
    title,
    amount,
    // Quỹ trả thì không ai ứng tiền riêng.
    paidById: input.fromFund ? null : (payer ?? null),
    fromFund: !!input.fromFund,
    ...spentAt(input.spentOn, input.spentMin),
    shares: custom
      ? [...custom].map(([userId, amount]) => ({ userId, amount }))
      : shareIds.map((userId) => ({ userId, amount: null })),
  };
}

export async function addExpense(tripId: string, input: ExpenseInput): Promise<ActionResult<{ id: string }>> {
  try {
    const { userId } = await editableTrip(tripId);
    const clean = await cleanExpense(tripId, input);
    if (typeof clean === "string") return { ok: false, error: clean };
    const { shares, ...data } = clean;
    const expense = await prisma.tripExpense.create({
      data: { tripId, ...data, createdById: userId, shares: { create: shares } },
      select: { id: true },
    });
    await refreshMoney(tripId);
    return { ok: true, data: { id: expense.id } };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Sửa một khoản chi. Ghi lại AI sửa và LÚC NÀO (`editedById` / `editedAt`) — sổ tiền chung ai trong chuyến cũng
 * sửa được, nên sửa phải để lại dấu, giống xoá mềm. Phần chia thay trọn (xoá hết rồi tạo lại) trong một giao dịch.
 */
export async function updateExpense(expenseId: string, input: ExpenseInput): Promise<ActionResult> {
  try {
    const ex = await prisma.tripExpense.findUnique({
      where: { id: expenseId },
      select: { tripId: true, kind: true, deletedAt: true },
    });
    if (!ex) return { ok: false, error: "Không tìm thấy khoản chi." };
    if (ex.deletedAt) return { ok: false, error: "Khoản này đã bị xoá — khôi phục rồi mới sửa được." };
    if (ex.kind !== "expense") return { ok: false, error: "Lần góp quỹ không sửa ở đây được." };
    const { userId } = await editableTrip(ex.tripId);
    const clean = await cleanExpense(ex.tripId, input);
    if (typeof clean === "string") return { ok: false, error: clean };
    const { shares, ...data } = clean;
    await prisma.$transaction([
      prisma.tripExpenseShare.deleteMany({ where: { expenseId } }),
      prisma.tripExpense.update({
        where: { id: expenseId },
        data: { ...data, editedAt: new Date(), editedById: userId, shares: { create: shares } },
      }),
    ]);
    await refreshMoney(ex.tripId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Lúc chi hợp lệ, hoặc mặc định "lúc ghi" (giờ VN). Ngày không đọc được thì cũng rơi về lúc ghi. */
function spentAt(day?: string | null, min?: number | null): { spentOn: Date; spentMin: number | null } {
  if (day && /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(`${day}T00:00:00Z`))) {
    const m = min == null ? null : Math.round(min);
    return { spentOn: new Date(`${day}T00:00:00Z`), spentMin: m != null && m >= 0 && m < 1440 ? m : null };
  }
  const now = vnDayMinute(new Date());
  return { spentOn: new Date(`${now.day}T00:00:00Z`), spentMin: now.min };
}

/** Góp quỹ chung — một hoặc nhiều người một lượt ("mỗi người góp 500k"). Mỗi người một dòng sổ. */
export async function addFundContributions(
  tripId: string,
  entries: { userId: string; amount: number }[],
): Promise<ActionResult> {
  const clean = entries
    .map((e) => ({ userId: e.userId, amount: Math.round(e.amount) }))
    .filter((e) => Number.isFinite(e.amount) && e.amount > 0);
  if (clean.length === 0) return { ok: false, error: "Chưa nhập số tiền góp." };
  if (clean.some((e) => e.amount > MAX_AMOUNT)) return { ok: false, error: "Số tiền lớn bất thường." };
  try {
    const { userId: me } = await editableTrip(tripId);
    const inTrip = new Set(await peopleInTrip(tripId, clean.map((e) => e.userId)));
    const rows = clean.filter((e) => inTrip.has(e.userId));
    if (rows.length === 0) return { ok: false, error: "Người góp không còn trong chuyến." };
    await prisma.tripExpense.createMany({
      data: rows.map((e) => ({
        tripId,
        title: "Góp quỹ",
        amount: e.amount,
        kind: "contribution",
        paidById: e.userId,
        createdById: me,
      })),
    });
    await refreshMoney(tripId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Đổi người giữ quỹ — người đó phải đang ở trong chuyến. */
export async function setFundKeeper(tripId: string, userId: string): Promise<ActionResult> {
  try {
    await editableTrip(tripId);
    const [keeper] = await peopleInTrip(tripId, [userId]);
    if (!keeper) return { ok: false, error: "Người này không còn trong chuyến." };
    await prisma.trip.update({ where: { id: tripId }, data: { fundKeeperId: keeper } });
    await refreshMoney(tripId);
    return { ok: true };
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
    await refreshMoney(ex.tripId);
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
    await refreshMoney(ex.tripId);
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
  trip: { id: string; title: string; version: number; placeName: string | null } | null;
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
  // Ngăn nổi chỉ xếp MỤC GỐC: thẻ hoạt động đi theo nơi của nó (kéo nơi là thẻ theo), nên chỉ ghi số.
  const doingCount = new Map<string, number>();
  for (const row of trip.items)
    if (row.parentId) doingCount.set(row.parentId, (doingCount.get(row.parentId) ?? 0) + 1);
  for (const row of trip.items) {
    if (row.parentId) continue;
    const item = bagItem(row);
    const n = doingCount.get(row.id);
    if (n) item.typeLabel = `${item.typeLabel}, kèm ${n} hoạt động`;
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
    trip: { id: trip.id, title: trip.title, version: trip.version, placeName: trip.place?.name ?? null },
    days,
    unscheduled,
    scheduledCount: trip.items.filter((r) => r.dayId).length,
    tripCount,
  };
}

const bagSelect = {
  id: true,
  title: true,
  version: true,
  place: { select: { name: true } },
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
      parentId: true,
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
