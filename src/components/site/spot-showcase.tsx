import Link from "next/link";
import Image from "next/image";
import { Ic } from "@/components/icon";
import { SectionHeading } from "@/components/site/section-heading";

export type SpotShowcaseItem = {
  slug: string;
  name: string;
  category: string | null;
  location: string | null;
  image: string;
  tagline: string | null;
};

// Section "Địa điểm đáng ghé" kiểu tạp chí: 1 hero ảnh làm chủ (trái, cao đúng
// bằng danh sách) + danh sách spot còn lại dạng mục lục có thumbnail (phải).
export function SpotShowcase({
  title,
  count,
  allHref,
  spots,
}: {
  title: string;
  count?: number;
  allHref: string;
  spots: SpotShowcaseItem[];
}) {
  const featured = spots[0];
  const list = spots.slice(1);
  if (!featured) return null;

  const featuredMeta = [featured.category, featured.location]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <SectionHeading
        title={title}
        href={allHref}
        count={count}
        unit="địa điểm"
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-12">
        {/* Hero — 1 card ảnh dọc, tự giãn cao bằng danh sách */}
        <Link
          href={`/dia-diem/${featured.slug}`}
          className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-muted shadow-md shadow-black/5 transition-shadow hover:shadow-xl hover:shadow-black/10 lg:col-span-4 lg:aspect-auto"
        >
          <Image
            src={featured.image}
            alt={featured.name}
            fill
            sizes="(min-width: 1024px) 33vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            {featuredMeta && (
              <p className="text-sm font-medium text-white/75 drop-shadow">
                {featuredMeta}
              </p>
            )}
            <h3 className="mt-1.5 text-balance text-2xl font-bold tracking-tight text-white drop-shadow-md sm:text-3xl">
              {featured.name}
            </h3>
            {featured.tagline && (
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/85 drop-shadow">
                {featured.tagline}
              </p>
            )}
          </div>
        </Link>

        {/* Danh sách — mục lục 2 cột, thumbnail nhỏ */}
        <div className="grid content-start gap-x-8 gap-y-6 sm:grid-cols-2 lg:col-span-8">
          {list.map((s) => (
            <Link
              key={s.slug}
              href={`/dia-diem/${s.slug}`}
              className="group flex items-center gap-4"
            >
              <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-muted shadow-sm shadow-black/5">
                <Image
                  src={s.image}
                  alt={s.name}
                  fill
                  sizes="96px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">
                  {s.name}
                </h4>
                {s.tagline && (
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                    {s.tagline}
                  </p>
                )}
              </div>
              <Ic
                icon="chevron-right"
                className="size-5 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
