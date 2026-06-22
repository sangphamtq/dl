"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { publishCommentsChanged } from "@/lib/ably";
import { notify } from "@/lib/notifications";

const STAFF = ["admin", "editor"];
const MAX_COMMENT = 2000;

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

async function requireUser(): Promise<{ id: string; role: string }> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Bạn cần đăng nhập.");
  return { id, role: session.user.role ?? "user" };
}

// Tim / bỏ tim một bài. Trả về trạng thái mới + tổng lượt tim.
export async function toggleLike(
  postId: string,
  postSlug: string,
): Promise<ActionResult<{ liked: boolean; count: number }>> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập để tim bài viết." };
  }

  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId, userId: user.id } },
    select: { id: true },
  });

  if (existing) {
    await prisma.postLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.postLike.create({ data: { postId, userId: user.id } });
  }

  const count = await prisma.postLike.count({ where: { postId } });
  revalidatePath(`/blog/${postSlug}`);
  return { ok: true, data: { liked: !existing, count } };
}

// Thêm bình luận (hoặc trả lời nếu có parentId — chỉ lồng 1 cấp).
export async function addComment(input: {
  postId: string;
  postSlug: string;
  content: string;
  parentId?: string | null;
}): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập để bình luận." };
  }

  const content = input.content.trim();
  if (!content) return { ok: false, error: "Nội dung không được để trống." };
  if (content.length > MAX_COMMENT)
    return { ok: false, error: `Bình luận tối đa ${MAX_COMMENT} ký tự.` };

  // Reply: parent phải tồn tại, cùng bài, và là comment gốc (lồng tối đa 1 cấp).
  let parentId: string | null = null;
  let parentAuthorId: string | null = null;
  if (input.parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: input.parentId },
      select: { postId: true, parentId: true, authorId: true },
    });
    if (!parent || parent.postId !== input.postId)
      return { ok: false, error: "Bình luận gốc không hợp lệ." };
    // Nếu reply vào một reply → quy về comment gốc của nó.
    parentId = parent.parentId ?? input.parentId;
    parentAuthorId = parent.authorId;
  }

  await prisma.comment.create({
    data: { postId: input.postId, authorId: user.id, content, parentId },
  });

  // Thông báo: trả lời bình luận blog → tác giả bình luận gốc.
  if (parentAuthorId)
    await notify({
      userId: parentAuthorId,
      actorId: user.id,
      type: "blog_reply",
      url: `/blog/${input.postSlug}`,
      excerpt: content,
    });

  revalidatePath(`/blog/${input.postSlug}`);
  await publishCommentsChanged(input.postSlug);
  return { ok: true };
}

// Xóa bình luận — tác giả bình luận hoặc staff. Xóa kèm các reply (cascade).
export async function deleteComment(
  commentId: string,
  postSlug: string,
): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  });
  if (!comment) return { ok: false, error: "Không tìm thấy bình luận." };

  const allowed = comment.authorId === user.id || STAFF.includes(user.role);
  if (!allowed) return { ok: false, error: "Bạn không có quyền xóa." };

  await prisma.comment.delete({ where: { id: commentId } });
  revalidatePath(`/blog/${postSlug}`);
  await publishCommentsChanged(postSlug);
  return { ok: true };
}
