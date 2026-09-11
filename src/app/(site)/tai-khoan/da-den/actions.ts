"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseMapCardOptions, type MapCardOptions } from "@/lib/map-card";
import type { ActionResult } from "@/app/(site)/blog/actions";

/**
 * Lưu tuỳ chỉnh trang "Nơi đã đến" cho CHÍNH người đang đăng nhập.
 *
 * Chạy qua `parseMapCardOptions()` trước khi ghi — cùng một hàm dùng lúc đọc,
 * nên cột Json không bao giờ chứa thứ mà giao diện không đọc lại được (hex
 * hỏng, chữ nhiều dòng, cả hai công tắc cùng tắt).
 */
export async function saveMapCardOptions(
  input: MapCardOptions,
): Promise<ActionResult<MapCardOptions>> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: "Bạn cần đăng nhập." };

  const data = parseMapCardOptions(input);
  await prisma.user.update({
    where: { id: userId },
    data: { mapCardOptions: data },
  });
  revalidatePath("/tai-khoan/da-den");
  return { ok: true, data };
}
