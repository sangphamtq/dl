import { prisma } from "@/lib/prisma";

export type Option = { id: string; label: string };

export async function getPlaceOptions(): Promise<Option[]> {
  const places = await prisma.place.findMany({
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      kind: true,
      parent: { select: { name: true } },
    },
  });
  return places.map((p) => ({
    id: p.id,
    label:
      p.kind === "province"
        ? `${p.name} · Tỉnh`
        : `${p.name}${p.parent ? ` · ${p.parent.name}` : ""}`,
  }));
}

// Quán ăn để liên kết M:N (kèm nơi để phân biệt).
export async function getEateryOptions(): Promise<Option[]> {
  const eateries = await prisma.eatery.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, place: { select: { name: true } } },
  });
  return eateries.map((e) => ({ id: e.id, label: `${e.name} · ${e.place.name}` }));
}
