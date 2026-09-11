"use client";

import { usePathname } from "next/navigation";
import { isMapRoute } from "@/lib/site-chrome";

export function FooterGate({ children }: { children: React.ReactNode }) {
  return isMapRoute(usePathname()) ? null : <>{children}</>;
}
