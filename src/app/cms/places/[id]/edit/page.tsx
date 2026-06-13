import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PlaceForm, type PlaceFormValues } from "../../place-form";
import { PlaceImages } from "../../place-images";

export default async function EditPlacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [place, provinces, images] = await Promise.all([
    prisma.place.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        kind: true,
        parentId: true,
        tagline: true,
        description: true,
        tags: true,
        status: true,
        isFeatured: true,
        order: true,
      },
    }),
    prisma.place.findMany({
      where: { kind: "province" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.image.findMany({
      where: { placeId: id },
      orderBy: [{ isCover: "desc" }, { order: "asc" }],
      select: { id: true, url: true, alt: true, isCover: true },
    }),
  ]);

  if (!place) notFound();

  // Loại bỏ chính nó khỏi danh sách tỉnh cha (không tự làm cha mình).
  const parentOptions = provinces.filter((p) => p.id !== place.id);

  const initial: Partial<PlaceFormValues> = {
    name: place.name,
    slug: place.slug,
    kind: place.kind,
    parentId: place.parentId,
    tagline: place.tagline ?? "",
    description: place.description ?? "",
    tags: place.tags.join(", "),
    status: place.status,
    isFeatured: place.isFeatured,
    order: place.order?.toString() ?? "",
  };

  return (
    <div className="p-6 sm:p-8">
      <Link
        href={`/cms/places/${place.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {place.name}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Sửa: {place.name}
      </h1>

      <div className="mt-8">
        <PlaceForm
          mode="edit"
          placeId={place.id}
          provinces={parentOptions}
          initial={initial}
        />
      </div>

      <div className="mt-10 max-w-2xl">
        <h2 className="text-lg font-semibold tracking-tight">Ảnh</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tải ảnh cho nơi này. Ảnh bìa hiển thị ở danh sách & hero trang.
        </p>
        <div className="mt-4">
          <PlaceImages placeId={place.id} images={images} />
        </div>
      </div>
    </div>
  );
}
