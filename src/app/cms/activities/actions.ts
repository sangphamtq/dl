"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  ActivityCategory,
  ActivityDifficulty,
  PriceRange,
  PublishStatus,
} from "@/generated/prisma/enums";
import { slugify, RESERVED_SLUGS } from "@/lib/slug";

const STAFF = ["admin", "editor"];

export type ActivityFormInput = {
  name: string;
  slug: string;
  description: string;
  category: string; // "" = none
  placeId: string;
  difficulty: string; // "" = none
  durationText: string;
  seasonText: string;
  operatorName: string;
  bookingUrl: string;
  phone: string;
  website: string;
  priceRange: string; // "" = none
  spotIds: string[];
  tags: string;
};

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

async function requireStaff() {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !STAFF.includes(role)) throw new Error("Không có quyền.");
}

async function normalize(
  input: ActivityFormInput,
  selfId?: string,
): Promise<{ data: Prisma.ActivityUncheckedCreateInput } | { error: string }> {
  const name = input.name.trim();
  if (!name) return { error: "Tên không được để trống." };

  const slug = (input.slug.trim() ? slugify(input.slug) : slugify(name)) || "";
  if (!slug) return { error: "Slug không hợp lệ." };
  if (RESERVED_SLUGS.has(slug))
    return { error: `Slug "${slug}" trùng tiền tố dành riêng.` };

  const dup = await prisma.activity.findUnique({ where: { slug } });
  if (dup && dup.id !== selfId)
    return { error: `Slug "${slug}" đã tồn tại (trong Hoạt động).` };

  if (!input.placeId) return { error: "Phải chọn nơi (Place) cho hoạt động." };
  const place = await prisma.place.findUnique({
    where: { id: input.placeId },
    select: { id: true },
  });
  if (!place) return { error: "Place không tồn tại." };

  const category =
    input.category && input.category in ActivityCategory
      ? (input.category as ActivityCategory)
      : null;
  const difficulty =
    input.difficulty && input.difficulty in ActivityDifficulty
      ? (input.difficulty as ActivityDifficulty)
      : null;
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
      category,
      placeId: input.placeId,
      difficulty,
      durationText: input.durationText.trim() || null,
      seasonText: input.seasonText.trim() || null,
      operatorName: input.operatorName.trim() || null,
      bookingUrl: input.bookingUrl.trim() || null,
      phone: input.phone.trim() || null,
      website: input.website.trim() || null,
      priceRange,
      tags,
    },
  };
}

export async function createActivity(
  input: ActivityFormInput,
): Promise<ActionResult> {
  await requireStaff();
  const res = await normalize(input);
  if ("error" in res) return { ok: false, error: res.error };

  const activity = await prisma.activity.create({
    data: {
      ...res.data,
      spots: { connect: input.spotIds.map((id) => ({ id })) },
    },
  });
  revalidatePath("/cms/activities");
  return { ok: true, id: activity.id };
}

export async function updateActivity(
  id: string,
  input: ActivityFormInput,
): Promise<ActionResult> {
  await requireStaff();
  const res = await normalize(input, id);
  if ("error" in res) return { ok: false, error: res.error };

  await prisma.activity.update({
    where: { id },
    data: {
      ...res.data,
      spots: { set: input.spotIds.map((sid) => ({ id: sid })) },
    },
  });
  revalidatePath("/cms/activities");
  revalidatePath(`/cms/activities/${id}`);
  revalidatePath(`/cms/activities/${id}/edit`);
  return { ok: true, id };
}

export async function deleteActivity(id: string): Promise<ActionResult> {
  await requireStaff();
  await prisma.activity.delete({ where: { id } });
  revalidatePath("/cms/activities");
  return { ok: true, id };
}

export async function togglePublish(
  id: string,
  publish: boolean,
): Promise<ActionResult> {
  await requireStaff();
  await prisma.activity.update({
    where: { id },
    data: {
      status: publish ? PublishStatus.published : PublishStatus.draft,
      publishedAt: publish ? new Date() : null,
    },
  });
  revalidatePath("/cms/activities");
  revalidatePath(`/cms/activities/${id}`);
  return { ok: true, id };
}

export async function toggleFeatured(
  id: string,
  featured: boolean,
): Promise<ActionResult> {
  await requireStaff();
  await prisma.activity.update({
    where: { id },
    data: { isFeatured: featured },
  });
  revalidatePath("/cms/activities");
  revalidatePath(`/cms/activities/${id}`);
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
  await prisma.activity.update({ where: { id }, data: { order: value } });
  revalidatePath("/cms/activities");
  revalidatePath(`/cms/activities/${id}`);
  return { ok: true, id };
}
