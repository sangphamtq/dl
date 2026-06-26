"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/app/blog/actions";

async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Bạn cần đăng nhập.");
  return id;
}

// Đánh dấu / bỏ đánh dấu "đã đến" một Place (tỉnh hoặc điểm đến lớn).
//
// Propagate (xem CLAUDE.md "Place" + schema CheckIn):
// - Check-in điểm đến con ⇒ tự tạo CheckIn tỉnh cha (auto=true) nếu chưa có.
// - Bỏ check-in con ⇒ chỉ gỡ tỉnh cha khi tỉnh đó là auto VÀ không còn con nào.
// - Tỉnh đánh dấu trực tiếp (auto=false) luôn giữ; bỏ tỉnh có con đã đến ⇒ hạ về auto.
export async function toggleCheckIn(
  placeId: string,
): Promise<ActionResult<{ checked: boolean }>> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập để đánh dấu đã đến." };
  }

  const place = await prisma.place.findUnique({
    where: { id: placeId },
    select: { id: true, slug: true, kind: true, parentId: true },
  });
  if (!place) return { ok: false, error: "Không tìm thấy địa điểm." };

  const existing = await prisma.checkIn.findUnique({
    where: { userId_placeId: { userId, placeId } },
    select: { id: true },
  });

  // Đếm số điểm đến con (cùng tỉnh) của user đang được check-in.
  const countCheckedChildren = (provinceId: string) =>
    prisma.checkIn.count({
      where: { userId, place: { parentId: provinceId } },
    });

  let checked: boolean;

  if (!existing) {
    // ── Đánh dấu đã đến ───────────────────────────────────────────────
    await prisma.$transaction(async (tx) => {
      await tx.checkIn.create({ data: { userId, placeId, auto: false } });
      if (place.kind === "destination" && place.parentId) {
        // Tạo CheckIn tỉnh cha nếu chưa có (auto=true); giữ nguyên nếu đã có.
        await tx.checkIn.upsert({
          where: { userId_placeId: { userId, placeId: place.parentId } },
          create: { userId, placeId: place.parentId, auto: true },
          update: {},
        });
      }
    });
    checked = true;
  } else {
    // ── Bỏ đánh dấu ──────────────────────────────────────────────────
    await prisma.$transaction(async (tx) => {
      await tx.checkIn.delete({ where: { id: existing.id } });

      if (place.kind === "destination" && place.parentId) {
        // Gỡ tỉnh cha nếu nó là auto và không còn con nào được check-in.
        const parent = await tx.checkIn.findUnique({
          where: { userId_placeId: { userId, placeId: place.parentId } },
          select: { id: true, auto: true },
        });
        if (parent?.auto) {
          const remaining = await tx.checkIn.count({
            where: { userId, place: { parentId: place.parentId } },
          });
          if (remaining === 0)
            await tx.checkIn.delete({ where: { id: parent.id } });
        }
      }
    });
    checked = false;

    // Tỉnh đánh dấu trực tiếp nhưng còn con đã đến ⇒ giữ lại dưới dạng auto.
    if (place.kind === "province") {
      const remaining = await countCheckedChildren(place.id);
      if (remaining > 0) {
        await prisma.checkIn.create({
          data: { userId, placeId, auto: true },
        });
        checked = true;
      }
    }
  }

  revalidatePath(`/diem-den/${place.slug}`);
  revalidatePath("/tai-khoan/da-den");
  return { ok: true, data: { checked } };
}
