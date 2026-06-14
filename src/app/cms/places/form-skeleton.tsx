import { Skeleton } from "@/components/ui/skeleton";

// Khung chờ cho trang tạo/sửa Place (khớp bố cục section 2 cột của PlaceForm).
function SectionSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <div className="grid gap-x-8 gap-y-4 py-8 lg:grid-cols-3">
      <div className="space-y-2 lg:col-span-1">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="space-y-5 lg:col-span-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlaceFormSkeleton() {
  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-8 w-64" />

      <div className="mt-4 divide-y">
        <SectionSkeleton rows={1} />
        <SectionSkeleton rows={3} />
        <SectionSkeleton rows={1} />
        <SectionSkeleton rows={1} />
      </div>
    </div>
  );
}
