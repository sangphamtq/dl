import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { coverUrl } from "@/lib/place-image";
import { POST_CATEGORY_LABELS } from "@/lib/listing-labels";
import { PostStats } from "@/components/blog/post-stats";
import { SectionHeading } from "@/components/site/section-heading";
import { cn } from "@/lib/utils";

// Đặc sản/Quán ăn không có trang chi tiết riêng (hiển thị drawer) nên không
// render "Bài viết liên quan". Lưu trú CÓ trang chi tiết (/luu-tru/[slug]) → giữ.
const FK = {
  place: "placeId",
  activity: "activityId",
  spot: "spotId",
  accommodation: "accommodationId",
} as const;

export type RefType = keyof typeof FK;

type Post = {
  slug: string;
  title: string;
  category: string | null;
  publishedAt: Date | null;
  images: { url: string; isCover: boolean }[];
  _count: { likes: number; comments: number };
};

// Ngày đăng: chỉ "12/03/2025", KHÔNG dùng `timeAgo`. Bài cẩm nang không phải tin
// tức — "3 tháng trước" nghe như đã cũ, trong khi kinh nghiệm đi chơi thì vẫn
// dùng được. Ngày cụ thể là dữ kiện trung tính.
const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// "Bài viết liên quan": các Post (đã xuất bản) có PostRef trỏ tới đối tượng này.
// Tự ẩn nếu không có bài.
//
// ẢNH TRÊN — CHỮ DƯỚI, KHÔNG khung thẻ: chỉ ảnh bo góc rồi chữ trần trên nền
// trang. Chữ nằm ngoài ảnh nên đọc chắc chắn, không phụ thuộc bức bìa sáng hay
// tối như bản chữ-đè-lên-ảnh.
//
// Tiết kiệm chỗ bằng CÁCH BÀY chứ không bằng cắt nội dung:
//  - mobile: dải cuộn ngang có snap, thấy ~1,7 thẻ mỗi lúc → cả mục cao đúng
//    MỘT thẻ (~250px) thay vì ba thẻ chồng lên nhau (~750px);
//  - từ lg: bỏ cuộn, thành lưới 3 cột.
//
// Chữ chỉ giữ thứ quyết định việc bấm: nhãn phân loại · tiêu đề 2 dòng · ngày
// và tương tác.
//
// Tiêu đề mục dùng `SectionHeading` như mọi mục khác, và container `max-w-7xl`
// cho khớp mọi trang gọi nó — cả bốn trang (điểm đến, địa điểm, hoạt động, lưu
// trú) đều dựng nội dung ở `max-w-7xl`.
export async function RelatedPosts({ type, id }: { type: RefType; id: string }) {
  const where = {
    status: "published" as const,
    refs: { some: { [FK[type]]: id } as Prisma.PostRefWhereInput },
  };
  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
      take: 3,
      select: {
        slug: true,
        title: true,
        category: true,
        publishedAt: true,
        images: {
          where: { isCover: true },
          take: 1,
          select: { url: true, isCover: true },
        },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  if (posts.length === 0) return null;

  return (
    // Tự dựng container: component này còn được gọi trực tiếp ở ba trang chi
    // tiết (địa điểm, hoạt động, lưu trú) mà không có dải nào bọc ngoài.
    //
    // Đệm TRÊN là bắt buộc, không ăn nhờ đệm dưới của khối trước: ở trang Place
    // khối trước là một dải có NỀN, nên đệm của nó là 80px màu nhạt — nền dừng
    // ngay sát chữ "Cẩm nang", đọc ra như nền đè lên tiêu đề. Có đệm riêng thì
    // giữa hai mục là 80px nhạt + 80px trắng, đúng nhịp như mọi cặp dải khác.
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeading
        eyebrow="Cẩm nang"
        title="Bài viết liên quan"
        href="/blog"
        count={total}
        unit="bài"
      />

      {/* `-mx-4 px-4` (và `sm:` tương ứng): dải cuộn chạm tới mép màn hình nhưng
          thẻ đầu vẫn thẳng hàng với tiêu đề mục. Từ lg bỏ cuộn, thành lưới.
          `py-1.5`: `overflow-x-auto` cắt cả chiều DỌC, thiếu đệm này thì lúc rê
          thẻ nhấc lên và bóng của nó bị xén ngang. */}
      <ul className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        {posts.map((p) => (
          <Card key={p.slug} p={p} />
        ))}
      </ul>
    </section>
  );
}

// KHÔNG có khung thẻ: chỉ ảnh bo góc + chữ trần trên nền trang. Bỏ viền/nền/
// bóng đi thì bức ảnh là vật thể duy nhất, mắt đi thẳng vào nó; thêm một khung
// nữa quanh ảnh vốn đã bo góc chỉ tạo hai đường bo lồng nhau.
//
// Đổi lại, nhãn phân loại rời khỏi ảnh xuống làm EYEBROW trên tiêu đề: bố cục
// trần thì viên kính trên ảnh là thứ duy nhất còn "đặc", nhìn lạc lõng; chữ nhỏ
// giãn ký tự + chấm cam hợp giọng biên tập của các mục khác trên trang.
function Card({ p }: { p: Post }) {
  const cat = p.category ? POST_CATEGORY_LABELS[p.category] : null;
  return (
    <li className="w-52 shrink-0 snap-start sm:w-60 lg:w-auto">
      {/* Hiệu ứng rê: cả thẻ NHẤC LÊN 4px và ảnh đổ bóng mềm, thay cho kiểu
          phóng ảnh. Phóng ảnh thì phải cắt bớt bức bìa đúng lúc người ta đang
          nhìn nó — với site du lịch, bức ảnh là nội dung chứ không phải nền để
          nghịch. Nhấc lên giữ nguyên ảnh, chỉ nói "cái này bấm được".
          Chạm (không có hover) thì lún xuống bằng `active:scale`. */}
      <Link
        href={`/blog/${p.slug}`}
        className="group flex h-full flex-col transition-transform duration-300 ease-out hover:-translate-y-1 active:scale-[0.99] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <span className="relative block aspect-[3/2] shrink-0 overflow-hidden rounded-2xl bg-muted shadow-sm shadow-black/5 transition-shadow duration-300 group-hover:shadow-xl group-hover:shadow-black/15">
          <Image
            src={coverUrl(p.images, p.slug, 480, 320)}
            alt=""
            fill
            sizes="(min-width: 1024px) 30vw, 240px"
            className="object-cover"
          />
        </span>

        {cat && (
          <span className="mt-3 inline-flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            <span aria-hidden className="size-1 rounded-full bg-warm" />
            {cat}
          </span>
        )}

        <span
          className={cn(
            "line-clamp-2 block text-[0.95rem] font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary",
            cat ? "mt-1" : "mt-3",
          )}
        >
          {p.title}
        </span>

        {/* KHÔNG có mũi tên ở dòng này. Cả thẻ đã là một link, nên mũi tên
            không nói thêm được gì; nó lại nằm lẻ ở mút phải cùng hàng với ngày
            tháng nên đọc ra như thuộc về ngày tháng. Mũi tên chỉ đáng có khi
            phân biệt MỘT hành động giữa nhiều hành động, hoặc báo rời khỏi site
            — cả hai đều không phải trường hợp này. Tín hiệu bấm được đã nằm ở
            tiêu đề đổi màu + ảnh phóng nhẹ khi rê.
            `mt-auto` đẩy dòng meta xuống đáy → ba thẻ cạnh nhau có ngày tháng
            thẳng hàng dù tiêu đề một dòng hay hai dòng. */}
        <span className="mt-auto flex items-center gap-x-2.5 pt-2 text-xs text-muted-foreground">
          {p.publishedAt && <span>{dateFmt.format(p.publishedAt)}</span>}
          {p.publishedAt && (p._count.likes > 0 || p._count.comments > 0) && (
            <span aria-hidden className="opacity-40">
              ·
            </span>
          )}
          <PostStats likes={p._count.likes} comments={p._count.comments} />
        </span>
      </Link>
    </li>
  );
}
