import { notFound } from "next/navigation";
import { getTripByShareId, buildDayViews } from "@/lib/trip";
import { TripView } from "@/components/trip/trip-view";

// Bản CHIA SẺ của một lịch trình cá nhân: ai có link đều xem được, chỉ đọc.
// `noindex` — đây vẫn là dữ liệu cá nhân, chỉ là chủ chuyến chủ động đưa link
// cho người khác (khác hẳn lịch trình mẫu ở /lich-trinh/mau/[slug], vốn là nội
// dung biên tập và CÓ index).
export const metadata = {
  title: "Lịch trình được chia sẻ · Halivivu",
  robots: { index: false, follow: false },
};

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;

  const trip = await getTripByShareId(shareId);
  // Tắt chia sẻ = visibility về private, nhưng shareId vẫn còn để bật lại sau —
  // nên phải kiểm visibility chứ không chỉ kiểm tìm thấy hay không.
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
