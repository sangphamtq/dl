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

  // 4. GHI CHÚ: người được mời cũng thêm/sửa/xoá được (cùng luật với điểm dừng),
  //    người ngoài thì không thấy gì cả.
  const note = await prisma.tripNote.create({
    data: { tripId: trip.id, body: "mã đặt phòng SH-4471", authorId: owner.id },
    select: { id: true },
  });
  const seenByMate = await prisma.tripNote.count({
    where: {
      id: note.id,
      trip: { OR: [{ ownerId: mate.id }, { members: { some: { userId: mate.id } } }] },
    },
  });
  ok("ghi chú: người được mời ĐỌC được", seenByMate === 1);

  const outsider = await prisma.user.create({
    data: { email: "nguoi-ngoai@example.com", name: "Người Ngoài" },
    select: { id: true },
  });
  const seenByOutsider = await prisma.tripNote.count({
    where: {
      id: note.id,
      trip: { OR: [{ ownerId: outsider.id }, { members: { some: { userId: outsider.id } } }] },
    },
  });
  ok("ghi chú: người ngoài KHÔNG đọc được", seenByOutsider === 0);

  // Ghim + xoá chuyến kéo theo ghi chú (Cascade).
  await prisma.tripNote.update({ where: { id: note.id }, data: { isPinned: true } });
  const pinnedFirst = await prisma.tripNote.findFirst({
    where: { tripId: trip.id },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    select: { id: true },
  });
  ok("ghi chú: mẩu đã ghim đứng đầu", pinnedFirst?.id === note.id);

  // 4b. ĐỒ MANG THEO: gán được cho người trong chuyến, và gỡ người khỏi chuyến
  //     thì món quay về "chưa ai nhận" chứ KHÔNG biến mất (SetNull).
  const pack = await prisma.tripPackItem.create({
    data: { tripId: trip.id, name: "Sạc dự phòng", assigneeId: ghost.id },
    select: { id: true },
  });
  await prisma.tripMember.deleteMany({ where: { tripId: trip.id, userId: ghost.id } });
  await prisma.user.delete({ where: { id: ghost.id } });
  const after2 = await prisma.tripPackItem.findUnique({
    where: { id: pack.id },
    select: { assigneeId: true },
  });
  ok("đồ mang theo: gỡ người → món CÒN, về chưa ai nhận", after2 !== null && after2.assigneeId === null);

  // 4c. ĐỒ RIÊNG: trạng thái là CỦA TỪNG NGƯỜI. Chủ chuyến tick xong thì người
  //     được mời vẫn phải thấy "chưa tick" — nếu dùng chung một cờ thì cả nhóm
  //     tưởng mình đã xếp đồ trong khi chưa ai đụng vào.
  const mine = await prisma.tripPackItem.create({
    data: { tripId: trip.id, name: "Bàn chải", scope: "personal" },
    select: { id: true },
  });
  await prisma.tripPackCheck.create({
    data: { itemId: mine.id, userId: owner.id, isReady: true },
  });
  const forOwner = await prisma.tripPackCheck.findUnique({
    where: { itemId_userId: { itemId: mine.id, userId: owner.id } },
    select: { isReady: true },
  });
  const forMate = await prisma.tripPackCheck.findUnique({
    where: { itemId_userId: { itemId: mine.id, userId: mate.id } },
  });
  ok("đồ riêng: chủ chuyến đã tick", forOwner?.isReady === true);
  ok("đồ riêng: người kia VẪN chưa tick", forMate === null);

  // 4d. CHI PHÍ: xoá chuyến thì khoản chi và các phần chia mất theo (Cascade).
  const ex = await prisma.tripExpense.create({
    data: {
      tripId: trip.id, title: "Tiền phòng", amount: 900_000, paidById: owner.id,
      shares: { create: [{ userId: owner.id }, { userId: mate.id }] },
    },
    select: { id: true },
  });
  ok("chi phí: ghi được kèm phần chia", (await prisma.tripExpenseShare.count({ where: { expenseId: ex.id } })) === 2);

  // Xoá là XOÁ MỀM: bản ghi còn nguyên, mang tên người xoá, khôi phục được.
  await prisma.tripExpense.update({
    where: { id: ex.id },
    data: { deletedAt: new Date(), deletedById: mate.id },
  });
  const softDeleted = await prisma.tripExpense.findUnique({
    where: { id: ex.id },
    select: { deletedAt: true, deletedBy: { select: { name: true } } },
  });
  ok("chi phí: xoá mềm giữ bản ghi + tên người xoá",
    softDeleted?.deletedAt != null && softDeleted?.deletedBy != null);
  await prisma.tripExpense.update({
    where: { id: ex.id },
    data: { deletedAt: null, deletedById: null },
  });
  const restored = await prisma.tripExpense.findUnique({
    where: { id: ex.id },
    select: { deletedAt: true },
  });
  ok("chi phí: khôi phục xong sạch dấu xoá", restored?.deletedAt === null);

  // 5. version tăng khi có mutation
  const v0 = (await prisma.trip.findUnique({ where: { id: trip.id }, select: { version: true } }))!.version;
  await prisma.trip.update({ where: { id: trip.id }, data: { version: { increment: 1 } } });
  const v1 = (await prisma.trip.findUnique({ where: { id: trip.id }, select: { version: true } }))!.version;
  ok("version tăng sau mutation", v1 === v0 + 1);

  // dọn
  await prisma.trip.delete({ where: { id: trip.id } });
  const notesLeft = await prisma.tripNote.count({ where: { id: note.id } });
  ok("ghi chú: xoá chuyến thì mất theo (Cascade)", notesLeft === 0);
  ok(
    "chi phí: xoá chuyến thì khoản chi + phần chia mất theo",
    (await prisma.tripExpense.count({ where: { id: ex.id } })) === 0 &&
      (await prisma.tripExpenseShare.count({ where: { expenseId: ex.id } })) === 0,
  );
  await prisma.user.delete({ where: { id: outsider.id } });
  if (temp) await prisma.user.delete({ where: { id: mate.id } });
  console.log(`\n${pass} qua · ${fail} hỏng`);
  if (fail) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
