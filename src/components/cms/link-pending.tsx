"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "@/components/icons";
import { cn } from "@/lib/utils";

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
