"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  detectChannel,
  isTrustChannel,
  normalizeValue,
  type TrustChannel,
} from "@/lib/trust";

export type VerifiedMatch = {
  type: "accommodation" | "sale";
  name: string;
  href: string;
};

export type CheckResult = {
  ok: true;
  channel: TrustChannel;
  valueNorm: string;
  verified: VerifiedMatch | null;
  reportCount: number;
};

export type CheckResponse = CheckResult | { ok: false; error: string };

// Phần chữ số có ý nghĩa (bỏ số 0 đầu) để lọc thô mọi biến thể định dạng.
function phoneNeedle(norm: string): string {
  return norm.replace(/^0/, "");
}

async function findVerified(
  channel: TrustChannel,
  valueNorm: string,
): Promise<VerifiedMatch | null> {
  if (channel === "bank_account") return null; // không giữ STK chính chủ

  if (channel === "phone") {
    const needle = phoneNeedle(valueNorm);
    if (!needle) return null;
    const [acc, sale] = await Promise.all([
      prisma.accommodation.findFirst({
        where: {
          isVerified: true,
          OR: [{ phone: { contains: needle } }, { zalo: { contains: needle } }],
        },
        select: { name: true, slug: true, phone: true, zalo: true },
      }),
      prisma.saleProfile.findFirst({
        where: {
          status: "approved",
          OR: [{ phone: { contains: needle } }, { zalo: { contains: needle } }],
        },
        select: { displayName: true, slug: true, phone: true, zalo: true },
      }),
    ]);
    // Xác nhận lại bằng chuẩn hoá đầy đủ (contains có thể khớp lỏng).
    const confirm = (a?: string | null, b?: string | null) =>
      [a, b].some((x) => x && normalizeValue("phone", x) === valueNorm);
    if (acc && confirm(acc.phone, acc.zalo))
      return { type: "accommodation", name: acc.name, href: `/luu-tru/${acc.slug}` };
    if (sale && confirm(sale.phone, sale.zalo))
      return { type: "sale", name: sale.displayName, href: `/sale/${sale.slug}` };
    return null;
  }

  if (channel === "facebook") {
    const [acc, sale] = await Promise.all([
      prisma.accommodation.findFirst({
        where: { isVerified: true, facebookUrl: { contains: valueNorm } },
        select: { name: true, slug: true, facebookUrl: true },
      }),
      prisma.saleProfile.findFirst({
        where: { status: "approved", facebookUrl: { contains: valueNorm } },
        select: { displayName: true, slug: true, facebookUrl: true },
      }),
    ]);
    const ok = (u?: string | null) => u && normalizeValue("facebook", u) === valueNorm;
    if (acc && ok(acc.facebookUrl))
      return { type: "accommodation", name: acc.name, href: `/luu-tru/${acc.slug}` };
    if (sale && ok(sale.facebookUrl))
      return { type: "sale", name: sale.displayName, href: `/sale/${sale.slug}` };
    return null;
  }

  // website — chỉ CTV có trường website
  const sale = await prisma.saleProfile.findFirst({
    where: { status: "approved", website: { contains: valueNorm } },
    select: { displayName: true, slug: true, website: true },
  });
  if (sale && sale.website && normalizeValue("website", sale.website) === valueNorm)
    return { type: "sale", name: sale.displayName, href: `/sale/${sale.slug}` };
  return null;
}

// Tra một SĐT / FB / website / STK: khớp danh bạ đã xác minh (dương) và đếm
// báo cáo lừa đảo đã duyệt (âm).
export async function checkTrust(
  rawValue: string,
  rawChannel?: string,
): Promise<CheckResponse> {
  const value = rawValue.trim();
  if (!value) return { ok: false, error: "Nhập thông tin cần kiểm tra." };

  const channel: TrustChannel =
    rawChannel && isTrustChannel(rawChannel)
      ? rawChannel
      : detectChannel(value);
  const valueNorm = normalizeValue(channel, value);
  if (!valueNorm)
    return { ok: false, error: "Thông tin không hợp lệ để kiểm tra." };

  const [verified, reportCount] = await Promise.all([
    findVerified(channel, valueNorm),
    prisma.scamReport.count({
      where: { channel, valueNorm, status: "confirmed" },
    }),
  ]);

  return { ok: true, channel, valueNorm, verified, reportCount };
}

export type ReportResult = { ok: true } | { ok: false; error: string };

// Gửi báo cáo lừa đảo (chờ kiểm duyệt). BẮT BUỘC có bằng chứng.
export async function submitScamReport(input: {
  channel: string;
  value: string;
  reason: string;
  description: string;
  evidenceUrls: string[];
  reporterContact: string;
}): Promise<ReportResult> {
  const session = await auth();

  const value = input.value.trim();
  if (!value) return { ok: false, error: "Nhập thông tin cần báo cáo." };

  const channel: TrustChannel = isTrustChannel(input.channel)
    ? input.channel
    : detectChannel(value);
  const valueNorm = normalizeValue(channel, value);
  if (!valueNorm) return { ok: false, error: "Thông tin không hợp lệ." };

  const evidenceUrls = input.evidenceUrls
    .filter((u) => /^https?:\/\//.test(u))
    .slice(0, 8);
  if (evidenceUrls.length === 0)
    return { ok: false, error: "Cần ít nhất 1 ảnh bằng chứng." };

  await prisma.scamReport.create({
    data: {
      channel,
      valueNorm,
      valueRaw: value,
      reason: input.reason.trim() || null,
      description: input.description.trim() || null,
      evidenceUrls,
      reporterId: session?.user?.id ?? null,
      reporterContact: input.reporterContact.trim() || null,
    },
  });
  return { ok: true };
}
