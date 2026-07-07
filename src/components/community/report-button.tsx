"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { reportContent } from "@/app/cong-dong/actions";

const REASONS = [
  { value: "spam", label: "Spam / quảng cáo" },
  { value: "scam", label: "Lừa đảo / lừa cọc" },
  { value: "offensive", label: "Xúc phạm / thù ghét" },
  { value: "offtopic", label: "Lạc chủ đề" },
  { value: "wrong_info", label: "Thông tin sai lệch" },
  { value: "other", label: "Khác" },
] as const;

// Dialog báo cáo — điều khiển từ ngoài (nút hoặc mục menu). Đúng 1 trong
// threadId/replyId.
export function ReportDialog({
  open,
  onOpenChange,
  threadId,
  replyId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  threadId?: string;
  replyId?: string;
}) {
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  // Đóng dialog + reset form (không dùng effect để tránh setState-in-effect).
  const setOpen = (v: boolean) => {
    if (!v) {
      setReason("");
      setNote("");
      setError(null);
      setDone(false);
    }
    onOpenChange(v);
  };

  const submit = () => {
    if (!reason) {
      setError("Vui lòng chọn lý do.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await reportContent({ threadId, replyId, reason, note });
      if (res.ok) {
        setDone(true);
        setTimeout(() => setOpen(false), 1200);
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Báo cáo nội dung</DialogTitle>
          <DialogDescription>
            Cho chúng tôi biết vấn đề. Báo cáo được gửi ẩn danh tới đội kiểm duyệt.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <p className="py-4 text-center text-sm font-medium text-emerald-600 dark:text-emerald-500">
            Đã gửi báo cáo. Cảm ơn bạn!
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                    reason === r.value
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:bg-muted",
                  )}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-primary"
                  />
                  {r.label}
                </label>
              ))}
            </div>

            {reason === "other" && (
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Mô tả ngắn vấn đề…"
                rows={3}
                className="mt-1"
              />
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Gửi báo cáo
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Nút "Báo cáo" độc lập (dùng cho bình luận) — tự quản trạng thái mở.
export function ReportButton({
  threadId,
  replyId,
}: {
  threadId?: string;
  replyId?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        Báo cáo
      </button>
      <ReportDialog
        open={open}
        onOpenChange={setOpen}
        threadId={threadId}
        replyId={replyId}
      />
    </>
  );
}
