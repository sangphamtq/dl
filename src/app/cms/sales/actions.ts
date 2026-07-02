"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";

const STAFF = ["admin", "editor"];

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireStaff(): Promise<string> {
  const session = await auth();
  const role = session?.user?.role;
  const id = session?.user?.id;
  if (!id || !role || !STAFF.includes(role)) throw new Error("Không có quyền.");
  return id;
}

function revalidate(slug?: string | null) {
  revalidatePath("/cms/sales");
  if (slug) revalidatePath(`/sale/${slug}`);
}

// Duyệt hồ sơ CTV → công khai + huy hiệu. level: basic|standard|high (theo SOP).
export async function approveSale(
  id: string,
  opts?: { level?: string; note?: string; reVerifyMonths?: number },
): Promise<ActionResult> {
  let reviewerId: string;
  try {
    reviewerId = await requireStaff();
  } catch {
    return { ok: false, error: "Không có quyền." };
  }

  const now = new Date();
  const reVerifyDueAt = opts?.reVerifyMonths
    ? new Date(now.getFullYear(), now.getMonth() + opts.reVerifyMonths, now.getDate())
    : null;

  const row = await prisma.saleProfile.update({
    where: { id },
    data: {
      status: "approved",
      verifiedAt: now,
      reviewedById: reviewerId,
      rejectReason: null,
      verificationLevel: opts?.level ?? "standard",
      verifiedNote: opts?.note?.trim() || null,
      reVerifyDueAt,
    },
    select: { slug: true, userId: true },
  });
  await notify({
    userId: row.userId,
    actorId: reviewerId,
    type: "sale_approved",
    url: `/sale/${row.slug}`,
  });
  revalidate(row.slug);
  return { ok: true };
}

// Từ chối hồ sơ (kèm lý do hiển thị cho chính chủ).
export async function rejectSale(
  id: string,
  reason: string,
): Promise<ActionResult> {
  let reviewerId: string;
  try {
    reviewerId = await requireStaff();
  } catch {
    return { ok: false, error: "Không có quyền." };
  }
  if (!reason.trim())
    return { ok: false, error: "Cần nêu lý do từ chối." };

  const row = await prisma.saleProfile.update({
    where: { id },
    data: {
      status: "rejected",
      verifiedAt: null,
      reviewedById: reviewerId,
      rejectReason: reason.trim(),
    },
    select: { slug: true, userId: true },
  });
  await notify({
    userId: row.userId,
    actorId: reviewerId,
    type: "sale_rejected",
    url: "/sale/dang-ky",
    excerpt: reason.trim(),
  });
  revalidate(row.slug);
  return { ok: true };
}

// Gỡ huy hiệu (khi có vấn đề) — đưa về chờ duyệt lại, badge biến mất ngay.
export async function revokeSale(id: string): Promise<ActionResult> {
  try {
    await requireStaff();
  } catch {
    return { ok: false, error: "Không có quyền." };
  }
  const row = await prisma.saleProfile.update({
    where: { id },
    data: { status: "pending", verifiedAt: null },
    select: { slug: true },
  });
  revalidate(row.slug);
  return { ok: true };
}
