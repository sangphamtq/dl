import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { FormSection } from "@/components/cms/form-section";
import { ListingImages } from "@/components/cms/listing-images";
import { TemplateForm } from "./form";

export const metadata = { title: "Sửa lịch trình mẫu · CMS" };

export default async function CmsTripTemplateEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [trip, places] = await Promise.all([
    prisma.trip.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        placeId: true,
        status: true,
        isFeatured: true,
        order: true,
        isTemplate: true,
        _count: { select: { days: true, items: true } },
        images: {
          orderBy: [{ isCover: "desc" }, { order: "asc" }],
          select: { id: true, url: true, alt: true, isCover: true },
        },
      },
    }),
    prisma.place.findMany({
      orderBy: [{ kind: "asc" }, { name: "asc" }],
      select: { id: true, name: true, kind: true },
    }),
  ]);

  if (!trip || !trip.isTemplate) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href="/cms/lich-trinh"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Lịch trình mẫu
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{trip.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {trip._count.days} ngày · {trip._count.items} mục
        </p>
      </div>

      {/* Nội dung từng ngày dùng CHÍNH trình soạn công khai — mẫu do editor sở
          hữu nên vào được. Khỏi dựng lại một trình soạn thứ hai trong CMS. */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border bg-muted/30 p-4">
        <div>
          <p className="font-medium">Soạn nội dung từng ngày</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Thêm điểm dừng, xếp ngày, đặt giờ bắt đầu — mở trình soạn công khai.
          </p>
        </div>
        <Link
          href={`/lich-trinh/cua-toi/${trip.id}`}
          className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
        >
          Mở trình soạn
        </Link>
      </div>

      <TemplateForm
        id={trip.id}
        initial={{
          title: trip.title,
          slug: trip.slug ?? "",
          summary: trip.summary ?? "",
          placeId: trip.placeId ?? "",
          status: trip.status,
          isFeatured: trip.isFeatured,
          order: trip.order?.toString() ?? "",
        }}
        places={places}
      />

      <div className="rounded-2xl border">
        <FormSection
          title="Ảnh bìa"
          description="Hiện trên thẻ gợi ý ở /lich-trinh và trang điểm đến."
        >
          <ListingImages ownerType="trip" ownerId={trip.id} images={trip.images} />
        </FormSection>
      </div>
    </div>
  );
}
