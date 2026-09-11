import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { coverUrl } from "@/lib/place-image";
import { POST_CATEGORY_LABELS } from "@/lib/listing-labels";
import { PostStats } from "@/components/blog/post-stats";
import { SectionHeading } from "@/components/site/section-heading";

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

export async function RelatedPosts({
  type,
  id,
  serif = false,
}: {
  type: RefType;
  id: string;
  serif?: boolean;
}) {
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
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
      <SectionHeading
        serif={serif}
        title="Bài viết liên quan"
        href="/blog"
        count={total}
        unit="bài"
      />

      <ul className="-mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        {posts.map((p) => (
          <Card key={p.slug} p={p} />
        ))}
      </ul>
    </section>
  );
}

function Card({ p }: { p: Post }) {
  const cat = p.category ? POST_CATEGORY_LABELS[p.category] : null;
  return (
    <li className="w-52 shrink-0 snap-start sm:w-60 lg:w-auto">
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

        {/* Loại bài KHÔNG còn là eyebrow trên tiêu đề. Nó là DỮ KIỆN, ngang
            hàng ngày đăng và lượt thích, nên đã chuyển xuống hàng meta ở đáy —
            xem chú thích ở đó. Nhờ vậy tiêu đề nằm ngay dưới ảnh, không bị một
            dòng chữ hoa 10px chen vào giữa hai thứ quan trọng nhất của thẻ. */}
        <span className="mt-3 line-clamp-2 block text-[0.95rem] font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
          {p.title}
        </span>

        <span className="mt-auto flex flex-wrap items-center gap-x-2.5 gap-y-1.5 pt-2.5 text-xs text-muted-foreground">
          {cat && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
              {cat}
            </span>
          )}
          {p.publishedAt && <span>{dateFmt.format(p.publishedAt)}</span>}
          <PostStats likes={p._count.likes} comments={p._count.comments} />
        </span>
      </Link>
    </li>
  );
}
