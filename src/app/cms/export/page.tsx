import {
  MapPin,
  Compass,
  Mountain,
  Sparkles,
  UtensilsCrossed,
  BedDouble,
  Bus,
  FileText,
} from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { ExportButton } from "./export-button";

export const metadata = { title: "Xuất Excel" };

// Xuất toàn bộ Điểm đến + Listing ra một file Excel nhiều sheet (mỗi loại 1 sheet).
export default async function ExportPage() {
  const [places, activities, spots, specialties, eateries, accommodations, transports] =
    await prisma.$transaction([
      prisma.place.count(),
      prisma.activity.count(),
      prisma.spot.count(),
      prisma.specialty.count(),
      prisma.eatery.count(),
      prisma.accommodation.count(),
      prisma.transport.count(),
    ]);

  const sheets = [
    { label: "Điểm đến", sub: "Tỉnh & điểm đến lớn", icon: MapPin, count: places },
    { label: "Hoạt động", sub: "Activity", icon: Compass, count: activities },
    { label: "Địa điểm", sub: "Spot", icon: Mountain, count: spots },
    { label: "Đặc sản", sub: "Specialty", icon: Sparkles, count: specialties },
    { label: "Quán ăn", sub: "Eatery", icon: UtensilsCrossed, count: eateries },
    { label: "Lưu trú", sub: "Accommodation", icon: BedDouble, count: accommodations },
    { label: "Di chuyển", sub: "Transport", icon: Bus, count: transports },
  ];
  const total = sheets.reduce((s, x) => s + x.count, 0);

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Xuất Excel</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tải toàn bộ điểm đến và listing ra một file Excel (.xlsx) — mỗi loại một
        sheet, có sẵn bộ lọc theo cột. Dùng để xem, lưu trữ hoặc chia sẻ.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {total.toLocaleString("vi-VN")} bản ghi · 7 sheet
            </p>
            <p className="text-xs text-muted-foreground">
              du-lieu-&lt;ngày&gt;-&lt;giờ&gt;.xlsx
            </p>
          </div>
        </div>
        <ExportButton />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sheets.map(({ label, sub, icon: Icon, count }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border px-4 py-3"
          >
            <Icon className="size-4 text-muted-foreground" aria-hidden />
            <div className="flex-1">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {count.toLocaleString("vi-VN")}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2.5 text-sm text-muted-foreground">
        File Excel chỉ để xem và lưu trữ — không đẩy ngược lại được vào cơ sở dữ
        liệu. Để sao lưu/khôi phục dữ liệu thật, dùng backup của database.
      </p>
    </div>
  );
}
