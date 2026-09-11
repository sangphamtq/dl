import { prisma } from "@/lib/prisma";

export type PlaceFilterOption = {
  id: string;
  name: string;
  kind: "province" | "destination";
  parentName: string | null;
};

export async function getPlaceFilterOptions(): Promise<PlaceFilterOption[]> {
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
    name: p.name,
    kind: p.kind,
    parentName: p.parent?.name ?? null,
  }));
}

export async function resolvePlaceIds(
  place: string | undefined,
): Promise<string[] | null> {
  if (!place || place === "all") return null;
  const p = await prisma.place.findUnique({
    where: { id: place },
    select: { id: true, kind: true, children: { select: { id: true } } },
  });
  if (!p) return null;
  return p.kind === "province"
    ? [p.id, ...p.children.map((c) => c.id)]
    : [p.id];
}
