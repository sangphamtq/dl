import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Ic } from "@/components/icon";
import { SPOT_CATEGORY_LABELS } from "@/lib/listing-labels";
import { SpotFilter, type SpotItem } from "@/components/site/spot-filter";

export const metadata = {
  title: "Địa điểm · Halivivu",
  description:
    "Duyệt mọi địa điểm tham quan trên khắp Việt Nam theo loại hình — biển, núi, thác, hang động, đền chùa…",
};

const pub = { status: "published" as const };

// Danh sách địa điểm (Spot) toàn quốc — lối duyệt theo CHỦ ĐỀ, cắt ngang tỉnh,
// bổ sung cho /diem-den (duyệt theo địa lý). Chi tiết tại /dia-diem/[slug].
export default async function DiaDiemPage() {
  const spots = await prisma.spot.findMany({
    where: pub,
    orderBy: [{ isFeatured: "desc" }, { popularity: "desc" }, { name: "asc" }],
    select: {
      slug: true,
      name: true,
      tagline: true,
      category: true,
      isFeatured: true,
      popularity: true,
      tags: true,
      images: {
        where: { isCover: true },
        take: 1,
        select: { url: true, isCover: true },
      },
      place: { select: { name: true, slug: true } },
    },
  });

  const items: SpotItem[] = spots.map((s) => ({
    slug: s.slug,
    name: s.name,
    tagline: s.tagline,
    categoryValue: s.category,
    categoryLabel: s.category
      ? (SPOT_CATEGORY_LABELS[s.category] ?? s.category)
      : null,
    placeName: s.place?.name ?? null,
    placeSlug: s.place?.slug ?? null,
    isFeatured: s.isFeatured,
    popularity: s.popularity,
    tags: s.tags,
    images: s.images,
  }));

  // Loại hình có mặt + số lượng (cho chip lọc), nhiều → ít.
  const catCount = new Map<string, number>();
  for (const s of spots)
    if (s.category) catCount.set(s.category, (catCount.get(s.category) ?? 0) + 1);
  const categories = [...catCount.entries()]
    .map(([value, count]) => ({
      value,
      label: SPOT_CATEGORY_LABELS[value] ?? value,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "vi"));

  // Điểm đến có địa điểm — giữ đúng thứ tự spot đã sắp (nổi bật → phổ biến),
  // nên nơi có nội dung mạnh nhất đứng section đầu.
  const places: { slug: string; name: string }[] = [];
  const seen = new Set<string>();
  for (const s of spots) {
    const pl = s.place;
    if (!pl?.slug || seen.has(pl.slug)) continue;
    seen.add(pl.slug);
    places.push({ slug: pl.slug, name: pl.name });
  }

  const isEmpty = items.length === 0;

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
              Chưa có địa điểm nào được xuất bản.
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-10">
            {/* Đầu trang: tên trang + MỘT CÂU — cùng khuôn /diem-den, không hero.
                Bản trước ở đây là một dải nền chuyển sắc chứa BỐN mảnh rời:
                nhãn eyebrow ("Đi khắp muôn nơi"), tiêu đề, một đoạn mô tả, một
                nút viền "Xem trên bản đồ", cộng hai con số dồn ở góc đối diện.
                Cả bốn đều nói lại đúng thứ mà tiêu đề và hàng chip loại hình
                ngay dưới đã nói, còn `/ban-do` thì đã nằm sẵn trong menu Khám
                phá VÀ là một tab của thanh dưới trên mobile.
                Gộp thành một câu đọc được: con số nằm trong ngữ pháp thay vì
                xếp thành hàng, và bản đồ được nhắc đúng lúc nói tới lý do dùng
                nó chứ không phải một nút không đầu không đuôi ở góc. */}
            <header className="mb-7 max-w-2xl">
              <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.75rem,3.4vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.035em]">
                Địa điểm tham quan
              </h1>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
                <Num>{items.length}</Num> địa điểm ở <Num>{places.length}</Num>{" "}
                điểm đến, chia theo <Num>{categories.length}</Num> loại hình —
                hoặc{" "}
                <Link
                  href="/ban-do"
                  className="font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
                >
                  mở bản đồ
                </Link>{" "}
                để chọn theo vị trí.
              </p>
            </header>

            <SpotFilter
              items={items}
              categories={categories}
              places={places}
            />
          </div>
        )}
      </main>

    </div>
  );
}

// Con số trong câu: đậm hơn chữ xung quanh một bậc và về màu chữ chính, đủ để
// mắt bắt được mà vẫn nằm trong dòng văn.
function Num({ children }: { children: React.ReactNode }) {
  return (
    <strong className="font-semibold tabular-nums text-foreground">
      {children}
    </strong>
  );
}
