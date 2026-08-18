import Link from "next/link";
import { CalendarDays, MapPin, Route } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NewTemplateButton, TemplateRowActions } from "./row-actions";

export const metadata = { title: "Lịch trình mẫu · CMS" };

// Danh sách lịch trình mẫu. Cố ý KHÔNG có bộ lọc/phân trang như các mục khác:
// mẫu là nội dung biên tập, số lượng tính bằng chục chứ không phải hàng trăm.
export default async function CmsTripTemplatesPage() {
  const rows = await prisma.trip.findMany({
    where: { isTemplate: true },
    orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      isFeatured: true,
      updatedAt: true,
      place: { select: { name: true } },
      _count: { select: { days: true, items: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lịch trình mẫu</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lịch trình gợi ý cho khách nhân bản. Nội dung từng ngày soạn ở trình soạn
            công khai; ở đây quản lý phần xuất bản.
          </p>
        </div>
        <NewTemplateButton />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed px-6 py-16 text-center">
          <Route className="mx-auto size-8 text-muted-foreground/40" aria-hidden />
          <p className="mt-3 font-medium">Chưa có lịch trình mẫu nào</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tạo một cái để hiện ở trang /lich-trinh và trang điểm đến.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-2xl border">
          {rows.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/cms/lich-trinh/${t.id}`}
                    className="font-medium hover:text-primary"
                  >
                    {t.title}
                  </Link>
                  <Badge variant={t.status === "published" ? "default" : "secondary"}>
                    {t.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                  </Badge>
                  {t.isFeatured && <Badge variant="outline">Nổi bật</Badge>}
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" aria-hidden />
                    {t._count.days} ngày · {t._count.items} mục
                  </span>
                  {t.place && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" aria-hidden />
                      {t.place.name}
                    </span>
                  )}
                  {t.slug && <span className="font-mono">/lich-trinh/mau/{t.slug}</span>}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/lich-trinh/${t.id}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Soạn ngày
                </Link>
                <TemplateRowActions id={t.id} title={t.title} slug={t.slug} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
