import { notFound, permanentRedirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTemplateBySlug, buildDayViews } from "@/lib/trip";
import { isStaffViewer } from "@/lib/preview";
import { TripView } from "@/components/trip/trip-view";

// Lịch trình MẪU do biên tập soạn — công khai, CÓ index, là đích SEO chính của
// cả tính năng (docs/lich-trinh.md §7). Người dùng bấm "Dùng lịch trình này"
// để nhân bản sang tài khoản rồi sửa.
//
// Ở TẦNG MỘT (`/lich-trinh/[slug]`, không còn `/mau/`): đây là thứ cần URL ngắn
// nhất trong cả tính năng. Hai token `cua-toi` và `s` là anh em cùng tầng nên
// chúng nằm trong `RESERVED_TRIP_SLUGS` — Next ưu tiên đoạn tĩnh hơn đoạn động
// nên không có chuyện tranh nhau, nhưng một mẫu lỡ mang slug đó thì vĩnh viễn
// không ai mở được.
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

  // Không phải mẫu → có thể là LINK CŨ tới trình soạn (`/lich-trinh/<id>`, dạng
  // đó đã nằm trong email mời và thông báo). Chuyển tiếp thay vì trả 404.
  // Chỉ tra khi đã chắc không có mẫu nào khớp, nên đường đi thường không tốn
  // thêm truy vấn nào.
  if (!trip) {
    const old = await prisma.trip.findUnique({
      where: { id: slug },
      select: { id: true, isTemplate: true, slug: true },
    });
    if (old?.isTemplate && old.slug) permanentRedirect(`/lich-trinh/${old.slug}`);
    if (old) permanentRedirect(`/lich-trinh/cua-toi/${old.id}`);
    notFound();
  }

  // Staff xem trước được bản nháp — cùng quy ước với mọi trang nội dung khác.
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
