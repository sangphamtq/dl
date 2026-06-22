import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { ThreadType } from "@/generated/prisma/enums";
import type { PostData } from "@/components/community/post-card";
import type { ReplyNode } from "@/components/community/reply-section";

// Select cho một trả lời (kèm số like + mình đã like chưa).
function replySelect(meId: string) {
  return {
    select: {
      id: true,
      authorId: true,
      content: true,
      createdAt: true,
      author: { select: { name: true } },
      _count: { select: { likes: true } },
      likes: { where: { userId: meId }, select: { id: true } },
    },
  } satisfies Prisma.ThreadReplyFindManyArgs;
}

function threadSelect(meId: string) {
  const r = replySelect(meId);
  return {
    id: true,
    slug: true,
    body: true,
    type: true,
    isPinned: true,
    isLocked: true,
    isHidden: true,
    createdAt: true,
    authorId: true,
    author: { select: { name: true } },
    place: { select: { slug: true, name: true } },
    images: { orderBy: { order: "asc" }, select: { url: true, alt: true } },
    _count: { select: { likes: true, replies: true } },
    likes: { where: { userId: meId }, select: { id: true } },
    replies: {
      where: { parentId: null },
      orderBy: { createdAt: "asc" },
      select: {
        ...r.select,
        replies: { orderBy: { createdAt: "asc" }, ...r },
      },
    },
  } satisfies Prisma.ThreadSelect;
}

type RawReply = {
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
  author: { name: string | null };
  _count: { likes: number };
  likes: { id: string }[];
  replies?: RawReply[];
};

function toReplyNode(r: RawReply): ReplyNode {
  return {
    id: r.id,
    authorId: r.authorId,
    content: r.content,
    createdAt: r.createdAt,
    author: r.author,
    likeCount: r._count.likes,
    likedByMe: r.likes.length > 0,
    replies: r.replies?.map(toReplyNode),
  };
}

type RawThread = {
  id: string;
  slug: string;
  body: string;
  type: string;
  isPinned: boolean;
  isLocked: boolean;
  isHidden: boolean;
  createdAt: Date;
  authorId: string;
  author: { name: string | null };
  place: { slug: string; name: string } | null;
  images: { url: string; alt: string | null }[];
  _count: { likes: number; replies: number };
  likes: { id: string }[];
  replies: RawReply[];
};

function shape(t: RawThread): PostData & { isHidden: boolean } {
  return {
    id: t.id,
    slug: t.slug,
    body: t.body,
    type: t.type,
    isPinned: t.isPinned,
    isLocked: t.isLocked,
    isHidden: t.isHidden,
    createdAt: t.createdAt,
    author: t.author,
    authorId: t.authorId,
    place: t.place,
    images: t.images,
    likeCount: t._count.likes,
    likedByMe: t.likes.length > 0,
    replyCount: t._count.replies,
    replies: t.replies.map(toReplyNode),
  };
}

// Feed: danh sách bài (ghim trước, rồi mới nhất theo hoạt động).
export async function getFeed(opts: {
  placeId?: string;
  type?: ThreadType;
  sort?: "active" | "new";
  skip?: number;
  take?: number;
  currentUserId: string | null;
}): Promise<{ posts: PostData[]; total: number }> {
  const meId = opts.currentUserId ?? "";
  const where: Prisma.ThreadWhereInput = {
    isHidden: false,
    ...(opts.placeId ? { placeId: opts.placeId } : {}),
    ...(opts.type ? { type: opts.type } : {}),
  };
  // 'new' = theo ngày tạo; 'active' (mặc định) = theo cập nhật gần nhất.
  const orderBy: Prisma.ThreadOrderByWithRelationInput[] =
    opts.sort === "new"
      ? [{ isPinned: "desc" }, { createdAt: "desc" }]
      : [{ isPinned: "desc" }, { lastActivityAt: "desc" }];

  const [rows, total] = await Promise.all([
    prisma.thread.findMany({
      where,
      orderBy,
      skip: opts.skip ?? 0,
      take: opts.take ?? 10,
      select: threadSelect(meId),
    }),
    prisma.thread.count({ where }),
  ]);

  return { posts: (rows as RawThread[]).map(shape), total };
}

// Bài "tìm bạn đồng hành" mới nhất (cho sidebar).
export async function getTrips(opts: { placeId?: string; take?: number }) {
  return prisma.thread.findMany({
    where: { isHidden: false, type: "trip", ...(opts.placeId ? { placeId: opts.placeId } : {}) },
    orderBy: { lastActivityAt: "desc" },
    take: opts.take ?? 4,
    select: {
      slug: true,
      body: true,
      createdAt: true,
      author: { select: { name: true } },
      place: { select: { name: true } },
    },
  });
}

// Một bài theo slug (cho trang permalink). Giữ cờ isHidden để gate staff.
export async function getThread(
  slug: string,
  currentUserId: string | null,
): Promise<(PostData & { isHidden: boolean }) | null> {
  const meId = currentUserId ?? "";
  const row = await prisma.thread.findUnique({
    where: { slug },
    select: threadSelect(meId),
  });
  return row ? shape(row as RawThread) : null;
}
