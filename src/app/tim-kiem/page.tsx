import Link from "next/link";
import { Search } from "lucide-react";
import { searchAll } from "@/lib/search";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata = { title: "Tìm kiếm · Hành Trình Việt" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";
  const groups = q ? await searchAll(q, 50) : [];
  const total = groups.reduce((n, g) => n + g.items.length, 0);

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

          {!q ? (
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
