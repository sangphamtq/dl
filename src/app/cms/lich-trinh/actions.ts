"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify, RESERVED_TRIP_SLUGS } from "@/lib/slug";

// CMS — lịch trình MẪU (Trip.isTemplate = true). Nội dung từng ngày vẫn soạn ở
// trình soạn công khai /lich-trinh/[id] (mẫu do chính editor sở hữu nên vào
// được); ở đây chỉ quản lý phần "xuất bản": slug, tóm tắt, nơi gắn, trạng thái.

const STAFF = ["admin", "editor"];

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

async function requireStaff(): Promise<string> {
  const session = await auth();
  const role = session?.user?.role;
  const id = session?.user?.id;
  if (!id || !role || !STAFF.includes(role)) throw new Error("Không có quyền.");
  return id;
}

export async function createTemplate(): Promise<ActionResult<{ id: string }>> {
  let userId: string;
  try {
    userId = await requireStaff();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const trip = await prisma.trip.create({
    data: {
      ownerId: userId,
      title: "Lịch trình mẫu mới",
      isTemplate: true,
      days: { create: [{ index: 0 }] },
    },
    select: { id: true },
  });

  revalidatePath("/cms/lich-trinh");
  return { ok: true, data: { id: trip.id } };
}

export async function updateTemplate(
  id: string,
  input: {
    title: string;
    slug: string;
    summary: string;
    placeId: string;
    status: string;
    isFeatured: boolean;
    order: string;
  },
): Promise<ActionResult> {
  try {
    await requireStaff();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const title = input.title.trim();
  if (!title) return { ok: false, error: "Tên không được để trống." };

  const slug = slugify(input.slug.trim() || title);
  if (!slug) return { ok: false, error: "Slug không hợp lệ." };
  // Mẫu nằm ở `/lich-trinh/[slug]`, cùng tầng với `cua-toi` và `s` — trùng thì
  // trang mẫu vĩnh viễn không mở được.
  if (RESERVED_TRIP_SLUGS.has(slug))
    return { ok: false, error: `"${slug}" là từ khoá dành riêng, chọn slug khác.` };

  const clash = await prisma.trip.findFirst({
    where: { slug, NOT: { id } },
    select: { id: true },
  });
  if (clash) return { ok: false, error: `Slug "${slug}" đã được dùng.` };

  const status = input.status === "published" ? "published" : "draft";
  const current = await prisma.trip.findUnique({
    where: { id },
    select: { publishedAt: true, isTemplate: true },
  });
  if (!current?.isTemplate) return { ok: false, error: "Không phải lịch trình mẫu." };

  const orderNum = input.order.trim() === "" ? null : Number(input.order);
  if (orderNum != null && !Number.isFinite(orderNum))
    return { ok: false, error: "Thứ tự phải là số." };

  await prisma.trip.update({
    where: { id },
    data: {
      title,
      slug,
      summary: input.summary.trim() || null,
      placeId: input.placeId || null,
      status,
      // Giữ mốc xuất bản đầu tiên; chỉ đặt khi lần đầu chuyển sang published.
      publishedAt:
        status === "published" ? (current.publishedAt ?? new Date()) : null,
      isFeatured: input.isFeatured,
      order: orderNum == null ? null : Math.round(orderNum),
    },
  });

  revalidatePath("/cms/lich-trinh");
  revalidatePath(`/cms/lich-trinh/${id}`);
  revalidatePath(`/lich-trinh/${slug}`);
  revalidatePath("/lich-trinh");
  return { ok: true };
}

export async function deleteTemplate(id: string): Promise<ActionResult> {
  try {
    await requireStaff();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const t = await prisma.trip.findUnique({ where: { id }, select: { isTemplate: true } });
  if (!t?.isTemplate) return { ok: false, error: "Không phải lịch trình mẫu." };

  await prisma.trip.delete({ where: { id } });
  revalidatePath("/cms/lich-trinh");
  revalidatePath("/lich-trinh");
  return { ok: true };
}
