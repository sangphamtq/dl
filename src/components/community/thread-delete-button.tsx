"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteThread } from "@/app/cong-dong/actions";

export function ThreadDeleteButton({
  threadId,
  redirectTo,
  className,
}: {
  threadId: string;
  redirectTo?: string; // nếu có → điều hướng tới đây sau khi xóa; không thì refresh
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    if (!confirm("Xóa bài này? Hành động không thể hoàn tác.")) return;
    startTransition(async () => {
      const res = await deleteThread(threadId);
      if (res.ok) {
        if (redirectTo) router.push(redirectTo);
        router.refresh();
      } else {
        alert(res.error);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      aria-label="Xóa bài"
      className={
        className ??
        "inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:opacity-50"
      }
    >
      <Trash2 className="size-4" aria-hidden />
    </button>
  );
}
