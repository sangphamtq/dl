import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { coverUrl } from "@/lib/place-image";
import { PostStats } from "@/components/blog/post-stats";
import { SectionHeading } from "@/components/site/section-heading";

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
  excerpt: string | null;
  images: { url: string; isCover: boolean }[];
  _count: { likes: number; comments: number };
};

// "Bài viết liên quan": các Post (đã xuất bản) có PostRef trỏ tới đối tượng này.
// Tự ẩn nếu không có bài.
//
// Bố cục BÀI CHÍNH + danh sách, không phải ba thẻ đều nhau như bản trước:
//  - ba thẻ đều nhau nói rằng ba bài quan trọng như nhau, trong khi thứ tự đã
//    được sắp theo `isFeatured` → `publishedAt`; bài đầu ĐANG là bài nên đọc
//    trước nhưng lại trông y như hai bài kia;
//  - đây là khối CUỐI trang, ngay trước footer. Một tấm ảnh lớn ở đây làm điểm
//    dừng cho mắt; ba thẻ nhỏ đều tăm tắp thì trang hết một cách lửng lơ;
//  - chữ là nội dung chính của một bài viết, nên hai bài sau bày thành hàng chữ
//    có ảnh nhỏ, đọc được tiêu đề trước rồi mới đến ảnh.
//
// Tiêu đề mục dùng `SectionHeading` như mọi mục khác (trước đây tự viết một thẻ
// h2 nhỏ hơn, thành mục duy nhất lệch khuôn trên trang), và container đổi từ
// `max-w-5xl` sang `max-w-7xl` cho khớp mọi trang gọi nó — cả bốn trang
// (điểm đến, địa điểm, hoạt động, lưu trú) đều dựng nội dung ở `max-w-7xl`.
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
        excerpt: true,
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
  const [lead, ...rest] = posts;

  return (
    // Tự dựng container: component này còn được gọi trực tiếp ở ba trang chi
    // tiết (địa điểm, hoạt động, lưu trú) mà không có dải nào bọc ngoài.
    //
    // Đệm TRÊN là bắt buộc, không ăn nhờ đệm dưới của khối trước: ở trang Place
    // khối trước là một dải có NỀN, nên đệm của nó là 80px màu nhạt — nền dừng
    // ngay sát chữ "Cẩm nang", đọc ra như nền đè lên tiêu đề. Có đệm riêng thì
    // giữa hai mục là 80px nhạt + 80px trắng, đúng nhịp như mọi cặp dải khác.
    <section className="mx-auto max-w-7xl px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-20">
      <SectionHeading
        eyebrow="Cẩm nang"
        title="Bài viết liên quan"
        href="/blog"
        count={total}
        unit="bài"
      />

      {rest.length > 0 ? (
        <div className="mt-7 grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          <Lead p={lead} />
          <ul className="divide-y divide-border/60">
            {rest.map((p) => (
              <Row key={p.slug} p={p} />
            ))}
          </ul>
        </div>
      ) : (
        // CHỈ MỘT bài: bày thành card ngang. Để nguyên khuôn "bài chính" thì nửa
        // phải trống một khoảng dài — mà một bài đứng một mình thì cũng không có
        // gì để so cao thấp.
        <Solo p={lead} />
      )}
    </section>
  );
}

// Bài chính: ảnh bìa lớn, tiêu đề cỡ lớn, excerpt.
function Lead({ p }: { p: Post }) {
  return (
    <Link href={`/blog/${p.slug}`} className="group block">
      <span className="relative block aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
        <Image
          src={coverUrl(p.images, p.slug, 900, 506)}
          alt=""
          fill
          sizes="(min-width: 1024px) 46vw, 92vw"
          className="object-cover"
        />
      </span>
      <h3 className="mt-4 text-balance font-[family-name:var(--font-display)] text-xl font-bold leading-snug tracking-tight transition-colors group-hover:text-primary sm:text-2xl">
        {p.title}
      </h3>
      {p.excerpt && (
        <p className="mt-2 line-clamp-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
          {p.excerpt}
        </p>
      )}
      <PostStats
        likes={p._count.likes}
        comments={p._count.comments}
        className="mt-2.5"
      />
    </Link>
  );
}

// Bài phụ: một hàng — tiêu đề trước, ảnh nhỏ bên phải.
function Row({ p }: { p: Post }) {
  return (
    <li className="first:-mt-1">
      <Link href={`/blog/${p.slug}`} className="group flex items-start gap-4 py-4">
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
            {p.title}
          </span>
          {p.excerpt && (
            <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-muted-foreground">
              {p.excerpt}
            </span>
          )}
          <PostStats
            likes={p._count.likes}
            comments={p._count.comments}
            className="mt-2"
          />
        </span>
        {/* Ảnh bên PHẢI ở hàng phụ: mắt chạy dọc cột tiêu đề, ảnh nhỏ chen bên
            trái mỗi hàng sẽ chặt cột chữ thành từng khúc. */}
        <span className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-24">
          <Image
            src={coverUrl(p.images, p.slug, 240, 240)}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
          />
        </span>
      </Link>
    </li>
  );
}

// Trường hợp chỉ có một bài: ảnh bên trái, chữ bên phải.
function Solo({ p }: { p: Post }) {
  return (
    <Link
      href={`/blog/${p.slug}`}
      className="group mt-7 grid grid-cols-1 gap-6 sm:grid-cols-[minmax(0,24rem)_1fr] sm:items-center sm:gap-8"
    >
      <span className="relative block aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
        <Image
          src={coverUrl(p.images, p.slug, 900, 506)}
          alt=""
          fill
          sizes="(min-width: 640px) 24rem, 92vw"
          className="object-cover"
        />
      </span>
      <span className="min-w-0">
        <span className="block text-balance font-[family-name:var(--font-display)] text-xl font-bold leading-snug tracking-tight transition-colors group-hover:text-primary sm:text-2xl">
          {p.title}
        </span>
        {p.excerpt && (
          <span className="mt-2 line-clamp-3 block max-w-prose text-sm leading-relaxed text-muted-foreground">
            {p.excerpt}
          </span>
        )}
        <PostStats
          likes={p._count.likes}
          comments={p._count.comments}
          className="mt-2.5"
        />
      </span>
    </Link>
  );
}
