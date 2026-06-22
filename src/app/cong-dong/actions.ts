"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify, RESERVED_SLUGS } from "@/lib/slug";
import { cleanHtml } from "@/lib/sanitize";
import { isThreadType, type ThreadTypeValue } from "@/lib/community";
import { ThreadType } from "@/generated/prisma/enums";
import {
  publishEvent,
  threadChannel,
  communityChannel,
  placeFeedChannel,
} from "@/lib/ably";

const STAFF = ["admin", "editor"];
const MAX_REPLY = 5000;

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

async function requireUser(): Promise<{ id: string; role: string }> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Bạn cần đăng nhập.");
  return { id, role: session.user.role ?? "user" };
}

// Tạo slug duy nhất từ một đoạn text (nối hậu tố nếu trùng / trùng tiền tố dành riêng).
async function uniqueThreadSlug(text: string): Promise<string> {
  const base = slugify(text).split("-").slice(0, 10).join("-").slice(0, 80) || "bai-viet";
  let slug = base;
  let n = 1;
  while (
    RESERVED_SLUGS.has(slug) ||
    (await prisma.thread.findUnique({ where: { slug }, select: { id: true } }))
  ) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

const MAX_BODY = 8000;
const MAX_IMAGES = 6;

// Tạo bài đăng mới (kiểu Facebook: không cần tiêu đề, văn bản + ảnh).
export async function createThread(input: {
  body: string;
  type: string;
  placeId?: string | null;
  imageUrls?: string[];
}): Promise<ActionResult<{ slug: string }>> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập để đăng bài." };
  }

  const body = cleanHtml(input.body || "").trim();
  const textLen = body.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim().length;
  const imageUrls = (input.imageUrls ?? [])
    .filter((u) => typeof u === "string" && /^https?:\/\//.test(u))
    .slice(0, MAX_IMAGES);

  if (textLen === 0 && imageUrls.length === 0)
    return { ok: false, error: "Hãy viết gì đó hoặc thêm ảnh." };
  if (textLen > MAX_BODY)
    return { ok: false, error: `Nội dung tối đa ${MAX_BODY} ký tự.` };

  const type: ThreadTypeValue = isThreadType(input.type)
    ? input.type
    : "discussion";

  // Điểm đến (tùy chọn) — chỉ gắn nếu tồn tại; lấy slug để phát realtime feed.
  let placeId: string | null = null;
  let placeSlug: string | null = null;
  if (input.placeId) {
    const place = await prisma.place.findUnique({
      where: { id: input.placeId },
      select: { id: true, slug: true },
    });
    placeId = place?.id ?? null;
    placeSlug = place?.slug ?? null;
  }

  const slugText = body.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
  const slug = await uniqueThreadSlug(slugText || "bai-viet");

  await prisma.thread.create({
    data: {
      slug,
      body,
      type: type as ThreadType,
      authorId: user.id,
      placeId,
      lastActivityAt: new Date(),
      images: {
        create: imageUrls.map((url, i) => ({ url, order: i })),
      },
    },
  });

  revalidatePath("/cong-dong");
  if (placeSlug) revalidatePath(`/diem-den/${placeSlug}/cong-dong`);
  await publishEvent(communityChannel(), "feed:changed");
  if (placeSlug) await publishEvent(placeFeedChannel(placeSlug), "feed:changed");
  return { ok: true, data: { slug } };
}

// Xóa chủ đề — tác giả hoặc staff.
export async function deleteThread(
  threadId: string,
): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { authorId: true, place: { select: { slug: true } } },
  });
  if (!thread) return { ok: false, error: "Không tìm thấy chủ đề." };
  if (thread.authorId !== user.id && !STAFF.includes(user.role))
    return { ok: false, error: "Bạn không có quyền xóa." };

  await prisma.thread.delete({ where: { id: threadId } });
  revalidatePath("/cong-dong");
  await publishEvent(communityChannel(), "feed:changed");
  if (thread.place?.slug) {
    revalidatePath(`/diem-den/${thread.place.slug}/cong-dong`);
    await publishEvent(placeFeedChannel(thread.place.slug), "feed:changed");
  }
  return { ok: true };
}

// Thêm trả lời (hoặc trả lời lồng 1 cấp).
export async function addReply(input: {
  threadId: string;
  threadSlug: string;
  content: string;
  parentId?: string | null;
}): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập để trả lời." };
  }

  const content = input.content.trim();
  if (!content) return { ok: false, error: "Nội dung không được để trống." };
  if (content.length > MAX_REPLY)
    return { ok: false, error: `Trả lời tối đa ${MAX_REPLY} ký tự.` };

  const thread = await prisma.thread.findUnique({
    where: { id: input.threadId },
    select: { isLocked: true, place: { select: { slug: true } } },
  });
  if (!thread) return { ok: false, error: "Không tìm thấy chủ đề." };
  if (thread.isLocked) return { ok: false, error: "Chủ đề đã bị khóa." };

  // Reply lồng tối đa 1 cấp — reply-của-reply quy về gốc.
  let parentId: string | null = null;
  if (input.parentId) {
    const parent = await prisma.threadReply.findUnique({
      where: { id: input.parentId },
      select: { threadId: true, parentId: true },
    });
    if (!parent || parent.threadId !== input.threadId)
      return { ok: false, error: "Trả lời gốc không hợp lệ." };
    parentId = parent.parentId ?? input.parentId;
  }

  await prisma.threadReply.create({
    data: { threadId: input.threadId, authorId: user.id, content, parentId },
  });

  // Cập nhật đếm + thời điểm hoạt động.
  const replyCount = await prisma.threadReply.count({
    where: { threadId: input.threadId },
  });
  await prisma.thread.update({
    where: { id: input.threadId },
    data: { replyCount, lastActivityAt: new Date() },
  });

  revalidatePath(`/cong-dong/${input.threadSlug}`);
  revalidatePath("/cong-dong");
  await publishEvent(threadChannel(input.threadSlug), "replies:changed");
  await publishEvent(communityChannel(), "feed:changed");
  if (thread.place?.slug) {
    revalidatePath(`/diem-den/${thread.place.slug}/cong-dong`);
    await publishEvent(placeFeedChannel(thread.place.slug), "feed:changed");
  }
  return { ok: true };
}

// Xóa trả lời — tác giả hoặc staff.
export async function deleteReply(
  replyId: string,
  threadSlug: string,
): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const reply = await prisma.threadReply.findUnique({
    where: { id: replyId },
    select: { authorId: true, threadId: true },
  });
  if (!reply) return { ok: false, error: "Không tìm thấy trả lời." };
  if (reply.authorId !== user.id && !STAFF.includes(user.role))
    return { ok: false, error: "Bạn không có quyền xóa." };

  await prisma.threadReply.delete({ where: { id: replyId } });
  const replyCount = await prisma.threadReply.count({
    where: { threadId: reply.threadId },
  });
  await prisma.thread.update({
    where: { id: reply.threadId },
    data: { replyCount },
  });

  revalidatePath(`/cong-dong/${threadSlug}`);
  await publishEvent(threadChannel(threadSlug), "replies:changed");
  return { ok: true };
}

// Thích/bỏ thích chủ đề.
export async function toggleThreadLike(
  threadId: string,
  threadSlug: string,
): Promise<ActionResult<{ liked: boolean; count: number }>> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập để thích." };
  }

  const existing = await prisma.threadLike.findUnique({
    where: { threadId_userId: { threadId, userId: user.id } },
    select: { id: true },
  });
  if (existing) {
    await prisma.threadLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.threadLike.create({ data: { threadId, userId: user.id } });
  }
  const count = await prisma.threadLike.count({ where: { threadId } });
  revalidatePath(`/cong-dong/${threadSlug}`);
  return { ok: true, data: { liked: !existing, count } };
}

// Thích/bỏ thích trả lời.
export async function toggleReplyLike(
  replyId: string,
  threadSlug: string,
): Promise<ActionResult<{ liked: boolean; count: number }>> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập để thích." };
  }

  const existing = await prisma.threadLike.findUnique({
    where: { replyId_userId: { replyId, userId: user.id } },
    select: { id: true },
  });
  if (existing) {
    await prisma.threadLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.threadLike.create({ data: { replyId, userId: user.id } });
  }
  const count = await prisma.threadLike.count({ where: { replyId } });
  revalidatePath(`/cong-dong/${threadSlug}`);
  return { ok: true, data: { liked: !existing, count } };
}
