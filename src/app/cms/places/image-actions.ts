"use server";

import { revalidatePath } from "next/cache";
import { UTApi } from "uploadthing/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const STAFF = ["admin", "editor"];
const utapi = new UTApi();

type Result = { ok: true } | { ok: false; error: string };

async function requireStaff() {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !STAFF.includes(role)) throw new Error("Không có quyền.");
}

// Lấy fileKey từ URL UploadThing (…/f/<key>) để xóa khỏi storage.
function keyFromUrl(url: string): string | null {
  const m = url.match(/\/f\/([^/?]+)/);
  return m ? m[1] : null;
}

function revalidate(placeId: string) {
  revalidatePath(`/cms/places/${placeId}/edit`);
}

export async function deleteImage(
  imageId: string,
  placeId: string,
): Promise<Result> {
  await requireStaff();

  const img = await prisma.image.findUnique({
    where: { id: imageId },
    select: { url: true, isCover: true, placeId: true },
  });
  if (!img) return { ok: false, error: "Ảnh không tồn tại." };

  // Xóa file trên UploadThing (bỏ qua lỗi để vẫn dọn được DB).
  const key = keyFromUrl(img.url);
  if (key) {
    try {
      await utapi.deleteFiles(key);
    } catch {
      // ignore storage error
    }
  }

  await prisma.image.delete({ where: { id: imageId } });

  // Nếu vừa xóa ảnh bìa → chọn ảnh order nhỏ nhất còn lại làm bìa.
  if (img.isCover && img.placeId) {
    const next = await prisma.image.findFirst({
      where: { placeId: img.placeId },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    if (next)
      await prisma.image.update({
        where: { id: next.id },
        data: { isCover: true },
      });
  }

  revalidate(placeId);
  return { ok: true };
}

export async function setCoverImage(
  imageId: string,
  placeId: string,
): Promise<Result> {
  await requireStaff();

  // Đảm bảo đúng 1 ảnh bìa cho Place này.
  await prisma.$transaction([
    prisma.image.updateMany({
      where: { placeId, isCover: true },
      data: { isCover: false },
    }),
    prisma.image.update({
      where: { id: imageId },
      data: { isCover: true },
    }),
  ]);

  revalidate(placeId);
  return { ok: true };
}

export async function updateImageAlt(
  imageId: string,
  placeId: string,
  alt: string,
): Promise<Result> {
  await requireStaff();
  await prisma.image.update({
    where: { id: imageId },
    data: { alt: alt.trim() || null },
  });
  revalidate(placeId);
  return { ok: true };
}
