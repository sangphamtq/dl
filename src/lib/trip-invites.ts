import "server-only";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";

// Biến các lời mời treo (TripInvite) của một email thành thành viên thật.
//
// Vì sao cần: site chỉ đăng nhập bằng OAuth nên không gửi được mail xác thực
// riêng. Mời một email chưa có tài khoản thì lời mời nằm chờ ở TripInvite; lần
// ĐẦU người đó đăng nhập bằng đúng email ấy, hàm này biến nó thành TripMember.
//
// Gọi ở sự kiện `signIn` trong auth.ts (Node runtime, có Prisma) — KHÔNG gọi
// được từ auth.config.ts vì file đó phải giữ edge-safe cho proxy.ts.
//
// Nuốt mọi lỗi: hỏng ở đây tuyệt đối không được chặn đăng nhập. Lời mời vẫn còn
// trong bảng nên lần đăng nhập sau sẽ nhận lại được.
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

    // Lời mời treo được nhận ĐÚNG LÚC đăng nhập lần đầu, tức là người dùng đang
    // ở một trang khác hẳn — không có gì trên màn hình nói cho họ biết vừa có
    // một lịch trình mới. Đẩy vào chuông thông báo để họ tìm lại được.
    for (const inv of invites) {
      if (!inv.invitedById) continue;
      await notify({
        userId,
        actorId: inv.invitedById,
        type: "trip_invite",
        url: `/lich-trinh/${inv.tripId}`,
        excerpt: inv.trip?.title,
      });
    }
  } catch {
    /* không bao giờ để chuyện này chặn đăng nhập */
  }
}
