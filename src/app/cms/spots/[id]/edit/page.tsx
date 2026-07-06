import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getProvinces } from "@/lib/locations";
import { parseTicketTiers } from "@/lib/tickets";
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

  const [spot, places, adminProvinces, images] = await Promise.all([
    prisma.spot.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        tagline: true,
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
        bestTime: true,
        bestTimeNote: true,
        ticketFree: true,
        ticketTiers: true,
        ticketInfo: true,
        notice: true,
        gettingThere: true,
        tips: true,
        highlights: {
          orderBy: { order: "asc" },
          select: { title: true, body: true },
        },
        activityLinks: {
          orderBy: { order: "asc" },
          select: {
            activityId: true,
            blurb: true,
            imageUrl: true,
            imageAlt: true,
            activity: { select: { name: true } },
          },
        },
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
      where: { spotId: id },
      orderBy: [{ isCover: "desc" }, { order: "asc" }],
      select: { id: true, url: true, alt: true, isCover: true },
    }),
  ]);

  if (!spot) notFound();

  const initial: Partial<SpotFormValues> = {
    name: spot.name,
    slug: spot.slug,
    tagline: spot.tagline ?? "",
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
    mapUrl: spot.mapUrl ?? "",
    bestTime: spot.bestTime ?? "",
    bestTimeNote: spot.bestTimeNote ?? "",
    ticketFree: spot.ticketFree,
    ticketTiers: parseTicketTiers(spot.ticketTiers).map((t) => ({
      label: t.label,
      price: t.price == null ? "" : String(t.price),
      note: t.note ?? "",
    })),
    ticketInfo: spot.ticketInfo ?? "",
    notice: spot.notice ?? "",
    gettingThere: spot.gettingThere ?? "",
    tips: spot.tips.join("\n"),
    highlights: spot.highlights.map((h) => ({
      title: h.title,
      body: h.body ?? "",
    })),
    activityContent: spot.activityLinks.map((l) => ({
      activityId: l.activityId,
      name: l.activity.name,
      blurb: l.blurb ?? "",
      imageUrl: l.imageUrl ?? "",
      imageAlt: l.imageAlt ?? "",
    })),
    tags: spot.tags.join(", "),
    provinceCode: spot.provinceCode?.toString() ?? "",
    provinceName: spot.provinceName ?? "",
    districtCode: spot.districtCode?.toString() ?? "",
    districtName: spot.districtName ?? "",
    wardCode: spot.wardCode?.toString() ?? "",
    wardName: spot.wardName ?? "",
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
          adminProvinces={adminProvinces}
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
