"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  EateryCategory,
  PriceRange,
  Meal,
  PublishStatus,
} from "@/generated/prisma/enums";
import { slugify, RESERVED_SLUGS } from "@/lib/slug";

const STAFF = ["admin", "editor"];

export type EateryFormInput = {
  name: string;
  slug: string;
  description: string;
  category: string;
  placeId: string;
  address: string;
  lat: string;
  lng: string;
  openingHours: string;
  phone: string;
  website: string;
  bookingUrl: string;
  mapUrl: string;
  priceRange: string;
  meals: string[];
  notice: string;
  tags: string;
  provinceCode: string;
  provinceName: string;
  districtCode: string;
  districtName: string;
  wardCode: string;
  wardName: string;
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

// Mã hành chính đến từ selector — bỏ qua giá trị rác thay vì báo lỗi.
function code(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

async function normalize(
  input: EateryFormInput,
  selfId?: string,
): Promise<{ data: Prisma.EateryUncheckedCreateInput } | { error: string }> {
  const name = input.name.trim();
  if (!name) return { error: "Tên không được để trống." };

  const slug = (input.slug.trim() ? slugify(input.slug) : slugify(name)) || "";
  if (!slug) return { error: "Slug không hợp lệ." };
  if (RESERVED_SLUGS.has(slug))
    return { error: `Slug "${slug}" trùng tiền tố dành riêng.` };

  const dup = await prisma.eatery.findUnique({ where: { slug } });
  if (dup && dup.id !== selfId)
    return { error: `Slug "${slug}" đã tồn tại (trong Quán ăn).` };

  if (!input.placeId) return { error: "Phải chọn nơi (Place) chứa quán." };
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
    input.category && input.category in EateryCategory
      ? (input.category as EateryCategory)
      : null;
  const priceRange =
    input.priceRange && input.priceRange in PriceRange
      ? (input.priceRange as PriceRange)
      : null;
  const meals = input.meals.filter((m) => m in Meal) as Meal[];

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
      openingHours: input.openingHours.trim() || null,
      phone: input.phone.trim() || null,
      website: input.website.trim() || null,
      bookingUrl: input.bookingUrl.trim() || null,
      mapUrl: input.mapUrl.trim() || null,
      priceRange,
      meals,
      notice: input.notice.trim() || null,
      tags,
      provinceCode: code(input.provinceCode),
      provinceName: input.provinceName.trim() || null,
      districtCode: code(input.districtCode),
      districtName: input.districtName.trim() || null,
      wardCode: code(input.wardCode),
      wardName: input.wardName.trim() || null,
    },
  };
}

export async function createEatery(input: EateryFormInput): Promise<ActionResult> {
  await requireStaff();
  const res = await normalize(input);
  if ("error" in res) return { ok: false, error: res.error };
  const eatery = await prisma.eatery.create({ data: res.data });
  revalidatePath("/cms/eateries");
  return { ok: true, id: eatery.id };
}

export async function updateEatery(
  id: string,
  input: EateryFormInput,
): Promise<ActionResult> {
  await requireStaff();
  const res = await normalize(input, id);
  if ("error" in res) return { ok: false, error: res.error };
  await prisma.eatery.update({ where: { id }, data: res.data });
  revalidatePath("/cms/eateries");
  revalidatePath(`/cms/eateries/${id}`);
  revalidatePath(`/cms/eateries/${id}/edit`);
  return { ok: true, id };
}

export async function deleteEatery(id: string): Promise<ActionResult> {
  await requireStaff();
  await prisma.eatery.delete({ where: { id } });
  revalidatePath("/cms/eateries");
  return { ok: true, id };
}

export async function togglePublish(
  id: string,
  publish: boolean,
): Promise<ActionResult> {
  await requireStaff();
  await prisma.eatery.update({
    where: { id },
    data: {
      status: publish ? PublishStatus.published : PublishStatus.draft,
      publishedAt: publish ? new Date() : null,
    },
  });
  revalidatePath("/cms/eateries");
  revalidatePath(`/cms/eateries/${id}`);
  return { ok: true, id };
}

export async function toggleFeatured(
  id: string,
  featured: boolean,
): Promise<ActionResult> {
  await requireStaff();
  await prisma.eatery.update({ where: { id }, data: { isFeatured: featured } });
  revalidatePath("/cms/eateries");
  revalidatePath(`/cms/eateries/${id}`);
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
  await prisma.eatery.update({ where: { id }, data: { order: value } });
  revalidatePath("/cms/eateries");
  revalidatePath(`/cms/eateries/${id}`);
  return { ok: true, id };
}
