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
  const [destinations, provinces] = await Promise.all([
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
            {/* Đầu trang: tên trang + MỘT CÂU. Không phải hero.
                Bản trước ở đây là hai mảnh rời nhau và cả hai đều đọc ra như
                khuôn mẫu dựng sẵn:
                  · một dãy bốn con số ngăn bằng dấu chấm giữa ("31 điểm đến ·
                    63 tỉnh thành · 18 địa điểm · 34 trải nghiệm"). Hai con số
                    cuối còn chẳng phải thứ trang này liệt kê, và mọi con số ở
                    đó đều không giúp ai quyết định gì — mỗi miền bên dưới đã
                    tự khai số của mình rồi;
                  · một viên nút viền treo lơ lửng ở góc đối diện tiêu đề. Mà
                    `/ban-do` đã nằm sẵn trong menu "Khám phá" trên desktop VÀ
                    là một tab của thanh dưới trên mobile — dựng thêm một nút
                    thứ ba cho cùng một chỗ chỉ là chiếm chỗ.
                Gộp cả hai vào một câu đọc được: con số nằm trong ngữ pháp thay
                vì xếp thành hàng, và bản đồ được nhắc đúng lúc nói tới lý do
                dùng nó (chọn theo vị trí) chứ không phải một nút không đầu
                không đuôi ở góc. */}
            <header className="mb-7 max-w-2xl">
              <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,3.4vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.035em]">
                Điểm đến Việt Nam
              </h1>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
                <Num>{destinations.length}</Num> điểm đến ở{" "}
                <Num>{provinceCount}</Num> tỉnh thành — hoặc{" "}
                <Link
                  href="/ban-do"
                  className="font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
                >
                  mở bản đồ
                </Link>{" "}
                để chọn theo vị trí.
              </p>
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
