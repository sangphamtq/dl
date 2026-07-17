import "dotenv/config";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { buildExportWorkbook, exportFileName } from "@/lib/export-workbook";

// Xuất toàn bộ Điểm đến (Place) + các Listing ra MỘT file Excel nhiều sheet.
// Dùng: pnpm export:excel → exports/du-lieu-YYYYMMDD-HHmm.xlsx (thư mục đã gitignore).
// Cùng logic với chức năng CMS (/cms/export) qua @/lib/export-workbook.

async function main() {
  const { workbook, counts } = await buildExportWorkbook();

  const outDir = path.join(process.cwd(), "exports");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, exportFileName());
  await workbook.xlsx.writeFile(outPath);

  console.log(`✓ Đã xuất ${counts.total} bản ghi ra ${path.relative(process.cwd(), outPath)}`);
  console.log(
    `  Điểm đến: ${counts.places} · Hoạt động: ${counts.activities} · Địa điểm: ${counts.spots} · ` +
      `Đặc sản: ${counts.specialties} · Quán ăn: ${counts.eateries} · Lưu trú: ${counts.accommodations} · ` +
      `Di chuyển: ${counts.transports}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
