import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { coverUrl } from "@/lib/place-image";
import { POST_CATEGORY_LABELS, label } from "@/lib/listing-labels";
import { SectionHeading } from "@/components/site/section-heading";
import { CtaButton } from "@/components/site/cta-button";
import { HomeHero, type HeroTitle } from "@/components/site/home-hero";

const pub = { status: "published" as const };

const cover = {
  where: { isCover: true },
  take: 1,
  select: { url: true, isCover: true },
} as const;

// Bộ ba dùng chung cho bốn truy vấn "một mục tiêu biểu có ảnh".
const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// Nhãn nhỏ dùng chung — cùng khuôn với thẻ ở Điểm đến / Lưu trú / Ẩm thực.
const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";

// Góc nghiêng của từng tấm ảnh in. Viết NGUYÊN CHUỖI class: Tailwind quét mã
// nguồn theo văn bản, tên class ghép lúc chạy thì nó không sinh CSS.
// BA TIÊU ĐỀ HERO, đổi cùng nhịp với ảnh. Cả ba nói CÙNG MỘT LỜI HỨA bằng ba
// góc khác nhau — đừng thêm biến thể chỉ để có thêm chữ chạy: tiêu đề đổi mà
// người đọc phải suy nghĩ xem nó có mâu thuẫn với câu vừa rồi không thì hỏng.
// Biến thể ĐẦU TIÊN là tiêu đề chính thức (đọc bằng `sr-only`, dành cho trình
// đọc màn hình và bộ thu thập) — sửa thứ tự là sửa luôn h1 thật.
const TITLES: HeroTitle[] = [
  { a: "Đi một chuyến,", b: "khỏi mở mười tab", mark: "mười tab" },
  { a: "Mỗi điểm đến", b: "có một trang riêng", mark: "một trang riêng" },
  { a: "Bớt hỏi trong group,", b: "mở một trang là đủ", mark: "là đủ" },
];

// BA CÂU HỎI CỦA NGƯỜI SẮP ĐI — viết đúng giọng người ta hỏi nhau trong group,
// mỗi câu kèm chỗ site trả lời.
//
// Cố ý KHÔNG trùng với bốn lợi ích ở section bên dưới (gom một trang · giờ mở
// cửa · xác minh chính chủ · giá đi lại): ba câu này nhắm vào phần lên kế hoạch
// — đi đâu, đi mấy ngày, đi mùa nào. Hai khối cùng nói một chuyện thì khối sau
// hoá ra thừa.
const ASKS: { q: string; a: string }[] = [
  {
    q: "Cuối tuần này đi đâu được?",
    a: "Mỗi điểm đến một trang đầy đủ, xem xong là chốt được nơi.",
  },
  {
    q: "Ba ngày ở đó thì đi những đâu?",
    a: "Lịch trình mẫu xếp sẵn theo ngày, kéo thả sửa lại thành của mình.",
  },
  {
    q: "Mùa này lên đó có gì đẹp?",
    a: "Từng địa điểm ghi rõ mùa và giờ đẹp nhất để đi.",
  },
];

// SÁU góc nghiêng cho một lưới BỐN cột: số lẻ so với số cột nên hàng thứ hai
// không lặp lại y hệt hàng đầu — bốn góc cho bốn cột thì hai hàng thành một
// khuôn dập, đọc ra ngay là máy xếp chứ không phải ai đó dán lên tường.
const PRINTS = [
  { tilt: "-rotate-2" },
  { tilt: "rotate-2" },
  { tilt: "rotate-1" },
  { tilt: "-rotate-3" },
  { tilt: "rotate-3" },
  { tilt: "-rotate-1" },
];

export default async function Home() {
  const [session, featured, posts, counts] = await Promise.all([
      auth(),
      prisma.place.findMany({
        where: { ...pub, kind: "destination" },
        orderBy: [
          { isFeatured: "desc" },
          { order: "asc" },
          { popularity: "desc" },
          { name: "asc" },
        ],
        take: 12,
        select: {
          slug: true,
          name: true,
          tagline: true,
          images: cover,
          lat: true,
          lng: true,
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
      Promise.all([
        prisma.place.count({ where: { ...pub, kind: "destination" } }),
        prisma.spot.count({ where: pub }),
        prisma.eatery.count({ where: pub }),
        prisma.activity.count({ where: pub }),
        prisma.accommodation.count({ where: pub }),
      ]),
    ]);

  const user = session?.user;
  const [destCount, spotCount, eateryCount, activityCount, stayCount] =
    counts;
  // ẢNH HERO — bốn nơi nổi bật nhất, chỉ lấy làm KHÔNG KHÍ (tên nơi ghi ở cụm
  // điều khiển). Hero không hứa hẹn gì về nơi trong ảnh, nó chỉ ghi tên và cho
  // một lối bấm vào.
  const shots = featured.slice(0, 4).map((p) => ({
    slug: p.slug,
    name: p.name,
    province: p.parent?.name ?? null,
    url: coverUrl(p.images, p.slug, 1920, 1080),
    lat: p.lat,
    lng: p.lng,
  }));

  // Ảnh in ở section "Điểm đến nổi bật" không lặp lại các nơi vừa chạy trên
  // hero — trừ khi trong DB chưa đủ điểm đến để tách hai nhóm.
  const rest = featured.slice(shots.length);
  // Tám tấm (hai hàng bốn) thay vì bốn: bỏ hai section ở cuối rồi thì lưới
  // điểm đến là phần NỘI DUNG THẬT duy nhất còn lại trước Cẩm nang — cho nó
  // gánh nhiều hơn thay vì để trang chủ mỏng đi.
  const prints = (rest.length >= 8 ? rest : featured).slice(0, 8);

  const inside: { n: number; unit: string; note: string }[] = [
    { n: spotCount, unit: "địa điểm", note: "đã lên bản đồ" },
    { n: activityCount, unit: "trải nghiệm", note: "có mùa & thời lượng" },
    { n: eateryCount, unit: "quán ăn & quán nước", note: "gồm cả quán view" },
    { n: stayCount, unit: "nơi lưu trú", note: "phần lớn đã xác minh" },
  ];

  return (
    <main className="flex-1">
      {/* ── HERO — ẢNH TRÀN VIỀN, CHỮ LÀ LỜI HỨA CỦA SITE ──────────────
          Ảnh chỉ là KHÔNG KHÍ: nơi trong ảnh ghi tên ở cụm điều khiển bên phải
          (kèm link), chứ không làm chữ to nhất màn hình — trang chủ không phải
          chỗ quảng cáo cho một điểm đến đổi mỗi bảy giây.

          PHẦN GIỚI THIỆU NÓI BẰNG CÂU HỎI CỦA NGƯỜI ĐI, không phải bằng lời tự
          giới thiệu. Trên là tiêu đề + một câu + hai lối đi tiếp; dưới là một
          dải tràn ngang ba cột: ba câu người ta vẫn hỏi nhau trước chuyến đi,
          mỗi câu kèm chỗ site trả lời.

          Đã thử và bỏ hai bản trước, đừng quay lại:
            · ĐOẠN VĂN BỐN DÒNG + hàng nhãn trần ("Địa điểm · Trải nghiệm · …")
              — nhãn nói TÊN mục mà không nói mục đó chứa gì, còn nửa phải tấm
              ảnh thì trống trơn;
            · THẺ MỤC LỤC kính tối ở cột phải, năm mục đánh số 01–05 — đọc được,
              nhưng đó là site tự mô tả cấu trúc của mình bằng từ vựng nội bộ
              ("Nơi lưu trú", "Di chuyển"), trong khi khách đến đây mang theo
              câu hỏi chứ không mang theo sơ đồ dữ liệu. Nó cũng là khối thứ ba
              liên tiếp có dạng "danh sách mục + chú thích nhỏ", ngay trên
              section số liệu và section lợi ích vốn cũng cùng một hình.
          Dải câu hỏi thì ngược lại: giọng người thật, hình khác hẳn (chữ lớn,
          hairline chia cột, không hộp), và tràn hết bề ngang nên nửa phải tấm
          ảnh có việc để làm.

          Hero tràn viền chạy DƯỚI header ⇒ `/` phải ở nhánh `overlay` của
          `site-chrome.ts`, không phải LIGHT_ROUTES. */}
      {/* THANG NHIỆT ĐỘ CHỮ (chữ trên ảnh KHÔNG dùng một sắc trắng cho mọi cấp —
          xếp chồng năm mức trắng đục thì cả hero đọc ra đen-trắng):
            · h1 và câu hỏi  → TRẮNG THUẦN, tương phản cao nhất;
            · câu dẫn & câu trả lời → TRẮNG NGẢ ẤM (#f8ece0 / #f7e7d6), cùng
              nhiệt độ với vệt nắng hắt lên từ góc dưới trái;
            · nhãn mở đầu → CAM thật (`warm-bright`), một dòng chữ có màu;
            · toạ độ → cam rất mờ, đọc ra như ghi chú bên lề.
          Bảng màu này chỉ đúng TRÊN ẢNH TỐI nên viết thẳng mã màu, không qua
          token: token phải lật theo theme, còn hero thì tối ở cả hai theme. */}
      <HomeHero
        shots={shots}
        titles={TITLES}
        greeting={user?.name ?? null}
        footer={
          <ul className="hero-rise grid gap-x-10 gap-y-6 [animation-delay:520ms] sm:grid-cols-3 sm:divide-x sm:divide-white/15">
            {ASKS.map((item, i) => (
              <li
                key={item.q}
                className={cn(
                  "border-white/15",
                  i > 0 && "border-t pt-6 sm:border-t-0 sm:pl-10 sm:pt-0",
                )}
              >
                {/* Dấu mở ngoặc kép để RỜI, cỡ lớn, màu cam: nó là dấu hiệu
                    "đây là lời người ta nói" — thứ khiến dải này đọc ra khác
                    hẳn một danh sách tính năng. `leading-[0]` + `align`: dấu “
                    của font display có rất nhiều khoảng trắng phía dưới, để tự
                    nhiên thì nó đội câu hỏi lệch xuống. */}
                <p className="font-[family-name:var(--font-display)] text-lg font-semibold leading-snug text-white [text-shadow:0_1px_12px_rgba(0,0,0,0.7)]">
                  <span
                    aria-hidden
                    className="mr-1 font-bold text-warm-bright"
                  >
                    “
                  </span>
                  {item.q}
                  <span aria-hidden className="text-white/40">
                    ”
                  </span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#f7e7d6]/75 [text-shadow:0_1px_10px_rgba(0,0,0,0.7)]">
                  {item.a}
                </p>
              </li>
            ))}
          </ul>
        }
      >
        <p className="hero-rise mt-5 max-w-lg text-pretty leading-relaxed text-[#f8ece0]/75 [animation-delay:300ms] [text-shadow:0_1px_12px_rgba(0,0,0,0.75)] sm:text-lg">
          Mỗi điểm đến ở đây có một trang riêng:{" "}
          <strong className="font-semibold text-white">chỗ ghé</strong>,{" "}
          <strong className="font-semibold text-white">chỗ ăn</strong>,{" "}
          <strong className="font-semibold text-white">chỗ ở</strong>,{" "}
          <strong className="font-semibold text-white">đường đi</strong> — biên
          tập tay, không phải sàn đặt phòng, cũng không phải blog kể chuyện.
        </p>

        <div className="hero-rise mt-8 flex flex-wrap items-center gap-3 [animation-delay:400ms]">
          <CtaButton href="/diem-den" tone="photo">
            Khám phá điểm đến
          </CtaButton>
          <CtaButton href="/lich-trinh" tone="glass" arrow={false}>
            Xem lịch trình mẫu
          </CtaButton>
        </div>
      </HomeHero>

      {/* ── SỐ LIỆU ────────────────────────────────────────────────────
          Câu quy mô với chữ số cỡ lớn, rồi hàng bốn con số của tầng nội dung.

          ĐÃ THỬ VÀ BỎ: một **bản đồ độ phủ** 63 tỉnh ở cột phải (tô xanh tỉnh
          đã có điểm đến, rê vào thì mảnh nhấc lên kèm popup liệt kê điểm đến).
          Nhìn thì đẹp, nhưng nó kéo cả section thành một thứ để nghịch, và bộ
          đường viền ~58KB nằm thẳng trong HTML trang chủ chỉ để minh hoạ mấy
          con số. Đường viền 63 tỉnh vẫn còn ở
          `components/account/vietnam-map-paths.ts` (trang `/tai-khoan/da-den`
          dùng), nên dựng lại lúc nào cũng được.

          LUẬT MÀU: xanh (`brand`) = tầng nơi chốn, cam (`warm-ink`) = tầng nội
          dung bên trong. KHÔNG dùng `primary`/`warm`: đây là CHỮ trên nền sáng,
          hai token kia không đủ tương phản. */}
      <section className="relative border-b border-border/60">
        {/* Vệt nắng ấm rất nhạt hắt từ góc TRÊN TRÁI — nối tiếp vệt nắng ở góc
            dưới trái của hero, để chỗ nối hai section không phải là một đường
            cắt giữa ảnh tối và một mảng trắng phẳng. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(65%_85%_at_0%_0%,rgba(255,154,31,0.07),transparent_62%)]"
        />

        {/* MỘT DẢI hai cột, không phải một section cao lêu nghêu: bỏ hai
            section bên dưới rồi thì khối này còn mỗi câu mở + bốn con số, mà
            vẫn ăn `py-20` như hồi nó là một section đầy — đọc ra như trang bị
            hụt nội dung. Xếp câu mở sang trái, số sang phải, đệm dọc giảm còn
            `py-12/14`: nó thành một GẠCH NGANG giữa hero và lưới điểm đến,
            đúng vai trò thật. */}
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-center lg:gap-16">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-warm-ink">
              Nội dung đang có
            </p>

            <h2 className="mt-4 text-balance font-[family-name:var(--font-display)] text-[clamp(1.4rem,2.6vw,1.85rem)] font-medium leading-[1.2] tracking-tight text-muted-foreground">
              {/* Không có dấu cách viết tay quanh <Big>: khoảng cách do `me-2`
                  của chính nó lo, thêm space nữa là hở gấp đôi.
                  CỐ Ý KHÔNG đếm số tỉnh: đích đến là phủ đủ 63 tỉnh, mà một con
                  số "27/63" đọc ra như một thanh tiến trình còn dang dở. */}
              <Big>{destCount}</Big>điểm đến, mỗi nơi một trang riêng
            </h2>
          </div>

          {/* Khai `grid-cols-2` từ khổ nhỏ nhất (không chỉ `sm:`): lưới không
              khai cột thì track co theo max-content và tràn ngang. */}
          <ul className="grid grid-cols-2 gap-x-8 gap-y-7 sm:grid-cols-4">
            {inside.map((item) => (
              <li key={item.unit} className="border-t border-border pt-3">
                <p className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,2.8vw,2.25rem)] font-bold leading-none tabular-nums text-warm-ink">
                  {item.n}
                </p>
                <p className="mt-2 text-sm font-medium leading-snug">
                  {item.unit}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.note}
                </p>
              </li>
            ))}
          </ul>
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
          <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-4 sm:gap-x-6 sm:gap-y-11">
            {prints.map((p, i) => (
              <li
                key={p.slug}
                className={cn("relative", PRINTS[i % PRINTS.length].tilt)}
              >
                <PhotoPrint p={p} taped={i === 1 || i === 4 || i === 6} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── CẨM NANG ───────────────────────────────────────────────────── */}
      {posts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:pb-24 sm:pt-14">
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

    </main>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

// Chữ số cỡ lớn trong câu số liệu. Đặt `inline-block` + `leading-[0.85]` để nó
// cao hơn hẳn dòng chữ mà không đội khoảng cách dòng lên; `align-baseline` giữ
// chân số đứng đúng đường chân chữ của câu.
function Big({ children }: { children: React.ReactNode }) {
  return (
    <strong className="me-2 align-baseline font-[family-name:var(--font-display)] text-[clamp(3rem,7vw,5.5rem)] font-bold leading-[0.85] tracking-[-0.04em] tabular-nums text-brand">
      {children}
    </strong>
  );
}

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
