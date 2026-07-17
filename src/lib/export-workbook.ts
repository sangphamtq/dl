import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

// Dựng workbook Excel (nhiều sheet) từ toàn bộ Điểm đến (Place) + các Listing.
// Dùng chung cho CLI (scripts/export-excel.ts) và route CMS (/api/cms/export).

const KIND_VI: Record<string, string> = { province: "Tỉnh/Thành", destination: "Điểm đến" };
const STATUS_VI: Record<string, string> = { draft: "Nháp", published: "Xuất bản" };
const DIRECTION_VI: Record<string, string> = { getTo: "Đến nơi", getAround: "Tại chỗ" };

const yn = (b: boolean) => (b ? "Có" : "");
const arr = (a: string[] | null | undefined) => (a && a.length ? a.join(", ") : "");
const dt = (d: Date | null | undefined) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";

function addSheet(
  wb: ExcelJS.Workbook,
  name: string,
  columns: string[],
  rows: (string | number)[][],
) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = columns.map((header) => ({
    header,
    width: Math.min(Math.max(header.length + 2, 14), 50),
  }));
  const head = ws.getRow(1);
  head.font = { bold: true };
  head.alignment = { vertical: "middle" };
  head.height = 20;
  for (const r of rows) ws.addRow(r);
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
}

export type ExportCounts = {
  places: number;
  activities: number;
  spots: number;
  specialties: number;
  eateries: number;
  accommodations: number;
  transports: number;
  total: number;
};

export async function buildExportWorkbook(): Promise<{
  workbook: ExcelJS.Workbook;
  counts: ExportCounts;
}> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Halivivu";

  // ---- Điểm đến (Place) ----
  const places = await prisma.place.findMany({
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    include: { parent: { select: { name: true } }, _count: { select: { images: true } } },
  });
  const placeById = new Map(places.map((p) => [p.id, p.name]));

  addSheet(
    wb,
    "Điểm đến",
    ["Loại", "Tên", "Slug", "Tỉnh cha", "Tagline", "Mô tả", "Tỉnh (hành chính)", "Trạng thái", "Nổi bật", "Thứ tự", "Lượt xem", "Số ảnh", "Tags", "Ngày tạo"],
    places.map((p) => [
      KIND_VI[p.kind] ?? p.kind,
      p.name,
      p.slug,
      p.parent?.name ?? "",
      p.tagline ?? "",
      p.description ?? "",
      p.provinceName ?? "",
      STATUS_VI[p.status] ?? p.status,
      yn(p.isFeatured),
      p.order ?? "",
      p.viewCount,
      p._count.images,
      arr(p.tags),
      dt(p.createdAt),
    ]),
  );

  // ---- Hoạt động (Activity) ----
  const activities = await prisma.activity.findMany({
    orderBy: { name: "asc" },
    include: { place: { select: { name: true } }, _count: { select: { spotLinks: true, images: true } } },
  });
  addSheet(
    wb,
    "Hoạt động",
    ["Tên", "Slug", "Điểm đến", "Loại (kind)", "Category", "Mô tả", "Đơn vị", "SĐT", "Website", "Thời lượng", "Mùa", "Số spot", "Số ảnh", "Trạng thái", "Nổi bật", "Tags"],
    activities.map((a) => [
      a.name, a.slug, a.place.name, a.kind, a.category ?? "", a.description ?? "",
      a.operatorName ?? "", a.phone ?? "", a.website ?? "", a.durationText ?? "", a.seasonText ?? "",
      a._count.spotLinks, a._count.images, STATUS_VI[a.status] ?? a.status, yn(a.isFeatured), arr(a.tags),
    ]),
  );

  // ---- Địa điểm (Spot) ----
  const spots = await prisma.spot.findMany({
    orderBy: { name: "asc" },
    include: { place: { select: { name: true } }, _count: { select: { activityLinks: true, images: true } } },
  });
  addSheet(
    wb,
    "Địa điểm",
    ["Tên", "Slug", "Điểm đến", "Category", "Mô tả", "Địa chỉ", "Lat", "Lng", "Giờ mở", "SĐT", "Website", "Giá", "Số hoạt động", "Số ảnh", "Trạng thái", "Nổi bật", "Tags"],
    spots.map((s) => [
      s.name, s.slug, s.place.name, s.category ?? "", s.description ?? "", s.address ?? "",
      s.lat ?? "", s.lng ?? "", s.openingHours ?? "", s.phone ?? "", s.website ?? "", s.priceRange ?? "",
      s._count.activityLinks, s._count.images, STATUS_VI[s.status] ?? s.status, yn(s.isFeatured), arr(s.tags),
    ]),
  );

  // ---- Đặc sản (Specialty) ----
  const specialties = await prisma.specialty.findMany({
    orderBy: { name: "asc" },
    include: { place: { select: { name: true } }, _count: { select: { eateries: true, images: true } } },
  });
  addSheet(
    wb,
    "Đặc sản",
    ["Tên", "Slug", "Điểm đến", "Mô tả", "Số quán liên kết", "Số ảnh", "Trạng thái", "Nổi bật", "Tags"],
    specialties.map((s) => [
      s.name, s.slug, s.place.name, s.description ?? "", s._count.eateries, s._count.images,
      STATUS_VI[s.status] ?? s.status, yn(s.isFeatured), arr(s.tags),
    ]),
  );

  // ---- Quán ăn (Eatery) ----
  const eateries = await prisma.eatery.findMany({
    orderBy: { name: "asc" },
    include: { place: { select: { name: true } }, _count: { select: { specialties: true, images: true } } },
  });
  addSheet(
    wb,
    "Quán ăn",
    ["Tên", "Slug", "Điểm đến", "Category", "Mô tả", "Địa chỉ", "Giờ mở", "SĐT", "Bữa", "Ghi chú", "Số đặc sản", "Số ảnh", "Trạng thái", "Nổi bật", "Tags"],
    eateries.map((e) => [
      e.name, e.slug, e.place.name, e.category ?? "", e.description ?? "", e.address ?? "", e.openingHours ?? "",
      e.phone ?? "", arr(e.meals as unknown as string[]), e.notice ?? "", e._count.specialties, e._count.images,
      STATUS_VI[e.status] ?? e.status, yn(e.isFeatured), arr(e.tags),
    ]),
  );

  // ---- Lưu trú (Accommodation) ----
  const accommodations = await prisma.accommodation.findMany({
    orderBy: { name: "asc" },
    include: { place: { select: { name: true } }, _count: { select: { images: true } } },
  });
  addSheet(
    wb,
    "Lưu trú",
    ["Tên", "Slug", "Điểm đến", "Loại hình", "Mô tả", "Địa chỉ", "SĐT", "Zalo", "Facebook", "Đã xác minh", "Ngày XM", "Chính sách cọc", "Ghi chú", "Số ảnh", "Trạng thái", "Nổi bật", "Tags"],
    accommodations.map((a) => [
      a.name, a.slug, a.place.name, a.category ?? "", a.description ?? "", a.address ?? "", a.phone ?? "",
      a.zalo ?? "", a.facebookUrl ?? "", yn(a.isVerified), dt(a.verifiedAt), a.depositPolicy ?? "", a.notice ?? "",
      a._count.images, STATUS_VI[a.status] ?? a.status, yn(a.isFeatured), arr(a.tags),
    ]),
  );

  // ---- Di chuyển (Transport) ----
  const transports = await prisma.transport.findMany({ orderBy: { name: "asc" } });
  addSheet(
    wb,
    "Di chuyển",
    ["Tên", "Điểm đến", "Hướng", "Phương tiện", "Mô tả", "Từ", "Thời gian", "Km", "Giá từ", "Giá đến", "Đơn vị", "SĐT", "Khuyên dùng", "Trạng thái"],
    transports.map((t) => [
      t.name, placeById.get(t.placeId) ?? "", DIRECTION_VI[t.direction] ?? t.direction, t.mode, t.description ?? "",
      t.fromName ?? "", t.duration ?? "", t.distanceKm ?? "", t.priceFrom ?? "", t.priceTo ?? "",
      t.operatorName ?? "", t.phone ?? "", yn(t.isRecommended), STATUS_VI[t.status] ?? t.status,
    ]),
  );

  const counts: ExportCounts = {
    places: places.length,
    activities: activities.length,
    spots: spots.length,
    specialties: specialties.length,
    eateries: eateries.length,
    accommodations: accommodations.length,
    transports: transports.length,
    total:
      places.length + activities.length + spots.length + specialties.length +
      eateries.length + accommodations.length + transports.length,
  };

  return { workbook: wb, counts };
}

// Tên file có timestamp: du-lieu-YYYYMMDD-HHmm.xlsx
export function exportFileName(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}` +
    `-${p(now.getHours())}${p(now.getMinutes())}`;
  return `du-lieu-${stamp}.xlsx`;
}
