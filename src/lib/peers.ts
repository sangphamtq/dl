import { prisma } from "@/lib/prisma";
import { REGION_LABELS, regionOf } from "@/lib/regions";

export type PeerItem = {
  slug: string;
  name: string;
  images: { url: string; isCover: boolean }[];
};

// Mọi điểm đến lớn (đã xuất bản) gom theo miền — cho thanh chuyển nhanh ở
// trang điểm đến và các trang danh sách listing của nó.
export async function getDestinationPeerGroups(): Promise<
  { label: string; items: PeerItem[] }[]
> {
  const all = await prisma.place.findMany({
    where: { status: "published", kind: "destination" },
    orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
    select: {
      slug: true,
      name: true,
      parent: { select: { slug: true } },
      images: { where: { isCover: true }, take: 1, select: { url: true, isCover: true } },
    },
  });
  return REGION_LABELS.map((label) => ({
    label,
    items: all
      .filter((d) => regionOf(d.parent?.slug) === label)
      .map((d) => ({ slug: d.slug, name: d.name, images: d.images })),
  })).filter((g) => g.items.length > 0);
}

// Các listing CÙNG LOẠI, CÙNG nơi (place), đã xuất bản — gồm cả chính nó để
// thanh chuyển nhanh làm nổi mục đang xem.
export async function getListingPeers(
  model: "spot" | "activity",
  placeId: string,
): Promise<PeerItem[]> {
  const delegate = prisma[model] as unknown as {
    findMany: (args: unknown) => Promise<PeerItem[]>;
  };
  return delegate.findMany({
    where: { placeId, status: "published" },
    orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
    take: 30,
    select: {
      slug: true,
      name: true,
      images: {
        where: { isCover: true },
        take: 1,
        select: { url: true, isCover: true },
      },
    },
  });
}
