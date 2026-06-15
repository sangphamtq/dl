import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getProvinces } from "@/lib/locations";
import { FormSection } from "@/components/cms/form-section";
import { ListingImages } from "@/components/cms/listing-images";
import { EateryForm, type EateryFormValues } from "../../eatery-form";
import { getPlaceOptions } from "../../options";

export default async function EditEateryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [eatery, places, adminProvinces, images] = await Promise.all([
    prisma.eatery.findUnique({
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
        mapUrl: true,
        priceRange: true,
        meals: true,
        notice: true,
        tags: true,
        provinceCode: true,
        provinceName: true,
        districtCode: true,
        districtName: true,
        wardCode: true,
        wardName: true,
      },
    }),
    getPlaceOptions(),
    getProvinces(),
    prisma.image.findMany({
      where: { eateryId: id },
      orderBy: [{ isCover: "desc" }, { order: "asc" }],
      select: { id: true, url: true, alt: true, isCover: true },
    }),
  ]);

  if (!eatery) notFound();

  const initial: Partial<EateryFormValues> = {
    name: eatery.name,
    slug: eatery.slug,
    description: eatery.description ?? "",
    category: eatery.category ?? "",
    placeId: eatery.placeId,
    address: eatery.address ?? "",
    lat: eatery.lat?.toString() ?? "",
    lng: eatery.lng?.toString() ?? "",
    openingHours: eatery.openingHours ?? "",
    phone: eatery.phone ?? "",
    website: eatery.website ?? "",
    bookingUrl: eatery.bookingUrl ?? "",
    mapUrl: eatery.mapUrl ?? "",
    priceRange: eatery.priceRange ?? "",
    meals: eatery.meals,
    notice: eatery.notice ?? "",
    tags: eatery.tags.join(", "),
    provinceCode: eatery.provinceCode?.toString() ?? "",
    provinceName: eatery.provinceName ?? "",
    districtCode: eatery.districtCode?.toString() ?? "",
    districtName: eatery.districtName ?? "",
    wardCode: eatery.wardCode?.toString() ?? "",
    wardName: eatery.wardName ?? "",
  };

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      <Link
        href={`/cms/eateries/${eatery.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {eatery.name}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Sửa: {eatery.name}
      </h1>

      <div className="mt-4">
        <EateryForm
          mode="edit"
          eateryId={eatery.id}
          places={places}
          adminProvinces={adminProvinces}
          initial={initial}
        />
      </div>

      <div className="border-t">
        <FormSection
          title="Ảnh"
          description="Tải ảnh cho quán. Ảnh bìa hiển thị ở danh sách & trang."
        >
          <ListingImages ownerType="eatery" ownerId={eatery.id} images={images} />
        </FormSection>
      </div>
    </div>
  );
}
