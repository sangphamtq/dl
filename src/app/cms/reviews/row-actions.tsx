"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setReviewHidden, deleteReviewCms } from "./actions";

export function ReviewRowActions({
  id,
  isHidden,
}: {
  id: string;
  isHidden: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean }>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => run(() => setReviewHidden(id, !isHidden))}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : isHidden ? (
          <Eye className="size-4" />
        ) : (
          <EyeOff className="size-4" />
        )}
        {isHidden ? "Hiện lại" : "Ẩn"}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => run(() => deleteReviewCms(id))}
        disabled={pending}
      >
        <Trash2 className="size-4" />
        Xoá
      </Button>
    </div>
  );
}
