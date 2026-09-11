import { notFound } from "next/navigation";
import { findTripSection } from "@/lib/trip-sections";
import { TripWorkspace } from "../trip-workspace";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ muc: string }>;
}) {
  const { muc } = await params;
  const section = findTripSection(muc);
  return { title: section?.label ?? "Lịch trình" };
}

export default async function TripSectionPage({
  params,
}: {
  params: Promise<{ id: string; muc: string }>;
}) {
  const { id, muc } = await params;

  const section = findTripSection(muc);
  if (!section || !section.token) notFound();

  return <TripWorkspace id={id} currentPath={`/lich-trinh/${id}/${muc}`} />;
}
