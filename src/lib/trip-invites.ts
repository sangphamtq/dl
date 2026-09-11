import "server-only";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";

export async function claimTripInvites(
  userId: string,
  email: string | null | undefined,
): Promise<void> {
  if (!email) return;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  try {
    const invites = await prisma.tripInvite.findMany({
      where: { email: normalized },
      select: { id: true, tripId: true, role: true, invitedById: true, trip: { select: { title: true } } },
    });
    if (invites.length === 0) return;

    await prisma.$transaction(async (tx) => {
      for (const inv of invites) {
        await tx.tripMember.upsert({
          where: { tripId_userId: { tripId: inv.tripId, userId } },
          create: {
            tripId: inv.tripId,
            userId,
            role: inv.role,
            addedById: inv.invitedById,
          },
          update: {},
        });
      }
      await tx.tripInvite.deleteMany({ where: { id: { in: invites.map((i) => i.id) } } });
    });

    for (const inv of invites) {
      if (!inv.invitedById) continue;
      await notify({
        userId,
        actorId: inv.invitedById,
        type: "trip_invite",
        url: `/lich-trinh/cua-toi/${inv.tripId}`,
        excerpt: inv.trip?.title,
      });
    }
  } catch {
    /* không bao giờ để chuyện này chặn đăng nhập */
  }
}
