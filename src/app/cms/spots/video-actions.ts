"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseTikTokId, getTikTokInfo } from "@/lib/tiktok";

const STAFF = ["admin", "editor"];

type Result = { ok: true } | { ok: false; error: string };

async function requireStaff() {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !STAFF.includes(role)) throw new Error("Không có quyền.");
}

async function revalidate(spotId: string) {
  revalidatePath(`/cms/spots/${spotId}/edit`);
  const s = await prisma.spot.findUnique({
    where: { id: spotId },
    select: { slug: true },
  });
  if (s) revalidatePath(`/dia-diem/${s.slug}`);
}

// Thêm video: nhận link TikTok hoặc ID. Caption rỗng → lấy tạm tiêu đề từ oEmbed.
export async function addVideo(
  spotId: string,
  input: string,
  caption: string,
): Promise<Result> {
  await requireStaff();

  const videoId = parseTikTokId(input);
  if (!videoId) return { ok: false, error: "Không nhận ra link/ID TikTok." };

  const exists = await prisma.spotVideo.findFirst({
    where: { spotId, videoId },
    select: { id: true },
  });
  if (exists) return { ok: false, error: "Video này đã có trong danh sách." };

  let cap = caption.trim();
  if (!cap) {
    const info = await getTikTokInfo(videoId);
    cap = (info.title ?? "").trim();
  }

  const max = await prisma.spotVideo.aggregate({
    where: { spotId },
    _max: { order: true },
  });

  await prisma.spotVideo.create({
    data: {
      spotId,
      videoId,
      caption: cap || null,
      order: (max._max.order ?? -1) + 1,
    },
  });

  await revalidate(spotId);
  return { ok: true };
}

export async function deleteVideo(id: string, spotId: string): Promise<Result> {
  await requireStaff();
  await prisma.spotVideo.delete({ where: { id } });
  await revalidate(spotId);
  return { ok: true };
}

export async function updateVideoCaption(
  id: string,
  spotId: string,
  caption: string,
): Promise<Result> {
  await requireStaff();
  await prisma.spotVideo.update({
    where: { id },
    data: { caption: caption.trim() || null },
  });
  await revalidate(spotId);
  return { ok: true };
}

// Đổi thứ tự: hoán đổi `order` với video liền kề theo hướng dir (-1 lên, +1 xuống).
export async function moveVideo(
  id: string,
  spotId: string,
  dir: -1 | 1,
): Promise<Result> {
  await requireStaff();

  const cur = await prisma.spotVideo.findUnique({
    where: { id },
    select: { order: true },
  });
  if (!cur) return { ok: false, error: "Video không tồn tại." };

  const neighbor = await prisma.spotVideo.findFirst({
    where: {
      spotId,
      order: dir < 0 ? { lt: cur.order } : { gt: cur.order },
    },
    orderBy: { order: dir < 0 ? "desc" : "asc" },
    select: { id: true, order: true },
  });
  if (!neighbor) return { ok: true }; // đã ở đầu/cuối

  await prisma.$transaction([
    prisma.spotVideo.update({
      where: { id },
      data: { order: neighbor.order },
    }),
    prisma.spotVideo.update({
      where: { id: neighbor.id },
      data: { order: cur.order },
    }),
  ]);

  await revalidate(spotId);
  return { ok: true };
}
