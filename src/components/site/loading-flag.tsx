"use client";

import { useEffect } from "react";
import { setPageLoading } from "./loading-state";

// Không render gì — chỉ bật cờ "đang chờ tải trang" suốt thời gian màn chờ còn
// gắn trên cây, rồi tắt khi nội dung thật thay chỗ nó. Lý do tồn tại nằm ở
// `loading-state.ts`.
export function LoadingFlag() {
  useEffect(() => {
    setPageLoading(true);
    return () => setPageLoading(false);
  }, []);
  return null;
}
