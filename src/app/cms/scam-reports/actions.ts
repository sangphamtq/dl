"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const STAFF = ["admin", "editor"];

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireStaff(): Promise<string> {
  const session = await auth();
  const role = session?.user?.role;
  const id = session?.user?.id;
  if (!id || !role || !STAFF.includes(role)) throw new Error("Không có quyền.");
  return id;
}

// Xác nhận báo cáo → tính vào kết quả kiểm tra công khai.
export async function confirmScamReport(
  id: string,
  note?: string,
): Promise<ActionResult> {
  let reviewerId: string;
  try {
    reviewerId = await requireStaff();
  } catch {
    return { ok: false, error: "Không có quyền." };
  }
  await prisma.scamReport.update({
    where: { id },
    data: {
      status: "confirmed",
      reviewedById: reviewerId,
      reviewNote: note?.trim() || null,
    },
  });
  revalidatePath("/cms/scam-reports");
  return { ok: true };
}

// Bác bỏ báo cáo.
export async function rejectScamReport(
  id: string,
  note?: string,
): Promise<ActionResult> {
  let reviewerId: string;
  try {
    reviewerId = await requireStaff();
  } catch {
    return { ok: false, error: "Không có quyền." };
  }
  await prisma.scamReport.update({
    where: { id },
    data: {
      status: "rejected",
      reviewedById: reviewerId,
      reviewNote: note?.trim() || null,
    },
  });
  revalidatePath("/cms/scam-reports");
  return { ok: true };
}

// Xoá hẳn báo cáo.
export async function deleteScamReport(id: string): Promise<ActionResult> {
  try {
    await requireStaff();
  } catch {
    return { ok: false, error: "Không có quyền." };
  }
  await prisma.scamReport.delete({ where: { id } });
  revalidatePath("/cms/scam-reports");
  return { ok: true };
}
