import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getTripById,
  buildDayViews,
  getTripNotes,
  getTripPackItems,
  getTripExpenses,
} from "@/lib/trip";
import { getPlanningTripId } from "../actions";
import { TripEditor } from "@/components/trip/trip-editor";
import { TripPlanningSync } from "@/components/trip/trip-planning-sync";

// KHÔNG GIAN LÀM VIỆC của một chuyến — dùng chung cho route `[id]` (mục Lịch
// trình) và `[id]/[muc]` (ba mục kia). Cả hai route render CÙNG một component
// với ĐỦ dữ liệu của bốn mục; mục nào đang mở do client suy từ URL. Nhờ vậy
// chuyển mục ở sidebar chỉ là `history.pushState` — không vòng server nào —
// còn deep-link/F5 vào bất kỳ mục nào vẫn ra đúng trang.
//
// Giờ ước tính & cảnh báo TÍNH Ở SERVER: mọi thao tác (thêm/xoá/đổi thứ tự)
// đều là server action rồi revalidate, nên lịch tự tính lại cùng lúc — không
// phải nuôi hai bản tính ở hai phía.
export async function TripWorkspace({
  id,
  currentPath,
}: {
  id: string;
  /** Đường dẫn đang mở — để đăng nhập xong quay về đúng mục. */
  currentPath: string;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=${currentPath}`);

  const trip = await getTripById(id);
  if (!trip) notFound();
  // Chủ chuyến HOẶC người được mời cùng sửa. Không lộ sự tồn tại của chuyến
  // người khác → 404 chứ không phải 403.
  const canEdit =
    trip.ownerId === session.user.id || trip.memberIds.includes(session.user.id);
  if (!canEdit) notFound();

  const [days, planningId, notes, packing, expenses] = await Promise.all([
    buildDayViews(trip),
    getPlanningTripId(),
    getTripNotes(trip.id),
    getTripPackItems(trip.id, session.user.id),
    getTripExpenses(trip.id),
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
          place: trip.place,
          isTemplate: trip.isTemplate,
          version: trip.version,
          isOwner: trip.ownerId === session.user.id,
          people: trip.people,
        }}
        days={days}
        backlog={trip.backlog}
        notes={notes}
        packing={packing}
        expenses={expenses}
        viewerId={session.user.id}
      />
    </>
  );
}
