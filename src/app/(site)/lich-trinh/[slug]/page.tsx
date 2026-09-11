import { notFound, permanentRedirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTemplateBySlug, buildDayViews } from "@/lib/trip";
import { isStaffViewer } from "@/lib/preview";
import { TripView } from "@/components/trip/trip-view";
import { notFoundMetadata } from "@/lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await prisma.trip.findUnique({
    where: { slug },
    select: { title: true, summary: true, status: true, isTemplate: true },
  });
  if (!t || !t.isTemplate || t.status !== "published") return notFoundMetadata;
  return { title: t.title, description: t.summary ?? undefined };
}

export default async function TripTemplatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [trip, staff] = await Promise.all([getTemplateBySlug(slug), isStaffViewer()]);

  if (!trip) {
    const old = await prisma.trip.findUnique({
      where: { id: slug },
      select: { id: true, isTemplate: true, slug: true },
    });
    if (old?.isTemplate && old.slug) permanentRedirect(`/lich-trinh/${old.slug}`);
    if (old) permanentRedirect(`/lich-trinh/cua-toi/${old.id}`);
    notFound();
  }

  if (trip.status !== "published" && !staff) notFound();

  const days = await buildDayViews(trip);

  return (
    <TripView
      trip={{
        id: trip.id,
        title: trip.title,
        summary: trip.summary,
        placeName: trip.place?.name ?? null,
        placeSlug: trip.place?.slug ?? null,
        isTemplate: true,
        coverImage: trip.coverImage,
      }}
      days={days}
      backlog={trip.backlog}
    />
  );
}
