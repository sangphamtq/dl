"use server";

import { revalidatePath } from "next/cache";
import { UTApi } from "uploadthing/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { OWNER_FK, OWNER_CMS_BASE, type OwnerType } from "@/lib/owner";

const STAFF = ["admin", "editor"];
const utapi = new UTApi();

type Result = { ok: true } | { ok: false; error: string };

function keyFromUrl(url: string): string | null {
  const m = url.match(/\/f\/([^/?]+)/);
  return m ? m[1] : null;
}

async function requireStaff() {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !STAFF.includes(role)) throw new Error("Không có quyền.");
}

function revalidateOwner(ownerType: OwnerType, ownerId: string) {
  const base = OWNER_CMS_BASE[ownerType];
  if (!base) return;
  revalidatePath(`${base}/${ownerId}`);
  revalidatePath(`${base}/${ownerId}/edit`);
}

export async function deleteImage(
  imageId: string,
  ownerType: OwnerType,
  ownerId: string,
): Promise<Result> {
  await requireStaff();

  const img = await prisma.image.findUnique({
    where: { id: imageId },
    select: { url: true, isCover: true },
  });
  if (!img) return { ok: false, error: "Ảnh không tồn tại." };

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
  if (img.isCover) {
    const where = { [OWNER_FK[ownerType]]: ownerId };
    const next = await prisma.image.findFirst({
      where,
      orderBy: { order: "asc" },
      select: { id: true },
    });
    if (next)
      await prisma.image.update({
        where: { id: next.id },
        data: { isCover: true },
      });
  }

  revalidateOwner(ownerType, ownerId);
  return { ok: true };
}

export async function setCoverImage(
  imageId: string,
  ownerType: OwnerType,
  ownerId: string,
): Promise<Result> {
  await requireStaff();
  const where = { [OWNER_FK[ownerType]]: ownerId };
  await prisma.$transaction([
    prisma.image.updateMany({ where: { ...where, isCover: true }, data: { isCover: false } }),
    prisma.image.update({ where: { id: imageId }, data: { isCover: true } }),
  ]);
  revalidateOwner(ownerType, ownerId);
  return { ok: true };
}

export async function updateImageAlt(
  imageId: string,
  ownerType: OwnerType,
  ownerId: string,
  alt: string,
): Promise<Result> {
  await requireStaff();
  await prisma.image.update({
    where: { id: imageId },
    data: { alt: alt.trim() || null },
  });
  revalidateOwner(ownerType, ownerId);
  return { ok: true };
}
