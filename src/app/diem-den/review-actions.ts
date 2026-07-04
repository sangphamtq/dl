"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/app/blog/actions";
import type { CheckTarget } from "@/app/diem-den/check-in-actions";
import { isStance, sanitizeAspects, MAX_CONTENT } from "@/lib/review-meta";

type ReviewInput = {
  target: CheckTarget;
  stance: string;
  highlights: string[];
  caveats: string[];
  content: string;
};

async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Bạn cần đăng nhập.");
  return id;
}

function pagePath(kind: "place" | "spot", slug: string) {
  return kind === "place" ? `/diem-den/${slug}` : `/dia-diem/${slug}`;
}

// Kiểm tra target hợp lệ để đánh giá + trả slug (revalidate). place: phải là điểm
// đến lớn; spot: chỉ cần tồn tại.
async function resolveTarget(
  target: CheckTarget,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  if (target.kind === "place") {
    const place = await prisma.place.findUnique({
      where: { id: target.id },
      select: { slug: true, kind: true },
    });
    if (!place || place.kind !== "destination")
      return { ok: false, error: "Chỉ đánh giá được cho điểm đến." };
    return { ok: true, slug: place.slug };
  }
  const spot = await prisma.spot.findUnique({
    where: { id: target.id },
    select: { slug: true },
  });
  if (!spot) return { ok: false, error: "Không tìm thấy địa điểm." };
  return { ok: true, slug: spot.slug };
}

// Đảm bảo có check-in cho target (đánh giá = xác nhận "đã đến"). Place: propagate
// tỉnh cha (auto) như togglePlaceCheckIn.
async function ensureCheckIn(userId: string, target: CheckTarget) {
  if (target.kind === "spot") {
    await prisma.checkIn.upsert({
      where: { userId_spotId: { userId, spotId: target.id } },
      create: { userId, spotId: target.id },
      update: {},
    });
    return;
  }
  const place = await prisma.place.findUnique({
    where: { id: target.id },
    select: { kind: true, parentId: true },
  });
  await prisma.$transaction(async (tx) => {
    await tx.checkIn.upsert({
      where: { userId_placeId: { userId, placeId: target.id } },
      create: { userId, placeId: target.id, auto: false },
      update: {},
    });
    if (place?.kind === "destination" && place.parentId) {
      await tx.checkIn.upsert({
        where: { userId_placeId: { userId, placeId: place.parentId } },
        create: { userId, placeId: place.parentId, auto: true },
        update: {},
      });
    }
  });
}

// Gửi (tạo hoặc cập nhật) đánh giá cho điểm đến HOẶC địa điểm.
export async function submitReview(
  input: ReviewInput,
): Promise<ActionResult<{ id: string }>> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập để đánh giá." };
  }

  if (!isStance(input.stance))
    return { ok: false, error: "Hãy chọn cảm nhận chung của bạn." };

  const resolved = await resolveTarget(input.target);
  if (!resolved.ok) return resolved;

  // Gửi đánh giá = xác nhận "đã đến" → tự tạo check-in nếu chưa có.
  await ensureCheckIn(userId, input.target);

  const data = {
    stance: input.stance,
    highlights: sanitizeAspects(input.highlights, "highlights"),
    caveats: sanitizeAspects(input.caveats, "caveats"),
    content: input.content?.trim().slice(0, MAX_CONTENT) || null,
  };

  const { kind, id } = input.target;
  const saved =
    kind === "place"
      ? await prisma.review.upsert({
          where: { placeId_authorId: { placeId: id, authorId: userId } },
          create: { placeId: id, authorId: userId, ...data },
          update: data,
          select: { id: true },
        })
      : await prisma.review.upsert({
          where: { spotId_authorId: { spotId: id, authorId: userId } },
          create: { spotId: id, authorId: userId, ...data },
          update: data,
          select: { id: true },
        });

  revalidatePath(pagePath(kind, resolved.slug));
  revalidatePath("/tai-khoan/da-den");
  revalidatePath("/cms/reviews");
  return { ok: true, data: { id: saved.id } };
}

// Xoá đánh giá của chính mình cho một target.
export async function deleteReview(
  target: CheckTarget,
): Promise<ActionResult> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const { kind, id } = target;
  const where =
    kind === "place"
      ? { placeId: id, authorId: userId }
      : { spotId: id, authorId: userId };
  await prisma.review.deleteMany({ where });

  const resolved = await resolveTarget(target);
  if (resolved.ok) revalidatePath(pagePath(kind, resolved.slug));
  revalidatePath("/cms/reviews");
  return { ok: true };
}
