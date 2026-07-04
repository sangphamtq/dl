"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const STAFF = ["admin", "editor"];

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireStaff(): Promise<void> {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !role || !STAFF.includes(role))
    throw new Error("Không có quyền.");
}

async function revalidateFor(id: string) {
  const r = await prisma.review.findUnique({
    where: { id },
    select: { place: { select: { slug: true } } },
  });
  revalidatePath("/cms/reviews");
  if (r?.place?.slug) revalidatePath(`/diem-den/${r.place.slug}`);
}

// Ẩn / hiện một review (ẩn thì không hiện công khai & không tính vào tổng hợp).
export async function setReviewHidden(
  id: string,
  hidden: boolean,
): Promise<ActionResult> {
  try {
    await requireStaff();
  } catch {
    return { ok: false, error: "Không có quyền." };
  }
  await prisma.review.update({ where: { id }, data: { isHidden: hidden } });
  await revalidateFor(id);
  return { ok: true };
}

// Xoá hẳn review.
export async function deleteReviewCms(id: string): Promise<ActionResult> {
  try {
    await requireStaff();
  } catch {
    return { ok: false, error: "Không có quyền." };
  }
  await revalidateFor(id); // lấy slug trước khi xoá
  await prisma.review.delete({ where: { id } });
  return { ok: true };
}
