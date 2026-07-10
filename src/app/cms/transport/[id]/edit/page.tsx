import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { TransportForm, type TransportFormValues } from "../../transport-form";
import { getPlaceOptions } from "../../options";

export default async function EditTransportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [t, places] = await Promise.all([
    prisma.transport.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        direction: true,
        mode: true,
        placeId: true,
        fromName: true,
        duration: true,
        distanceKm: true,
        priceFrom: true,
        priceTo: true,
        currency: true,
        operatorName: true,
        bookingUrl: true,
        status: true,
        order: true,
      },
    }),
    getPlaceOptions(),
  ]);

  if (!t) notFound();

  const initial: Partial<TransportFormValues> = {
    name: t.name,
    description: t.description ?? "",
    direction: t.direction,
    mode: t.mode,
    placeId: t.placeId,
    fromName: t.fromName ?? "",
    duration: t.duration ?? "",
    distanceKm: t.distanceKm?.toString() ?? "",
    priceFrom: t.priceFrom?.toString() ?? "",
    priceTo: t.priceTo?.toString() ?? "",
    currency: t.currency ?? "VND",
    operatorName: t.operatorName ?? "",
    bookingUrl: t.bookingUrl ?? "",
    status: t.status,
    order: t.order?.toString() ?? "",
  };

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      <Link
        href="/cms/transport"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Di chuyển
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">
        Sửa: {t.name}
      </h1>

      <div className="mt-4">
        <TransportForm
          mode="edit"
          transportId={t.id}
          places={places}
          initial={initial}
        />
      </div>
    </div>
  );
}
