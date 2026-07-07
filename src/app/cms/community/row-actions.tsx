"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, LockOpen, Pin, PinOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  setThreadPinned,
  setThreadLocked,
  setThreadHidden,
  deleteThreadCms,
} from "./actions";

export function ThreadRowActions({
  id,
  isPinned,
  isLocked,
  isHidden,
}: {
  id: string;
  isPinned: boolean;
  isLocked: boolean;
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
        onClick={() => run(() => setThreadPinned(id, !isPinned))}
        disabled={pending}
      >
        {isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
        {isPinned ? "Bỏ ghim" : "Ghim"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => run(() => setThreadLocked(id, !isLocked))}
        disabled={pending}
      >
        {isLocked ? <LockOpen className="size-4" /> : <Lock className="size-4" />}
        {isLocked ? "Mở khóa" : "Khóa"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => run(() => setThreadHidden(id, !isHidden))}
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
        onClick={() => {
          if (confirm("Xóa hẳn bài này? Không thể hoàn tác.")) run(() => deleteThreadCms(id));
        }}
        disabled={pending}
      >
        <Trash2 className="size-4" />
        Xóa
      </Button>
    </div>
  );
}
