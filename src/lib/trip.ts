import "server-only";
import { prisma } from "@/lib/prisma";
import { coverUrl } from "@/lib/place-image";
import {
  SPOT_CATEGORY_LABELS,
  EATERY_CATEGORY_LABELS,
  ACCOMMODATION_CATEGORY_LABELS,
  ACTIVITY_CATEGORY_LABELS,
  label,
} from "@/lib/listing-labels";
import { scheduleDay, legKey, type ScheduleItemInput, type TripItemKind, type TripWarning } from "@/lib/trip-time";
import { getLegs, legMinutes } from "@/lib/trip-route";

// Lớp đọc dữ liệu của Lịch trình: nạp một Trip rồi QUY MỌI LOẠI MỤC VỀ MỘT HÌNH
// DẠNG CHUNG (ResolvedItem). Nhờ vậy UI và máy tính giờ chỉ phải biết một kiểu,
// không rẽ nhánh 5 lần ở khắp nơi.
//
// Exclusive arc: mỗi TripItem chỉ có đúng 1 FK được set — xem docs/lich-trinh.md §3.

export type ResolvedItem = {
  id: string; // id của TripItem (không phải của entity đích)
  kind: TripItemKind;
  dayId: string | null;
  order: number;
  note: string | null;
  stayMin: number | null;

  name: string;
  href: string | null; // null với mục tự nhập
  image: string | null;
  typeLabel: string; // "Địa điểm" · "Quán ăn" …
  categoryLabel: string | null;
  areaLabel: string | null; // địa chỉ rút gọn / tên nơi chứa

  lat: number | null;
  lng: number | null;
  openingHours: string | null;
  durationText: string | null;
  bestTime: string | null;
  notice: string | null;
};

export type TripDayData = {
  id: string;
  index: number;
  startMin: number;
  title: string | null;
  note: string | null;
  items: ResolvedItem[];
};

export type TripPerson = {
  id: string;
  name: string | null;
  image: string | null;
  isOwner: boolean;
};

export type TripData = {
  id: string;
  ownerId: string;
  title: string;
  summary: string | null;
  startDate: Date | null;
  partySize: number | null;
  shareId: string | null;
  visibility: "private" | "unlisted";
  isTemplate: boolean;
  slug: string | null;
  status: "draft" | "published";
  /** Khoá lạc quan — client gửi lại khi kéo–thả (docs/lich-trinh-cong-tac.md §3). */
  version: number;
  ownerName: string | null;
  memberIds: string[];
  /** Chủ chuyến + người đã nhận lời mời, chủ đứng đầu. KHÔNG gồm lời mời còn treo. */
  people: TripPerson[];
  place: { slug: string; name: string } | null;
  coverImage: string | null;
  days: TripDayData[];
  backlog: ResolvedItem[]; // mục CHƯA XẾP NGÀY (dayId = null)
  updatedAt: Date;
};

const TYPE_LABELS: Record<TripItemKind, string> = {
  spot: "Địa điểm",
  eatery: "Quán ăn",
  accommodation: "Nơi ở",
  activity: "Hoạt động",
  custom: "Tự thêm",
};

const imgSelect = { select: { url: true, isCover: true } } as const;

// Một truy vấn duy nhất cho cả cây Trip → Days → Items → 5 entity đích.
const tripInclude = {
  place: { select: { slug: true, name: true } },
  owner: { select: { id: true, name: true, image: true } },
  members: {
    orderBy: { createdAt: "asc" },
    select: { userId: true, user: { select: { name: true, image: true } } },
  },
  images: { where: { isCover: true }, take: 1, select: { url: true } },
  days: { orderBy: { index: "asc" } },
  items: {
    orderBy: { order: "asc" },
    include: {
      spot: {
        select: {
          slug: true, name: true, address: true, lat: true, lng: true,
          openingHours: true, category: true, bestTime: true, notice: true,
          images: imgSelect, place: { select: { name: true } },
        },
      },
      eatery: {
        select: {
          slug: true, name: true, address: true, lat: true, lng: true,
          openingHours: true, category: true, bestTime: true, notice: true,
          images: imgSelect, place: { select: { name: true } },
        },
      },
      accommodation: {
        select: {
          slug: true, name: true, address: true, lat: true, lng: true,
          category: true, notice: true,
          images: imgSelect, place: { select: { name: true } },
        },
      },
      activity: {
        select: {
          slug: true, name: true, durationText: true, seasonText: true, category: true,
          images: imgSelect, place: { select: { name: true } },
          // Activity không có toạ độ riêng — mượn của spot liên kết đầu tiên để
          // vẫn ước tính được quãng đường (xem docs/lich-trinh.md §5, cảnh báo ⚪).
          spotLinks: {
            orderBy: { order: "asc" },
            take: 1,
            select: { spot: { select: { lat: true, lng: true, address: true } } },
          },
        },
      },
    },
  },
} as const;

type RawTrip = NonNullable<Awaited<ReturnType<typeof findTrip>>>;
type RawItem = RawTrip["items"][number];

function findTrip(where: { id: string } | { shareId: string } | { slug: string }) {
  return prisma.trip.findUnique({ where: where as { id: string }, include: tripInclude });
}

// Đuôi địa chỉ sau khi bỏ đoạn trùng tên nơi chứa — cùng ý với `areaOf` của thẻ
// lưu trú: "TP. Phan Thiết" lặp ở mọi thẻ thì vô nghĩa, "Mũi Né" mới có ích.
function areaOf(address: string | null, placeName: string | null): string | null {
  if (!address) return placeName;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  const useful = parts.filter(
    (p) => !placeName || !p.toLowerCase().includes(placeName.toLowerCase()),
  );
  return useful[useful.length - 1] ?? placeName;
}

function resolveItem(item: RawItem): ResolvedItem {
  const base = {
    id: item.id,
    dayId: item.dayId,
    order: item.order,
    note: item.note,
    stayMin: item.stayMin,
    openingHours: null as string | null,
    durationText: null as string | null,
    bestTime: null as string | null,
    notice: null as string | null,
  };

  if (item.spot) {
    const s = item.spot;
    return {
      ...base, kind: "spot", name: s.name, href: `/dia-diem/${s.slug}`,
      image: coverUrl(s.images, s.slug, 200, 200),
      typeLabel: TYPE_LABELS.spot,
      categoryLabel: label(SPOT_CATEGORY_LABELS, s.category),
      areaLabel: areaOf(s.address, s.place?.name ?? null),
      lat: s.lat, lng: s.lng, openingHours: s.openingHours,
      durationText: null, bestTime: s.bestTime, notice: s.notice,
    };
  }
  if (item.eatery) {
    const e = item.eatery;
    return {
      ...base, kind: "eatery", name: e.name, href: null, // quán ăn không có trang riêng (popup)
      image: coverUrl(e.images, e.slug, 200, 200),
      typeLabel: TYPE_LABELS.eatery,
      categoryLabel: label(EATERY_CATEGORY_LABELS, e.category),
      areaLabel: areaOf(e.address, e.place?.name ?? null),
      lat: e.lat, lng: e.lng, openingHours: e.openingHours,
      durationText: null, bestTime: e.bestTime, notice: e.notice,
    };
  }
  if (item.accommodation) {
    const a = item.accommodation;
    return {
      ...base, kind: "accommodation", name: a.name, href: `/luu-tru/${a.slug}`,
      image: coverUrl(a.images, a.slug, 200, 200),
      typeLabel: TYPE_LABELS.accommodation,
      categoryLabel: label(ACCOMMODATION_CATEGORY_LABELS, a.category),
      areaLabel: areaOf(a.address, a.place?.name ?? null),
      lat: a.lat, lng: a.lng, openingHours: null,
      durationText: null, bestTime: null, notice: a.notice,
    };
  }
  if (item.activity) {
    const ac = item.activity;
    const borrowed = ac.spotLinks[0]?.spot ?? null;
    return {
      ...base, kind: "activity", name: ac.name, href: `/hoat-dong/${ac.slug}`,
      image: coverUrl(ac.images, ac.slug, 200, 200),
      typeLabel: TYPE_LABELS.activity,
      categoryLabel: label(ACTIVITY_CATEGORY_LABELS, ac.category),
      areaLabel: areaOf(borrowed?.address ?? null, ac.place?.name ?? null),
      lat: borrowed?.lat ?? null, lng: borrowed?.lng ?? null,
      openingHours: null, durationText: ac.durationText,
      bestTime: ac.seasonText, notice: null,
    };
  }
  // Mục tự nhập.
  return {
    ...base, kind: "custom", name: item.customTitle ?? "Mục tự thêm", href: null,
    image: null, typeLabel: TYPE_LABELS.custom, categoryLabel: null, areaLabel: null,
    lat: item.customLat, lng: item.customLng,
    durationText: null, bestTime: null, notice: null, openingHours: null,
  };
}

function shape(trip: RawTrip): TripData {
  const items = trip.items.map(resolveItem);
  return {
    id: trip.id,
    ownerId: trip.ownerId,
    title: trip.title,
    summary: trip.summary,
    startDate: trip.startDate,
    partySize: trip.partySize,
    shareId: trip.shareId,
    visibility: trip.visibility,
    isTemplate: trip.isTemplate,
    slug: trip.slug,
    status: trip.status,
    version: trip.version,
    ownerName: trip.owner?.name ?? null,
    memberIds: trip.members.map((m) => m.userId),
    people: [
      // Chủ chuyến luôn đứng đầu — cụm avatar chồng đọc từ trái sang.
      { id: trip.ownerId, name: trip.owner?.name ?? null, image: trip.owner?.image ?? null, isOwner: true },
      ...trip.members.map((m) => ({
        id: m.userId,
        name: m.user?.name ?? null,
        image: m.user?.image ?? null,
        isOwner: false,
      })),
    ],
    place: trip.place,
    coverImage: trip.images[0]?.url ?? null,
    days: trip.days.map((d) => ({
      id: d.id,
      index: d.index,
      startMin: d.startMin,
      title: d.title,
      note: d.note,
      items: items.filter((i) => i.dayId === d.id).sort((a, b) => a.order - b.order),
    })),
    backlog: items.filter((i) => i.dayId === null).sort((a, b) => a.order - b.order),
    updatedAt: trip.updatedAt,
  };
}

export async function getTripById(id: string): Promise<TripData | null> {
  const trip = await findTrip({ id });
  return trip ? shape(trip) : null;
}

export async function getTripByShareId(shareId: string): Promise<TripData | null> {
  const trip = await prisma.trip.findUnique({ where: { shareId }, include: tripInclude });
  return trip ? shape(trip) : null;
}

export async function getTemplateBySlug(slug: string): Promise<TripData | null> {
  const trip = await prisma.trip.findUnique({ where: { slug }, include: tripInclude });
  return trip && trip.isTemplate ? shape(trip) : null;
}

// ── Dựng khung nhìn đã tính giờ ──────────────────────────────────────────
// Dùng chung cho CẢ BA trang (soạn · bản chia sẻ · lịch trình mẫu) — nếu để
// mỗi trang tự tính thì ba nơi sẽ trôi khác nhau lúc nào không hay.

export type ItemView = ResolvedItem & {
  arriveMin: number;
  leaveMin: number;
  effectiveStayMin: number;
  driveToNextMin: number | null;
  driveApprox: boolean;
  warnings: TripWarning[];
};

export type DayView = {
  id: string;
  index: number;
  startMin: number;
  title: string | null;
  note: string | null;
  dateLabel: string | null;
  items: ItemView[];
  endMin: number;
  driveMin: number;
  warnings: TripWarning[];
};

export async function buildDayViews(trip: TripData): Promise<DayView[]> {
  return Promise.all(
    trip.days.map(async (day) => {
      const legs = await getLegs(
        day.items.map((i) => ({ id: i.id, lat: i.lat, lng: i.lng })),
      );
      const sched = scheduleDay(day.startMin, day.items.map(toScheduleInput), legMinutes(legs));

      const items: ItemView[] = day.items.map((item, i) => {
        const s = sched.items[i];
        const next = day.items[i + 1];
        return {
          ...item,
          arriveMin: s.arriveMin,
          leaveMin: s.leaveMin,
          effectiveStayMin: s.stayMin,
          driveToNextMin: s.driveToNextMin,
          driveApprox: next ? (legs[legKey(item.id, next.id)]?.approx ?? false) : false,
          warnings: s.warnings,
        };
      });

      return {
        id: day.id,
        index: day.index,
        startMin: day.startMin,
        title: day.title,
        note: day.note,
        dateLabel: labelOfDate(dateOfDay(trip.startDate, day.index)),
        items,
        endMin: sched.endMin,
        driveMin: sched.driveMin,
        warnings: sched.warnings,
      };
    }),
  );
}

function labelOfDate(d: Date | null): string | null {
  if (!d) return null;
  return d.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
  });
}

/** Chuyển ResolvedItem sang đầu vào của máy tính giờ. */
function toScheduleInput(item: ResolvedItem): ScheduleItemInput {
  return {
    id: item.id,
    kind: item.kind,
    name: item.name,
    stayMin: item.stayMin,
    durationText: item.durationText,
    openingHours: item.openingHours,
    lat: item.lat,
    lng: item.lng,
  };
}

/** Ngày thật của một ngày trong lịch (null nếu chuyến chưa định ngày). */
function dateOfDay(startDate: Date | null, index: number): Date | null {
  if (!startDate) return null;
  const d = new Date(startDate);
  d.setDate(d.getDate() + index);
  return d;
}

export type TripNoteRow = {
  id: string;
  body: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: { name: string | null; image: string | null } | null;
};

// Ghi chú của một chuyến. Ghim lên đầu, còn lại MỚI NHẤT TRƯỚC: mẩu vừa thêm là
// mẩu đang nghĩ tới. Mẩu tham chiếu (mã đặt phòng) chìm dần thì ghim, chứ không
// dựng thêm sắp xếp tay.
export function getTripNotes(tripId: string): Promise<TripNoteRow[]> {
  return prisma.tripNote.findMany({
    where: { tripId },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    select: {
      id: true, body: true, isPinned: true, createdAt: true, updatedAt: true,
      author: { select: { name: true, image: true } },
    },
  });
}

export type TripPackRow = {
  id: string;
  name: string;
  scope: "group" | "personal";
  /** Đã quy về "của người đang xem": món chung lấy cờ chung, món riêng lấy tick của chính họ. */
  isReady: boolean;
  isPacked: boolean;
  /** Chỉ món chung mới có người nhận. */
  assignee: { id: string; name: string | null; image: string | null } | null;
};

/**
 * Đồ mang theo, ĐÃ QUY VỀ GÓC NHÌN của một người:
 *   • món `group`    → hai cờ trên chính bản ghi (Minh xếp rồi là cả nhóm xong);
 *   • món `personal` → tick riêng của người đang xem trong `TripPackCheck`;
 *     chưa có bản ghi nghĩa là chưa tick.
 * Nhờ vậy giao diện chỉ phải biết MỘT hình dạng hàng, không rẽ nhánh khắp nơi.
 *
 * Thứ tự THÊM VÀO, cố định — KHÔNG đẩy món đã xong xuống cuối: tick ba món liên
 * tiếp mà danh sách nhảy loạn dưới tay thì không ai tick tiếp.
 */
export async function getTripPackItems(
  tripId: string,
  viewerId: string,
): Promise<TripPackRow[]> {
  const rows = await prisma.tripPackItem.findMany({
    where: { tripId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, name: true, scope: true, isReady: true, isPacked: true,
      assignee: { select: { id: true, name: true, image: true } },
      checks: { where: { userId: viewerId }, select: { isReady: true, isPacked: true } },
    },
  });

  return rows.map((r) => {
    const mine = r.checks[0];
    return {
      id: r.id,
      name: r.name,
      scope: r.scope,
      assignee: r.scope === "group" ? r.assignee : null,
      isReady: r.scope === "group" ? r.isReady : (mine?.isReady ?? false),
      isPacked: r.scope === "group" ? r.isPacked : (mine?.isPacked ?? false),
    };
  });
}

export type TripExpenseRow = {
  id: string;
  title: string;
  amount: number;
  paidBy: { id: string; name: string | null; image: string | null } | null;
  shareIds: string[];
  /** Khác null = đã xoá mềm — nằm ở mục "Đã xoá", KHÔNG tính vào sổ. */
  deletedAt: Date | null;
  deletedBy: { name: string | null } | null;
};

// Khoản chi của một chuyến, mới nhất trước: sổ chi tiêu thì thứ vừa tiêu là thứ
// người ta vừa nghĩ tới.
export async function getTripExpenses(tripId: string): Promise<TripExpenseRow[]> {
  const rows = await prisma.tripExpense.findMany({
    where: { tripId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, amount: true, deletedAt: true,
      paidBy: { select: { id: true, name: true, image: true } },
      deletedBy: { select: { name: true } },
      shares: { select: { userId: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    amount: r.amount,
    paidBy: r.paidBy,
    shareIds: r.shares.map((s) => s.userId),
    deletedAt: r.deletedAt,
    deletedBy: r.deletedBy,
  }));
}
