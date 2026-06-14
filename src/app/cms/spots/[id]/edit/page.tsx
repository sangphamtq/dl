import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { FormSection } from "@/components/cms/form-section";
import { ListingImages } from "@/components/cms/listing-images";
import { SpotForm, type SpotFormValues } from "../../spot-form";
import { getPlaceOptions } from "../../place-options";

export default async function EditSpotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [spot, places, images] = await Promise.all([
    prisma.spot.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: true,
        placeId: true,
        address: true,
        lat: true,
        lng: true,
        openingHours: true,
        phone: true,
        website: true,
        bookingUrl: true,
        priceRange: true,
        bestTime: true,
        ticketInfo: true,
        notice: true,
        tags: true,
      },
    }),
    getPlaceOptions(),
    prisma.image.findMany({
      where: { spotId: id },
      orderBy: [{ isCover: "desc" }, { order: "asc" }],
      select: { id: true, url: true, alt: true, isCover: true },
    }),
  ]);

  if (!spot) notFound();

  const initial: Partial<SpotFormValues> = {
    name: spot.name,
    slug: spot.slug,
    description: spot.description ?? "",
    category: spot.category ?? "",
    placeId: spot.placeId,
    address: spot.address ?? "",
    lat: spot.lat?.toString() ?? "",
    lng: spot.lng?.toString() ?? "",
    openingHours: spot.openingHours ?? "",
    phone: spot.phone ?? "",
    website: spot.website ?? "",
    bookingUrl: spot.bookingUrl ?? "",
    priceRange: spot.priceRange ?? "",
    bestTime: spot.bestTime ?? "",
    ticketInfo: spot.ticketInfo ?? "",
    notice: spot.notice ?? "",
    tags: spot.tags.join(", "),
  };

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      <Link
        href={`/cms/spots/${spot.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {spot.name}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Sửa: {spot.name}
      </h1>

      <div className="mt-4">
        <SpotForm
          mode="edit"
          spotId={spot.id}
          places={places}
          initial={initial}
        />
      </div>

      <div className="border-t">
        <FormSection
          title="Ảnh"
          description="Tải ảnh cho địa điểm. Ảnh bìa hiển thị ở danh sách & trang."
        >
          <ListingImages ownerType="spot" ownerId={spot.id} images={images} />
        </FormSection>
      </div>
    </div>
  );
}
