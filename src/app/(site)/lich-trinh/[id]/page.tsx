import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTripById, buildDayViews } from "@/lib/trip";
import { getPlanningTripId } from "../actions";
import { TripEditor } from "@/components/trip/trip-editor";
import { TripPlanningSync } from "@/components/trip/trip-planning-sync";

export const metadata = { title: "Soạn lịch trình · Halivivu" };

// Trang soạn lịch trình. Giờ ước tính & cảnh báo TÍNH Ở SERVER: mọi thao tác
// (thêm/xoá/đổi thứ tự) đều là server action rồi revalidate, nên lịch tự tính
// lại cùng lúc — không phải nuôi hai bản tính ở hai phía.
export default async function TripEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/lich-trinh/${id}`);

  const trip = await getTripById(id);
  if (!trip) notFound();
  // Không lộ sự tồn tại của chuyến người khác → 404 chứ không phải 403.
  if (trip.ownerId !== session.user.id) notFound();

  const [days, planningId] = await Promise.all([
    buildDayViews(trip),
    getPlanningTripId(),
  ]);

  return (
    <>
      <TripPlanningSync tripId={trip.id} isPlanning={planningId === trip.id} />
      <TripEditor
        trip={{
          id: trip.id,
          title: trip.title,
          startDate: trip.startDate ? trip.startDate.toISOString().slice(0, 10) : null,
          partySize: trip.partySize,
          shareId: trip.shareId,
          visibility: trip.visibility,
        }}
        days={days}
        backlog={trip.backlog}
      />
    </>
  );
}
