"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { PlaceKind, PublishStatus } from "@/generated/prisma/enums";
import { slugify, RESERVED_SLUGS } from "@/lib/slug";

const STAFF = ["admin", "editor"];

export type QuickFact = { label: string; value: string };

export type PlaceFormInput = {
  name: string;
  slug: string;
  kind: "province" | "destination";
  parentId: string | null;
  tagline: string;
  description: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  lat: string;
  lng: string;
  tags: string;
  quickInfo: QuickFact[];
};

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

function coord(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

async function requireStaff() {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !STAFF.includes(role)) throw new Error("Không có quyền.");
}

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

  const dup = await prisma.place.findUnique({ where: { slug } });
  if (dup && dup.id !== selfId)
    return { error: `Slug "${slug}" đã tồn tại. Hãy đổi tên hoặc slug.` };

  const kind = input.kind === "province" ? PlaceKind.province : PlaceKind.destination;

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
    parentId = null;
  }

  const provinceCode =
    input.provinceCode.trim() === "" ? null : Number(input.provinceCode);
  const wardCode = input.wardCode.trim() === "" ? null : Number(input.wardCode);
  if (
    (provinceCode !== null && !Number.isFinite(provinceCode)) ||
    (wardCode !== null && !Number.isFinite(wardCode))
  )
    return { error: "Mã vị trí không hợp lệ." };

  const tags = input.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const quickInfo = (input.quickInfo ?? [])
    .map((f) => ({ label: f.label.trim(), value: f.value.trim() }))
    .filter((f) => f.label || f.value);

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
      wardCode,
      wardName: wardCode ? input.wardName.trim() || null : null,
      lat: coord(input.lat),
      lng: coord(input.lng),
      tags,
      quickInfo: quickInfo.length
        ? (quickInfo as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  };
}

function revalidatePublic(slug?: string | null) {
  revalidatePath("/diem-den");
  if (slug) revalidatePath(`/diem-den/${slug}`);
}

export async function createPlace(input: PlaceFormInput): Promise<ActionResult> {
  await requireStaff();
  const res = await normalize(input);
  if ("error" in res) return { ok: false, error: res.error };

  const place = await prisma.place.create({ data: res.data });
  revalidatePath("/cms/places");
  revalidatePublic(place.slug);
  return { ok: true, id: place.id };
}

export async function updatePlace(
  id: string,
  input: PlaceFormInput,
): Promise<ActionResult> {
  await requireStaff();

  const res = await normalize(input, id);
  if ("error" in res) return { ok: false, error: res.error };

  const updated = await prisma.place.update({
    where: { id },
    data: res.data,
    select: { slug: true },
  });
  revalidatePath("/cms/places");
  revalidatePath(`/cms/places/${id}`);
  revalidatePath(`/cms/places/${id}/edit`);
  revalidatePublic(updated.slug);
  return { ok: true, id };
}

export async function deletePlace(id: string): Promise<ActionResult> {
  await requireStaff();

  const childCount = await prisma.place.count({ where: { parentId: id } });
  if (childCount > 0)
    return {
      ok: false,
      error: `Không thể xóa: còn ${childCount} điểm đến con. Hãy xóa hoặc chuyển chúng trước.`,
    };

  const removed = await prisma.place.delete({
    where: { id },
    select: { slug: true },
  });
  revalidatePath("/cms/places");
  revalidatePublic(removed.slug);
  return { ok: true, id };
}

export async function togglePublish(
  id: string,
  publish: boolean,
): Promise<ActionResult> {
  await requireStaff();
  const place = await prisma.place.update({
    where: { id },
    data: {
      status: publish ? PublishStatus.published : PublishStatus.draft,
      publishedAt: publish ? new Date() : null,
    },
    select: { slug: true },
  });
  revalidatePath("/cms/places");
  revalidatePath(`/cms/places/${id}`);
  revalidatePublic(place.slug);
  return { ok: true, id };
}

export async function toggleFeatured(
  id: string,
  featured: boolean,
): Promise<ActionResult> {
  await requireStaff();
  const place = await prisma.place.update({
    where: { id },
    data: { isFeatured: featured },
    select: { slug: true },
  });
  revalidatePath("/cms/places");
  revalidatePath(`/cms/places/${id}`);
  revalidatePublic(place.slug);
  return { ok: true, id };
}

export async function toggleTreatAsDestination(
  id: string,
  value: boolean,
): Promise<ActionResult> {
  await requireStaff();
  const place = await prisma.place.update({
    where: { id },
    data: { treatAsDestination: value },
    select: { slug: true },
  });
  revalidatePath("/cms/places");
  revalidatePath(`/cms/places/${id}`);
  revalidatePublic(place.slug);
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

  const place = await prisma.place.update({
    where: { id },
    data: { order: value },
    select: { slug: true },
  });
  revalidatePath("/cms/places");
  revalidatePath(`/cms/places/${id}`);
  revalidatePublic(place.slug);
  return { ok: true, id };
}
