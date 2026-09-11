import { prisma } from "@/lib/prisma";

const VIEW_ENTITIES = [
  "place",
  "activity",
  "spot",
  "eatery",
  "accommodation",
] as const;
export type ViewEntity = (typeof VIEW_ENTITIES)[number];

export function isViewEntity(v: unknown): v is ViewEntity {
  return typeof v === "string" && (VIEW_ENTITIES as readonly string[]).includes(v);
}

function todayUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function daysAgoUTC(days: number): Date {
  const d = todayUTC();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

export async function recordView(
  entityType: ViewEntity,
  entityId: string,
): Promise<void> {
  const date = todayUTC();
  const ops: Promise<unknown>[] = [
    prisma.viewStat.upsert({
      where: { entityType_entityId_date: { entityType, entityId, date } },
      create: { entityType, entityId, date, count: 1 },
      update: { count: { increment: 1 } },
    }),
  ];

  if (entityType === "place") {
    ops.push(
      prisma.place.update({
        where: { id: entityId },
        data: { viewCount: { increment: 1 } },
      }),
    );
  } else {
    const model = prisma[entityType] as unknown as {
      update: (args: unknown) => Promise<unknown>;
    };
    ops.push(
      model.update({
        where: { id: entityId },
        data: { popularity: { increment: 1 } },
      }),
    );
  }

  await prisma.$transaction(ops as never);
}

function ymdUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const ENTITY_META: Record<ViewEntity, { label: string; cmsBase: string }> = {
  place: { label: "Điểm đến", cmsBase: "/cms/places" },
  activity: { label: "Hoạt động", cmsBase: "/cms/activities" },
  spot: { label: "Địa điểm nhỏ", cmsBase: "/cms/spots" },
  eatery: { label: "Quán ăn", cmsBase: "/cms/eateries" },
  accommodation: { label: "Lưu trú", cmsBase: "/cms/accommodations" },
};

export type DailyPoint = {
  date: string;
  place: number;
  listing: number;
  total: number;
};

export async function getDailySeries(days: number): Promise<DailyPoint[]> {
  const rows = await prisma.viewStat.groupBy({
    by: ["date", "entityType"],
    where: { date: { gte: daysAgoUTC(days - 1) } },
    _sum: { count: true },
  });

  const byDate = new Map<string, { place: number; listing: number }>();
  for (const r of rows) {
    const key = ymdUTC(r.date);
    const bucket = byDate.get(key) ?? { place: 0, listing: 0 };
    const n = r._sum.count ?? 0;
    if (r.entityType === "place") bucket.place += n;
    else bucket.listing += n;
    byDate.set(key, bucket);
  }

  const out: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = ymdUTC(daysAgoUTC(i));
    const b = byDate.get(key) ?? { place: 0, listing: 0 };
    out.push({ date: key, place: b.place, listing: b.listing, total: b.place + b.listing });
  }
  return out;
}

export type PeriodTotals = { total: number; place: number; listing: number };

export async function getPeriodTotals(days: number): Promise<PeriodTotals> {
  const rows = await prisma.viewStat.groupBy({
    by: ["entityType"],
    where: { date: { gte: daysAgoUTC(days - 1) } },
    _sum: { count: true },
  });
  let place = 0;
  let listing = 0;
  for (const r of rows) {
    const n = r._sum.count ?? 0;
    if (r.entityType === "place") place += n;
    else listing += n;
  }
  return { total: place + listing, place, listing };
}

export type TopEntity = {
  entityType: string;
  entityId: string;
  count: number;
  name: string;
  label: string;
  href: string;
};

async function resolveNames(
  items: { entityType: string; entityId: string }[],
): Promise<Map<string, string>> {
  const byType = new Map<string, string[]>();
  for (const it of items) {
    const arr = byType.get(it.entityType) ?? [];
    arr.push(it.entityId);
    byType.set(it.entityType, arr);
  }
  const out = new Map<string, string>();
  await Promise.all(
    [...byType.entries()].map(async ([type, ids]) => {
      const model = prisma[type as ViewEntity] as unknown as {
        findMany: (args: unknown) => Promise<{ id: string; name: string }[]>;
      };
      const rows = await model.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      });
      for (const r of rows) out.set(`${type}:${r.id}`, r.name);
    }),
  );
  return out;
}

export async function getTopEntities(
  days: number,
  scope: "place" | "listing",
  limit = 10,
): Promise<TopEntity[]> {
  const where =
    scope === "place"
      ? { entityType: "place", date: { gte: daysAgoUTC(days - 1) } }
      : { entityType: { not: "place" }, date: { gte: daysAgoUTC(days - 1) } };

  const rows = await prisma.viewStat.groupBy({
    by: ["entityType", "entityId"],
    where,
    _sum: { count: true },
    orderBy: { _sum: { count: "desc" } },
    take: limit,
  });

  const names = await resolveNames(rows);
  return rows.map((r) => {
    const meta = ENTITY_META[r.entityType as ViewEntity];
    return {
      entityType: r.entityType,
      entityId: r.entityId,
      count: r._sum.count ?? 0,
      name: names.get(`${r.entityType}:${r.entityId}`) ?? "(đã xoá)",
      label: meta?.label ?? r.entityType,
      href: meta ? `${meta.cmsBase}/${r.entityId}` : "#",
    };
  });
}
