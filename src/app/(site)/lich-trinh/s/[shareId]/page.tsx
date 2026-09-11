import { notFound } from "next/navigation";
import { getTripByShareId, buildDayViews } from "@/lib/trip";
import { TripView } from "@/components/trip/trip-view";

export const metadata = {
  title: "Lịch trình được chia sẻ",
  robots: { index: false, follow: false },
};

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;

  const trip = await getTripByShareId(shareId);
  if (!trip || trip.visibility !== "unlisted") notFound();

  const days = await buildDayViews(trip);

  return (
    <TripView
      trip={{
        id: trip.id,
        title: trip.title,
        summary: trip.summary,
        placeName: trip.place?.name ?? null,
        placeSlug: trip.place?.slug ?? null,
        isTemplate: false,
        coverImage: trip.coverImage,
      }}
      days={days}
      backlog={trip.backlog}
    />
  );
}
