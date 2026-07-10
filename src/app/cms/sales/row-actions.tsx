"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2, ShieldX, Undo2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { approveSale, rejectSale, revokeSale } from "./actions";

export function SaleRowActions({
  id,
  status,
}: {
  id: string;
  status: "pending" | "approved" | "rejected";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Có lỗi xảy ra.");
      else {
        setRejecting(false);
        setReason("");
        router.refresh();
      }
    });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status !== "approved" && (
          <Button
            size="sm"
            onClick={() => run(() => approveSale(id))}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <BadgeCheck className="size-4" />
            )}
            Duyệt
          </Button>
        )}
        {status !== "rejected" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRejecting((v) => !v)}
            disabled={pending}
          >
            <ShieldX className="size-4" />
            Từ chối
          </Button>
        )}
        {status === "approved" && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => run(() => revokeSale(id))}
            disabled={pending}
          >
            <Undo2 className="size-4" />
            Gỡ huy hiệu
          </Button>
        )}
      </div>

      {rejecting && (
        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/40 p-3">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Lý do từ chối (hiển thị cho người đăng ký)…"
            rows={2}
          />
          <Button
            size="sm"
            variant="destructive"
            onClick={() => run(() => rejectSale(id, reason))}
            disabled={pending || !reason.trim()}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Xác nhận từ chối
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
