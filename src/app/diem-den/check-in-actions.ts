"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/app/blog/actions";

// Đích check-in: điểm đến (place) hoặc địa điểm (spot).
export type CheckTarget = { kind: "place" | "spot"; id: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Bạn cần đăng nhập.");
  return id;
}

// Đánh dấu / bỏ đánh dấu "đã đến" một điểm đến HOẶC địa điểm.
export async function toggleCheckIn(
  target: CheckTarget,
): Promise<ActionResult<{ checked: boolean }>> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập để đánh dấu đã đến." };
  }

  return target.kind === "spot"
    ? toggleSpotCheckIn(userId, target.id)
    : togglePlaceCheckIn(userId, target.id);
}

// Spot: đơn giản, không propagate (khác Place).
async function toggleSpotCheckIn(
  userId: string,
  spotId: string,
): Promise<ActionResult<{ checked: boolean }>> {
  const spot = await prisma.spot.findUnique({
    where: { id: spotId },
    select: { id: true, slug: true },
  });
  if (!spot) return { ok: false, error: "Không tìm thấy địa điểm." };

  const existing = await prisma.checkIn.findUnique({
    where: { userId_spotId: { userId, spotId } },
    select: { id: true },
  });

  let checked: boolean;
  if (existing) {
    await prisma.checkIn.delete({ where: { id: existing.id } });
    checked = false;
  } else {
    await prisma.checkIn.create({ data: { userId, spotId } });
    checked = true;
  }

  revalidatePath(`/dia-diem/${spot.slug}`);
  return { ok: true, data: { checked } };
}

// Place: có propagate tỉnh cha (xem CLAUDE.md "Place" + schema CheckIn):
// - Check-in điểm đến con ⇒ tự tạo CheckIn tỉnh cha (auto=true) nếu chưa có.
// - Bỏ check-in con ⇒ chỉ gỡ tỉnh cha khi tỉnh đó là auto VÀ không còn con nào.
// - Tỉnh đánh dấu trực tiếp (auto=false) luôn giữ; bỏ tỉnh có con đã đến ⇒ hạ về auto.
async function togglePlaceCheckIn(
  userId: string,
  placeId: string,
): Promise<ActionResult<{ checked: boolean }>> {
  const place = await prisma.place.findUnique({
    where: { id: placeId },
    select: { id: true, slug: true, kind: true, parentId: true },
  });
  if (!place) return { ok: false, error: "Không tìm thấy địa điểm." };

  const existing = await prisma.checkIn.findUnique({
    where: { userId_placeId: { userId, placeId } },
    select: { id: true },
  });

  const countCheckedChildren = (provinceId: string) =>
    prisma.checkIn.count({
      where: { userId, place: { parentId: provinceId } },
    });

  let checked: boolean;

  if (!existing) {
    await prisma.$transaction(async (tx) => {
      await tx.checkIn.create({ data: { userId, placeId, auto: false } });
      if (place.kind === "destination" && place.parentId) {
        await tx.checkIn.upsert({
          where: { userId_placeId: { userId, placeId: place.parentId } },
          create: { userId, placeId: place.parentId, auto: true },
          update: {},
        });
      }
    });
    checked = true;
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.checkIn.delete({ where: { id: existing.id } });

      if (place.kind === "destination" && place.parentId) {
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

    if (place.kind === "province") {
      const remaining = await countCheckedChildren(place.id);
      if (remaining > 0) {
        await prisma.checkIn.create({ data: { userId, placeId, auto: true } });
        checked = true;
      }
    }
  }

  revalidatePath(`/diem-den/${place.slug}`);
  revalidatePath("/tai-khoan/da-den");
  return { ok: true, data: { checked } };
}
