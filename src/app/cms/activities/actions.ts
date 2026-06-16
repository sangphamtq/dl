"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { ActivityCategory, PublishStatus } from "@/generated/prisma/enums";
import { slugify, RESERVED_SLUGS } from "@/lib/slug";
import { normalizeUrl } from "@/lib/url";
import type { TicketTier } from "@/lib/tickets";

const STAFF = ["admin", "editor"];

// Một dòng giá vé ở form (giá nhập text); chuẩn hóa thành number ở normalize.
export type TicketTierInput = { label: string; price: string; note: string };

export type ActivityFormInput = {
  name: string;
  slug: string;
  description: string;
  category: string; // "" = none
  placeId: string;
  durationText: string;
  seasonText: string;
  operatorName: string;
  bookingUrl: string;
  phone: string;
  website: string;
  ticketFree: boolean;
  ticketTiers: TicketTierInput[];
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

  const tags = input.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // Giá vé: bỏ dòng trống, validate giá; miễn phí thì không lưu tiers.
  const tiers: TicketTier[] = [];
  if (!input.ticketFree) {
    for (const t of input.ticketTiers) {
      const label = t.label.trim();
      if (!label) continue;
      const priceStr = t.price.trim();
      let price: number | null = null;
      if (priceStr !== "") {
        const n = Number(priceStr);
        if (!Number.isFinite(n)) return { error: `Giá vé "${label}" phải là số.` };
        if (n < 0) return { error: `Giá vé "${label}" không được âm.` };
        price = Math.round(n);
      }
      tiers.push({ label, price, note: t.note.trim() || null });
    }
  }

  return {
    data: {
      name,
      slug,
      description: input.description.trim() || null,
      category,
      placeId: input.placeId,
      durationText: input.durationText.trim() || null,
      seasonText: input.seasonText.trim() || null,
      operatorName: input.operatorName.trim() || null,
      bookingUrl: normalizeUrl(input.bookingUrl),
      phone: input.phone.trim() || null,
      website: normalizeUrl(input.website),
      ticketFree: input.ticketFree,
      ticketTiers:
        tiers.length > 0 ? (tiers as Prisma.InputJsonValue) : Prisma.DbNull,
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
