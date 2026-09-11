import { Map as MapIcon } from "@/components/icons";
import { getDestinationMapPoints } from "@/lib/geo";
import { VietnamMap } from "@/components/map/vietnam-map";

export const metadata = {
  title: "Bản đồ du lịch Việt Nam",
  description:
    "Khám phá các điểm đến trên khắp Việt Nam qua bản đồ tương tác — chọn vùng, xem điểm đến nổi bật và lên ý tưởng cho chuyến đi.",
};

export default async function BanDoPage({
  searchParams,
}: {
  searchParams: Promise<{ tu?: string; at?: string; gio?: string; lo?: string }>;
}) {
  const [sp, points] = await Promise.all([searchParams, getDestinationMapPoints()]);

  return (
    <div className="flex h-dvh flex-col lg:h-[calc(100dvh-4rem)]">
      <main className="min-h-0 flex-1">
        {points.length === 0 ? (
          <div className="grid h-full place-items-center px-6 text-center">
            <div className="max-w-md">
              <span
                aria-hidden
                className="mx-auto grid size-12 place-items-center bg-muted text-muted-foreground"
              >
                <MapIcon className="size-5" />
              </span>
              <p className="mt-5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Bản đồ du lịch
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-[clamp(1.75rem,5vw,2.75rem)] font-normal uppercase leading-[1.15] tracking-[0.12em]">
                Việt Nam
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Các điểm đến sẽ hiện trên bản đồ khi có địa điểm được gắn toạ độ.
                Hãy quay lại sau nhé.
              </p>
            </div>
          </div>
        ) : (
          <VietnamMap
            points={points}
            initialAt={sp.tu ?? sp.at}
            initialHours={sp.gio ? Number(sp.gio) : undefined}
            initialStops={sp.lo ? sp.lo.split(",").filter(Boolean) : undefined}
          />
        )}
      </main>
    </div>
  );
}
