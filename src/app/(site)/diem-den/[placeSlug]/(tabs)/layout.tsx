import { notFound } from "next/navigation";
import { getPlaceHero, getPlaceCounts, buildPlaceTabs } from "@/lib/place-meta";
import { isStaffViewer } from "@/lib/preview";
import { PlaceTabs } from "@/components/site/place-tabs";

export default async function PlaceTabsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ placeSlug: string }>;
}) {
  const { placeSlug } = await params;
  const [heroData, staff] = await Promise.all([
    getPlaceHero(placeSlug),
    isStaffViewer(),
  ]);
  if (!heroData || (heroData.place.status !== "published" && !staff)) notFound();
  const place = heroData.place;

  // Không còn nút "đã đến"/chia sẻ ở đây nên layout cũng KHÔNG cần phiên đăng
  // nhập lẫn truy vấn check-in — hai hành động đó là cấp ĐIỂM ĐẾN, sống ở trang
  // Tổng quan.
  const counts = await getPlaceCounts(place.id);

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1">
        <PlaceTabs
          items={buildPlaceTabs(place.slug, counts)}
          place={{
            slug: place.slug,
            name: place.name,
            image: heroData.heroImages[0]?.url ?? null,
          }}
        />
        {children}
      </main>
    </div>
  );
}
