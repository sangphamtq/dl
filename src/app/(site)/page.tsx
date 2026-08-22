import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { POST_CATEGORY_LABELS, label } from "@/lib/listing-labels";
import { SectionHeading } from "@/components/site/section-heading";
import { CtaButton } from "@/components/site/cta-button";

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
          // Đếm THEO TỪNG MỤC của trang điểm đến — đây là thứ hero dùng để nói
          // "trang này có gì" bằng số thật thay vì bằng một danh sách danh từ.
          // Lọc `published` ngay trong _count: đếm cả bản nháp thì con số trên
          // hero không khớp với thứ người xem bấm vào sẽ thấy.
          _count: {
            select: {
              spots: { where: pub },
              activities: { where: pub },
              eateries: { where: pub },
              accommodations: { where: pub },
              transports: { where: pub },
            },
          },
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

  // HERO LẤY MỘT NƠI LÀM VÍ DỤ — và phải là nơi CÓ NỘI DUNG THẬT.
  //
  // Hero nay nói về TRANG WEB, nhưng nói bằng một trang có thật thay vì bằng
  // tính từ: thẻ bên phải liệt kê đúng năm mục của một điểm đến kèm số lượng.
  // Nơi rỗng vào đó là hỏng cả hai đầu — thẻ ra năm số 0, và nút "Xem trang"
  // dẫn tới một trang trống.
  //
  // Lọc theo DỮ LIỆU chứ không theo cờ `isFeatured`: biên tập bật nổi bật cho
  // một nơi từ lúc mới tạo là chuyện bình thường, nội dung mới là thứ nói được
  // nơi đó đã đủ để đem ra làm ví dụ hay chưa.
  const hasContent = (p: (typeof featured)[number]) =>
    p._count.spots +
      p._count.activities +
      p._count.eateries +
      p._count.accommodations +
      p._count.transports >
    0;
  // Nơi dày nhất, không phải nơi đầu danh sách: đây là gian hàng mẫu của cả
  // site nên lấy trang đầy đủ nhất đang có.
  const sample =
    featured
      .filter(hasContent)
      .sort(
        (a, b) =>
          b._count.spots +
          b._count.activities +
          b._count.eateries +
          b._count.accommodations +
          b._count.transports -
          (a._count.spots +
            a._count.activities +
            a._count.eateries +
            a._count.accommodations +
            a._count.transports),
      )[0] ?? null;

  const sampleRows = sample
    ? ([
        ["Địa điểm", sample._count.spots],
        ["Trải nghiệm", sample._count.activities],
        ["Quán ăn & cà phê", sample._count.eateries],
        ["Nơi lưu trú", sample._count.accommodations],
        ["Cách di chuyển", sample._count.transports],
      ] as const)
    : [];

  // Ảnh in bên dưới không lặp lại nơi vừa dùng làm ví dụ ở hero.
  const prints = featured.filter((p) => p.slug !== sample?.slug).slice(0, 4);

  return (
    <main className="flex-1">
      {/* ── HERO — NÓI VỀ TRANG WEB, KHÔNG PHẢI VỀ MỘT ĐIỂM ĐẾN ──────────
          Bản trước là ảnh TRÀN VIỀN với một điểm đến làm nhân vật chính. Bản
          này đổi chủ ngữ: câu chuyện là chính cái site, còn điểm đến rút về vai
          VÍ DỤ — thẻ bên phải.

          Vì vậy hero cũng không còn là ảnh nền nữa mà là một khối hai cột trên
          nền sáng. Kéo theo hai thứ phải đổi cùng lúc, đừng tách ra:
            · `site-chrome.ts` — `/` chuyển sang LIGHT_ROUTES và rời khỏi
              `overlay`. Không đổi thì header vẫn là kính TỐI chờ đè lên ảnh, mà
              dưới nó giờ là nền trắng;
            · hero KHÔNG còn cần client JS. Slideshow cũ (`hero-slideshow.tsx`)
              là "use client" vì phải đếm giờ đổi ảnh; ở đây mọi thứ tĩnh nên
              hero chạy thẳng trên server.

          NÓI BẰNG VÍ DỤ, KHÔNG BẰNG TÍNH TỪ. Cột phải không phải ảnh trang trí:
          nó là một trang điểm đến CÓ THẬT, liệt kê đúng năm mục kèm số lượng
          thật. "Gom đủ mọi thứ vào một trang" là một lời hứa; năm dòng số là
          bằng chứng — và bấm vào kiểm được ngay. */}
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-primary/[0.07] via-background to-background">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:py-24">
          {/* ── Cột trái: trang này là gì ─────────────────────────────── */}
          <div>
            {user?.name && (
              <p className="mb-4 text-sm font-medium text-muted-foreground">
                Chào {user.name}
              </p>
            )}
            <h1 className="text-balance font-[family-name:var(--font-display)] text-[clamp(2.15rem,4.6vw,3.6rem)] font-bold leading-[1.08] tracking-tight">
              Mỗi nơi một trang,{" "}
              <span className="text-primary">đủ cho cả chuyến đi</span>
            </h1>

            <p className="mt-6 max-w-xl text-pretty leading-relaxed text-muted-foreground sm:text-lg">
              Địa điểm, trải nghiệm, quán ăn, chỗ ở và cách đi lại của một điểm
              đến — gom sẵn vào cùng một trang, thay vì mười tab và ba group
              Facebook.
            </p>

            {/* Số liệu TOÀN SITE (khác thẻ bên phải, vốn là số của một nơi).
                Đây là câu trả lời cho "trang này đã có bao nhiêu" — thứ mà mọi
                lời giới thiệu đều né. Tính từ DB nên không bao giờ lỗi thời. */}
            <p className="mt-8 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
              <Stat n={provinceCount} unit="tỉnh thành" />
              <Dot />
              <Stat n={destCount} unit="điểm đến" />
              <Dot />
              <Stat n={spotCount} unit="địa điểm" />
              <Dot />
              <Stat n={eateryCount} unit="quán ăn" />
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <CtaButton href="/diem-den">Khám phá điểm đến</CtaButton>
              <Link
                href="/blog"
                className="inline-flex h-12 items-center rounded-full border border-border px-5 text-[0.95rem] font-medium transition-colors hover:border-primary/40 hover:text-primary"
              >
                Đọc cẩm nang
              </Link>
            </div>
          </div>

          {/* ── Cột phải: một trang điểm đến thật, thu nhỏ ─────────────── */}
          {/* `max-w` + `mx-auto` chứ không để thẻ tràn hết ô lưới: `TripDock` là
              một viên tròn CỐ ĐỊNH ở giữa mép phải màn hình, mà cột số của thẻ
              căn phải — ở quãng viewport ~1440px (đúng bằng `max-w-7xl`) hai thứ
              đè lên nhau và con số đầu tiên biến mất. Kéo thẻ vào trong là hết
              chồng, mà thẻ cũng không bị kéo dài quá khổ. `mx-auto` (căn GIỮA ô
              lưới) chứ không `ml-auto`: dán thẻ vào mép phải thì dù đã thu hẹp
              nó vẫn nằm đúng dưới viên nút. */}
          {sample && (
            <div className="relative mx-auto w-full max-w-lg lg:max-w-[32rem]">
              {/* Mảng nền mềm sau thẻ — thay cho vòng tròn đồng tâm/đường bay
                  nét đứt: cùng tác dụng tách lớp mà không thêm một họa tiết nào
                  mới vào site. */}
              <div
                aria-hidden
                className="absolute -inset-3 -z-10 rounded-[2.25rem] bg-primary/[0.07] sm:-inset-5"
              />
              <article className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xl shadow-black/5">
                <div className="relative aspect-[16/10]">
                  <Image
                    src={coverUrl(sample.images, sample.slug, 960, 600)}
                    alt={`Ảnh ${sample.name}`}
                    fill
                    priority
                    sizes="(min-width: 1024px) 44vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-5 pb-4 pt-12">
                    {sample.parent?.name && (
                      <p className="text-xs font-medium text-white/75">
                        {sample.parent.name}
                      </p>
                    )}
                    <p className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white">
                      {sample.name}
                    </p>
                  </div>
                </div>

                {/* Năm mục — đúng thứ tự các mục trong một trang điểm đến (xem
                    CLAUDE.md), KHÔNG sắp theo số lớn nhỏ: thẻ này dạy cấu trúc,
                    mà cấu trúc thì không đổi chỗ theo dữ liệu.
                    Mục rỗng vẫn hiện, ghi "—": giấu đi thì thẻ hoá ra hứa rằng
                    trang chỉ có bốn mục. */}
                <ul className="divide-y divide-border/60">
                  {sampleRows.map(([label, n]) => (
                    <li
                      key={label}
                      className="flex items-center justify-between px-5 py-2.5 text-sm"
                    >
                      <span className="text-muted-foreground">{label}</span>
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          n > 0 ? "text-foreground" : "text-muted-foreground/50",
                        )}
                      >
                        {n > 0 ? n : "—"}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/diem-den/${sample.slug}`}
                  className="group flex items-center justify-between border-t border-border/60 px-5 py-3.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                >
                  Xem trang {sample.name}
                  <ArrowRight
                    className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden
                  />
                </Link>
              </article>
            </div>
          )}
        </div>
      </section>

      {/* ── ĐIỂM ĐẾN NỔI BẬT ───────────────────────────────────────────────
          Hero nói về cái site và chỉ đưa ra MỘT nơi làm ví dụ, nên phần "đi đâu
          bây giờ" dồn hết vào đây. Vẫn là ảnh in nghiêng — giữ lại chất liệu ấy
          ở đúng một chỗ, không rải khắp trang. */}
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

function Num({ children }: { children: React.ReactNode }) {
  return (
    <strong className="font-semibold tabular-nums text-foreground">
      {children}
    </strong>
  );
}

function Stat({ n, unit }: { n: number; unit: string }) {
  return (
    <span>
      <strong className="font-semibold tabular-nums text-foreground">{n}</strong>{" "}
      {unit}
    </span>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-border">
      ·
    </span>
  );
}
