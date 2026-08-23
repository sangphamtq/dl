import { prisma } from "@/lib/prisma";
import { Ic } from "@/components/icon";
import {
  DestinationFilter,
  type DestItem,
  type ProvinceItem,
} from "@/components/site/destination-filter";
import Link from "next/link";
import { REGION_LABELS, regionOf } from "@/lib/regions";

export const metadata = {
  title: "Điểm đến · Halivivu",
  description: "Khám phá các điểm đến nổi bật và tỉnh thành khắp Việt Nam.",
};

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
      },
    }),
    prisma.place.findMany({
      where: { kind: "province", ...pub },
      orderBy: [{ name: "asc" }],
      select: {
        slug: true,
        name: true,
        isFeatured: true,
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
    prisma.spot.count({ where: pub }),
  ]);

  const isEmpty = provinces.length === 0 && destinations.length === 0;

  // Chỉ MỘT con số kèm theo, và nó nói về đúng thứ trang này liệt kê: số tỉnh
  // THẬT SỰ có điểm đến, lấy ngay từ danh sách vừa truy vấn.
  // KHÔNG dùng `provinces.length` (63): phần lớn trong số đó đang là chip "Đang
  // cập nhật", nói "khắp 63 tỉnh thành" là hứa nhiều hơn thứ đang có.
  const provinceCount = new Set(
    destinations.map((d) => d.parent?.slug).filter(Boolean),
  ).size;

  const destItems: DestItem[] = destinations.map((d) => ({
    slug: d.slug,
    name: d.name,
    tagline: d.tagline,
    isFeatured: d.isFeatured,
    viewCount: d.viewCount,
    images: d.images,
    parentName: d.parent?.name ?? null,
    region: regionOf(d.parent?.slug),
  }));
  const provinceItems: ProvinceItem[] = provinces.map((p) => {
    const c = p._count;
    return {
      slug: p.slug,
      name: p.name,
      region: regionOf(p.slug),
      isFeatured: p.isFeatured,
      childCount: c.children,
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
    <div className="flex flex-1 flex-col">

      <main className="flex-1">
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
          <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-10">
            {/* Đầu trang: tên trang + một câu + HAI LỐI DUYỆT KHÁC.
                Không phải hero.

                Bản trước ở đây chỉ có tiêu đề và một câu, còn `/ban-do` được
                nhắc bằng một link chìm trong câu ấy. Lý do ghi lại hồi đó:
                "`/ban-do` đã nằm sẵn trong menu Khám phá trên desktop VÀ là một
                tab của thanh dưới trên mobile — dựng thêm một nút thứ ba cho
                cùng một chỗ chỉ là chiếm chỗ."

                TIỀN ĐỀ ẤY KHÔNG CÒN ĐÚNG: "Địa điểm" và "Bản đồ" vừa được gỡ
                khỏi nav header (xem `site-header.tsx`), nên đây là lối vào DUY
                NHẤT của chúng trên desktop. Một link chìm trong câu văn không
                gánh nổi vai trò đó.

                Vẫn KHÔNG quay lại kiểu "viên nút viền treo lơ lửng ở góc đối
                diện tiêu đề" từng bị bỏ. Hai mục này không phải hành động, chúng
                là HAI CÁCH XEM KHÁC của cùng kho nội dung mà trang đang liệt kê
                — nên chúng có hình của một cặp lối rẽ ngang hàng nhau: cùng
                khuôn, cùng cỡ, đặt cạnh nhau, mỗi cái tự khai nó dẫn tới cái gì
                bằng một con số hoặc một câu ngắn. */}
            <header className="mb-8">
              <div className="max-w-2xl">
                <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,3.4vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.035em]">
                  Điểm đến Việt Nam
                </h1>
                {/* Câu này KHÔNG còn nhắc bản đồ: bản đồ nay có ô riêng ngay
                    dưới, mà hai link cùng đích trong một khối là thứ mắt phải
                    đọc hai lần mới biết chúng trùng nhau. */}
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  <Num>{destinations.length}</Num> điểm đến ở{" "}
                  <Num>{provinceCount}</Num> tỉnh thành, xếp theo miền.
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:max-w-2xl sm:grid-cols-2">
                <BrowseLink
                  href="/dia-diem"
                  icon="map-pin"
                  label="Địa điểm"
                  desc={`${spotCount} chỗ đáng ghé, lọc theo loại hình`}
                />
                <BrowseLink
                  href="/ban-do"
                  icon="map"
                  label="Bản đồ du lịch"
                  desc="Chọn theo vị trí, xem cái gì gần cái gì"
                />
              </div>
            </header>

            <DestinationFilter
              items={destItems}
              provinces={provinceItems}
              regions={allRegions}
            />
          </div>
        )}
      </main>

    </div>
  );
}

// Một LỐI DUYỆT KHÁC của cùng kho nội dung (địa điểm cụ thể · bản đồ). Cố ý
// KHÔNG mang hình của nút: nền `muted/40` không viền, icon trong ô bo góc, mũi
// tên chỉ hiện khi rê — đọc ra là "đi tiếp sang một cách xem khác", không phải
// "bấm để làm một việc". Hai ô cùng khuôn nên chúng ngang hàng nhau.
//
// Dùng THẺ (nền `card` + viền mảnh) chứ không phải nền `muted`: ngay bên dưới là
// thanh lọc dính, mà mọi điều khiển trong đó đều là viên nền `muted`. Hai dải
// xám xếp chồng nhau thì mắt đọc thành một khối điều khiển bốn hàng.
function BrowseLink({
  href,
  icon,
  label,
  desc,
}: {
  href: string;
  icon: string;
  label: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3.5 rounded-xl border border-border/70 bg-card p-3.5 transition-colors hover:border-primary/40"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Ic icon={icon} className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight transition-colors group-hover:text-primary">
          {label}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {desc}
        </span>
      </span>
      <Ic
        icon="arrow-right"
        className="size-4 shrink-0 -translate-x-1 text-primary opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none"
        aria-hidden
      />
    </Link>
  );
}

// Con số trong câu: đậm hơn chữ xung quanh một bậc và về màu chữ chính, đủ để
// mắt bắt được mà vẫn nằm trong dòng văn. `tabular-nums` cho hai con số cùng
// bề ngang chữ số.
function Num({ children }: { children: React.ReactNode }) {
  return (
    <strong className="font-semibold tabular-nums text-foreground">
      {children}
    </strong>
  );
}
