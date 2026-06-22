import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/generated/prisma/enums";
import { publishEvent, userChannel } from "@/lib/ably";

function snippet(s: string | undefined, n = 120): string | null {
  if (!s) return null;
  const t = s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > n ? t.slice(0, n) + "…" : t;
}

type NotifArgs = {
  userId: string; // người nhận
  actorId: string; // người gây ra
  type: NotificationType;
  url: string;
  excerpt?: string;
};

// Tạo thông báo (không tự báo cho chính mình; không chặn luồng chính nếu lỗi).
export async function notify(args: NotifArgs): Promise<void> {
  if (!args.userId || args.userId === args.actorId) return;
  try {
    await prisma.notification.create({
      data: {
        userId: args.userId,
        actorId: args.actorId,
        type: args.type,
        url: args.url,
        excerpt: snippet(args.excerpt),
      },
    });
    await publishEvent(userChannel(args.userId), "notif");
  } catch (e) {
    console.error("[notify]", e);
  }
}

// Thông báo "thích" — giữ tối đa 1 bản ghi cho mỗi (người nhận, người thích,
// loại, đích) để khỏi spam khi bật/tắt tim.
export async function notifyLike(args: NotifArgs): Promise<void> {
  if (!args.userId || args.userId === args.actorId) return;
  try {
    await prisma.notification.deleteMany({
      where: { userId: args.userId, actorId: args.actorId, type: args.type, url: args.url },
    });
    await prisma.notification.create({
      data: {
        userId: args.userId,
        actorId: args.actorId,
        type: args.type,
        url: args.url,
        excerpt: snippet(args.excerpt),
      },
    });
    await publishEvent(userChannel(args.userId), "notif");
  } catch (e) {
    console.error("[notifyLike]", e);
  }
}

// Bỏ thông báo "thích" khi người dùng bỏ tim.
export async function removeLikeNotif(args: {
  userId: string;
  actorId: string;
  type: NotificationType;
  url: string;
}): Promise<void> {
  if (!args.userId || args.userId === args.actorId) return;
  try {
    await prisma.notification.deleteMany({ where: args });
    await publishEvent(userChannel(args.userId), "notif");
  } catch (e) {
    console.error("[removeLikeNotif]", e);
  }
}

export function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export function getRecentNotifications(userId: string, take = 15) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      url: true,
      excerpt: true,
      isRead: true,
      createdAt: true,
      actor: { select: { name: true } },
    },
  });
}

export type NotificationItem = Awaited<
  ReturnType<typeof getRecentNotifications>
>[number];
