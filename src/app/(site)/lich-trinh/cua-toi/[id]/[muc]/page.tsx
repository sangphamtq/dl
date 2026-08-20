import { notFound } from "next/navigation";
import { findTripSection } from "@/lib/trip-sections";
import { TripWorkspace } from "../trip-workspace";

// Các MỤC khác của một lịch trình: /lich-trinh/[id]/ghi-chu, /do-mang-theo,
// /chi-phi. Route này chỉ còn hai việc: chặn token lạ và đặt <title> — nội
// dung là CÙNG một `TripWorkspace` với route `[id]`, vì cả bốn mục render sẵn
// một lượt và client tự chọn mục theo URL (xem trip-workspace.tsx).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ muc: string }>;
}) {
  const { muc } = await params;
  const section = findTripSection(muc);
  // Root layout đã có template `%s · <tên site>` — đừng nối tay lần nữa.
  return { title: section?.label ?? "Lịch trình" };
}

export default async function TripSectionPage({
  params,
}: {
  params: Promise<{ id: string; muc: string }>;
}) {
  const { id, muc } = await params;

  const section = findTripSection(muc);
  // Token lạ, hoặc ai đó gõ tay `/lich-trinh/<id>/` + token của mục Lịch trình.
  if (!section || !section.token) notFound();

  return <TripWorkspace id={id} currentPath={`/lich-trinh/${id}/${muc}`} />;
}
