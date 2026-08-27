import { prisma } from "@/lib/prisma";
import { Ic } from "@/components/icon";
import {
  DestinationFilter,
  type DestItem,
  type ProvinceItem,
} from "@/components/site/destination-filter";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Curtain, Rise } from "@/components/site/reveal";
import { Playfair_Display } from "next/font/google";
import { REGION_LABELS, regionOf } from "@/lib/regions";

export const metadata = {
  title: "Điểm đến · Halivivu",
  description: "Khám phá các điểm đến nổi bật và tỉnh thành khắp Việt Nam.",
};

// Font serif DUY NHẤT của dự án, và cố ý khai ở ĐÂY chứ không ở `layout.tsx`:
// nó chỉ phục vụ trang này, khai ở root là mọi trang khác cũng gánh thêm một
// file font mà không dùng tới một chữ nào.
//
// Phát qua BIẾN CSS (`--font-serif`) chứ không phải `serif.className`: tên miền
// trong `destination-filter.tsx` cũng dùng nó, mà file đó là Client Component
// nên không import được đối tượng font từ đây. Biến gắn một lần trên thẻ bọc
// ngoài cùng, mọi thứ bên trong tra được.
// Weight 400 — chính nét mảnh mới là lý do dùng nó; Playfair ở 700 thì đậm và
// tương phản nét gắt, đọc ra là một font khác hẳn.
const serif = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin", "vietnamese"],
  weight: ["400"],
  display: "swap",
});

const pub = { status: "published" as const };

const cover = {
  where: { isCover: true },
  take: 1,
  select: { url: true, isCover: true },
} as const;

export default async function DiemDenPage() {
  const [destinations, provinces, spotCount] = await Promise.all([
    prisma.place.findMany({
      where: { kind: "destination", ...pub },
      orderBy: [{ isFeatured: "desc" }, { popularity: "desc" }, { name: "asc" }],
      select: {
        slug: true,
        name: true,
        tagline: true,
        isFeatured: true,
        viewCount: true,
        images: cover,
        parent: { select: { name: true, slug: true } },
        // Số đếm nội dung — bốn ô dữ kiện ở đáy thẻ. Lấy thẳng từ DB nên luôn
        // đúng, không phải bảo trì như một câu văn xuôi; và nó nói được thứ
        // duy nhất người đang chọn nơi cần biết trước khi bấm: nơi này đã có
        // bao nhiêu thứ để xem/ăn/ở.
        _count: {
          select: {
            spots: { where: pub },
            eateries: { where: pub },
            accommodations: { where: pub },
            activities: { where: pub },
          },
        },
      },
    }),
    prisma.place.findMany({
      where: { kind: "province", ...pub },
      orderBy: [{ name: "asc" }],
      select: {
        slug: true,
        name: true,
        isFeatured: true,
        // Cờ "tỉnh này tự nó là một điểm đến" (Ninh Bình, Huế, Đà Nẵng…) — bật
        // thì tỉnh lên dải thẻ, đứng ngang hàng với các điểm đến. Xem chú thích
        // ở `Place.treatAsDestination` trong `schema.prisma`.
        treatAsDestination: true,
        // Ba trường dưới đây chỉ phục vụ những tỉnh như vậy.
        tagline: true,
        viewCount: true,
        images: cover,
        // Tên vài điểm đến trong tỉnh — thẻ tỉnh liệt kê thẳng ra thay vì chỉ
        // ghi một con số. Cùng thứ tự với dải thẻ chính (nổi bật → phổ biến →
        // ABC) nên cái được nêu tên là cái đáng nêu nhất.
        children: {
          where: pub,
          orderBy: [
            { isFeatured: "desc" },
            { popularity: "desc" },
            { name: "asc" },
          ],
          select: { name: true },
          take: 5,
        },
        // …và cả ĐỊA ĐIỂM gắn thẳng vào tỉnh. Một tỉnh "tự nó là điểm đến"
        // thường không có điểm đến con nào — thứ nằm trong nó là các `Spot`
        // (xem quy tắc gắn listing trong CLAUDE.md), nên nếu chỉ liệt kê
        // `children` thì đúng những tỉnh cần liệt kê nhất lại trống trơn.
        spots: {
          where: pub,
          orderBy: [
            { isFeatured: "desc" },
            { popularity: "desc" },
            { name: "asc" },
          ],
          select: { name: true },
          take: 5,
        },
        _count: {
          select: {
            children: { where: pub },
            spots: { where: pub },
            activities: { where: pub },
            // Đặc sản không đếm: phần món ăn đã tắt hiển thị, một nơi chỉ có
            // đặc sản mà gắn cờ "có nội dung" thì bấm vào ra trang trắng.
            eateries: { where: pub },
            accommodations: { where: pub },
          },
        },
      },
    }),
    // Chỉ để điền con số vào nhãn lối rẽ "Xem N địa điểm" — nhãn có số nói
    // được nó dẫn tới bao nhiêu thứ, thay vì hai chữ trống không.
    prisma.spot.count({ where: pub }),
  ]);

  const isEmpty = provinces.length === 0 && destinations.length === 0;

  const destItems: DestItem[] = destinations.map((d) => ({
    slug: d.slug,
    name: d.name,
    tagline: d.tagline,
    isFeatured: d.isFeatured,
    viewCount: d.viewCount,
    images: d.images,
    parentName: d.parent?.name ?? null,
    region: regionOf(d.parent?.slug),
    counts: {
      spot: d._count.spots,
      eatery: d._count.eateries,
      stay: d._count.accommodations,
      activity: d._count.activities,
    },
  }));
  const provinceItems: ProvinceItem[] = provinces.map((p) => {
    const c = p._count;
    return {
      slug: p.slug,
      name: p.name,
      region: regionOf(p.slug),
      isFeatured: p.isFeatured,
      treatAsDestination: p.treatAsDestination,
      childCount: c.children,
      // Điểm đến con đứng trước địa điểm: nơi lớn trước, chỗ cụ thể sau.
      childNames: [
        ...p.children.map((k) => k.name),
        ...p.spots.map((k) => k.name),
      ],
      childTotal: c.children + c.spots,
      tagline: p.tagline,
      viewCount: p.viewCount,
      images: p.images,
      counts: {
        spot: c.spots,
        eatery: c.eateries,
        stay: c.accommodations,
        activity: c.activities,
      },
      hasContent:
        c.children +
          c.spots +
          c.activities +
          c.eateries +
          c.accommodations >
        0,
    };
  });
  // Miền có điểm đến hoặc tỉnh (giữ thứ tự Bắc → Trung → Nam → Khác).
  const allRegions = REGION_LABELS.filter(
    (label) =>
      destItems.some((d) => d.region === label) ||
      provinceItems.some((p) => p.region === label),
  );

  return (
    <div className={cn("flex flex-1 flex-col", serif.variable)}>

      {/* TRANG NÀY CHẠY FULL-BLEED — không có `max-w-7xl` như phần còn lại
          của site. Mọi thứ (dải hero, thanh lọc, dải thẻ, danh sách tỉnh) dùng
          hết bề ngang khung nhìn, chỉ chừa lề bằng `px` tăng dần theo khổ:
          1rem → 1.5rem → 2.5rem → 3.5rem.
          Lý do: nội dung ở đây là ẢNH xếp thành dải ngang, mà một cột 90rem
          giữa màn 1600–2560px thì hai bên bỏ trống cả mấy trăm pixel trong khi
          dải thẻ bị cắt cụt. Đổi lại, header (dùng chung cả site, vẫn
          `max-w-7xl`) sẽ lệch vào trong so với nội dung ở màn rất rộng. */}
      {/* `overflow-x-clip`: dải thẻ của mỗi miền NỞ RA quá cột nội dung khi rê
          chuột (xem `destination-filter.tsx`), và nó tính bằng `100vw` — đơn vị
          này gồm CẢ bề rộng thanh cuộn dọc, nên trên máy có thanh cuộn chiếm
          chỗ (Windows) khối đó rộng hơn vùng nhìn thấy vài pixel và trang sinh
          ra một thanh cuộn NGANG.
          Dùng `clip` chứ KHÔNG phải `hidden`: `hidden` biến phần tử thành một
          scroll container, và thanh lọc `sticky` bên trong sẽ dính theo nó thay
          vì theo khung nhìn — tức là hỏng. `clip` chỉ cắt phần thừa. */}
      <main className="flex-1 overflow-x-clip">
        {isEmpty ? (
          <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6">
            <Ic
              icon="map-pin"
              className="mx-auto size-12 text-muted-foreground"
              aria-hidden
            />
            <p className="mt-4 text-muted-foreground">
              Chưa có điểm đến nào được xuất bản.
            </p>
          </div>
        ) : (
          <>
            <section className="relative isolate overflow-hidden">
              <Image
                src="/du-lich-viet-nam-2020-1.jpg"
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover object-[50%_70%]"
              />
              <span
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(ellipse_84%_92%_at_50%_50%,rgba(8,22,15,0.5)_0%,rgba(8,22,15,0.4)_46%,rgba(8,22,15,0.2)_76%,rgba(8,22,15,0.05)_100%)]"
              />

              <div className="relative mx-auto flex min-h-[clamp(15rem,22vw,18.5rem)] max-w-7xl flex-col items-center justify-center px-4 py-12 text-center sm:px-6 lg:min-h-[clamp(19rem,26vw,22.5rem)] lg:pb-12 lg:pt-[7rem]">
                <Curtain>
                <h1
                  className={`font-[family-name:var(--font-serif)] text-[clamp(2.5rem,7.5vw,5.5rem)] font-normal uppercase leading-[1.15] tracking-[0.12em] text-white [text-shadow:0_2px_40px_rgba(0,0,0,0.62)] sm:tracking-[0.18em]`}
                >
                  Việt Nam
                </h1>
                </Curtain>
                <Rise delay={0.18} className="mt-5 sm:mt-6">
                <p className="max-w-[40rem] text-[clamp(1.0625rem,2vw,1.5rem)] font-normal leading-snug text-white/90 [text-shadow:0_2px_20px_rgba(0,0,0,0.72)]">
                  Mỗi vùng đất, một hành trình để nhớ.
                </p>
                </Rise>
                <Rise delay={0.32} className="mt-8 sm:mt-10">
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                  <BrowseLink href="/dia-diem" label={`Xem ${spotCount} địa điểm`} />
                  <BrowseLink href="/ban-do" label="Mở bản đồ du lịch" />
                </div>
                </Rise>
              </div>
            </section>

            <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pb-24">
              <DestinationFilter
                items={destItems}
                provinces={provinceItems}
                regions={allRegions}
              />
            </div>
          </>
        )}
      </main>

    </div>
  );
}

// Một LỐI DUYỆT KHÁC của cùng kho nội dung (địa điểm cụ thể · bản đồ), đứng
// thành một hàng dưới câu dẫn.
//
// ─── KÍNH TRONG ──────────────────────────────────────────────────────────────
// Dựng lại từ đầu, và lần này bám vào thứ mắt THẬT SỰ thấy ở một tấm kính trong
// đặt trên ảnh — không phải "một ô mờ có viền":
//
//   1. MẶT KÍNH bắt sáng KHÔNG ĐỀU. Ánh sáng tới từ trên nên mặt kính sáng nhất
//      ở mép trên rồi nhạt dần xuống (`from-white/22 → to-white/[0.02]`). Đây là
//      khác biệt lớn nhất so với mọi bản trước: chúng đều dùng MỘT mức nền phẳng
//      (`bg-white/10`, `bg-black/20`), mà một mảng phẳng thì không bao giờ đọc ra
//      là kính — nó là giấy dán.
//   2. MÉP KHÚC XẠ. Rìa kính bẻ ánh sáng nên sáng hơn hẳn thân: một sợi trắng
//      70% ngay trong lòng mép trên, một sợi 18% ở mép dưới (ánh sáng vòng qua
//      đáy khối), cộng `ring` trắng 40% quanh bốn cạnh.
//   3. BÓNG ĐỔ NGẮN, LỆCH XUỐNG (`0_10px_28px_-10px`) — tấm kính nổi cách mặt
//      ảnh một chút chứ không dán bẹp lên đó.
//   4. GẦN NHƯ KHÔNG LÀM NHOÈ: `backdrop-blur-[2px]` + `saturate-[1.3]`. Ảnh
//      phía sau nhìn xuyên qua vẫn rõ hình, chỉ đậm màu hơn một nhịp.
//      Thang đã thử và BỎ, đừng đi lại: blur 40px → phẳng lì như tấm nhựa mờ;
//      12px → còn mềm quá; brightness 0.72 rồi 0.94 → kính hết trong; tint đặc
//      `black/20`–`rgba(8,22,15,0.42)` → thành mảng tối dán lên ảnh.
//
// Chữ đọc được nhờ BÓNG CHỮ hai tầng (một bóng chặt ôm sát nét, một bóng rộng
// dằn cả vùng) — bóng chỉ tối đúng chỗ có chữ, nên khoảng giữa các con chữ vẫn
// nhìn thẳng xuống ảnh. Đó là cách duy nhất giữ được kính trong mà chữ vẫn rõ.
//
// HOVER: kính SÁNG LÊN chứ không đảo thành trắng đặc — đảo màu thì đúng lúc
// người dùng chạm vào, vật liệu lại biến mất.
//
// Màu viết thẳng bằng `white/…` chứ KHÔNG qua token: dải hero tối ở CẢ HAI theme
// (giống `home-hero`), mà `border`/`card`/`foreground` thì lật theo theme.
function BrowseLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group relative inline-flex h-12 items-center px-6 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-[0_10px_28px_-10px_rgba(8,22,15,0.75)] backdrop-blur-[2px] backdrop-saturate-[1.3] [text-shadow:0_1px_3px_rgba(8,22,15,0.6),0_2px_16px_rgba(8,22,15,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:text-[0.8125rem]"
    >
      {/* Mặt kính — chuyển sắc, sáng ở trên. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.22] via-white/[0.07] to-white/[0.02] transition-colors duration-200 group-hover:from-white/40 group-hover:via-white/20 group-hover:to-white/10 motion-reduce:transition-none"
      />
      {/* Mép khúc xạ — ring quanh bốn cạnh + hai sợi sáng trong lòng mép. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-1px_0_rgba(255,255,255,0.18)] ring-1 ring-inset ring-white/40 transition-shadow duration-200 group-hover:ring-white/75 motion-reduce:transition-none"
      />
      <span className="relative">{label}</span>
    </Link>
  );
}
