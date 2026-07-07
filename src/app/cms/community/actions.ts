"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import {
  publishEvent,
  communityChannel,
  placeFeedChannel,
} from "@/lib/ably";

const STAFF = ["admin", "editor"];

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireStaff(): Promise<{ id: string }> {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !role || !STAFF.includes(role))
    throw new Error("Không có quyền.");
  return { id: session.user.id };
}

// Làm mới các trang công khai liên quan tới một chủ đề.
async function revalidateThreadPublic(placeSlug: string | null | undefined) {
  revalidatePath("/cong-dong");
  revalidatePath("/cms/community");
  revalidatePath("/cms/community/reports");
  await publishEvent(communityChannel(), "feed:changed");
  if (placeSlug) {
    revalidatePath(`/diem-den/${placeSlug}/cong-dong`);
    await publishEvent(placeFeedChannel(placeSlug), "feed:changed");
  }
}

async function loadThread(id: string) {
  return prisma.thread.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      body: true,
      authorId: true,
      place: { select: { slug: true } },
    },
  });
}

// Ghim / bỏ ghim.
export async function setThreadPinned(
  id: string,
  pinned: boolean,
): Promise<ActionResult> {
  try {
    await requireStaff();
  } catch {
    return { ok: false, error: "Không có quyền." };
  }
  const t = await loadThread(id);
  if (!t) return { ok: false, error: "Không tìm thấy chủ đề." };
  await prisma.thread.update({ where: { id }, data: { isPinned: pinned } });
  await revalidateThreadPublic(t.place?.slug);
  return { ok: true };
}

// Khóa / mở khóa trả lời. Báo tác giả khi khóa.
export async function setThreadLocked(
  id: string,
  locked: boolean,
): Promise<ActionResult> {
  let staff;
  try {
    staff = await requireStaff();
  } catch {
    return { ok: false, error: "Không có quyền." };
  }
  const t = await loadThread(id);
  if (!t) return { ok: false, error: "Không tìm thấy chủ đề." };
  await prisma.thread.update({ where: { id }, data: { isLocked: locked } });
  if (locked)
    await notify({
      userId: t.authorId,
      actorId: staff.id,
      type: "thread_moderated",
      url: `/cong-dong/${t.slug}`,
      excerpt: t.body,
    });
  await revalidateThreadPublic(t.place?.slug);
  return { ok: true };
}

// Ẩn / hiện chủ đề. Báo tác giả khi ẩn. Đồng thời đóng các báo cáo pending của bài.
export async function setThreadHidden(
  id: string,
  hidden: boolean,
): Promise<ActionResult> {
  let staff;
  try {
    staff = await requireStaff();
  } catch {
    return { ok: false, error: "Không có quyền." };
  }
  const t = await loadThread(id);
  if (!t) return { ok: false, error: "Không tìm thấy chủ đề." };
  await prisma.thread.update({ where: { id }, data: { isHidden: hidden } });
  if (hidden) {
    await prisma.contentReport.updateMany({
      where: { threadId: id, status: "pending" },
      data: { status: "actioned", reviewedById: staff.id },
    });
    await notify({
      userId: t.authorId,
      actorId: staff.id,
      type: "thread_moderated",
      url: `/cong-dong/${t.slug}`,
      excerpt: t.body,
    });
  }
  await revalidateThreadPublic(t.place?.slug);
  return { ok: true };
}

// Xóa hẳn chủ đề (cascade: reply, like, ảnh, báo cáo).
export async function deleteThreadCms(id: string): Promise<ActionResult> {
  try {
    await requireStaff();
  } catch {
    return { ok: false, error: "Không có quyền." };
  }
  const t = await loadThread(id);
  if (!t) return { ok: false, error: "Không tìm thấy chủ đề." };
  await prisma.thread.delete({ where: { id } });
  await revalidateThreadPublic(t.place?.slug);
  return { ok: true };
}

// ── Báo cáo nội dung ────────────────────────────────────────────────────────

async function loadReport(id: string) {
  return prisma.contentReport.findUnique({
    where: { id },
    select: {
      id: true,
      threadId: true,
      replyId: true,
      thread: { select: { slug: true, place: { select: { slug: true } } } },
      reply: {
        select: {
          authorId: true,
          content: true,
          thread: {
            select: {
              id: true,
              slug: true,
              place: { select: { slug: true } },
            },
          },
        },
      },
    },
  });
}

// Bỏ qua một báo cáo (không vi phạm).
export async function dismissReport(id: string): Promise<ActionResult> {
  let staff;
  try {
    staff = await requireStaff();
  } catch {
    return { ok: false, error: "Không có quyền." };
  }
  await prisma.contentReport.update({
    where: { id },
    data: { status: "dismissed", reviewedById: staff.id },
  });
  revalidatePath("/cms/community/reports");
  return { ok: true };
}

// Xử lý báo cáo bài → ẩn bài (dùng lại setThreadHidden để notify + đóng báo cáo).
export async function hideThreadFromReport(id: string): Promise<ActionResult> {
  try {
    await requireStaff();
  } catch {
    return { ok: false, error: "Không có quyền." };
  }
  const r = await loadReport(id);
  if (!r?.threadId) return { ok: false, error: "Báo cáo không trỏ tới bài." };
  return setThreadHidden(r.threadId, true);
}

// Xử lý báo cáo → xóa hẳn bài (cascade xóa luôn báo cáo).
export async function deleteThreadFromReport(
  id: string,
): Promise<ActionResult> {
  try {
    await requireStaff();
  } catch {
    return { ok: false, error: "Không có quyền." };
  }
  const r = await loadReport(id);
  if (!r?.threadId) return { ok: false, error: "Báo cáo không trỏ tới bài." };
  return deleteThreadCms(r.threadId);
}

// Xử lý báo cáo trả lời → xóa trả lời (cascade xóa báo cáo). Báo tác giả.
export async function deleteReplyFromReport(
  id: string,
): Promise<ActionResult> {
  let staff;
  try {
    staff = await requireStaff();
  } catch {
    return { ok: false, error: "Không có quyền." };
  }
  const r = await loadReport(id);
  if (!r?.replyId || !r.reply)
    return { ok: false, error: "Báo cáo không trỏ tới trả lời." };
  const slug = r.reply.thread.slug;
  const threadId = r.reply.thread.id;
  await prisma.threadReply.delete({ where: { id: r.replyId } });
  const replyCount = await prisma.threadReply.count({ where: { threadId } });
  await prisma.thread.update({ where: { id: threadId }, data: { replyCount } });
  await notify({
    userId: r.reply.authorId,
    actorId: staff.id,
    type: "thread_moderated",
    url: `/cong-dong/${slug}`,
    excerpt: r.reply.content,
  });
  await revalidateThreadPublic(r.reply.thread.place?.slug);
  return { ok: true };
}
