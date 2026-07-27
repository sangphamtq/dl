import Link from "next/link";
import Image from "next/image";
import { Ic } from "@/components/icon";

export type HeroDest = {
  slug: string;
  name: string;
  parentName: string | null;
  url: string;
};

export type HeroStat = { icon: string; value: number; label: string };

// Hero trang danh sách điểm đến — cùng ngôn ngữ với hero trang chủ: ảnh toàn
// khung điện ảnh (Ken-Burns) + scrim tối, chữ trắng đặt trên ảnh. Ảnh nền là
// điểm đến nổi bật nhất; chip gợi ý dẫn tới vài điểm đến khác.
export function PlaceIndexHero({
  dests,
  stats,
}: {
  dests: HeroDest[];
  stats: HeroStat[];
}) {
  const bg = dests[0];
  const chips = dests.slice(1, 5);
  const bgUrl =
    bg?.url ?? "https://picsum.photos/seed/vietnam-diem-den/1920/1080";

  return (
    <section className="relative isolate flex min-h-[30rem] items-end overflow-hidden sm:min-h-[34rem]">
      <Image
        src={bgUrl}
        alt={bg ? `${bg.name} — điểm đến Việt Nam` : "Phong cảnh Việt Nam"}
        fill
        priority
        sizes="100vw"
        className="hero-kb -z-10 object-cover object-center"
      />
      <div className="absolute inset-0 -z-10 bg-black/35" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/45 to-black/20" />

      {/* Credit: nơi trong ảnh nền */}
      {bg && (
        <Link
          href={`/diem-den/${bg.slug}`}
          className="absolute right-4 top-20 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/85 ring-1 ring-white/15 backdrop-blur transition-colors hover:bg-white/20 sm:right-6 sm:top-24"
        >
          <Ic icon="map-pin" className="size-3.5" aria-hidden />
          {bg.name}
        </Link>
      )}

      <div className="mx-auto w-full max-w-7xl px-4 pb-11 pt-32 sm:px-6 sm:pb-14">
        <p className="hero-rise flex items-center gap-2 font-rounded text-lg font-medium text-white/85 sm:text-xl">
          <Ic icon="backpack" className="size-5" aria-hidden />
          Muôn nơi chờ bạn
        </p>

        <h1 className="hero-rise mt-2 max-w-2xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
          Điểm đến khắp dải đất{" "}
          <span className="font-light text-white/80">hình chữ S</span>
        </h1>

        <p className="hero-rise mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
          Chọn một nơi để bắt đầu — gợi ý nên ăn gì, chơi gì, ở đâu và đi lại thế
          nào cho từng vùng.
        </p>

        {stats.length > 0 && (
          <dl className="hero-rise mt-7 flex flex-wrap gap-x-7 gap-y-3">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-white">
                <Ic
                  icon={s.icon}
                  className="size-[18px] shrink-0 text-white/70"
                  aria-hidden
                />
                <dd className="text-xl font-bold leading-none tracking-tight tabular-nums">
                  {s.value.toLocaleString("vi-VN")}
                </dd>
                <dt className="text-sm text-white/70">{s.label}</dt>
              </div>
            ))}
          </dl>
        )}

        <div className="hero-rise mt-8 flex flex-wrap items-center gap-x-3 gap-y-2.5">
          <Link
            href="/ban-do"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 shadow-lg shadow-black/20 transition-colors hover:bg-white/90"
          >
            <Ic icon="map" className="size-4" aria-hidden />
            Xem trên bản đồ
          </Link>

          {chips.length > 0 && (
            <>
              <span className="ml-1 hidden text-sm text-white/55 sm:inline">
                Gợi ý
              </span>
              {chips.map((c) => (
                <Link
                  key={c.slug}
                  href={`/diem-den/${c.slug}`}
                  className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white/90 ring-1 ring-white/15 backdrop-blur transition-colors hover:bg-white/20"
                >
                  {c.name}
                </Link>
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
