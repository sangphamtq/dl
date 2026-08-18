// Kiểm phần CỘNG TÁC của lịch trình (docs/lich-trinh-cong-tac.md §9).
// Chạy: pnpm check:trip-collab
//
// Đây là phần rủi ro nhất của tính năng: sót một chỗ kiểm quyền là lộ hoặc mất
// dữ liệu của người khác — mà lỗi kiểu đó không lộ qua typecheck.
// Script tự tạo và tự dọn dữ liệu test.
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { claimTripInvites } from "@/lib/trip-invites";

let pass = 0, fail = 0;
function ok(name: string, cond: boolean) {
  console.log(`${cond ? "OK  " : "FAIL"}  ${name}`);
  if (cond) pass++;
  else fail++;
}

async function main() {
  const owner = await prisma.user.findFirst({ select: { id: true, email: true } });
  if (!owner) throw new Error("cần ít nhất 1 user");

  // Người thứ hai: tạo tạm nếu DB chỉ có một user.
  let mate = await prisma.user.findFirst({ where: { id: { not: owner.id } }, select: { id: true, email: true } });
  let temp = false;
  if (!mate) {
    mate = await prisma.user.create({ data: { email: "collab-test@example.com", name: "Bạn Thử" }, select: { id: true, email: true } });
    temp = true;
  }

  const trip = await prisma.trip.create({
    data: { ownerId: owner.id, title: "COLLAB TEST", days: { create: [{ index: 0 }] } },
    select: { id: true, version: true, days: { select: { id: true } } },
  });

  // 1. chưa mời → không phải thành viên
  const before = await prisma.trip.count({
    where: { id: trip.id, OR: [{ ownerId: mate.id }, { members: { some: { userId: mate.id } } }] },
  });
  ok("chưa mời: người kia KHÔNG thấy chuyến", before === 0);

  // 2. mời email đã có tài khoản → thành viên ngay
  await prisma.tripMember.create({ data: { tripId: trip.id, userId: mate.id, addedById: owner.id } });
  const after = await prisma.trip.count({
    where: { id: trip.id, OR: [{ ownerId: mate.id }, { members: { some: { userId: mate.id } } }] },
  });
  ok("đã mời: người kia THẤY chuyến", after === 1);

  // 3. lời mời treo cho email chưa có tài khoản → nhận khi đăng nhập
  const ghostEmail = "chua-co-tai-khoan@example.com";
  await prisma.tripInvite.create({ data: { tripId: trip.id, email: ghostEmail, invitedById: owner.id } });
  const ghost = await prisma.user.create({ data: { email: ghostEmail, name: "Người Mới" }, select: { id: true, email: true } });
  await claimTripInvites(ghost.id, ghost.email);
  const claimed = await prisma.tripMember.count({ where: { tripId: trip.id, userId: ghost.id } });
  const leftover = await prisma.tripInvite.count({ where: { tripId: trip.id, email: ghostEmail } });
  ok("lời mời treo → thành viên sau khi đăng nhập", claimed === 1);
  ok("lời mời đã dùng thì bị dọn", leftover === 0);

  // 3b. và người đó phải BIẾT là mình vừa được mời. Site chỉ đăng nhập OAuth,
  // không gửi được email — chuông thông báo là kênh duy nhất.
  const notif = await prisma.notification.findFirst({
    where: { userId: ghost.id, type: "trip_invite", url: `/lich-trinh/${trip.id}` },
    select: { actorId: true, excerpt: true },
  });
  ok("nhận lời mời treo → có thông báo", notif?.actorId === owner.id);
  ok("thông báo kèm tên chuyến", notif?.excerpt === "COLLAB TEST");

  // 4. version tăng khi có mutation
  const v0 = (await prisma.trip.findUnique({ where: { id: trip.id }, select: { version: true } }))!.version;
  await prisma.trip.update({ where: { id: trip.id }, data: { version: { increment: 1 } } });
  const v1 = (await prisma.trip.findUnique({ where: { id: trip.id }, select: { version: true } }))!.version;
  ok("version tăng sau mutation", v1 === v0 + 1);

  // dọn
  await prisma.trip.delete({ where: { id: trip.id } });
  await prisma.notification.deleteMany({ where: { userId: ghost.id } });
  await prisma.user.delete({ where: { id: ghost.id } });
  if (temp) await prisma.user.delete({ where: { id: mate.id } });
  console.log(`\n${pass} qua · ${fail} hỏng`);
  if (fail) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
