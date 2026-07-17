"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, RefreshCw } from "@/components/icons";
import { Button } from "@/components/ui/button";

// Tải file Excel qua /api/cms/export. Fetch blob để hiển thị trạng thái đang
// tạo (workbook mất vài giây) rồi kích hoạt tải xuống.
export function ExportButton() {
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      const res = await fetch("/api/cms/export");
      if (!res.ok) throw new Error(String(res.status));

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? "du-lieu.xlsx";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Đã tải file Excel");
    } catch {
      toast.error("Xuất Excel thất bại. Thử lại sau.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" onClick={onClick} disabled={pending}>
      {pending ? (
        <RefreshCw className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      {pending ? "Đang tạo file…" : "Tải Excel"}
    </Button>
  );
}
