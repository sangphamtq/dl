import { TripWorkspace } from "./trip-workspace";

export const metadata = { title: "Soạn lịch trình" };

export default async function TripEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TripWorkspace id={id} currentPath={`/lich-trinh/cua-toi/${id}`} />;
}
