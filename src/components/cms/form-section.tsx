// Hàng form 2 cột: tiêu đề + mô tả bên trái, các trường nhập bên phải.
// Dùng cho trang tạo/sửa trong CMS (kiểu settings, nhiều khoảng trắng).
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-x-8 gap-y-4 py-8 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-5 lg:col-span-2">{children}</div>
    </div>
  );
}
