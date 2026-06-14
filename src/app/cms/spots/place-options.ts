import { prisma } from "@/lib/prisma";
import type { PlaceOption } from "./spot-form";

// Danh sách Place để chọn "nơi chứa" (gồm cả tỉnh & điểm đến), kèm gợi ý ngữ cảnh.
export async function getPlaceOptions(): Promise<PlaceOption[]> {
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
