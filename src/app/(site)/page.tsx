import Image from "next/image";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { R_BADGE, R_CARD } from "@/lib/radius";
import { coverUrl } from "@/lib/place-image";
import { POST_CATEGORY_LABELS, label } from "@/lib/listing-labels";
import { Ic } from "@/components/icon";
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
// Cùng họ chữ tiêu đề với các trang đã chuyển giọng — khai TẠI TRANG vì
// `--font-serif` không có trong root layout.
const serif = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin", "vietnamese"],
  weight: ["400"],
  display: "swap",
});

const MICRO = "text-[0.6rem] font-semibold uppercase tracking-[0.14em]";

// BA BƯỚC dùng site — mỗi bước ứng đúng một nhánh route thật, không phải ba lời
// hứa chung chung.
const STEPS = [
  {
    icon: "compass",
    title: "Chọn nơi",
    body: "Duyệt theo miền, hoặc mở bản đồ xem chỗ nào gần chỗ mình.",
  },
  {
    icon: "map-pinned",
    title: "Đọc một lượt",
    body: "Từng chỗ ghi giờ mở cửa, giá và mùa đẹp. Quán nào hay hết sớm cũng có ghi.",
  },
  {
    icon: "calendar-days",
    title: "Xếp ngày",
    body: "Thấy chỗ nào ưng thì bỏ vào túi, xong kéo thả chia ra từng ngày.",
  },
];

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

export default async function Home() {
  const [session, featured, trips, posts, counts] = await Promise.all([
      auth(),
      prisma.place.findMany({
        where: { ...pub, kind: "destination" },
        orderBy: [
          { isFeatured: "desc" },
          { order: "asc" },
          { popularity: "desc" },
          { name: "asc" },
        ],
        take: 16,
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
      // Lịch trình mẫu — cùng bộ lọc với /lich-trinh: phải đã xuất bản, có slug,
      // và có ÍT NHẤT MỘT ngày đã xếp được mục vào (mẫu rỗng thì không mời xem).
      prisma.trip.findMany({
        where: {
          isTemplate: true,
          ...pub,
          slug: { not: null },
          days: { some: { items: { some: {} } } },
        },
        orderBy: [
          { isFeatured: "desc" },
          { order: "asc" },
          { publishedAt: "desc" },
        ],
        take: 3,
        select: {
          slug: true,
          title: true,
          summary: true,
          images: cover,
          place: { select: { name: true, parent: { select: { name: true } } } },
          _count: { select: { days: true } },
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

  // Các nơi hiện ở thân trang KHÔNG lặp lại bốn nơi vừa chạy trên hero — trừ
  // khi trong DB chưa đủ điểm đến để tách hai nhóm.
  const rest = featured.slice(shots.length);
  const pool = rest.length >= 5 ? rest : featured;

  // Lưới điểm đến LỆCH: một nơi đứng đầu chiếm nửa bên phải, bốn nơi còn lại
  // xếp 2×2 bên trái. Chọn cách này thay cho lưới đều tám ô vì một trang chủ
  // nói "mỗi nơi một trang riêng" thì phải CHO XEM một trang riêng trông ra
  // sao, chứ không chỉ liệt kê tên.
  const lead = pool[0] ?? null;
  const gridPlaces = pool.slice(1, 5);
  // Collage ở dải số liệu — lấy tiếp phần đuôi, vòng lại từ đầu nếu thiếu.
  const thumbs = pool.slice(5, 8);
  const collage = (pool.length >= 11 ? pool.slice(8, 11) : featured).slice(0, 3);
  // Ảnh dải kết phải là nơi CHƯA xuất hiện ở bất kỳ ô nào phía trên — không chỉ
  // khác thẻ lớn. Bản đầu chỉ loại mỗi `lead`, nên nó vớ đúng phần tử kế tiếp,
  // mà phần tử ấy đang nằm trong lưới 2×2 ngay trên: cùng một tấm ảnh hiện hai
  // lần trong một màn hình, đọc ra như lỗi lặp dữ liệu.
  const usedAbove = new Set(
    [lead, ...gridPlaces, ...thumbs, ...collage].map((x) => x?.slug),
  );
  const closing = pool.find((p) => !usedAbove.has(p.slug)) ?? lead;

  const inside: { n: number; unit: string; note: string }[] = [
    { n: spotCount, unit: "địa điểm", note: "đã lên bản đồ" },
    { n: activityCount, unit: "trải nghiệm", note: "có mùa & thời lượng" },
    { n: eateryCount, unit: "quán ăn & quán nước", note: "gồm cả quán view" },
    { n: stayCount, unit: "nơi lưu trú", note: "phần lớn đã xác minh" },
  ];

  return (
    <main className={cn("flex-1", serif.variable)}>
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

      {/* ── NỘI DUNG ĐANG CÓ — hai cột: câu quy mô + số liệu | collage ảnh ──
          Bản trước là một DẢI mỏng: câu mở bên trái, bốn con số gạch chân bên
          phải, hết. Nó đúng vai trò "gạch ngang giữa hero và lưới điểm đến",
          nhưng khi trang chủ dài ra thì một dải chữ-toàn-chữ ngay dưới hero ảnh
          làm cả trang tụt hẳn nhiệt độ.

          Nay: chữ dồn về một cột hẹp, cột kia là ẢNH THẬT của các nơi đang có —
          tức là chính thứ mấy con số đang nói tới. Số liệu vào thẻ có viền
          thay vì gạch chân, để chúng đọc ra như bốn mảnh dữ kiện rời chứ không
          phải một bảng.

          ĐÃ THỬ VÀ BỎ (đừng dựng lại mà không hỏi): một **bản đồ độ phủ** 34
          tỉnh ở cột phải. Nhìn đẹp nhưng kéo cả section thành một thứ để nghịch,
          và bộ đường viền ~58KB nằm thẳng trong HTML trang chủ chỉ để minh hoạ
          mấy con số. Đường viền vẫn còn ở `components/account/vietnam-map-paths.ts`.

          LUẬT MÀU: xanh (`brand`) = tầng nơi chốn, cam (`warm-ink`) = tầng nội
          dung bên trong. KHÔNG dùng `primary`/`warm`: đây là CHỮ trên nền sáng,
          hai token kia không đủ tương phản. */}
      <section className="relative overflow-hidden border-b border-border/60">
        {/* Vệt nắng ấm rất nhạt hắt từ góc TRÊN TRÁI — nối tiếp vệt nắng ở góc
            dưới trái của hero, để chỗ nối hai section không phải là một đường
            cắt giữa ảnh tối và một mảng trắng phẳng. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(65%_85%_at_0%_0%,rgba(255,154,31,0.07),transparent_62%)]"
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className={cn(MICRO, "text-warm-ink")}>Nội dung đang có</p>

            <h2 className="mt-4 text-balance font-[family-name:var(--font-display)] text-[clamp(1.6rem,3vw,2.15rem)] font-semibold leading-[1.15] tracking-tight">
              {/* CỐ Ý KHÔNG đếm số tỉnh: đích đến là phủ đủ 34 tỉnh, mà một con
                  số "18/34" đọc ra như thanh tiến trình còn dang dở. */}
              <Big>{destCount}</Big>
              <span className="text-muted-foreground">
                điểm đến, mỗi nơi một trang riêng
              </span>
            </h2>

            {/* Câu này CỐ Ý không nhắc lại "chỗ ghé / chỗ ăn / chỗ ở / đường
                đi" — hero ngay phía trên đã liệt kê rồi, nhắc lần hai là đọc
                thành một trang tự quảng cáo. Nó nói thứ chưa ai nói: nội dung
                dày mỏng KHÔNG ĐỀU, và thừa nhận điều đó. */}
            <p className="mt-5 max-w-prose text-sm leading-relaxed text-muted-foreground">
              Nơi nào đã làm thì làm kỹ. Nơi mới thêm còn mỏng, đang bù dần.
            </p>

            {/* Khai `grid-cols-2` từ khổ nhỏ nhất (không chỉ `sm:`): lưới không
                khai cột thì track co theo max-content và tràn ngang ở 320px. */}
            <ul className="mt-8 grid grid-cols-2 gap-3">
              {inside.map((item) => (
                <li
                  key={item.unit}
                  className={cn(R_CARD, "border border-border px-4 py-4")}
                >
                  <p className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,2.4vw,1.9rem)] font-bold leading-none tabular-nums text-warm-ink">
                    {item.n}
                  </p>
                  <p className="mt-2 text-sm font-medium leading-snug">
                    {item.unit}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    {item.note}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {collage.length >= 3 && <Collage items={collage} />}
        </div>
      </section>

      {/* ── ĐIỂM ĐẾN NỔI BẬT — lưới LỆCH, một nơi đứng đầu ─────────────────
          Hero nói về cái site và chỉ đưa một nơi làm ví dụ, nên phần "đi đâu
          bây giờ" dồn hết vào đây.

          ĐÃ THAY: lưới tám tấm ẢNH IN NGHIÊNG (khung giấy trắng, băng dính,
          rê chuột thì tấm thẳng lại). Chất liệu ấy đẹp nhưng nó áp một giọng
          "album ảnh cũ" lên đúng chỗ đang phải trả lời câu hỏi thực dụng nhất
          của trang. Bản mới: thẻ ảnh sạch, một nơi được phóng lớn để CHO XEM
          một trang điểm đến trông ra sao thay vì chỉ liệt kê tên. Mã cũ
          (`PhotoPrint`, mảng `PRINTS`) nằm trong lịch sử git. */}
      {lead && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          {/* CHỈ tiêu đề, không eyebrow không câu dẫn. Bản trước có đủ ba tầng
              như mọi section khác, mà cả eyebrow ("Đi đâu bây giờ") lẫn câu dẫn
              đều chỉ diễn đạt lại đúng bốn chữ "Điểm đến nổi bật" nằm giữa
              chúng. Nút "Xem tất cả" ở cuối section gánh nốt phần dẫn. */}
          <h2 className="text-balance text-center font-[family-name:var(--font-serif)] text-[clamp(1.375rem,2.8vw,2rem)] font-normal uppercase leading-[1.2] tracking-[0.1em] sm:tracking-[0.14em]">
            Điểm đến nổi bật
          </h2>

          <div className="mt-12 grid gap-5 lg:grid-cols-2 lg:gap-6">
            {/* Bốn ô nhỏ 2×2. Ở khổ hẹp chúng xếp trên thẻ lớn, vì một thẻ lớn
                đứng đầu trên điện thoại thì đẩy hết phần còn lại xuống dưới màn. */}
            {gridPlaces.length > 0 && (
              <ul className="grid grid-cols-2 gap-5 lg:gap-6">
                {gridPlaces.map((p) => (
                  <li key={p.slug}>
                    <PlaceTile p={p} />
                  </li>
                ))}
              </ul>
            )}

            <LeadTile p={lead} thumbs={thumbs} />
          </div>

          <div className="mt-10 flex justify-center">
            <CtaButton href="/diem-den" tone="surface">
              Xem tất cả {destCount} điểm đến
            </CtaButton>
          </div>
        </section>
      )}

      {/* ── BA BƯỚC ────────────────────────────────────────────────────────
          Trang này không bán gì, nên khối "cách dùng" không phải là quy trình
          đặt chỗ mà là ĐƯỜNG ĐI TRONG SITE: từ chọn nơi → xem cái gì có sẵn ở
          đó → xếp thành lịch. Ba bước ứng đúng ba nhánh route thật
          (/diem-den → /diem-den/[slug]/[loai] → /lich-trinh), không phải ba lời
          hứa chung chung. */}
      <section className="relative overflow-hidden border-y border-border/60 bg-muted/30">
        <FlightPath />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          {/* Thông tin "không cần đăng nhập" gộp thẳng vào TIÊU ĐỀ. Trước đây
              nó là câu dẫn riêng bên dưới một tiêu đề chơi chữ ("Từ 'đi đâu'
              tới lịch trình, ba bước") — mà tiêu đề ấy không mang tin gì, còn
              câu dẫn thì mang. Gộp lại thì mất một dòng và tiêu đề có việc. */}
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance font-[family-name:var(--font-serif)] text-[clamp(1.375rem,2.8vw,2rem)] font-normal uppercase leading-[1.2] tracking-[0.1em] sm:tracking-[0.14em]">
              Ba bước, không cần đăng nhập
            </h2>
            <p className="mt-4 text-pretty text-sm leading-relaxed text-muted-foreground">
              Chỉ khi muốn lưu lịch trình của mình thì mới cần tài khoản.
            </p>
          </div>

          <ol className="mt-12 grid gap-5 sm:grid-cols-3 sm:gap-6">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className={cn(R_CARD, "border border-border bg-card p-6 text-center sm:p-7")}
              >
                <span className={cn(R_CARD, "mx-auto grid size-14 place-items-center border border-border text-primary-ink")}>
                  <Ic icon={s.icon} className="size-6" />
                </span>
                <p className={cn(MICRO, "mt-5 text-muted-foreground")}>
                  Bước {i + 1}
                </p>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── LỊCH TRÌNH MẪU ─────────────────────────────────────────────────
          Tương đương khối "gói tour" của các site bán chuyến — nhưng ở đây
          KHÔNG có giá, vì không bán gì. Huy hiệu góc ảnh ghi SỐ NGÀY: đó mới là
          thứ khách cân nhắc khi chọn một lịch trình mẫu để sửa lại thành của
          mình. */}
      {trips.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <SectionHeading
            serif
            title="Lịch trình mẫu"
            href="/lich-trinh"
            count={trips.length}
            unit="lịch trình"
          />
          {/* Lưới CO THEO SỐ MẪU THẬT, không phải bốn ô cố định: hiện DB mới có
              hai mẫu đủ điều kiện, mà lưới bốn cột thì hai ô trống bên phải đọc
              ra như trang bị lỗi tải. Ba mẫu → mẫu đầu chiếm hai cột cho vừa
              đúng hàng bốn; ít hơn → chia đều. */}
          <ul
            className={cn(
              "mt-9 grid gap-5 sm:grid-cols-2 lg:gap-6",
              trips.length >= 3 && "lg:grid-cols-4",
            )}
          >
            {trips.map((t, i) => {
              const wide = trips.length >= 3 && i === 0;
              return (
                <li key={t.slug} className={cn(wide && "lg:col-span-2")}>
                  <TripTile t={t} wide={wide || trips.length <= 2} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── CẨM NANG ───────────────────────────────────────────────────── */}
      {posts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-4 sm:px-6 sm:pb-20 sm:pt-8">
          <SectionHeading serif title="Mới trong Cẩm nang" href="/blog" />
          <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <li key={p.slug}>
                <PostTile p={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── DẢI KẾT — ảnh tràn + lời mời ───────────────────────────────────
          CLAUDE.md từng ghi "trang chủ kết thúc ở Cẩm nang, không có CTA đóng
          trang". Cái bị bỏ hồi đó là một khối CHỮ trên nền phẳng — nó chỉ lặp
          lại lời hứa của hero bằng chữ nhỏ hơn. Bản này khác hẳn về chất: một
          tấm ảnh tràn viền làm nền, tức là vẫn đang cho xem nơi chốn chứ không
          chỉ nói về nó. Đặt ở đây vì sau khi lướt hết bốn khối nội dung thì lối
          đi tiếp tự nhiên là "chọn một nơi". */}
      {closing && (
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 sm:pb-24">
          <div className="relative isolate overflow-hidden">
            <Image
              src={coverUrl(closing.images, closing.slug, 1600, 700)}
              alt=""
              width={1600}
              height={700}
              className="h-full w-full object-cover"
            />
            {/* Scrim xanh rừng rất sâu thay cho đen thuần — cùng cách xử lý với
                hero, để vùng chữ có nhiệt độ màu chứ không xám chì. */}
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(100deg,rgba(8,22,15,0.88)_0%,rgba(8,22,15,0.72)_45%,rgba(8,22,15,0.25)_100%)]"
            />
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-xl p-7 sm:p-10 lg:p-14">
                {/* Bỏ eyebrow ("Bắt đầu từ đâu" — thừa, cả dải này đã là lời
                    mời bắt đầu). Tiêu đề cũ "Chọn một nơi, phần còn lại đã nằm
                    sẵn ở đó" chính là câu CLAUDE.md ghi đã gỡ khỏi trang chủ
                    một lần, còn câu dưới nó thì lặp NGUYÊN VĂN "xem xong là
                    chốt được nơi" ở hero. Bản mới nói thứ chưa chỗ nào nói:
                    quyết định thật mà người ta cần là ĐI HAY KHÔNG. */}
                <h2 className="text-balance font-[family-name:var(--font-serif)] text-[clamp(1.375rem,2.8vw,2.125rem)] font-normal uppercase leading-[1.2] tracking-[0.1em] text-white sm:tracking-[0.14em]">
                  Chọn một nơi rồi tính tiếp
                </h2>
                <p className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-[#f7e7d6] sm:text-base">
                  Đọc hết một trang là biết nơi đó có đáng đi không. Đáng thì
                  xếp luôn thành lịch.
                </p>
                <div className="mt-7">
                  <CtaButton href="/diem-den" tone="photo">
                    Khám phá điểm đến
                  </CtaButton>
                </div>
              </div>
            </div>
          </div>
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

// Collage ảnh ở dải "Nội dung đang có" — năm tấm xếp lệch trong một lưới 3 cột,
// mỗi tấm có LỀ GIẤY TRẮNG mỏng (`bg-card p-1.5`) nên chồng lên nhau vẫn tách
// lớp được mà không cần viền.
//
// Cố ý KHÔNG dùng `absolute` để rải: vị trí tuyệt đối thì ở 320px các tấm chồng
// đè lên nhau và cả khối vỡ. Lưới `grid` + vài `translate-y` cho nhịp lệch giữ
// được cảm giác "rải" mà vẫn co giãn.
function Collage({ items }: { items: Tile[] }) {
  const [a, b, c] = items;
  const cell =
    "relative block overflow-hidden bg-muted ring-1 ring-black/5";
  const frame =
    "bg-card p-1.5 shadow-[0_14px_30px_-18px_rgba(0,0,0,0.45)]";

  return (
    <div className="relative">
      {/* Vệt nắng sau collage — cùng họ với vệt ở góc trên trái của section. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 -z-10 bg-[radial-gradient(60%_60%_at_70%_30%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_70%)]"
      />

      <div className="grid grid-cols-5 items-center gap-3 sm:gap-4">
        <div className={cn(frame, "col-span-3")}>
          <Shot p={a} ratio="aspect-[4/3]" className={cell} sizes="30vw" />
        </div>
        <div className={cn(frame, "col-span-2 -translate-y-4 sm:-translate-y-6")}>
          <Shot p={b} ratio="aspect-[3/4]" className={cell} sizes="20vw" />
        </div>
        {c && (
          <div className={cn(frame, "col-span-5 -translate-y-8 sm:-translate-y-12")}>
            <Shot p={c} ratio="aspect-[21/9]" className={cell} sizes="50vw" />
          </div>
        )}
      </div>
    </div>
  );
}

// Một ô ảnh trong collage. `alt=""` là CỐ Ý: đây là ảnh không khí, tên nơi
// không hiện và cũng không bấm được — đọc tên từng tấm lên cho trình đọc màn
// hình chỉ làm loãng, phần chữ ngay bên trái đã nói đủ.
function Shot({
  p,
  ratio,
  className,
  sizes,
}: {
  p: Tile;
  ratio: string;
  className: string;
  sizes: string;
}) {
  return (
    <span className={cn(className, ratio)}>
      <Image
        src={coverUrl(p.images, p.slug, 720, 720)}
        alt=""
        fill
        sizes={`(min-width: 1024px) ${sizes}, 45vw`}
        className="object-cover"
      />
    </span>
  );
}

// Đường bay nét đứt chạy vắt ngang section "Ba bước" — hoạ tiết du lịch duy
// nhất của trang, đặt sau nội dung và `pointer-events-none`.
// Ẩn dưới `sm`: ở khổ hẹp ba thẻ xếp DỌC nên một đường cong nằm ngang không
// còn nối được gì, nó chỉ là một nét lạ chạy sau chữ.
function FlightPath() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 220"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 top-1/2 hidden h-44 w-full -translate-y-1/2 text-primary/25 sm:block"
    >
      <path
        d="M40 170 C 260 40, 420 40, 600 110 S 940 180, 1160 60"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="7 9"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// Thẻ điểm đến thường — ảnh 4/3 lồng trong lòng thẻ (thẻ có lề mỏng quanh ảnh,
// ảnh bo góc riêng), cùng khuôn với thẻ ở StayDirectory / FoodMenu.
function PlaceTile({ p }: { p: Tile }) {
  return (
    <Link
      href={`/diem-den/${p.slug}`}
      className={cn(R_CARD, "group flex h-full flex-col border border-border bg-card p-2 transition-colors duration-200 hover:border-foreground")}
    >
      <span className={cn(R_BADGE, "relative block aspect-[4/3] overflow-hidden bg-muted")}>
        <Image
          src={coverUrl(p.images, p.slug, 560, 420)}
          alt=""
          fill
          sizes="(min-width: 1024px) 22vw, 45vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col px-2 pb-1.5 pt-3">
        {p.parent?.name && (
          <span className={cn(MICRO, "mb-1.5 truncate text-warm-ink")}>
            {p.parent.name}
          </span>
        )}
        <span className="truncate font-[family-name:var(--font-display)] text-base font-semibold tracking-tight underline-offset-4 group-hover:underline">
          {p.name}
        </span>
        {p.tagline && (
          <span className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {p.tagline}
          </span>
        )}
      </span>
    </Link>
  );
}

// Thẻ điểm đến ĐỨNG ĐẦU — ảnh tràn cả thẻ, chữ đặt trên ảnh, kèm dải ba ảnh nhỏ
// của các nơi khác ở góc dưới phải.
//
// Dải ảnh nhỏ là ẢNH TRANG TRÍ, không phải link: lồng link trong link là HTML
// không hợp lệ, mà tách chúng ra ngoài vùng bấm thì thẻ lớn mất một mảng bấm.
function LeadTile({ p, thumbs }: { p: Tile; thumbs: Tile[] }) {
  return (
    <Link
      href={`/diem-den/${p.slug}`}
      className={cn(R_CARD, "group relative isolate flex min-h-[22rem] flex-col justify-end overflow-hidden bg-muted p-6 sm:min-h-[26rem] sm:p-8 lg:min-h-full")}
    >
      <Image
        src={coverUrl(p.images, p.slug, 1200, 900)}
        alt=""
        fill
        sizes="(min-width: 1024px) 46vw, 92vw"
        className="-z-10 object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(8,22,15,0.9)_0%,rgba(8,22,15,0.55)_38%,rgba(8,22,15,0.05)_72%)]"
      />

      {thumbs.length > 0 && (
        <span
          aria-hidden
          className="absolute right-5 top-5 hidden gap-2 sm:flex"
        >
          {thumbs.map((t) => (
            <span
              key={t.slug}
              className={cn(R_BADGE, "relative block size-14 overflow-hidden bg-card/20 ring-2 ring-white/70")}
            >
              <Image
                src={coverUrl(t.images, t.slug, 160, 160)}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            </span>
          ))}
        </span>
      )}

      <span className="relative max-w-md">
        {p.parent?.name && (
          <span className={cn(MICRO, "block text-[#f6c98a]")}>
            {p.parent.name}
          </span>
        )}
        <span className="mt-2 block font-[family-name:var(--font-display)] text-[clamp(1.4rem,2.6vw,2rem)] font-semibold leading-tight tracking-tight text-white">
          {p.name}
        </span>
        {p.tagline && (
          <span className="mt-2.5 line-clamp-2 block text-sm leading-relaxed text-[#f7e7d6]">
            {p.tagline}
          </span>
        )}
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
          Mở trang điểm đến
          <Ic
            icon="arrow-right"
            className="size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
          />
        </span>
      </span>
    </Link>
  );
}

type TripRow = {
  slug: string | null;
  title: string;
  summary: string | null;
  images: { url: string; isCover: boolean }[];
  place: { name: string; parent: { name: string } | null } | null;
  _count: { days: number };
};

// Thẻ lịch trình mẫu — ảnh làm nền, huy hiệu SỐ NGÀY ở góc trên phải (chỗ mà
// các site bán chuyến để giá; ở đây không có giá nên số ngày vào đúng vị trí
// mắt đã quen tìm), tên đặt trên ảnh ở đáy.
function TripTile({ t, wide }: { t: TripRow; wide?: boolean }) {
  const nights = Math.max(0, t._count.days - 1);
  return (
    <Link
      href={`/lich-trinh/${t.slug}`}
      className={cn(
        "group relative isolate flex flex-col justify-end overflow-hidden bg-muted p-5",
        wide ? "min-h-[18rem] sm:min-h-[20rem]" : "min-h-[18rem]",
      )}
    >
      <Image
        src={coverUrl(t.images, t.slug ?? t.title, 900, 700)}
        alt=""
        fill
        sizes={wide ? "(min-width: 1024px) 46vw, 92vw" : "(min-width: 1024px) 23vw, 46vw"}
        className="-z-10 object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(8,22,15,0.88)_0%,rgba(8,22,15,0.45)_45%,rgba(8,22,15,0.05)_78%)]"
      />

      <span className="absolute right-4 top-4 bg-white/95 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] tabular-nums text-neutral-900 shadow-sm">
        {t._count.days} ngày{nights > 0 && ` ${nights} đêm`}
      </span>

      <span className="relative">
        {t.place?.name && (
          <span className={cn(MICRO, "block text-[#f6c98a]")}>
            {t.place.name}
          </span>
        )}
        <span className="mt-1.5 line-clamp-2 block font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight text-white">
          {t.title}
        </span>
        {wide && t.summary && (
          <span className="mt-2 line-clamp-2 block max-w-md text-sm leading-relaxed text-[#f7e7d6]">
            {t.summary}
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
      <span className={cn(R_CARD, "relative block aspect-[16/10] overflow-hidden bg-muted")}>
        <Image
          src={coverUrl(p.images, p.slug, 640, 400)}
          alt=""
          fill
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
          className="object-cover"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/10"
        />
      </span>
      <span className="mt-4 flex min-w-0 flex-col">
        {p.category && (
          <span className={cn(MICRO, "mb-2 text-warm-ink")}>
            {label(POST_CATEGORY_LABELS, p.category)}
          </span>
        )}
        <span className="line-clamp-2 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight underline-offset-4 group-hover:underline">
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
