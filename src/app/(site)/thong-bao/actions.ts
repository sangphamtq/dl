"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function markAllNotificationsRead(): Promise<void> {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return;
  await prisma.notification.updateMany({
    where: { userId: uid, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/thong-bao");
}

export async function markNotificationRead(id: string): Promise<void> {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return;
  await prisma.notification.updateMany({
    where: { id, userId: uid },
    data: { isRead: true },
  });
}
