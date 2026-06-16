"use client";

import { useEffect } from "react";

// Cảnh báo khi rời trang (đóng tab / refresh / điều hướng ngoài) lúc form còn
// thay đổi chưa lưu. Lưu ý: chỉ bắt được unload của trình duyệt, không bắt được
// điều hướng SPA nội bộ (hạn chế của App Router).
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}
