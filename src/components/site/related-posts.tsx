import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { coverUrl } from "@/lib/place-image";
import { POST_CATEGORY_LABELS } from "@/lib/listing-labels";
import { readingMinutes } from "@/lib/toc";
import { R_CARD } from "@/lib/radius";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/components/site/section-heading";

const FK = {
  place: "placeId",
  activity: "activityId",
  spot: "spotId",
  accommodation: "accommodationId",
} as const;

export type RefType = keyof typeof FK;

const TAKE = 5;



type Post = {
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  publishedAt: Date | null;
  minutes: number;
  image: string;
};

// Ngày đăng: chỉ "12/03/2025", KHÔNG dùng `timeAgo`. Bài cẩm nang không phải tin
// tức — "3 tháng trước" nghe như đã cũ, trong khi kinh nghiệm đi chơi thì vẫn
// dùng được. Ngày cụ thể là dữ kiện trung tính.
const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function refWhere(type: RefType, id: string): Prisma.PostRefWhereInput {
  // Một điểm đến gồm cả bài viết về các listing của nó: bài "Bãi biển Mũi Né"
  // gắn vào Spot, không gắn vào Phan Thiết.
  if (type === "place")
    return {
      OR: [
        { placeId: id },
        { spot: { placeId: id } },
        { activity: { placeId: id } },
        { eatery: { placeId: id } },
        { accommodation: { placeId: id } },
      ],
    };
  return { [FK[type]]: id } as Prisma.PostRefWhereInput;
}

export async function RelatedPosts({
  type,
  id,
  title = "Bài viết liên quan",
  excludeCategory,
  serif = false,
}: {
  type: RefType;
  id: string;
  title?: string;
  /** Loại bài đã có chỗ riêng trên trang (vd. bài Di chuyển ở trang điểm đến). */
  excludeCategory?: string;
  serif?: boolean;
}) {
  const where: Prisma.PostWhereInput = {
    status: "published",
    refs: { some: refWhere(type, id) },
    ...(excludeCategory && {
      OR: [{ category: null }, { category: { not: excludeCategory } }],
    }),
  };
  const [rows, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
      take: TAKE,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        category: true,
        publishedAt: true,
        content: true,
        images: {
          where: { isCover: true },
          take: 1,
          select: { url: true, isCover: true },
        },
      },
    }),
    prisma.post.count({ where }),
  ]);

  if (rows.length === 0) return null;

  const posts: Post[] = rows.map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    category: p.category,
    publishedAt: p.publishedAt,
    minutes: readingMinutes(p.content),
    // Bài nào cũng có ảnh: không có bìa thì `coverUrl` cấp ảnh dự phòng.
    image: coverUrl(p.images, p.slug, 960, 640),
  }));
  const [lead, ...rest] = posts;

  return (
    <section id="bai-viet" className="mx-auto max-w-7xl scroll-mt-32 px-4 py-14 sm:px-6 sm:py-20">
      <SectionHeading
        serif={serif}
        title={title}
        href="/blog"
        count={total}
        unit="bài"
      />

      {rest.length === 0 ? (
        <div className="mt-7">
          <LeadPost p={lead} layout="wide" />
        </div>
      ) : (
        <div className="mt-7 grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <LeadPost p={lead} layout="column" />
          <ol className="border-t border-border lg:border-t-0">
            {rest.map((p, i) => (
              <li
                key={p.slug}
                className={cn("border-b border-border", i === 0 && "lg:border-t-0")}
              >
                <PostRow p={p} />
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function Meta({ p }: { p: Post }) {
  return (
    <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {p.publishedAt && <span>{dateFmt.format(p.publishedAt)}</span>}
      <span>
        <b className="font-semibold tabular-nums text-foreground">{p.minutes}</b> phút đọc
      </span>
    </span>
  );
}

function Category({ value }: { value: string | null }) {
  const label = value ? POST_CATEGORY_LABELS[value] : null;
  if (!label) return null;
  return (
    <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {label}
    </span>
  );
}

// Không zoom ảnh, không gạch chân — dấu hiệu bấm được là TÊN ĐỔI MÀU, cùng luật
// với các mục xem trước khác của trang điểm đến.
function LeadPost({ p, layout }: { p: Post; layout: "wide" | "column" }) {
  const wide = layout === "wide";
  return (
    <Link
      href={`/blog/${p.slug}`}
      className={cn(
        "group",
        "block sm:grid sm:grid-cols-2 sm:items-center sm:gap-8",
        wide ? "lg:gap-12" : "lg:flex lg:flex-col lg:items-stretch lg:gap-0",
      )}
    >
      <span
        className={cn(
          R_CARD,
          "relative block aspect-[16/10] overflow-hidden bg-muted",
          // Từ lg ảnh bài dẫn cao theo cột danh sách bên phải (grid stretch) —
          // tỉ lệ cố định thì 2 bài phụ để trống nửa dưới, 4 bài thì tràn.
          !wide && "lg:aspect-auto lg:min-h-64 lg:flex-1",
        )}
      >
        <Image
          src={p.image}
          alt=""
          fill
          sizes="(min-width: 1024px) 640px, 100vw"
          className="object-cover"
        />
      </span>
      <span className={cn("mt-4 block sm:mt-0", !wide && "lg:mt-4")}>
        <Category value={p.category} />
        <span className="mt-1.5 block text-pretty font-[family-name:var(--font-display)] text-2xl font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary sm:text-[1.75rem]">
          {p.title}
        </span>
        {p.excerpt && (
          <span className="mt-2.5 line-clamp-2 block max-w-[36rem] leading-7 text-muted-foreground">
            {p.excerpt}
          </span>
        )}
        <span className="mt-3 block">
          <Meta p={p} />
        </span>
      </span>
    </Link>
  );
}

function PostRow({ p }: { p: Post }) {
  return (
    <Link href={`/blog/${p.slug}`} className="group flex items-start gap-5 py-5">
      <span className="min-w-0 flex-1">
        <Category value={p.category} />
        <span className="mt-1 line-clamp-3 block font-[family-name:var(--font-display)] text-lg font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
          {p.title}
        </span>
        <span className="mt-2 block">
          <Meta p={p} />
        </span>
      </span>
      {/* Ảnh nhỏ ở mép PHẢI — chỉ mục Trải nghiệm phía trên để ảnh bên trái. */}
      <span
        className={cn(
          R_CARD,
          "relative aspect-[4/3] w-28 shrink-0 overflow-hidden bg-muted sm:w-36",
        )}
      >
        <Image src={p.image} alt="" fill sizes="144px" className="object-cover" />
      </span>
    </Link>
  );
}
