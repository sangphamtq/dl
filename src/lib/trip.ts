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
import { scheduleDay, type ScheduleItemInput, type TripItemKind, type TripWarning } from "@/lib/trip-time";
import { getLegs, legMinutes } from "@/lib/trip-route";

export type ResolvedItem = {
  id: string;
  kind: TripItemKind;
  dayId: string | null;
  order: number;
  note: string | null;
  stayMin: number | null;

  name: string;
  href: string | null;
  image: string | null;
  typeLabel: string;
  categoryLabel: string | null;
  areaLabel: string | null;

  lat: number | null;
  lng: number | null;
  openingHours: string | null;
  durationText: string | null;
  bestTime: string | null;
  notice: string | null;
  /** Chỉ mục kind=spot: id của Spot — để biết một hoạt động có đang ở ĐÚNG chỗ của nó không. */
  spotId: string | null;
  /** Chỉ mục kind=activity: các nơi diễn ra hoạt động này (thứ tự biên tập). */
  atSpots: { id: string; name: string }[];
  /** Chỉ mục kind=custom: một NƠI tự gõ ("Nhà bạn Minh"), không phải một việc. */
  customPlace: boolean;
  /** Mục gốc mà việc này THUỘC về (hàng "Ở đâu | Làm gì"); null = mục gốc. */
  parentId: string | null;
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
  autoTravel: boolean;
  shareId: string | null;
  visibility: "private" | "unlisted";
  isTemplate: boolean;
  slug: string | null;
  status: "draft" | "published";
  version: number;
  ownerName: string | null;
  memberIds: string[];
  /** Chủ chuyến + người đã nhận lời mời, chủ đứng đầu. KHÔNG gồm lời mời còn treo. */
  people: TripPerson[];
  place: { slug: string; name: string } | null;
  coverImage: string | null;
  /**
   * Ảnh THẬT cho dải ảnh đầu trang soạn: ảnh điểm đến, không có thì ảnh BÌA của điểm dừng đầu
   * tiên (chuyến nhân bản không mang `placeId` theo). Chỉ ảnh bìa — ảnh menu không bao giờ là bìa.
   */
  days: TripDayData[];
  backlog: ResolvedItem[];
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

const tripInclude = {
  place: {
    select: {
      slug: true,
      name: true,
    },
  },
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
          spotLinks: {
            orderBy: { order: "asc" },
            select: { spot: { select: { id: true, name: true, lat: true, lng: true, address: true } } },
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
    spotId: item.spotId,
    atSpots: [] as { id: string; name: string }[],
    customPlace: item.customPlace ?? false,
    parentId: item.parentId ?? null,
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
      atSpots: ac.spotLinks.map((l) => ({ id: l.spot.id, name: l.spot.name })),
    };
  }
  return {
    ...base, kind: "custom", name: item.customTitle ?? "Mục tự thêm", href: null,
    image: null, typeLabel: TYPE_LABELS.custom, categoryLabel: null, areaLabel: null,
    lat: item.customLat, lng: item.customLng,
    durationText: null, bestTime: null, notice: null, openingHours: null,
  };
}

/**
 * Thứ tự phẳng của một vùng: mỗi mục gốc rồi NGAY SAU là các việc của nó. `order` của mục con
 * đếm trong cha, của mục gốc đếm trong vùng — sắp chung một lượt là xáo lẫn nhau.
 * Mục con mà cha không ở cùng vùng (dữ liệu lệch) thì coi như mục gốc, đừng làm mất nó.
 */
function flatten(list: ResolvedItem[]): ResolvedItem[] {
  const ids = new Set(list.map((i) => i.id));
  const byOrder = (a: ResolvedItem, b: ResolvedItem) => a.order - b.order;
  const kids = new Map<string, ResolvedItem[]>();
  const tops: ResolvedItem[] = [];
  for (const i of list) {
    if (i.parentId && ids.has(i.parentId)) {
      const k = kids.get(i.parentId);
      if (k) k.push(i);
      else kids.set(i.parentId, [i]);
    } else tops.push(i.parentId ? { ...i, parentId: null } : i);
  }
  return tops.sort(byOrder).flatMap((t) => [t, ...(kids.get(t.id) ?? []).sort(byOrder)]);
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
    // `?? true`: server dev chưa khởi động lại sau migration giữ Prisma client cũ, đọc ra
    // undefined — đừng để nó lặng lẽ tắt việc tính đường của mọi chuyến.
    autoTravel: trip.autoTravel ?? true,
    shareId: trip.shareId,
    visibility: trip.visibility,
    isTemplate: trip.isTemplate,
    slug: trip.slug,
    status: trip.status,
    version: trip.version,
    ownerName: trip.owner?.name ?? null,
    memberIds: trip.members.map((m) => m.userId),
    people: [
      { id: trip.ownerId, name: trip.owner?.name ?? null, image: trip.owner?.image ?? null, isOwner: true },
      ...trip.members.map((m) => ({
        id: m.userId,
        name: m.user?.name ?? null,
        image: m.user?.image ?? null,
        isOwner: false,
      })),
    ],
    place: trip.place
      ? { slug: trip.place.slug, name: trip.place.name }
      : null,
    coverImage: trip.images[0]?.url ?? null,
    days: trip.days.map((d) => ({
      id: d.id,
      index: d.index,
      startMin: d.startMin,
      title: d.title,
      note: d.note,
      items: flatten(items.filter((i) => i.dayId === d.id)),
    })),
    backlog: flatten(items.filter((i) => i.dayId === null)),
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

export type ItemView = ResolvedItem & {
  arriveMin: number;
  leaveMin: number;
  effectiveStayMin: number;
  driveToNextMin: number | null;
  driveApprox: boolean;
  driveKm: number | null;
  legHidden: boolean;
  /** Hoạt động đang ở TRONG nơi phía trên nó — vẽ thành mục con, không số. */
  nested: boolean;
  /** Số thứ tự chỉ đếm ĐIỂM DỪNG (mục con không lấy số). */
  stopNo: number | null;
  /** "tại …" — nơi diễn ra một hoạt động. */
  atName: string | null;
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
      // Chỉ những mục CÓ toạ độ mới là điểm trên tuyến — việc (đặt xe, chờ người…)
      // nằm giữa hai nơi không được cắt đôi chặng.
      // Hoạt động đang lồng dưới nơi của nó cũng vậy: nó diễn ra TẠI nơi đó.
      // Tắt tự tính thì KHÔNG gọi OSRM luôn — đỡ một lượt mạng cho mỗi chặng.
      // Việc diễn ra TẠI nơi của nó: không có chặng tới nó, không nằm trên tuyến.
      const anchors = day.items.map((i) =>
        i.parentId ? day.items.findIndex((p) => p.id === i.parentId) : null,
      );
      const legs = trip.autoTravel
        ? await getLegs(
            day.items
              .filter((i, k) => i.lat != null && i.lng != null && anchors[k] == null)
              .map((i) => ({ id: i.id, lat: i.lat, lng: i.lng })),
          )
        : {};
      const sched = scheduleDay(
        day.startMin,
        day.items.map((item, k) => ({ ...toScheduleInput(item), inPlace: anchors[k] != null })),
        legMinutes(legs),
        { travel: trip.autoTravel },
      );

      let stop = 0;
      const items: ItemView[] = day.items.map((item, i) => {
        const s = sched.items[i];
        const anchor = anchors[i];
        return {
          ...item,
          nested: anchor != null,
          stopNo: anchor != null ? null : ++stop,
          atName:
            anchor != null
              ? day.items[anchor].name
              : item.kind === "activity"
                ? (item.atSpots[0]?.name ?? null)
                : null,
          arriveMin: s.arriveMin,
          leaveMin: s.leaveMin,
          effectiveStayMin: s.stayMin,
          driveToNextMin: s.driveToNextMin,
          driveApprox: s.legKey ? (legs[s.legKey]?.approx ?? false) : false,
          driveKm: s.legKey ? (legs[s.legKey]?.km ?? null) : null,
          legHidden: s.legHidden,
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
    customPlace: item.customPlace,
  };
}

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
  isReady: boolean;
  isPacked: boolean;
  assignee: { id: string; name: string | null; image: string | null } | null;
};

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
