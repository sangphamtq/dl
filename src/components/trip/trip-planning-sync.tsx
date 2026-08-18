"use client";

import { useEffect, useRef } from "react";
import { markTripPlanning } from "@/app/(site)/lich-trinh/actions";

// Mở trình soạn một chuyến ⇒ chuyến đó thành "chuyến đang lên lịch trình", để
// nút "Thêm vào lịch trình" ở các trang khác đi thẳng vào đúng chuyến đó.
// Không có bước này thì nó chỉ đổi lúc TẠO chuyến mới — đúng chỗ người dùng hụt.
//
// Vì sao mở trình soạn là đủ để coi như "đang lên lịch": /lich-trinh/[id] KHÔNG
// phải trang xem, nó là chỗ sửa. Vào đó tức là đang lên lịch cho chuyến đó.
//
// Phải làm ở client vì cookie chỉ ghi được trong server action / route handler,
// không ghi được lúc render Server Component.
export function TripPlanningSync({
  tripId,
  isPlanning,
}: {
  tripId: string;
  isPlanning: boolean;
}) {
  const done = useRef(false);

  useEffect(() => {
    // Đã là chuyến đang lên lịch thì khỏi gọi — tránh một vòng mạng thừa.
    if (isPlanning || done.current) return;
    done.current = true;
    void markTripPlanning(tripId);
  }, [tripId, isPlanning]);

  return null;
}
