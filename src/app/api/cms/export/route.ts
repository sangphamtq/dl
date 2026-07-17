import { auth } from "@/auth";
import { buildExportWorkbook, exportFileName } from "@/lib/export-workbook";

// GET /api/cms/export → tải file Excel toàn bộ Điểm đến + Listing.
// Chỉ staff (admin/editor). Chạy nodejs runtime (exceljs cần Node API).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STAFF = ["admin", "editor"];

export async function GET() {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !STAFF.includes(role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { workbook } = await buildExportWorkbook();
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${exportFileName()}"`,
      "Cache-Control": "no-store",
    },
  });
}
