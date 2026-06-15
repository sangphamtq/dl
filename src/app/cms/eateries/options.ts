import { prisma } from "@/lib/prisma";

// Place để chọn "nơi chứa" quán, kèm vị trí hành chính để tự điền cho quán.
export type Option = {
  id: string;
  label: string;
  provinceCode: number | null;
  provinceName: string | null;
  districtCode: number | null;
  districtName: string | null;
  wardCode: number | null;
  wardName: string | null;
};

export async function getPlaceOptions(): Promise<Option[]> {
  const places = await prisma.place.findMany({
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      kind: true,
      parent: { select: { name: true } },
      provinceCode: true,
      provinceName: true,
      districtCode: true,
      districtName: true,
      wardCode: true,
      wardName: true,
    },
  });
  return places.map((p) => ({
    id: p.id,
    label:
      p.kind === "province"
        ? p.name
        : `${p.name}${p.parent ? ` · ${p.parent.name}` : ""}`,
    provinceCode: p.provinceCode,
    provinceName: p.provinceName,
    districtCode: p.districtCode,
    districtName: p.districtName,
    wardCode: p.wardCode,
    wardName: p.wardName,
  }));
}
