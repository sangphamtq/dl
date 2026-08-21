import Link from "next/link";
import Image from "next/image";
import {
  BadgeCheck,
  Clock,
  MapPin,
  Pencil,
  Route,
  type LucideIcon,
} from "@/components/icons";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TripBrowser, type TripCard } from "@/components/trip/trip-browser";

// `/lich-trinh` — trang CÔNG KHAI của cả tính năng: danh sách lịch trình mẫu.
//
// Trước đây chỗ này là danh sách chuyến CÁ NHÂN và `redirect("/login")` ngay
// dòng đầu, nên nó tạo ra một nghịch lý: lịch trình mẫu được dựng để làm đòn
// bẩy SEO (có trong sitemap, `sw.js` còn allowlist riêng để cache) nhưng danh
// sách của chúng lại nằm sau tường đăng nhập. Khách từ Google vào một mẫu rồi
// muốn xem mẫu khác thì không có đường nào — trang index không tồn tại.
//
// Nay: phần cá nhân dời xuống `/lich-trinh/cua-toi`, chỗ này để cho khách.
// Xem docs/lich-trinh.md §4 và §7a.
//
// ── BỐ CỤC ──────────────────────────────────────────────────────────────────
// Dải mở đầu (chữ trái + ảnh mờ dần bên phải) → thanh công cụ NỔI cưỡi lên mép
// dưới của dải → chip điểm đến → lưới thẻ (đổi được sang danh sách) → tải thêm
// → dải bốn cam kết.
//
// Phần tương tác nằm ở `@/components/trip/trip-browser` (client). Trang này vẫn
// là Server Component: nó lấy dữ liệu, dựng dải mở đầu và dải cuối.
//
// ⚠ Container `max-w-7xl px-4 sm:px-6` — ĐÚNG BẰNG container của header.
//
// Tông header: `/lich-trinh` nằm trong `LIGHT_ROUTES` (lib/site-chrome). Trang
// mở bằng nền sáng mà header lấy bản `dark` thì tint `black/20` biến thành một
// vệt xám vắt ngang và chữ trắng trên đó chỉ còn ~1.7:1.

export const metadata = {
  title: "Lịch trình mẫu · Halivivu",
  description:
    "Lịch trình gợi ý theo từng điểm đến — xem chi tiết từng ngày, giờ ước tính, rồi sao về tài khoản và sửa theo ý bạn.",
};

export const revalidate = 3600;

const MICRO = "text-[0.7rem] font-semibold uppercase tracking-[0.14em]";

const coverSel = {
  where: { isCover: true },
  take: 1,
  select: { url: true, alt: true },
} as const;

/**
 * Dải bốn cam kết ở chân trang.
 *
 * ⚠ MỌI DÒNG Ở ĐÂY PHẢI ĐÚNG. Bản phác có "Hỗ trợ 24/7 — đồng hành cùng bạn"
 * và "Đánh giá từ người đi trước": site không có tổng đài, và lịch trình mẫu
 * không có đánh giá nào trong CSDL. Bốn dòng dưới đây đều là việc trang này
 * thật sự làm được, kiểm lại bằng chính mã nguồn:
 */
const PROMISES: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: BadgeCheck,
    title: "Do biên tập soạn",
    body: "Không phải danh sách tự sinh — mỗi mẫu là một chuyến có thật, xếp tay.",
  },
  {
    Icon: Clock,
    title: "Có giờ ước tính",
    body: "Từng chặng tính theo đường thật, báo trước chỗ nào chưa mở lúc bạn tới.",
  },
  {
    Icon: Pencil,
    title: "Sao về rồi sửa",
    body: "Nhân bản sang tài khoản, đổi ngày, thêm bớt điểm dừng thoải mái.",
  },
  {
    Icon: MapPin,
    title: "Xem không cần đăng nhập",
    body: "Cả trang này và từng lịch trình đều mở cho khách, chia sẻ link được ngay.",
  },
];

export default async function TripTemplatesPage() {
  // `auth()` chỉ để đổi nhãn nút ở dải cuối trang. Trang KHÔNG chặn khách — đó
  // là cả lý do nó tồn tại.
  const [session, rows] = await Promise.all([
    auth(),
    prisma.trip.findMany({
      where: {
        isTemplate: true,
        status: "published",
        slug: { not: null },
        // Phải có ÍT NHẤT MỘT ngày đã xếp được mục vào. Một mẫu vừa tạo trong
        // CMS (một ngày trống, chưa mục nào) mà lọt ra đây thì trang công khai
        // đang mời khách xem một lịch trình không có gì. Biên tập vẫn thấy nó ở
        // /cms/lich-trinh; nó chỉ không lên trang công khai cho tới khi có mục.
        // KHÔNG dùng `items: { some: {} }`: `items` tính cả mục còn trong túi
        // "Chưa xếp ngày", tức mẫu chỉ toàn mục chưa xếp vẫn lọt.
        days: { some: { items: { some: {} } } },
      },
      orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { publishedAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        place: {
          select: { name: true, parent: { select: { name: true } } },
        },
        images: coverSel,
        days: {
          orderBy: { index: "asc" },
          select: {
            id: true,
            title: true,
            _count: { select: { items: true } },
            // Chỉ lấy ẢNH BÌA của từng mục — dùng để chọn ảnh cho dải mở đầu
            // (xem `hero` bên dưới), không hiển thị trên thẻ. Số mẫu xuất bản
            // đếm trên đầu ngón tay và trang `revalidate = 3600`, nên vài chục
            // dòng ảnh ở đây rẻ hơn một truy vấn thứ hai.
            items: {
              orderBy: { order: "asc" },
              select: {
                spot: { select: { images: coverSel } },
                activity: { select: { images: coverSel } },
                eatery: { select: { images: coverSel } },
                accommodation: { select: { images: coverSel } },
              },
            },
          },
        },
      },
    }),
  ]);

  const items: TripCard[] = rows.map((t) => ({
    slug: t.slug!,
    title: t.title,
    summary: t.summary,
    placeName: t.place?.name ?? null,
    provinceName: t.place?.parent?.name ?? t.place?.name ?? null,
    days: t.days.length,
    cover: t.images[0] ?? null,
    dayTitles: t.days.map((d, i) => d.title ?? `Ngày ${i + 1}`),
    // Số điểm dừng đếm THEO TỪNG NGÀY, không phải `Trip._count.items`: `items`
    // gồm cả mục còn nằm trong túi "Chưa xếp ngày" (mẫu Phan Thiết: 21 mục
    // nhưng chỉ 17 nằm trong ba ngày). Khoe con số lớn hơn là hứa nhiều hơn thứ
    // lịch trình thật sự xếp sẵn.
    dayStops: t.days.map((d) => d._count.items),
  }));

  const placeCount = new Set(items.map((t) => t.placeName).filter(Boolean)).size;

  // Ảnh của dải mở đầu KHÔNG được trùng ảnh bìa của bất kỳ thẻ nào bên dưới:
  // cùng một tấm hiện hai lần trong một màn hình thì dải mở đầu đọc ra như một
  // cái thẻ bị phóng to. Vì thẻ chỉ dùng ảnh bìa của chuyến, mọi ảnh lấy từ
  // ĐIỂM DỪNG trong ngày đều an toàn — và cũng vẫn là ảnh của đúng chuyến đó.
  const usedOnCards = new Set(items.map((t) => t.cover?.url).filter(Boolean));
  const hero =
    rows
      .flatMap((t) => t.days)
      .flatMap((d) => d.items)
      .flatMap((it) => [
        it.spot?.images[0],
        it.activity?.images[0],
        it.eatery?.images[0],
        it.accommodation?.images[0],
      ])
      .find((img) => img && !usedOnCards.has(img.url)) ?? null;

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1">
        {/* ── Dải mở đầu ─────────────────────────────────────────────────────
            Ảnh KHÔNG cắt thành một khối chữ nhật đứng cạnh chữ: nó mờ dần về
            phía trái bằng `mask-image` rồi tan vào chính nền chuyển sắc, nên
            dải đọc ra là MỘT mảng liền chứ không phải hai ô ghép. Ảnh mượn bìa
            của mẫu đầu tiên có ảnh — không có mẫu nào có ảnh thì dải này chỉ
            còn chữ, và vẫn đứng được. */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/8 via-primary/[0.03] to-background">
          {hero && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 hidden w-[58%] lg:block"
            >
              <Image
                src={hero.url}
                alt=""
                fill
                priority
                sizes="58vw"
                className="object-cover opacity-90 [mask-image:linear-gradient(to_left,black_38%,transparent_92%)]"
              />
              {/* Mép DƯỚI cũng phải tan, nếu không ảnh bị dải màu cắt ngang
                  bằng một đường thẳng — đúng thứ mà `mask-image` bên trên vừa
                  bỏ công xoá ở mép trái. */}
              <span className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            </div>
          )}

          {/* Vòng tròn mờ sau ảnh — cùng họ với hoạ tiết vòng đồng tâm của
              trang chủ, giữ rất nhạt để không thành một mảng màu. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 hidden size-[30rem] rounded-full bg-primary/8 blur-3xl lg:block"
          />

          <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10 lg:pb-24">
            <nav className={cn(MICRO, "flex items-center text-muted-foreground")}>
              <Link href="/" className="transition-colors hover:text-primary">
                Trang chủ
              </Link>
              <span className="mx-2 text-border" aria-hidden>
                /
              </span>
              <span className="text-foreground">Lịch trình mẫu</span>
            </nav>

            <div className="mt-6 max-w-xl lg:mt-10">
              {/* Tiêu đề KHÔNG lặp lại chữ của breadcrumb ("Lịch trình mẫu"):
                  hai dòng chữ giống hệt nhau chồng lên nhau là hai lần cùng một
                  cái tên, đúng lỗi mà /blog đã gỡ. */}
              <h1 className="text-balance font-[family-name:var(--font-display)] text-[clamp(2rem,4.6vw,3.25rem)] font-extrabold leading-[1.05] tracking-[-0.035em]">
                Lịch trình xếp sẵn từng ngày
              </h1>
              {items.length > 0 ? (
                <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
                  <Num>{items.length}</Num> hành trình do biên tập soạn cho{" "}
                  <Num>{placeCount}</Num> điểm đến — chọn một cái, sao về tài khoản
                  rồi sửa theo ý bạn.
                </p>
              ) : (
                <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
                  Phần lịch trình mẫu đang được biên tập. Trong lúc chờ, bạn vẫn tự
                  xếp được lịch trình của mình.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Thanh công cụ nổi nằm TRONG khối này để `-mt-7` của nó cưỡi lên dải
            mở đầu phía trên. */}
        <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20">
          {items.length > 0 ? (
            <TripBrowser items={items} />
          ) : (
            <div className="relative z-10 -mt-7 rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center shadow-lg shadow-black/5 sm:-mt-8">
              <Route className="mx-auto size-10 text-muted-foreground/40" aria-hidden />
              <p className="mt-4 font-semibold tracking-tight">
                Chưa có lịch trình mẫu nào
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Bạn vẫn tự xếp được: bấm{" "}
                <strong className="font-medium text-foreground">
                  Thêm vào lịch trình
                </strong>{" "}
                ở bất kỳ địa điểm, quán ăn hay chỗ ở nào rồi kéo vào từng ngày.
              </p>
            </div>
          )}

          {/* ── Dải cuối: bốn cam kết + lối sang phần tự xếp ────────────────
              Gộp làm MỘT khối thay vì hai dải rời: cả hai đều nói về "nếu mẫu
              không hợp thì sao", và trang đã đủ tầng rồi. */}
          <section className="mt-14 rounded-[1.75rem] border border-border bg-muted/40 px-6 py-8 sm:px-9 sm:py-10 lg:mt-20">
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {PROMISES.map(({ Icon, title, body }) => (
                <li key={title} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold tracking-tight">{title}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
                      {body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-4 border-t border-border pt-7 lg:flex-row lg:items-center lg:justify-between">
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                <strong className="font-semibold text-foreground">
                  Không mẫu nào đúng chuyến của bạn?
                </strong>{" "}
                Tự xếp lấy — ở bất kỳ địa điểm, quán ăn hay chỗ ở nào, bấm{" "}
                <strong className="font-semibold text-foreground">
                  Thêm vào lịch trình
                </strong>{" "}
                rồi kéo vào ngày bạn muốn.
              </p>
              <Button asChild size="lg" className="shrink-0 rounded-full">
                <Link href="/lich-trinh/cua-toi">
                  <Route className="size-4" aria-hidden />
                  {session?.user ? "Lịch trình của tôi" : "Tự lên lịch trình"}
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// Con số trong câu: đậm hơn chữ xung quanh một bậc và về màu chữ chính, đủ để
// mắt bắt được mà vẫn nằm trong dòng văn. Cùng quy ước với /diem-den.
function Num({ children }: { children: React.ReactNode }) {
  return (
    <strong className="font-semibold tabular-nums text-foreground">
      {children}
    </strong>
  );
}
