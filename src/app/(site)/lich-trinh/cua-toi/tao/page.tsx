import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTripDestinations } from "../../actions";
import { CreateTripForm } from "@/components/trip/create-trip-form";

export const metadata = { title: "Tạo lịch trình", robots: { index: false, follow: false } };

export default async function CreateTripPage({
  searchParams,
}: {
  /** `?noi-den=<id Place>` — mở từ "Lên lịch trình đi X" thì nơi đến điền sẵn. */
  searchParams: Promise<{ "noi-den"?: string }>;
}) {
  const { "noi-den": presetId } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    const back = `/lich-trinh/cua-toi/tao${presetId ? `?noi-den=${encodeURIComponent(presetId)}` : ""}`;
    redirect(`/login?callbackUrl=${encodeURIComponent(back)}`);
  }
  const destinations = await getTripDestinations();
  const preset = destinations.find((d) => d.id === presetId) ?? null;
  return (
    <main className="flex-1">
      <CreateTripForm destinations={destinations} preset={preset} />
    </main>
  );
}
