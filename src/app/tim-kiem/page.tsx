import Link from "next/link";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { removeDiacritics } from "@/lib/slug";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata = { title: "Tìm kiếm · Hành Trình Việt" };

const pub = { status: "published" as const };
const sel = { select: { name: true, slug: true } };

type Item = { name: string; slug: string };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";
  const norm = removeDiacritics(q);

  let groups: { label: string; prefix: string; items: Item[] }[] = [];
  let total = 0;

  if (norm) {
    const [places, activities, spots, specialties, eateries, accommodations, posts] =
      await Promise.all([
        prisma.place.findMany({ where: pub, take: 500, ...sel }),
        prisma.activity.findMany({ where: pub, take: 500, ...sel }),
        prisma.spot.findMany({ where: pub, take: 500, ...sel }),
        prisma.specialty.findMany({ where: pub, take: 500, ...sel }),
        prisma.eatery.findMany({ where: pub, take: 500, ...sel }),
        prisma.accommodation.findMany({ where: pub, take: 500, ...sel }),
        prisma.post.findMany({
          where: pub,
          take: 500,
          select: { title: true, slug: true },
        }),
      ]);

    const match = (name: string) => removeDiacritics(name).includes(norm);
    const filt = (rows: Item[]) => rows.filter((r) => match(r.name));

    groups = [
      { label: "Điểm đến", prefix: "diem-den", items: filt(places) },
      { label: "Hoạt động", prefix: "hoat-dong", items: filt(activities) },
      { label: "Địa điểm", prefix: "dia-diem", items: filt(spots) },
      { label: "Đặc sản", prefix: "dac-san", items: filt(specialties) },
      { label: "Quán ăn", prefix: "quan-an", items: filt(eateries) },
      { label: "Lưu trú", prefix: "luu-tru", items: filt(accommodations) },
      {
        label: "Bài viết",
        prefix: "blog",
        items: posts
          .map((p) => ({ name: p.title, slug: p.slug }))
          .filter((r) => match(r.name)),
      },
    ].filter((g) => g.items.length > 0);
    total = groups.reduce((n, g) => n + g.items.length, 0);
  }

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Tìm kiếm
          </h1>

          <form action="/tim-kiem" className="relative mt-5">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              name="q"
              defaultValue={q}
              autoFocus
              placeholder="Tìm điểm đến, quán ăn, đặc sản, bài viết…"
              className="h-11 pl-10"
            />
          </form>

          {!norm ? (
            <p className="mt-8 text-muted-foreground">
              Nhập từ khoá để tìm (không cần dấu).
            </p>
          ) : total === 0 ? (
            <p className="mt-8 text-muted-foreground">
              Không tìm thấy kết quả cho “{q}”.
            </p>
          ) : (
            <div className="mt-8 space-y-8">
              <p className="text-sm text-muted-foreground">
                {total} kết quả cho “{q}”
              </p>
              {groups.map((g) => (
                <section key={g.prefix}>
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    {g.label} ({g.items.length})
                  </h2>
                  <ul className="mt-2 divide-y overflow-hidden rounded-xl border">
                    {g.items.map((it) => (
                      <li key={`${g.prefix}-${it.slug}`}>
                        <Link
                          href={`/${g.prefix}/${it.slug}`}
                          className="block px-4 py-3 font-medium transition-colors hover:bg-muted/50"
                        >
                          {it.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
