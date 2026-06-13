import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/enums";

// Đặt role cho một user theo email.
// Dùng: pnpm set-role <email> [user|editor|admin]   (mặc định admin)
// Lưu ý: user phải ĐĂNG NHẬP ít nhất 1 lần để có bản ghi trong DB trước khi chạy.
async function main() {
  const email = process.argv[2];
  const role = (process.argv[3] ?? "admin") as keyof typeof UserRole;

  if (!email) {
    console.error("Thiếu email. Dùng: pnpm set-role <email> [user|editor|admin]");
    process.exit(1);
  }
  if (!Object.keys(UserRole).includes(role)) {
    console.error(`Role không hợp lệ: "${role}". Chọn: ${Object.keys(UserRole).join(" | ")}`);
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(
      `Không tìm thấy user "${email}". Hãy đăng nhập Google bằng email này một lần rồi chạy lại.`,
    );
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { email },
    data: { role: UserRole[role] },
  });
  console.log(`✓ ${updated.email} → role = ${updated.role}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
