"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  AccommodationCategory,
  PriceRange,
  PublishStatus,
} from "@/generated/prisma/enums";
import { slugify, RESERVED_SLUGS } from "@/lib/slug";

const STAFF = ["admin", "editor"];

export type AccommodationFormInput = {
  name: string;
  slug: string;
  description: string;
  category: string;
  placeId: string;
  address: string;
  lat: string;
  lng: string;
  phone: string;
  website: string;
  bookingUrl: string;
  priceRange: string;
  tags: string;
};

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

async function requireStaff() {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !STAFF.includes(role)) throw new Error("Không có quyền.");
}

function num(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

async function normalize(
  input: AccommodationFormInput,
  selfId?: string,
): Promise<
  { data: Prisma.AccommodationUncheckedCreateInput } | { error: string }
> {
  const name = input.name.trim();
  if (!name) return { error: "Tên không được để trống." };

  const slug = (input.slug.trim() ? slugify(input.slug) : slugify(name)) || "";
  if (!slug) return { error: "Slug không hợp lệ." };
  if (RESERVED_SLUGS.has(slug))
    return { error: `Slug "${slug}" trùng tiền tố dành riêng.` };

  const dup = await prisma.accommodation.findUnique({ where: { slug } });
  if (dup && dup.id !== selfId)
    return { error: `Slug "${slug}" đã tồn tại (trong Lưu trú).` };

  if (!input.placeId) return { error: "Phải chọn nơi (Place) chứa cơ sở." };
  const place = await prisma.place.findUnique({
    where: { id: input.placeId },
    select: { id: true },
  });
  if (!place) return { error: "Place không tồn tại." };

  const lat = num(input.lat);
  const lng = num(input.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng))
    return { error: "Toạ độ (lat/lng) phải là số." };

  const category =
    input.category && input.category in AccommodationCategory
      ? (input.category as AccommodationCategory)
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
      address: input.address.trim() || null,
      lat,
      lng,
      phone: input.phone.trim() || null,
      website: input.website.trim() || null,
      bookingUrl: input.bookingUrl.trim() || null,
      priceRange,
      tags,
    },
  };
}

export async function createAccommodation(
  input: AccommodationFormInput,
): Promise<ActionResult> {
  await requireStaff();
  const res = await normalize(input);
  if ("error" in res) return { ok: false, error: res.error };
  const row = await prisma.accommodation.create({ data: res.data });
  revalidatePath("/cms/accommodations");
  return { ok: true, id: row.id };
}

export async function updateAccommodation(
  id: string,
  input: AccommodationFormInput,
): Promise<ActionResult> {
  await requireStaff();
  const res = await normalize(input, id);
  if ("error" in res) return { ok: false, error: res.error };
  await prisma.accommodation.update({ where: { id }, data: res.data });
  revalidatePath("/cms/accommodations");
  revalidatePath(`/cms/accommodations/${id}`);
  revalidatePath(`/cms/accommodations/${id}/edit`);
  return { ok: true, id };
}

export async function deleteAccommodation(id: string): Promise<ActionResult> {
  await requireStaff();
  await prisma.accommodation.delete({ where: { id } });
  revalidatePath("/cms/accommodations");
  return { ok: true, id };
}

export async function togglePublish(
  id: string,
  publish: boolean,
): Promise<ActionResult> {
  await requireStaff();
  await prisma.accommodation.update({
    where: { id },
    data: {
      status: publish ? PublishStatus.published : PublishStatus.draft,
      publishedAt: publish ? new Date() : null,
    },
  });
  revalidatePath("/cms/accommodations");
  revalidatePath(`/cms/accommodations/${id}`);
  return { ok: true, id };
}

export async function toggleFeatured(
  id: string,
  featured: boolean,
): Promise<ActionResult> {
  await requireStaff();
  await prisma.accommodation.update({
    where: { id },
    data: { isFeatured: featured },
  });
  revalidatePath("/cms/accommodations");
  revalidatePath(`/cms/accommodations/${id}`);
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
  await prisma.accommodation.update({ where: { id }, data: { order: value } });
  revalidatePath("/cms/accommodations");
  revalidatePath(`/cms/accommodations/${id}`);
  return { ok: true, id };
}
