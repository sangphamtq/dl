import { prisma } from "@/lib/prisma";

export type Option = { id: string; label: string };

// Place để chọn "nơi" của hoạt động (tỉnh & điểm đến).
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
        ? p.name
        : `${p.name}${p.parent ? ` · ${p.parent.name}` : ""}`,
  }));
}

// Spot để liên kết M:N.
export async function getSpotOptions(): Promise<Option[]> {
  const spots = await prisma.spot.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return spots.map((s) => ({ id: s.id, label: s.name }));
}
