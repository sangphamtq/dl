import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { POST_CATEGORY_LABELS, label } from "@/lib/listing-labels";
import { SectionHeading } from "@/components/site/section-heading";
import {
  HeroSlideshow,
  type HeroShot,
} from "@/components/site/hero-slideshow";

const pub = { status: "published" as const };

const cover = {
  where: { isCover: true },
  take: 1,
  select: { url: true, isCover: true },
} as const;

const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// Nhãn nhỏ dùng chung — cùng khuôn với thẻ ở Điểm đến / Lưu trú / Ẩm thực.
const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";

// Góc nghiêng của từng tấm ảnh in. Viết NGUYÊN CHUỖI class: Tailwind quét mã
// nguồn theo văn bản, tên class ghép lúc chạy thì nó không sinh CSS.
const PRINTS = [
  { tilt: "-rotate-2" },
  { tilt: "rotate-2" },
  { tilt: "rotate-1" },
  { tilt: "-rotate-3" },
];

// Lớp phủ hero — ĐẬM Ở ĐỈNH, ngược hẳn lớp phủ của thẻ.
// Khối chữ nằm ở PHẦN TRÊN bức ảnh (như tấm banner tham chiếu), mà phần trên
// của ảnh phong cảnh gần như luôn là trời sáng. Công thức đậm-ở-đáy của thẻ đặt
// vào đây thì dằn đúng chỗ không có chữ nào. Vẫn để đáy tối nhẹ trở lại để
// khung hình không bị hẫng một đầu.
const HERO_SCRIM =
  "absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.5)_0%,rgba(0,0,0,0.42)_22%,rgba(0,0,0,0.26)_48%,rgba(0,0,0,0.18)_70%,rgba(0,0,0,0.34)_100%)]";

// Năm mục của một trang điểm đến — đúng năm thứ đang có thật (xem CLAUDE.md).
//
// Thay cho dải "Khám phá theo chủ đề" cũ: sáu ô ảnh dẫn tới
// `/diem-den/<một nơi bất kỳ>/<loại>`, nơi đó chỉ là phần tử thứ i của danh
// sách nổi bật. Bấm "Ẩm thực" mà nhảy vào trang ăn uống của một điểm đến ngẫu
// nhiên thì đó là một lời hứa sai, và không ô nào trong sáu ô ấy nói được rằng
// mọi điểm đến đều có đủ cả năm mục.
const PARTS: { label: string; desc: string }[] = [
  {
    label: "Địa điểm",
    desc: "Chỗ đáng ghé, kèm giờ mở cửa, vé vào và mùa đẹp nhất.",
  },
  {
    label: "Trải nghiệm",
    desc: "Việc nên làm, kèm đơn vị tổ chức và giá nếu có.",
  },
  {
    label: "Ăn uống",
    desc: "Quán ăn và quán cà phê, lọc theo bữa và theo hướng nhìn.",
  },
  {
    label: "Nơi lưu trú",
    desc: "Danh bạ chỗ ở kèm kênh liên hệ đã đối chiếu với chủ nhà.",
  },
  {
    label: "Di chuyển",
    desc: "Cách đến nơi từ các thành phố lớn, và cách đi lại khi đã tới.",
  },
];

export default async function Home() {
  const [session, featured, posts, destParents, counts] = await Promise.all([
      auth(),
      prisma.place.findMany({
        where: { ...pub, kind: "destination" },
        orderBy: [
          { isFeatured: "desc" },
          { order: "asc" },
          { popularity: "desc" },
          { name: "asc" },
        ],
        take: 9,
        select: {
          slug: true,
          name: true,
          tagline: true,
          images: cover,
          parent: { select: { name: true } },
        },
      }),
      prisma.post.findMany({
        where: pub,
        orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
        take: 3,
        select: {
          slug: true,
          title: true,
          excerpt: true,
          category: true,
          publishedAt: true,
          createdAt: true,
          images: cover,
        },
      }),
      prisma.place.findMany({
        where: { ...pub, kind: "destination" },
        select: { parentId: true },
      }),
      Promise.all([
        prisma.place.count({ where: { ...pub, kind: "destination" } }),
        prisma.spot.count({ where: pub }),
        prisma.eatery.count({ where: pub }),
      ]),
    ]);

  const user = session?.user;
  const [destCount, spotCount, eateryCount] = counts;
  // Tỉnh THẬT SỰ có điểm đến, không phải tổng số tỉnh đã xuất bản.
  const provinceCount = new Set(destParents.map((d) => d.parentId)).size;

  // Hai nhóm KHÔNG GIAO NHAU cắt từ cùng một danh sách: năm ảnh nền hero thay
  // nhau, và bốn tấm ảnh in ở section ngay dưới. Trùng nhau thì một nơi vừa lướt
  // qua làm ảnh nền lại hiện ngay bên dưới thành thẻ.
  const shots: HeroShot[] = featured.slice(0, 5).map((p) => ({
    slug: p.slug,
    name: p.name,
    province: p.parent?.name ?? null,
    url: coverUrl(p.images, p.slug, 1920, 1280),
    thumb: coverUrl(p.images, p.slug, 160, 120),
  }));
  const prints = featured.slice(5, 9);

  return (
    <main className="flex-1">
      {/* ── HERO — BANNER ĐIỆN ẢNH, ẢNH NỀN THAY NHAU ─────────────────────
          Năm ảnh điểm đến crossfade 7 giây một lượt (xem HeroSlideshow — kèm
          chấm chuyển, nút tạm dừng và cách tải ảnh dần).
          Ảnh tràn viền, khối chữ canh giữa ở PHẦN TRÊN ảnh, xếp ba tầng:
            · tên nước bằng CHỮ VIẾT TAY cỡ lớn,
            · một dòng chữ hoa giãn ký tự,
            · một dòng mảnh liệt kê bằng dấu chấm giữa.
          Không thẻ, không ảnh in, không lưới — hero lần này là một tấm banner
          đúng nghĩa, còn các lối đi tiếp nằm ở section ngay dưới.

          Chữ bút lông là `--font-script` (Dancing Script) và ĐÂY LÀ CHỖ DUY
          NHẤT trong cả site dùng nó — xem ghi chú ở layout.tsx về lý do nó được
          đưa trở lại kèm `preload: false`. Thêm chỗ thứ hai là hỏng giao kèo đó.
          `leading-[1.05]` chứ không siết chặt hơn: chữ script có nét thò lên
          thò xuống, mà "Việt" còn thêm dấu nặng dưới đáy. */}
      <section className="relative isolate flex min-h-[48rem] items-start justify-center overflow-hidden pb-28 pt-36 lg:min-h-svh lg:pt-48">
        <HeroSlideshow shots={shots} />
        <span aria-hidden className={HERO_SCRIM} />

        <div className="mx-auto w-full max-w-4xl px-4 text-center sm:px-6">
          {user?.name && (
            <p className="mb-2 text-sm font-medium text-white/75">
              Chào {user.name}
            </p>
          )}

          {/* Cả hai tầng nằm TRONG h1: tách tên nước ra một thẻ riêng thì trang
              còn lại một tiêu đề cụt ngủn là "Việt Nam", không nói được trang
              này làm gì. */}
          <h1 className="text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.55)]">
            <span className="block font-[family-name:var(--font-script)] text-[clamp(3.5rem,10vw,7.5rem)] font-bold leading-[1.05] tracking-[-0.005em]">
              Việt Nam
            </span>
            {/* `max-w-4xl` cho khối chữ + `text-balance` ở dòng này: ở
                `max-w-3xl` (768px) câu hoa giãn 0.22em rộng ~817px nên rớt hai
                chữ cuối xuống dòng hai, thành một dòng dài và một dòng cụt. */}
            <span className="mt-3 block text-balance font-[family-name:var(--font-display)] text-[clamp(0.95rem,2.1vw,1.6rem)] font-semibold uppercase leading-tight tracking-[0.14em] text-white/90 sm:tracking-[0.22em]">
              Mỗi nơi một trang, đủ cho cả chuyến đi
            </span>
          </h1>

          {/* Dòng này liệt kê đúng NĂM MỤC có thật của một trang điểm đến, thay
              cho bản cũ nhắc lại bốn câu hỏi vốn đã là tiêu đề trang Giới thiệu.
              Người đọc đối chiếu được ngay khi bấm vào một nơi bất kỳ. */}
          <p className="mx-auto mt-6 max-w-xl text-balance text-sm leading-relaxed text-white/80 [text-shadow:0_1px_12px_rgba(0,0,0,0.7)] sm:text-base">
            Địa điểm · Trải nghiệm · Ăn uống · Lưu trú · Di chuyển
          </p>

          <CtaButton href="/diem-den" tone="photo" className="mt-10">
            Khám phá {destCount} điểm đến
          </CtaButton>
        </div>
      </section>

      {/* ── ĐIỂM ĐẾN NỔI BẬT ───────────────────────────────────────────────
          Hero nay là banner thuần, không còn lối đi nào trong đó ngoài một nút,
          nên bốn nơi đầu tiên phải có mặt ngay dưới. Vẫn là ảnh in nghiêng —
          giữ lại chất liệu ấy ở đúng một chỗ, không rải khắp trang. */}
      {prints.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <SectionHeading
            title="Điểm đến nổi bật"
            href="/diem-den"
            count={destCount}
            unit="điểm đến"
          />
          <ul className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-4 sm:gap-6">
            {prints.map((p, i) => (
              <li
                key={p.slug}
                className={cn("relative", PRINTS[i % PRINTS.length].tilt)}
              >
                <PhotoPrint p={p} taped={i === 0 || i === 3} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── MỘT TRANG ĐIỂM ĐẾN CÓ GÌ ───────────────────────────────────────
          Thay cho hai section cũ: "Khám phá theo chủ đề" (6 ô ảnh dẫn tới một
          nơi ngẫu nhiên) và "Về chúng tôi" (hai ảnh chồng lớp + huy hiệu tròn
          "100% Miễn phí & minh bạch" + hai ô icon). Cả hai đều nói về sản phẩm
          mà không nói được điều gì kiểm chứng nổi.
          Ở đây là danh sách năm mục THẬT, cộng một câu về phần khác biệt duy
          nhất — chỗ ở đã xác minh chính chủ. */}
      <section className="border-y border-border/60 bg-accent/30">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <div>
            <h2 className="text-balance font-[family-name:var(--font-display)] text-[clamp(1.6rem,3.2vw,2.5rem)] font-bold leading-[1.1] tracking-[-0.035em]">
              Mở một điểm đến là có sẵn cả chuyến đi
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
              Không phải sàn đặt phòng, cũng không phải blog cá nhân. Mỗi nơi có
              một trang riêng, và chỗ ở thì kèm kênh liên hệ đã đối chiếu với chủ
              nhà — phần khiến bạn không phải dò page thật giả trước khi chuyển
              cọc.
            </p>
            <Link
              href="/gioi-thieu"
              className="group mt-6 inline-flex items-center gap-2 font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
            >
              Vì sao làm trang này
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>

          <ol className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {PARTS.map((p, i) => (
              <li key={p.label} className="flex gap-4">
                <span
                  aria-hidden
                  className="shrink-0 pt-1 font-[family-name:var(--font-display)] text-sm font-bold tabular-nums text-warm"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h3 className="font-[family-name:var(--font-display)] font-semibold tracking-tight">
                    {p.label}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {p.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── CẨM NANG ───────────────────────────────────────────────────── */}
      {posts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <SectionHeading title="Mới trong Cẩm nang" href="/blog" />
          <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <li key={p.slug}>
                <PostTile p={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── ĐÓNG LẠI ───────────────────────────────────────────────────────
          Bản cũ đóng bằng BỐN section liên tiếp: dải thống kê (số kèm dấu "+"
          — 63 tỉnh không phải "63+"), lời chứng thực của hai người KHÔNG CÓ
          THẬT kèm điểm "4.9/5 từ cộng đồng" không dựa trên dữ liệu nào, thư
          viện ảnh, rồi một banner CTA có vòng tròn đồng tâm, đường bay nét đứt,
          máy bay và bóng skyline.
          Còn lại đúng một câu số đếm được và một lối đi tiếp. */}
      <section className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="max-w-lg text-balance font-[family-name:var(--font-display)] text-[clamp(1.5rem,3vw,2.25rem)] font-bold leading-[1.15] tracking-[-0.035em]">
              Chọn một nơi, phần còn lại đã nằm sẵn ở đó
            </h2>
            <p className="mt-3 max-w-lg leading-relaxed text-muted-foreground">
              Hiện có <Num>{destCount}</Num> điểm đến ở{" "}
              <Num>{provinceCount}</Num> tỉnh thành, với <Num>{spotCount}</Num>{" "}
              địa điểm và <Num>{eateryCount}</Num> quán ăn – quán nước đã được
              biên tập.
            </p>
          </div>

          <CtaButton href="/diem-den" className="shrink-0 self-start lg:self-auto">
            Xem tất cả điểm đến
          </CtaButton>
        </div>
      </section>
    </main>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

type Tile = {
  slug: string;
  name: string;
  tagline: string | null;
  images: { url: string; isCover: boolean }[];
  parent: { name: string } | null;
};

// Một tấm ẢNH IN: khung giấy trắng bao quanh, mép dưới dày hơn để ghi tên —
// đúng cách một tấm ảnh rửa ra trông như thế. Không bo góc lớn (giấy ảnh cắt
// vuông), bóng đổ ngắn và lệch nhẹ như vật thật đặt trên tường.
//
// Rê chuột thì tấm ảnh NHẤC LÊN VÀ THẲNG LẠI (`rotate-0`) — không phóng to ảnh.
// Cả tấm nghiêng sẵn nên việc nó tự chỉnh ngay ngắn khi được chú ý đọc ra rất
// tự nhiên, mà lại không đụng gì tới khuôn hình.
function PhotoPrint({ p, taped }: { p: Tile; taped?: boolean }) {
  return (
    <Link
      href={`/diem-den/${p.slug}`}
      className="group relative block rounded-[3px] bg-card p-2 pb-1 shadow-[0_12px_28px_-14px_rgba(0,0,0,0.5)] ring-1 ring-black/5 transition-transform duration-200 hover:-translate-y-1.5 hover:rotate-0 motion-reduce:transition-none"
    >
      {/* Băng dính — chỉ dán vài tấm, không dán hết: dán đều thì nó thành một
          hoạ tiết lặp chứ không còn ra vẻ ai đó vừa dán lên tường. */}
      {taped && (
        <span
          aria-hidden
          className="absolute -top-2.5 left-1/2 h-5 w-14 -translate-x-1/2 -rotate-6 rounded-[2px] bg-foreground/10"
        />
      )}

      <span className="relative block aspect-[4/5] overflow-hidden bg-muted">
        <Image
          src={coverUrl(p.images, p.slug, 400, 500)}
          alt=""
          fill
          sizes="(min-width: 1024px) 17vw, (min-width: 640px) 30vw, 45vw"
          className="object-cover"
        />
      </span>

      <span className="block px-0.5 pb-2 pt-2.5 text-center">
        <span className="block truncate font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight transition-colors group-hover:text-primary">
          {p.name}
        </span>
        {p.parent?.name && (
          <span className={cn(MICRO, "mt-0.5 block truncate text-warm")}>
            {p.parent.name}
          </span>
        )}
      </span>
    </Link>
  );
}

type PostRow = {
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  images: { url: string; isCover: boolean }[];
};

// Thẻ bài viết — cùng khuôn với lưới ở trang Cẩm nang: ảnh 16/10 bo góc, nhãn
// chuyên mục cam, tên bằng font display, không thẻ bọc.
function PostTile({ p }: { p: PostRow }) {
  return (
    <Link href={`/blog/${p.slug}`} className="group flex flex-col">
      <span className="relative block aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
        <Image
          src={coverUrl(p.images, p.slug, 640, 400)}
          alt=""
          fill
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
          className="object-cover"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10"
        />
      </span>
      <span className="mt-4 flex min-w-0 flex-col">
        {p.category && (
          <span className={cn(MICRO, "mb-2 text-warm")}>
            {label(POST_CATEGORY_LABELS, p.category)}
          </span>
        )}
        <span className="line-clamp-2 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
          {p.title}
        </span>
        {p.excerpt && (
          <span className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {p.excerpt}
          </span>
        )}
        <span className="mt-3 text-xs text-muted-foreground">
          {dateFmt.format(p.publishedAt ?? p.createdAt)}
        </span>
      </span>
    </Link>
  );
}

// Nút hành động chính. MỘT khuôn cho cả hero lẫn khối kết, chỉ đổi tông màu
// theo thứ nằm sau lưng nó.
//
// Bản trước có: đĩa trắng lọt trong viên nút, hai mũi tên chạy qua nhau, một
// vệt sáng quét chéo, nút nhấc lên 2px và bóng màu nở ra khi rê chuột. Năm hiệu
// ứng cho một cái nút — mỗi thứ riêng lẻ đều "hiện đại", cộng lại thì nó là thứ
// duy nhất trên trang đòi được chú ý, và đòi to hơn cả tấm ảnh lẫn tiêu đề.
//
// Ở đây chỉ còn hình viên thuốc, một màu nền và MỘT chuyển động: mũi tên nhích
// 2px. Đúng cử chỉ mà `SectionHeading` và mọi link "Xem tất cả" trong site đang
// dùng — nút chính không cần một ngôn ngữ chuyển động riêng, nó chỉ cần đậm hơn.
function CtaButton({
  href,
  children,
  className,
  /** `photo`: nút nằm trên ảnh → nền trắng, chữ mực, có bóng để tách khỏi ảnh.
   *  Mặc định nằm trên nền trang → nền `primary`. */
  tone = "surface",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  tone?: "photo" | "surface";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex h-12 items-center gap-2.5 rounded-full px-6 font-[family-name:var(--font-display)] text-[0.95rem] font-semibold transition-colors",
        tone === "photo"
          ? "bg-white text-foreground shadow-md shadow-black/20 hover:bg-white/90"
          : "bg-primary text-primary-foreground hover:bg-primary/90",
        className,
      )}
    >
      {children}
      <ArrowRight
        className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        aria-hidden
      />
    </Link>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return (
    <strong className="font-semibold tabular-nums text-foreground">
      {children}
    </strong>
  );
}
