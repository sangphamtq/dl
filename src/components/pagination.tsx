import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Pagination as UIPagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";

// Danh sách trang rút gọn: 1 … p-1 p p+1 … N
function pageItems(page: number, total: number): (number | "ellipsis")[] {
  const set = new Set<number>([1, total, page - 1, page, page + 1]);
  const pages = [...set]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) out.push("ellipsis");
    out.push(p);
    prev = p;
  }
  return out;
}

// Phân trang dùng component shadcn; điều hướng SPA qua next/link.
export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const items = pageItems(page, totalPages);
  const navBtn = cn(buttonVariants({ variant: "ghost", size: "default" }), "gap-1 px-2.5");

  return (
    <UIPagination className="mt-6">
      <PaginationContent>
        <PaginationItem>
          {page > 1 ? (
            <PaginationLink asChild size="default" className="gap-1 px-2.5">
              <Link href={hrefFor(page - 1)} aria-label="Trang trước">
                <ChevronLeft className="size-4" />
                <span className="hidden sm:block">Trước</span>
              </Link>
            </PaginationLink>
          ) : (
            <span className={cn(navBtn, "pointer-events-none opacity-50")}>
              <ChevronLeft className="size-4" />
              <span className="hidden sm:block">Trước</span>
            </span>
          )}
        </PaginationItem>

        {items.map((it, i) =>
          it === "ellipsis" ? (
            <PaginationItem key={`e${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={it}>
              <PaginationLink asChild isActive={it === page}>
                <Link href={hrefFor(it)}>{it}</Link>
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          {page < totalPages ? (
            <PaginationLink asChild size="default" className="gap-1 px-2.5">
              <Link href={hrefFor(page + 1)} aria-label="Trang sau">
                <span className="hidden sm:block">Sau</span>
                <ChevronRight className="size-4" />
              </Link>
            </PaginationLink>
          ) : (
            <span className={cn(navBtn, "pointer-events-none opacity-50")}>
              <span className="hidden sm:block">Sau</span>
              <ChevronRight className="size-4" />
            </span>
          )}
        </PaginationItem>
      </PaginationContent>
    </UIPagination>
  );
}
