"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteThread } from "@/app/cong-dong/actions";
import { ReportDialog } from "./report-button";

// Nút ••• ở góc bài — gộp Báo cáo (người khác) + Xóa (chính chủ/staff).
export function PostMenu({
  threadId,
  canReport,
  canDelete,
  redirectTo,
}: {
  threadId: string;
  canReport: boolean;
  canDelete: boolean;
  redirectTo?: string; // sau khi xóa: điều hướng tới đây (vd trang permalink)
}) {
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);
  const [pending, start] = useTransition();

  const onDelete = () => {
    if (!confirm("Xóa bài này? Hành động không thể hoàn tác.")) return;
    start(async () => {
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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Tùy chọn"
            disabled={pending}
            className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 data-[state=open]:bg-muted"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <MoreHorizontal className="size-5" aria-hidden />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {canReport && (
            <DropdownMenuItem
              onSelect={() => setTimeout(() => setReportOpen(true), 0)}
            >
              <Flag className="size-4" />
              Báo cáo
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 className="size-4" />
              Xóa bài
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canReport && (
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          threadId={threadId}
        />
      )}
    </>
  );
}
