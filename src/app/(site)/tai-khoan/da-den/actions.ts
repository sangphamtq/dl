"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseMapCardOptions, type MapCardOptions } from "@/lib/map-card";
import type { ActionResult } from "@/app/(site)/blog/actions";

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
