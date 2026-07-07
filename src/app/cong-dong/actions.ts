"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify, RESERVED_SLUGS } from "@/lib/slug";
import { cleanHtml } from "@/lib/sanitize";
import { isThreadType, type ThreadTypeValue } from "@/lib/community";
import { ThreadType, ContentReportReason } from "@/generated/prisma/enums";
import {
  publishEvent,
  threadChannel,
  communityChannel,
  placeFeedChannel,
} from "@/lib/ably";
import { notify, notifyLike, removeLikeNotif } from "@/lib/notifications";
import { getReplyTree } from "@/lib/community-feed";
import type { ReplyNode } from "@/components/community/reply-section";

const STAFF = ["admin", "editor"];
const MAX_REPLY = 5000;

// ── Chống spam: giới hạn tần suất theo user (staff được bỏ qua) ──────────────
// Query-based, không cần bảng riêng: đếm theo createdAt.
const THREAD_COOLDOWN_MS = 20_000; // tối thiểu giữa 2 bài
const THREAD_PER_HOUR = 8;
const REPLY_COOLDOWN_MS = 5_000; // tối thiểu giữa 2 trả lời
const REPLY_PER_HOUR = 40;

// Trả về thông báo lỗi nếu vượt giới hạn, ngược lại null.
async function rateLimit(
  kind: "thread" | "reply",
  userId: string,
  role: string,
): Promise<string | null> {
  if (STAFF.includes(role)) return null;
  const now = Date.now();
  const cooldown = kind === "thread" ? THREAD_COOLDOWN_MS : REPLY_COOLDOWN_MS;
  const perHour = kind === "thread" ? THREAD_PER_HOUR : REPLY_PER_HOUR;

  const last =
    kind === "thread"
      ? await prisma.thread.findFirst({
          where: { authorId: userId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        })
      : await prisma.threadReply.findFirst({
          where: { authorId: userId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });
  if (last && now - last.createdAt.getTime() < cooldown)
    return "Bạn thao tác hơi nhanh, đợi vài giây rồi thử lại nhé.";

  const since = new Date(now - 3_600_000);
  const count =
    kind === "thread"
      ? await prisma.thread.count({ where: { authorId: userId, createdAt: { gte: since } } })
      : await prisma.threadReply.count({ where: { authorId: userId, createdAt: { gte: since } } });
  if (count >= perHour)
    return "Bạn đã đăng khá nhiều trong một giờ qua. Vui lòng thử lại sau.";

  return null;
}

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
  departDate?: string | null; // chỉ type=trip (ISO date, vd "2026-08-15")
  slots?: number | null; // chỉ type=trip
}): Promise<ActionResult<{ slug: string }>> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập để đăng bài." };
  }

  const rateErr = await rateLimit("thread", user.id, user.role);
  if (rateErr) return { ok: false, error: rateErr };

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

  // "sale" là loại đặc quyền: chỉ CTV có hồ sơ ĐÃ DUYỆT mới đăng được.
  if (type === "sale") {
    const sale = await prisma.saleProfile.findUnique({
      where: { userId: user.id },
      select: { status: true },
    });
    if (sale?.status !== "approved")
      return {
        ok: false,
        error: "Chỉ CTV đã được duyệt mới đăng được tin rao dịch vụ.",
      };
  }

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

  // Trip: ngày khởi hành (không nhận ngày quá khứ) + số chỗ. Bỏ qua nếu type khác.
  let departDate: Date | null = null;
  let slots: number | null = null;
  if (type === "trip") {
    if (input.departDate) {
      const d = new Date(input.departDate);
      if (!Number.isNaN(d.getTime())) departDate = d;
    }
    if (input.slots != null) {
      const n = Math.floor(Number(input.slots));
      if (Number.isFinite(n) && n > 0) slots = Math.min(n, 99);
    }
  }

  // Chống trùng (double-submit): bỏ qua nếu vừa đăng bài y hệt trong 10s.
  const dupThread = await prisma.thread.findFirst({
    where: {
      authorId: user.id,
      body,
      type: type as ThreadType,
      createdAt: { gte: new Date(Date.now() - 10_000) },
    },
    select: { slug: true },
  });
  if (dupThread) {
    revalidatePath("/cong-dong");
    return { ok: true, data: { slug: dupThread.slug } };
  }

  await prisma.thread.create({
    data: {
      slug,
      body,
      type: type as ThreadType,
      authorId: user.id,
      placeId,
      departDate,
      slots,
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

  const rateErr = await rateLimit("reply", user.id, user.role);
  if (rateErr) return { ok: false, error: rateErr };

  const thread = await prisma.thread.findUnique({
    where: { id: input.threadId },
    select: { isLocked: true, authorId: true, place: { select: { slug: true } } },
  });
  if (!thread) return { ok: false, error: "Không tìm thấy chủ đề." };
  if (thread.isLocked) return { ok: false, error: "Chủ đề đã bị khóa." };

  // Reply lồng tối đa 1 cấp — reply-của-reply quy về gốc.
  let parentId: string | null = null;
  let parentAuthorId: string | null = null;
  if (input.parentId) {
    const parent = await prisma.threadReply.findUnique({
      where: { id: input.parentId },
      select: { threadId: true, parentId: true, authorId: true },
    });
    if (!parent || parent.threadId !== input.threadId)
      return { ok: false, error: "Trả lời gốc không hợp lệ." };
    parentId = parent.parentId ?? input.parentId;
    parentAuthorId = parent.authorId;
  }

  // Chống trùng (double-submit): nếu vừa gửi y hệt trong 10s thì bỏ qua, coi như
  // đã ghi nhận — tránh tạo 2 bình luận giống nhau.
  const dup = await prisma.threadReply.findFirst({
    where: {
      threadId: input.threadId,
      authorId: user.id,
      content,
      parentId,
      createdAt: { gte: new Date(Date.now() - 10_000) },
    },
    select: { id: true },
  });
  if (dup) {
    revalidatePath(`/cong-dong/${input.threadSlug}`);
    return { ok: true };
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

  // Thông báo: trả lời bình luận → tác giả bình luận; còn lại → tác giả bài.
  const url = `/cong-dong/${input.threadSlug}`;
  const recipients = new Map<string, "thread_comment" | "thread_reply">();
  recipients.set(thread.authorId, "thread_comment");
  if (parentAuthorId) recipients.set(parentAuthorId, "thread_reply");
  recipients.delete(user.id);
  await Promise.all(
    [...recipients].map(([userId, type]) =>
      notify({ userId, actorId: user.id, type, url, excerpt: content }),
    ),
  );

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
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { authorId: true, body: true },
  });
  const url = `/cong-dong/${threadSlug}`;
  if (existing) {
    await prisma.threadLike.delete({ where: { id: existing.id } });
    if (thread)
      await removeLikeNotif({ userId: thread.authorId, actorId: user.id, type: "thread_like", url });
  } else {
    await prisma.threadLike.create({ data: { threadId, userId: user.id } });
    if (thread)
      await notifyLike({ userId: thread.authorId, actorId: user.id, type: "thread_like", url, excerpt: thread.body });
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
  const reply = await prisma.threadReply.findUnique({
    where: { id: replyId },
    select: { authorId: true, content: true },
  });
  const url = `/cong-dong/${threadSlug}`;
  if (existing) {
    await prisma.threadLike.delete({ where: { id: existing.id } });
    if (reply)
      await removeLikeNotif({ userId: reply.authorId, actorId: user.id, type: "reply_like", url });
  } else {
    await prisma.threadLike.create({ data: { replyId, userId: user.id } });
    if (reply)
      await notifyLike({ userId: reply.authorId, actorId: user.id, type: "reply_like", url, excerpt: reply.content });
  }
  const count = await prisma.threadLike.count({ where: { replyId } });
  revalidatePath(`/cong-dong/${threadSlug}`);
  return { ok: true, data: { liked: !existing, count } };
}

// Lazy-load cây trả lời của một chủ đề (feed không tải sẵn để nhẹ payload).
export async function fetchReplies(threadId: string): Promise<ReplyNode[]> {
  const session = await auth();
  return getReplyTree(threadId, session?.user?.id ?? null);
}

const REPORT_REASONS = new Set<string>([
  "spam",
  "scam",
  "offensive",
  "offtopic",
  "wrong_info",
  "other",
]);

// Báo cáo một bài (threadId) HOẶC một trả lời (replyId) vi phạm. Mỗi người báo
// cáo một đích tối đa 1 lần (unique) — báo lại coi như đã ghi nhận.
export async function reportContent(input: {
  threadId?: string | null;
  replyId?: string | null;
  reason: string;
  note?: string | null;
}): Promise<ActionResult> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập để báo cáo." };
  }

  const isThread = !!input.threadId;
  const isReply = !!input.replyId;
  if (isThread === isReply)
    return { ok: false, error: "Báo cáo không hợp lệ." };
  if (!REPORT_REASONS.has(input.reason))
    return { ok: false, error: "Vui lòng chọn lý do báo cáo." };
  const note = (input.note ?? "").trim().slice(0, 1000) || null;
  if (input.reason === "other" && !note)
    return { ok: false, error: "Vui lòng mô tả lý do khi chọn \"Khác\"." };

  // Đích tồn tại? (đồng thời lấy tác giả để chặn tự báo cáo mình)
  const authorId = isThread
    ? (await prisma.thread.findUnique({
        where: { id: input.threadId! },
        select: { authorId: true },
      }))?.authorId
    : (await prisma.threadReply.findUnique({
        where: { id: input.replyId! },
        select: { authorId: true },
      }))?.authorId;
  if (!authorId) return { ok: false, error: "Không tìm thấy nội dung." };
  if (authorId === user.id)
    return { ok: false, error: "Không thể tự báo cáo nội dung của mình." };

  try {
    await prisma.contentReport.create({
      data: {
        reason: input.reason as ContentReportReason,
        note,
        reporterId: user.id,
        threadId: input.threadId ?? null,
        replyId: input.replyId ?? null,
      },
    });
  } catch {
    // Trùng unique = đã báo cáo trước đó → coi như thành công (idempotent).
    return { ok: true };
  }
  return { ok: true };
}
