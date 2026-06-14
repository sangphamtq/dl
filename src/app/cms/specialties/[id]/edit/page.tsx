import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { FormSection } from "@/components/cms/form-section";
import { ListingImages } from "@/components/cms/listing-images";
import { SpecialtyForm, type SpecialtyFormValues } from "../../specialty-form";
import { getPlaceOptions, getEateryOptions } from "../../options";

export default async function EditSpecialtyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [specialty, places, eateries, images] = await Promise.all([
    prisma.specialty.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        kind: true,
        whereToBuy: true,
        priceRange: true,
        placeId: true,
        tags: true,
        eateries: { select: { id: true } },
      },
    }),
    getPlaceOptions(),
    getEateryOptions(),
    prisma.image.findMany({
      where: { specialtyId: id },
      orderBy: [{ isCover: "desc" }, { order: "asc" }],
      select: { id: true, url: true, alt: true, isCover: true },
    }),
  ]);

  if (!specialty) notFound();

  const initial: Partial<SpecialtyFormValues> = {
    name: specialty.name,
    slug: specialty.slug,
    description: specialty.description ?? "",
    kind: specialty.kind,
    whereToBuy: specialty.whereToBuy ?? "",
    priceRange: specialty.priceRange ?? "",
    placeId: specialty.placeId,
    eateryIds: specialty.eateries.map((e) => e.id),
    tags: specialty.tags.join(", "),
  };

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      <Link
        href={`/cms/specialties/${specialty.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {specialty.name}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Sửa: {specialty.name}
      </h1>

      <div className="mt-4">
        <SpecialtyForm
          mode="edit"
          specialtyId={specialty.id}
          places={places}
          eateries={eateries}
          initial={initial}
        />
      </div>

      <div className="border-t">
        <FormSection
          title="Ảnh"
          description="Tải ảnh cho đặc sản. Ảnh bìa hiển thị ở danh sách & trang."
        >
          <ListingImages
            ownerType="specialty"
            ownerId={specialty.id}
            images={images}
          />
        </FormSection>
      </div>
    </div>
  );
}
