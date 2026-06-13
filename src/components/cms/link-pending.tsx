"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Đặt BÊN TRONG <Link>: hiện spinner ngay khi bấm, trong lúc chờ điều hướng.
// Trả về icon thay thế (vd icon mặc định) khi không pending.
export function LinkPending({
  fallback,
  className,
}: {
  fallback?: React.ReactNode;
  className?: string;
}) {
  const { pending } = useLinkStatus();
  if (pending)
    return (
      <Loader2
        className={cn("size-4 animate-spin", className)}
        aria-hidden
      />
    );
  return <>{fallback ?? null}</>;
}
