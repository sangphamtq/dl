"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  TransportDirection,
  TransportMode,
  PublishStatus,
} from "@/generated/prisma/enums";
import { normalizeUrl } from "@/lib/url";

const STAFF = ["admin", "editor"];

export type TransportFormInput = {
  name: string;
  description: string;
  direction: string;
  mode: string;
  placeId: string;
  fromName: string;
  duration: string;
  distanceKm: string;
  priceFrom: string;
  priceTo: string;
  currency: string;
  operatorName: string;
  bookingUrl: string;
  status: string; // draft | published
  order: string;
};

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

async function requireStaff() {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !STAFF.includes(role)) throw new Error("Không có quyền.");
}

function intOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : NaN;
}
function floatOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

async function normalize(
  input: TransportFormInput,
): Promise<{ data: Prisma.TransportUncheckedCreateInput } | { error: string }> {
  const name = input.name.trim();
  if (!name) return { error: "Tên không được để trống." };

  if (!input.placeId) return { error: "Phải chọn nơi (Place)." };
  const place = await prisma.place.findUnique({
    where: { id: input.placeId },
    select: { id: true },
  });
  if (!place) return { error: "Place không tồn tại." };

  if (!(input.direction in TransportDirection))
    return { error: "Hướng di chuyển không hợp lệ." };
  if (!(input.mode in TransportMode))
    return { error: "Phương tiện không hợp lệ." };

  const distanceKm = floatOrNull(input.distanceKm);
  const priceFrom = intOrNull(input.priceFrom);
  const priceTo = intOrNull(input.priceTo);
  const order = intOrNull(input.order);
  if (
    Number.isNaN(distanceKm) ||
    Number.isNaN(priceFrom) ||
    Number.isNaN(priceTo) ||
    Number.isNaN(order)
  )
    return { error: "Khoảng cách / giá / thứ tự phải là số." };

  const status =
    input.status === "published" ? PublishStatus.published : PublishStatus.draft;
  const direction = input.direction as TransportDirection;

  return {
    data: {
      name,
      description: input.description.trim() || null,
      direction,
      mode: input.mode as TransportMode,
      placeId: input.placeId,
      // fromName chỉ dùng cho getTo
      fromName:
        direction === TransportDirection.getTo
          ? input.fromName.trim() || null
          : null,
      duration: input.duration.trim() || null,
      distanceKm,
      priceFrom,
      priceTo,
      currency: input.currency.trim() || "VND",
      operatorName: input.operatorName.trim() || null,
      bookingUrl: normalizeUrl(input.bookingUrl),
      status,
      publishedAt: status === PublishStatus.published ? new Date() : null,
      order,
    },
  };
}

export async function createTransport(
  input: TransportFormInput,
): Promise<ActionResult> {
  await requireStaff();
  const res = await normalize(input);
  if ("error" in res) return { ok: false, error: res.error };
  const row = await prisma.transport.create({ data: res.data });
  revalidatePath("/cms/transport");
  return { ok: true, id: row.id };
}

export async function updateTransport(
  id: string,
  input: TransportFormInput,
): Promise<ActionResult> {
  await requireStaff();
  const res = await normalize(input);
  if ("error" in res) return { ok: false, error: res.error };

  // Giữ publishedAt cũ nếu đang published (đừng đổi mốc khi chỉ sửa).
  const existing = await prisma.transport.findUnique({
    where: { id },
    select: { publishedAt: true },
  });
  const data = { ...res.data };
  if (data.status === PublishStatus.published && existing?.publishedAt)
    data.publishedAt = existing.publishedAt;

  await prisma.transport.update({ where: { id }, data });
  revalidatePath("/cms/transport");
  revalidatePath(`/cms/transport/${id}/edit`);
  return { ok: true, id };
}

export async function deleteTransport(id: string): Promise<ActionResult> {
  await requireStaff();
  await prisma.transport.delete({ where: { id } });
  revalidatePath("/cms/transport");
  return { ok: true, id };
}

export async function togglePublish(
  id: string,
  publish: boolean,
): Promise<ActionResult> {
  await requireStaff();
  await prisma.transport.update({
    where: { id },
    data: {
      status: publish ? PublishStatus.published : PublishStatus.draft,
      publishedAt: publish ? new Date() : null,
    },
  });
  revalidatePath("/cms/transport");
  return { ok: true, id };
}
