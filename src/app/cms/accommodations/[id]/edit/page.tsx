import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { FormSection } from "@/components/cms/form-section";
import { ListingImages } from "@/components/cms/listing-images";
import {
  AccommodationForm,
  type AccommodationFormValues,
} from "../../accommodation-form";
import { getPlaceOptions } from "../../options";

export default async function EditAccommodationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [acc, places, images] = await Promise.all([
    prisma.accommodation.findUnique({
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
        phone: true,
        website: true,
        bookingUrl: true,
        zalo: true,
        facebookUrl: true,
        isVerified: true,
        verifiedNote: true,
        depositPolicy: true,
        notice: true,
        tags: true,
      },
    }),
    getPlaceOptions(),
    prisma.image.findMany({
      where: { accommodationId: id },
      orderBy: [{ isCover: "desc" }, { order: "asc" }],
      select: { id: true, url: true, alt: true, isCover: true },
    }),
  ]);

  if (!acc) notFound();

  const initial: Partial<AccommodationFormValues> = {
    name: acc.name,
    slug: acc.slug,
    description: acc.description ?? "",
    category: acc.category ?? "",
    placeId: acc.placeId,
    address: acc.address ?? "",
    lat: acc.lat?.toString() ?? "",
    lng: acc.lng?.toString() ?? "",
    phone: acc.phone ?? "",
    website: acc.website ?? "",
    bookingUrl: acc.bookingUrl ?? "",
    zalo: acc.zalo ?? "",
    facebookUrl: acc.facebookUrl ?? "",
    isVerified: acc.isVerified,
    verifiedNote: acc.verifiedNote ?? "",
    depositPolicy: acc.depositPolicy ?? "",
    notice: acc.notice ?? "",
    tags: acc.tags.join(", "),
  };

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      <Link
        href={`/cms/accommodations/${acc.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {acc.name}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Sửa: {acc.name}
      </h1>

      <div className="mt-4">
        <AccommodationForm
          mode="edit"
          accommodationId={acc.id}
          places={places}
          initial={initial}
        />
      </div>

      <div className="border-t">
        <FormSection
          title="Ảnh"
          description="Tải ảnh cho cơ sở. Ảnh bìa hiển thị ở danh sách & trang."
        >
          <ListingImages
            ownerType="accommodation"
            ownerId={acc.id}
            images={images}
          />
        </FormSection>
      </div>
    </div>
  );
}
