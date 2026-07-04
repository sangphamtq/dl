"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/app/blog/actions";
import {
  isStance,
  sanitizeAspects,
  MAX_CONTENT,
} from "@/lib/review-meta";

type ReviewInput = {
  placeId: string;
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

// Gửi (tạo hoặc cập nhật) đánh giá điểm đến. Gate:
// - đăng nhập
// - place tồn tại & là điểm đến lớn (kind=destination)
// - author đã CheckIn place này ("Vivu-er đã đến mới đánh giá")
// stance bắt buộc; nhãn + nội dung tùy chọn. isHidden do staff giữ.
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

  const place = await prisma.place.findUnique({
    where: { id: input.placeId },
    select: { id: true, slug: true, kind: true },
  });
  if (!place || place.kind !== "destination")
    return { ok: false, error: "Chỉ đánh giá được cho điểm đến." };

  const checkedIn = await prisma.checkIn.findUnique({
    where: { userId_placeId: { userId, placeId: place.id } },
    select: { id: true },
  });
  if (!checkedIn)
    return {
      ok: false,
      error: "Bạn cần đánh dấu đã đến nơi này trước khi đánh giá.",
    };

  const highlights = sanitizeAspects(input.highlights, "highlights");
  const caveats = sanitizeAspects(input.caveats, "caveats");
  const content = input.content?.trim().slice(0, MAX_CONTENT) || null;

  const saved = await prisma.review.upsert({
    where: { placeId_authorId: { placeId: place.id, authorId: userId } },
    create: {
      placeId: place.id,
      authorId: userId,
      stance: input.stance,
      highlights,
      caveats,
      content,
    },
    update: { stance: input.stance, highlights, caveats, content },
    select: { id: true },
  });

  revalidatePath(`/diem-den/${place.slug}`);
  revalidatePath("/cms/reviews");
  return { ok: true, data: { id: saved.id } };
}

// Xoá đánh giá của chính mình cho một điểm đến.
export async function deleteReview(
  placeId: string,
): Promise<ActionResult> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const place = await prisma.place.findUnique({
    where: { id: placeId },
    select: { slug: true },
  });

  await prisma.review.deleteMany({ where: { placeId, authorId: userId } });

  if (place) revalidatePath(`/diem-den/${place.slug}`);
  revalidatePath("/cms/reviews");
  return { ok: true };
}
