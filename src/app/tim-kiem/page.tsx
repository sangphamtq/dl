import Link from "next/link";
import Image from "next/image";
import { Search, MapPin } from "lucide-react";
import { searchAll, featuredDestinations } from "@/lib/search";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SearchResults } from "@/components/site/search-results";

export const metadata = { title: "Tìm kiếm · Hành Trình Việt" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";
  const groups = q ? await searchAll(q, 50) : [];
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const popular = q ? [] : await featuredDestinations(8);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Tìm kiếm
          </h1>

          <form action="/tim-kiem" className="group relative mt-5">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
              aria-hidden
            />
            <input
              name="q"
              defaultValue={q}
              autoFocus
              placeholder="Tìm điểm đến, địa điểm, lưu trú, bài viết…"
              className="h-12 w-full rounded-xl border border-transparent bg-muted/50 pl-12 pr-4 text-base outline-none transition-colors placeholder:text-muted-foreground hover:bg-muted focus:border-primary/40 focus:bg-background"
            />
          </form>

          {q ? (
            total === 0 ? (
              <div className="mt-16 text-center">
                <p className="text-lg font-medium text-foreground">
                  Không tìm thấy kết quả cho “{q}”.
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Thử từ khoá khác — không cần gõ dấu.
                </p>
              </div>
            ) : (
              <SearchResults q={q} groups={groups} />
            )
          ) : (
            <section className="mt-10">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                Điểm đến nổi bật
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
                {popular.map((it) => (
                  <Link
                    key={it.slug}
                    href={`/diem-den/${it.slug}`}
                    className="group"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted ring-1 ring-inset ring-border/60">
                      {it.image ? (
                        <Image
                          src={it.image}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 45vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <span className="grid size-full place-items-center text-muted-foreground">
                          <MapPin className="size-6" aria-hidden />
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <div className="truncate font-medium">{it.name}</div>
                      {it.context && (
                        <div className="truncate text-sm text-muted-foreground">
                          {it.context}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
