import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { coverUrl } from "@/lib/place-image";
import { PostStats } from "@/components/blog/post-stats";

// Đặc sản/Quán ăn không có trang chi tiết riêng (hiển thị drawer) nên không
// render "Bài viết liên quan". Lưu trú CÓ trang chi tiết (/luu-tru/[slug]) → giữ.
const FK = {
  place: "placeId",
  activity: "activityId",
  spot: "spotId",
  accommodation: "accommodationId",
} as const;

export type RefType = keyof typeof FK;

// "Bài viết liên quan": các Post (đã xuất bản) có PostRef trỏ tới đối tượng này.
// Tự ẩn nếu không có bài.
export async function RelatedPosts({ type, id }: { type: RefType; id: string }) {
  const posts = await prisma.post.findMany({
    where: {
      status: "published",
      refs: { some: { [FK[type]]: id } as Prisma.PostRefWhereInput },
    },
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
    take: 3,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      images: { where: { isCover: true }, take: 1, select: { url: true, isCover: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  if (posts.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
      <h2 className="text-xl font-semibold tracking-tight">Bài viết liên quan</h2>
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="group block">
            <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted">
              <Image
                src={coverUrl(p.images, p.slug, 800, 450)}
                alt={p.title}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="mt-3 space-y-1">
              <h3 className="font-semibold leading-snug tracking-tight">
                {p.title}
              </h3>
              {p.excerpt && (
                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {p.excerpt}
                </p>
              )}
              <PostStats
                likes={p._count.likes}
                comments={p._count.comments}
                className="pt-0.5"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
