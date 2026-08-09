"use client";

import { usePathname } from "next/navigation";
import { isMapRoute } from "@/lib/site-chrome";

// Ẩn chân trang ở các trang bản đồ. Nhận `children` là SiteFooter — một Server
// Component truyền xuống làm con, nên nó vẫn render ở server, ở đây chỉ quyết
// định có gắn vào cây hay không.
export function FooterGate({ children }: { children: React.ReactNode }) {
  return isMapRoute(usePathname()) ? null : <>{children}</>;
}
