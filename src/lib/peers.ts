import { prisma } from "@/lib/prisma";

export type PeerItem = {
  slug: string;
  name: string;
  images: { url: string; isCover: boolean }[];
};

export async function getListingPeers(
  model: "spot" | "activity" | "accommodation",
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
