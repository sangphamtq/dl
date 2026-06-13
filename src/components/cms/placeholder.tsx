import { Construction } from "lucide-react";

// Trang CMS chưa xây dựng: tiêu đề + vùng nội dung trống.
export function CmsPlaceholder({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
        <Construction className="size-8 text-muted-foreground" aria-hidden />
        <p className="mt-3 text-sm text-muted-foreground">
          Đang xây dựng — chưa có nội dung.
        </p>
      </div>
    </div>
  );
}
