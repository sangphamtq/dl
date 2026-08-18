import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTemplateBySlug, buildDayViews } from "@/lib/trip";
import { isStaffViewer } from "@/lib/preview";
import { TripView } from "@/components/trip/trip-view";

// Lịch trình MẪU do biên tập soạn — công khai, CÓ index, là đích SEO chính của
// cả tính năng (docs/lich-trinh.md §7). Người dùng bấm "Dùng lịch trình này"
// để nhân bản sang tài khoản rồi sửa.
//
// CỐ Ý KHÔNG có generateStaticParams: trang gọi isStaffViewer() → auth(), mà
// auth() lúc prerender không có host tin cậy (UntrustedHost) nên build sẽ kêu.
// Mọi trang chi tiết khác (spot/hoạt động/lưu trú) cũng dynamic vì cùng lý do.

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
  if (!t || !t.isTemplate || t.status !== "published") return {};
  return { title: t.title, description: t.summary ?? undefined };
}

export default async function TripTemplatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [trip, staff] = await Promise.all([getTemplateBySlug(slug), isStaffViewer()]);
  // Staff xem trước được bản nháp — cùng quy ước với mọi trang nội dung khác.
  if (!trip || (trip.status !== "published" && !staff)) notFound();

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
      }}
      days={days}
    />
  );
}
