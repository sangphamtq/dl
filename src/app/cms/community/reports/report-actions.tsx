"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dismissReport,
  hideThreadFromReport,
  deleteThreadFromReport,
  deleteReplyFromReport,
} from "../actions";

export function ReportActions({
  id,
  kind,
}: {
  id: string;
  kind: "thread" | "reply";
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
      {kind === "thread" ? (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => run(() => hideThreadFromReport(id))}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <EyeOff className="size-4" />
            )}
            Ẩn bài
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (confirm("Xóa hẳn bài bị báo cáo?"))
                run(() => deleteThreadFromReport(id));
            }}
            disabled={pending}
          >
            <Trash2 className="size-4" />
            Xóa bài
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (confirm("Xóa trả lời bị báo cáo?"))
              run(() => deleteReplyFromReport(id));
          }}
          disabled={pending}
        >
          <Trash2 className="size-4" />
          Xóa trả lời
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={() => run(() => dismissReport(id))}
        disabled={pending}
      >
        <X className="size-4" />
        Bỏ qua
      </Button>
    </div>
  );
}
