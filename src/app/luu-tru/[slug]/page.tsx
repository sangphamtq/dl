import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// Trang chi tiết Lưu trú đã bỏ — chi tiết hiển thị trong drawer trên trang danh sách.
// Giữ URL cũ làm deep-link: chuyển hướng về trang lưu trú của Place và mở sẵn drawer.
export default async function AccommodationRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const acc = await prisma.accommodation.findUnique({
    where: { slug },
    select: { slug: true, place: { select: { slug: true } } },
  });
  if (!acc) notFound();
  redirect(`/diem-den/${acc.place.slug}/luu-tru?open=${acc.slug}`);
}
