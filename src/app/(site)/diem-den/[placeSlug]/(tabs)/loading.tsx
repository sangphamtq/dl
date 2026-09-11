import { R_CARD, R_CTRL } from "@/lib/radius";
import { cn } from "@/lib/utils";

export default function TabContentLoading() {
  return (
    <div
      className="page-loading mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20"
      aria-busy
      aria-label="Đang tải nội dung"
    >
      <div className="h-3.5 w-20 rounded bg-muted" />
      <div className="mt-3 h-9 w-72 max-w-full rounded bg-muted" />
      <div className="mt-5 flex gap-5">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-4 w-24 rounded bg-muted" />
      </div>

      <div className="mt-7 flex gap-2">
        {[64, 52, 78, 58].map((w, i) => (
          <div
            key={i}
            className={cn(R_CTRL, "h-9 bg-muted")}
            style={{ width: w }}
          />
        ))}
      </div>

      <div className="mt-8 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <div className={cn(R_CARD, "aspect-[3/2] w-full bg-muted")} />
            <div className="mt-3.5 h-5 w-2/3 rounded bg-muted" />
            <div className="mt-2 h-4 w-full rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
