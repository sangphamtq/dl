"use client";

import { useEffect } from "react";
import { setPageLoading } from "./loading-state";

export function LoadingFlag() {
  useEffect(() => {
    setPageLoading(true);
    return () => setPageLoading(false);
  }, []);
  return null;
}
