import { Skeleton } from "@/components/ui/skeleton";

// Khung chờ cho trang tạo/sửa Place (khớp bố cục PlaceForm).
function Field({ wide = false }: { wide?: boolean }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className={wide ? "h-24 w-full" : "h-9 w-full"} />
    </div>
  );
}

export function PlaceFormSkeleton() {
  return (
    <div className="p-6 sm:p-8">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-8 w-64" />
      <Skeleton className="mt-2 h-4 w-80" />

      <div className="mt-8 max-w-2xl space-y-6">
        <Field />
        <Field />
        <Field />
        <Field wide />
        <Field />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field />
          <Field />
        </div>
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-16" />
        </div>
      </div>
    </div>
  );
}
