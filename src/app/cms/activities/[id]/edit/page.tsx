import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { FormSection } from "@/components/cms/form-section";
import { ListingImages } from "@/components/cms/listing-images";
import { ActivityForm, type ActivityFormValues } from "../../activity-form";
import { getPlaceOptions, getSpotOptions } from "../../options";

export default async function EditActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [activity, places, spots, images] = await Promise.all([
    prisma.activity.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: true,
        placeId: true,
        difficulty: true,
        durationText: true,
        seasonText: true,
        operatorName: true,
        bookingUrl: true,
        phone: true,
        website: true,
        priceRange: true,
        tags: true,
        spots: { select: { id: true } },
      },
    }),
    getPlaceOptions(),
    getSpotOptions(),
    prisma.image.findMany({
      where: { activityId: id },
      orderBy: [{ isCover: "desc" }, { order: "asc" }],
      select: { id: true, url: true, alt: true, isCover: true },
    }),
  ]);

  if (!activity) notFound();

  const initial: Partial<ActivityFormValues> = {
    name: activity.name,
    slug: activity.slug,
    description: activity.description ?? "",
    category: activity.category ?? "",
    placeId: activity.placeId,
    difficulty: activity.difficulty ?? "",
    durationText: activity.durationText ?? "",
    seasonText: activity.seasonText ?? "",
    operatorName: activity.operatorName ?? "",
    bookingUrl: activity.bookingUrl ?? "",
    phone: activity.phone ?? "",
    website: activity.website ?? "",
    priceRange: activity.priceRange ?? "",
    spotIds: activity.spots.map((s) => s.id),
    tags: activity.tags.join(", "),
  };

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      <Link
        href={`/cms/activities/${activity.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {activity.name}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Sửa: {activity.name}
      </h1>

      <div className="mt-4">
        <ActivityForm
          mode="edit"
          activityId={activity.id}
          places={places}
          spots={spots}
          initial={initial}
        />
      </div>

      <div className="border-t">
        <FormSection
          title="Ảnh"
          description="Tải ảnh cho hoạt động. Ảnh bìa hiển thị ở danh sách & trang."
        >
          <ListingImages
            ownerType="activity"
            ownerId={activity.id}
            images={images}
          />
        </FormSection>
      </div>
    </div>
  );
}
