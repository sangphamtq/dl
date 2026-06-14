"use server";

import { revalidatePath } from "next/cache";
import { UTApi } from "uploadthing/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const STAFF = ["admin", "editor"];
const utapi = new UTApi();

type Result = { ok: true } | { ok: false; error: string };

// Lấy fileKey từ URL UploadThing (…/f/<key>) để xóa khỏi storage.
function keyFromUrl(url: string): string | null {
  const m = url.match(/\/f\/([^/?]+)/);
  return m ? m[1] : null;
}

// Cập nhật metadata ảnh: alt, caption, nguồn (credit).
export async function updateMediaImage(
  id: string,
  data: { alt: string; caption: string; credit: string },
): Promise<Result> {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !STAFF.includes(role))
    return { ok: false, error: "Không có quyền." };

  await prisma.image.update({
    where: { id },
    data: {
      alt: data.alt.trim() || null,
      caption: data.caption.trim() || null,
      credit: data.credit.trim() || null,
    },
  });
  revalidatePath("/cms/media");
  return { ok: true };
}

// Xóa một ảnh khỏi thư viện (cả file trên UploadThing lẫn bản ghi DB).
export async function deleteMediaImage(id: string): Promise<Result> {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !STAFF.includes(role))
    return { ok: false, error: "Không có quyền." };

  const img = await prisma.image.findUnique({
    where: { id },
    select: { url: true },
  });
  if (!img) return { ok: false, error: "Ảnh không tồn tại." };

  const key = keyFromUrl(img.url);
  if (key) {
    try {
      await utapi.deleteFiles(key);
    } catch {
      // bỏ qua lỗi storage, vẫn dọn DB
    }
  }

  await prisma.image.delete({ where: { id } });
  revalidatePath("/cms/media");
  return { ok: true };
}
