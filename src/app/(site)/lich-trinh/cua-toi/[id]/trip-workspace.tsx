import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getTripById,
  buildDayViews,
  getTripNotes,
  getTripPackItems,
  getTripExpenses,
} from "@/lib/trip";
import { getPlanningTripId } from "../../actions";
import { TripEditor } from "@/components/trip/trip-editor";
import { TripPlanningSync } from "@/components/trip/trip-planning-sync";

export async function TripWorkspace({
  id,
  currentPath,
}: {
  id: string;
  currentPath: string;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=${currentPath}`);

  const trip = await getTripById(id);
  if (!trip) notFound();
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
