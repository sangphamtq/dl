import Link from "next/link";
import Image from "next/image";
import { Search, MapPin } from "@/components/icons";
import { searchAll, featuredDestinations } from "@/lib/search";
import { SearchResults } from "@/components/site/search-results";
import { R_CARD, R_CTRL } from "@/lib/radius";

export const metadata = { title: "Tìm kiếm" };

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

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Tìm kiếm
          </h1>

          {/* Cùng VẬT LIỆU với mọi ô nhập khác của site: viền mảnh + nền
              trong suốt + bo `R_CTRL`, focus thì viền về màu mực. Bản trước là
              `rounded-xl` (12px) nền `bg-muted/50` viền trong suốt và vòng focus
              XANH — ba thứ đều chỉ có ở đây, khiến ô tìm kiếm chính của site
              đọc ra như đến từ một bộ giao diện khác. */}
          <form action="/tim-kiem" className="group relative mt-5">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground"
              aria-hidden
            />
            <input
              name="q"
              defaultValue={q}
              autoFocus
              placeholder="Tìm điểm đến, địa điểm, lưu trú, bài viết…"
              className={`${R_CTRL} h-12 w-full border border-border bg-transparent pl-12 pr-4 text-base outline-none transition-colors placeholder:text-muted-foreground/80 focus:border-foreground`}
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
                    <div className={`${R_CARD} relative aspect-[4/3] overflow-hidden bg-muted ring-1 ring-inset ring-border/60`}>
                      {it.image ? (
                        <Image
                          src={it.image}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 45vw"
                          className="object-cover"
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

    </div>
  );
}
