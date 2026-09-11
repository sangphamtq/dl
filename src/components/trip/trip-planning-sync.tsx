"use client";

import { useEffect, useRef } from "react";
import { markTripPlanning } from "@/app/(site)/lich-trinh/actions";

export function TripPlanningSync({
  tripId,
  isPlanning,
}: {
  tripId: string;
  isPlanning: boolean;
}) {
  const done = useRef(false);

  useEffect(() => {
    if (isPlanning || done.current) return;
    done.current = true;
    void markTripPlanning(tripId);
  }, [tripId, isPlanning]);

  return null;
}
