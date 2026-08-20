import Link from "next/link";
import Image from "next/image";
import { CalendarDays, MapPin, Route, Sparkles } from "@/components/icons";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";

// `/lich-trinh` — trang CÔNG KHAI của cả tính năng: danh sách lịch trình mẫu.
//
// Trước đây chỗ này là danh sách chuyến CÁ NHÂN và `redirect("/login")` ngay
// dòng đầu, nên nó tạo ra một nghịch lý: lịch trình mẫu được dựng để làm đòn
// bẩy SEO (có trong sitemap, `sw.js` còn allowlist riêng để cache) nhưng danh
// sách của chúng lại nằm sau tường đăng nhập. Khách từ Google vào một mẫu rồi
// muốn xem mẫu khác thì không có đường nào — trang index không tồn tại.
//
// Nay: phần cá nhân dời xuống `/lich-trinh/cua-toi`, chỗ này để cho khách.
// Xem docs/lich-trinh.md §4.

export const metadata = {
  title: "Lịch trình mẫu · Halivivu",
  description:
    "Lịch trình gợi ý theo từng điểm đến — xem chi tiết từng ngày, giờ ước tính, rồi sao về tài khoản và sửa theo ý bạn.",
};

export const revalidate = 3600;

export default async function TripTemplatesPage() {
  // `auth()` chỉ để đổi nhãn nút góc trên (Chuyến của tôi / Đăng nhập). Trang
  // KHÔNG chặn khách — đó là cả lý do nó tồn tại.
  const [session, templates] = await Promise.all([
    auth(),
    prisma.trip.findMany({
      where: { isTemplate: true, status: "published", slug: { not: null } },
      orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { publishedAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        place: { select: { name: true, slug: true } },
        images: { where: { isCover: true }, take: 1, select: { url: true, alt: true } },
        _count: { select: { days: true, items: true } },
      },
    }),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <main className="relative flex-1 bg-gradient-to-b from-sky-100/70 via-sky-50/40 to-background dark:from-muted/30 dark:via-muted/10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 top-4 -z-10 size-[34rem] rounded-full border border-primary/10 [mask-image:radial-gradient(circle,black,transparent_70%)]"
        >
          <div className="absolute inset-12 rounded-full border border-primary/10" />
          <div className="absolute inset-28 rounded-full border border-warm/10" />
        </div>

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <p className="text-sm font-medium text-warm">Đi đâu, mấy ngày, theo thứ tự nào</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Lịch trình mẫu</h1>
              <p className="mt-2 max-w-prose leading-relaxed text-muted-foreground">
                Lịch trình do biên tập soạn cho từng điểm đến — xem chi tiết từng ngày kèm giờ
                ước tính, thấy hợp thì sao về tài khoản rồi sửa thoải mái.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/lich-trinh/cua-toi">
                <Route className="size-4" aria-hidden />
                {session?.user ? "Lịch trình của tôi" : "Tự lên lịch trình"}
              </Link>
            </Button>
          </div>

          {templates.length > 0 ? (
            <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <li key={t.id} className="group relative">
                  <div className="h-full overflow-hidden rounded-2xl bg-card shadow-lg shadow-black/5 transition-shadow hover:shadow-xl">
                    <div className="relative aspect-[4/3] bg-muted">
                      {t.images[0] ? (
                        <Image
                          src={t.images[0].url}
                          alt={t.images[0].alt ?? t.title}
                          fill
                          sizes="(min-width:1024px) 20rem, (min-width:640px) 45vw, 90vw"
                          className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="grid h-full place-items-center">
                          <Sparkles className="size-8 text-muted-foreground/40" aria-hidden />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h2 className="font-semibold leading-snug tracking-tight">
                        <Link
                          href={`/lich-trinh/${t.slug}`}
                          className="after:absolute after:inset-0 hover:text-primary"
                        >
                          {t.title}
                        </Link>
                      </h2>
                      {t.summary && (
                        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                          {t.summary}
                        </p>
                      )}
                      <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3.5" aria-hidden />
                          {t._count.days} ngày
                        </span>
                        <span aria-hidden className="h-3 w-px bg-border" />
                        <span>{t._count.items} điểm dừng</span>
                        {t.place && (
                          <>
                            <span aria-hidden className="h-3 w-px bg-border" />
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3.5" aria-hidden />
                              {t.place.name}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            // Chưa có mẫu nào thì đừng để trang trắng: đẩy khách sang việc tự
            // lên lịch, vốn là thứ vẫn dùng được ngay.
            <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
              <Sparkles className="mx-auto size-10 text-muted-foreground/40" aria-hidden />
              <p className="mt-4 font-semibold tracking-tight">Chưa có lịch trình mẫu nào</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Bạn vẫn có thể tự lên lịch trình: chọn một điểm đến, bấm{" "}
                <strong className="font-medium text-foreground">Thêm vào lịch trình</strong> ở
                nơi bạn thích, rồi xếp vào từng ngày.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button asChild className="rounded-full">
                  <Link href="/diem-den">Khám phá điểm đến</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/lich-trinh/cua-toi">Lịch trình của tôi</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
