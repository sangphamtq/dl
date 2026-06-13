"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/enums";
import type { Role } from "./roles";

type Result = { ok: true } | { ok: false; error: string };

// Đổi vai trò một user. Chỉ admin được phép; không tự đổi role của chính mình
// (tránh tự khóa quyền). Sau khi đổi, user mục tiêu cần đăng nhập lại để JWT
// cập nhật role mới (role nằm trong token).
export async function updateUserRole(
  userId: string,
  role: Role,
): Promise<Result> {
  const session = await auth();
  const current = session?.user;

  if (current?.role !== "admin") {
    return { ok: false, error: "Chỉ quản trị viên mới đổi được vai trò." };
  }
  if (current.id === userId) {
    return { ok: false, error: "Không thể tự đổi vai trò của chính mình." };
  }
  if (!Object.keys(UserRole).includes(role)) {
    return { ok: false, error: "Vai trò không hợp lệ." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: UserRole[role] },
  });

  revalidatePath("/cms/users");
  return { ok: true };
}
