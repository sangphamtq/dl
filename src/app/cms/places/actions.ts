"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { PlaceKind, PublishStatus } from "@/generated/prisma/enums";
import { slugify, RESERVED_SLUGS } from "@/lib/slug";

const STAFF = ["admin", "editor"];

export type PlaceFormInput = {
  name: string;
  slug: string;
  kind: "province" | "destination";
  parentId: string | null;
  tagline: string;
  description: string;
  provinceCode: string; // code dạng text ("" nếu chưa chọn)
  provinceName: string;
  districtCode: string;
  districtName: string;
  wardCode: string;
  wardName: string;
  tags: string; // chuỗi phân tách bằng dấu phẩy
  status: "draft" | "published";
  isFeatured: boolean;
  order: string; // số dạng text; rỗng = không đặt
};

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

async function requireStaff() {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !STAFF.includes(role)) throw new Error("Không có quyền.");
}

// Chuẩn hóa & kiểm tra dữ liệu form; trả về data Prisma hoặc lỗi.
async function normalize(
  input: PlaceFormInput,
  selfId?: string,
): Promise<{ data: Prisma.PlaceUncheckedCreateInput } | { error: string }> {
  const name = input.name.trim();
  if (!name) return { error: "Tên không được để trống." };

  const slug = (input.slug.trim() ? slugify(input.slug) : slugify(name)) || "";
  if (!slug) return { error: "Slug không hợp lệ." };
  if (RESERVED_SLUGS.has(slug))
    return { error: `Slug "${slug}" trùng tiền tố dành riêng của hệ thống.` };

  // Slug duy nhất giữa mọi Place
  const dup = await prisma.place.findUnique({ where: { slug } });
  if (dup && dup.id !== selfId)
    return { error: `Slug "${slug}" đã tồn tại. Hãy đổi tên hoặc slug.` };

  const kind = input.kind === "province" ? PlaceKind.province : PlaceKind.destination;

  // Ràng buộc cây 2 mức (CLAUDE.md): province ⇒ parentId null;
  // destination ⇒ parentId trỏ tới một province.
  let parentId: string | null = null;
  if (kind === PlaceKind.destination) {
    if (!input.parentId)
      return { error: "Điểm đến lớn phải thuộc một Tỉnh. Hãy chọn tỉnh cha." };
    if (input.parentId === selfId)
      return { error: "Không thể chọn chính nó làm cha." };
    const parent = await prisma.place.findUnique({
      where: { id: input.parentId },
      select: { kind: true },
    });
    if (!parent) return { error: "Tỉnh cha không tồn tại." };
    if (parent.kind !== PlaceKind.province)
      return { error: "Cha phải là một Tỉnh (không lồng điểm đến vào điểm đến)." };
    parentId = input.parentId;
  } else {
    // province: chặn nếu đang có con mà lại bị đổi thành province có parent — luôn null
    parentId = null;
  }

  const order = input.order.trim() === "" ? null : Number(input.order);
  if (order !== null && !Number.isFinite(order))
    return { error: "Thứ tự phải là số." };

  const provinceCode =
    input.provinceCode.trim() === "" ? null : Number(input.provinceCode);
  const districtCode =
    input.districtCode.trim() === "" ? null : Number(input.districtCode);
  const wardCode = input.wardCode.trim() === "" ? null : Number(input.wardCode);
  if (
    (provinceCode !== null && !Number.isFinite(provinceCode)) ||
    (districtCode !== null && !Number.isFinite(districtCode)) ||
    (wardCode !== null && !Number.isFinite(wardCode))
  )
    return { error: "Mã vị trí không hợp lệ." };

  const tags = input.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const status =
    input.status === "published" ? PublishStatus.published : PublishStatus.draft;

  return {
    data: {
      name,
      slug,
      kind,
      parentId,
      tagline: input.tagline.trim() || null,
      description: input.description.trim() || null,
      provinceCode,
      provinceName: provinceCode ? input.provinceName.trim() || null : null,
      districtCode,
      districtName: districtCode ? input.districtName.trim() || null : null,
      wardCode,
      wardName: wardCode ? input.wardName.trim() || null : null,
      tags,
      status,
      isFeatured: input.isFeatured,
      order,
      publishedAt: status === PublishStatus.published ? new Date() : null,
    },
  };
}

export async function createPlace(input: PlaceFormInput): Promise<ActionResult> {
  await requireStaff();
  const res = await normalize(input);
  if ("error" in res) return { ok: false, error: res.error };

  const place = await prisma.place.create({ data: res.data });
  revalidatePath("/cms/places");
  return { ok: true, id: place.id };
}

export async function updatePlace(
  id: string,
  input: PlaceFormInput,
): Promise<ActionResult> {
  await requireStaff();

  // Nếu đổi sang province nhưng vẫn còn con là destination — vẫn hợp lệ (con trỏ về nó).
  const res = await normalize(input, id);
  if ("error" in res) return { ok: false, error: res.error };

  // Giữ nguyên publishedAt cũ nếu đã từng xuất bản (đừng reset mốc khi chỉ sửa).
  const existing = await prisma.place.findUnique({
    where: { id },
    select: { publishedAt: true },
  });
  const data = { ...res.data };
  if (data.status === PublishStatus.published && existing?.publishedAt) {
    data.publishedAt = existing.publishedAt;
  }

  await prisma.place.update({ where: { id }, data });
  revalidatePath("/cms/places");
  revalidatePath(`/cms/places/${id}/edit`);
  return { ok: true, id };
}

export async function deletePlace(id: string): Promise<ActionResult> {
  await requireStaff();

  // Không cho xóa Tỉnh còn điểm đến con (tránh mồ côi listing). Yêu cầu xóa con trước.
  const childCount = await prisma.place.count({ where: { parentId: id } });
  if (childCount > 0)
    return {
      ok: false,
      error: `Không thể xóa: còn ${childCount} điểm đến con. Hãy xóa hoặc chuyển chúng trước.`,
    };

  await prisma.place.delete({ where: { id } });
  revalidatePath("/cms/places");
  return { ok: true, id };
}

// Đổi nhanh trạng thái xuất bản từ danh sách.
export async function togglePublish(
  id: string,
  publish: boolean,
): Promise<ActionResult> {
  await requireStaff();
  await prisma.place.update({
    where: { id },
    data: {
      status: publish ? PublishStatus.published : PublishStatus.draft,
      publishedAt: publish ? new Date() : null,
    },
  });
  revalidatePath("/cms/places");
  return { ok: true, id };
}
