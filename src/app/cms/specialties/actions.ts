"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  SpecialtyKind,
  PriceRange,
  PublishStatus,
} from "@/generated/prisma/enums";
import { slugify, RESERVED_SLUGS } from "@/lib/slug";

const STAFF = ["admin", "editor"];

export type SpecialtyFormInput = {
  name: string;
  slug: string;
  description: string;
  kind: string; // dish | product
  whereToBuy: string;
  priceRange: string;
  placeId: string;
  eateryIds: string[];
  tags: string;
};

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

async function requireStaff() {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !STAFF.includes(role)) throw new Error("Không có quyền.");
}

async function normalize(
  input: SpecialtyFormInput,
  selfId?: string,
): Promise<{ data: Prisma.SpecialtyUncheckedCreateInput } | { error: string }> {
  const name = input.name.trim();
  if (!name) return { error: "Tên không được để trống." };

  const slug = (input.slug.trim() ? slugify(input.slug) : slugify(name)) || "";
  if (!slug) return { error: "Slug không hợp lệ." };
  if (RESERVED_SLUGS.has(slug))
    return { error: `Slug "${slug}" trùng tiền tố dành riêng.` };

  const dup = await prisma.specialty.findUnique({ where: { slug } });
  if (dup && dup.id !== selfId)
    return { error: `Slug "${slug}" đã tồn tại (trong Đặc sản).` };

  if (!input.placeId) return { error: "Phải chọn nơi (Place) của đặc sản." };
  const place = await prisma.place.findUnique({
    where: { id: input.placeId },
    select: { id: true },
  });
  if (!place) return { error: "Place không tồn tại." };

  const kind =
    input.kind === "product" ? SpecialtyKind.product : SpecialtyKind.dish;
  const priceRange =
    input.priceRange && input.priceRange in PriceRange
      ? (input.priceRange as PriceRange)
      : null;

  const tags = input.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    data: {
      name,
      slug,
      description: input.description.trim() || null,
      kind,
      // whereToBuy chỉ áp cho sản vật; món ăn dùng liên kết quán.
      whereToBuy:
        kind === SpecialtyKind.product ? input.whereToBuy.trim() || null : null,
      priceRange,
      placeId: input.placeId,
      tags,
    },
  };
}

// Món ăn (dish) mới gắn quán; sản vật (product) bỏ liên kết quán.
function eateryConnect(input: SpecialtyFormInput) {
  return input.kind === "product" ? [] : input.eateryIds.map((id) => ({ id }));
}

export async function createSpecialty(
  input: SpecialtyFormInput,
): Promise<ActionResult> {
  await requireStaff();
  const res = await normalize(input);
  if ("error" in res) return { ok: false, error: res.error };
  const specialty = await prisma.specialty.create({
    data: { ...res.data, eateries: { connect: eateryConnect(input) } },
  });
  revalidatePath("/cms/specialties");
  return { ok: true, id: specialty.id };
}

export async function updateSpecialty(
  id: string,
  input: SpecialtyFormInput,
): Promise<ActionResult> {
  await requireStaff();
  const res = await normalize(input, id);
  if ("error" in res) return { ok: false, error: res.error };
  await prisma.specialty.update({
    where: { id },
    data: { ...res.data, eateries: { set: eateryConnect(input) } },
  });
  revalidatePath("/cms/specialties");
  revalidatePath(`/cms/specialties/${id}`);
  revalidatePath(`/cms/specialties/${id}/edit`);
  return { ok: true, id };
}

export async function deleteSpecialty(id: string): Promise<ActionResult> {
  await requireStaff();
  await prisma.specialty.delete({ where: { id } });
  revalidatePath("/cms/specialties");
  return { ok: true, id };
}

export async function togglePublish(
  id: string,
  publish: boolean,
): Promise<ActionResult> {
  await requireStaff();
  await prisma.specialty.update({
    where: { id },
    data: {
      status: publish ? PublishStatus.published : PublishStatus.draft,
      publishedAt: publish ? new Date() : null,
    },
  });
  revalidatePath("/cms/specialties");
  revalidatePath(`/cms/specialties/${id}`);
  return { ok: true, id };
}

export async function toggleFeatured(
  id: string,
  featured: boolean,
): Promise<ActionResult> {
  await requireStaff();
  await prisma.specialty.update({
    where: { id },
    data: { isFeatured: featured },
  });
  revalidatePath("/cms/specialties");
  revalidatePath(`/cms/specialties/${id}`);
  return { ok: true, id };
}

export async function updateOrder(
  id: string,
  order: string,
): Promise<ActionResult> {
  await requireStaff();
  const value = order.trim() === "" ? null : Number(order);
  if (value !== null && !Number.isFinite(value))
    return { ok: false, error: "Thứ tự phải là số." };
  await prisma.specialty.update({ where: { id }, data: { order: value } });
  revalidatePath("/cms/specialties");
  revalidatePath(`/cms/specialties/${id}`);
  return { ok: true, id };
}
