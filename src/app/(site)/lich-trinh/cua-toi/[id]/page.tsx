import { TripWorkspace } from "./trip-workspace";

export const metadata = { title: "Soạn lịch trình · Halivivu" };

// Mục Lịch trình của một chuyến. Toàn bộ nội dung (kể cả ba mục kia) render ở
// `TripWorkspace` — xem chú thích trong file đó.
export default async function TripEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TripWorkspace id={id} currentPath={`/lich-trinh/cua-toi/${id}`} />;
}
