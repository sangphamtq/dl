import { MapPinned } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { PlaceCard, type PlaceCardData } from "@/components/site/place-card";

export const metadata = {
  title: "Điểm đến · Hành Trình Việt",
  description: "Khám phá các tỉnh thành và điểm đến nổi bật khắp Việt Nam.",
};

const placeSelect = {
  slug: true,
  name: true,
  kind: true,
  description: true,
  images: {
    where: { isCover: true },
    take: 1,
    select: { url: true, isCover: true },
  },
} as const;

export default async function DiemDenPage() {
  const [provinces, destinations] = await Promise.all([
    prisma.place.findMany({
      where: { kind: "province", status: "published" },
      orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { name: "asc" }],
      select: placeSelect,
    }),
    prisma.place.findMany({
      where: { kind: "destination", status: "published" },
      orderBy: [{ isFeatured: "desc" }, { popularity: "desc" }, { name: "asc" }],
      select: placeSelect,
    }),
  ]);

  const isEmpty = provinces.length === 0 && destinations.length === 0;

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Tiêu đề trang */}
        <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Điểm đến
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Chọn một tỉnh thành hoặc điểm đến để xem nên ăn gì, chơi gì, ở đâu và
            đi lại thế nào.
          </p>
        </section>

        {isEmpty ? (
          <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
            <MapPinned
              className="mx-auto size-10 text-muted-foreground"
              aria-hidden
            />
            <p className="mt-4 text-muted-foreground">
              Chưa có điểm đến nào được xuất bản.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-6xl space-y-14 px-4 py-12 sm:px-6 sm:py-16">
            {provinces.length > 0 && (
              <PlaceSection
                title="Tỉnh & Thành phố"
                subtitle="Bắt đầu từ một vùng đất."
                places={provinces}
              />
            )}
            {destinations.length > 0 && (
              <PlaceSection
                title="Điểm đến nổi bật"
                subtitle="Những nơi được yêu thích nhất."
                places={destinations}
              />
            )}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function PlaceSection({
  title,
  subtitle,
  places,
}: {
  title: string;
  subtitle: string;
  places: PlaceCardData[];
}) {
  return (
    <section>
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {places.map((p) => (
          <PlaceCard key={p.slug} place={p} />
        ))}
      </div>
    </section>
  );
}
