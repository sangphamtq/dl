"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Trash2, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  confirmScamReport,
  rejectScamReport,
  deleteScamReport,
} from "./actions";

export function ScamRowActions({
  id,
  status,
}: {
  id: string;
  status: "pending" | "confirmed" | "rejected";
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
      {status !== "confirmed" && (
        <Button
          size="sm"
          onClick={() => run(() => confirmScamReport(id))}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Xác nhận
        </Button>
      )}
      {status !== "rejected" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => run(() => rejectScamReport(id))}
          disabled={pending}
        >
          <X className="size-4" />
          Bác bỏ
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => run(() => deleteScamReport(id))}
        disabled={pending}
      >
        <Trash2 className="size-4" />
        Xoá
      </Button>
    </div>
  );
}
