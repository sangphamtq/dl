import "server-only";
import { getDrivingDistances, type LatLng } from "@/lib/routing";
import { distanceKm } from "@/lib/nearby";
import { legKey } from "@/lib/trip-time";

// Thời gian lái giữa các mục LIÊN TIẾP trong một ngày của lịch trình.
//
// Dùng lại getDrivingDistances() ở lib/routing (OpenRouteService, đã bọc
// unstable_cache 30 ngày theo toạ độ) — mỗi chặng một lời gọi, chạy song song.
// Sau lần đầu thì gần như luôn trúng cache, vì khoá là cặp toạ độ chứ không
// phải id lịch trình: hai người xếp cùng hai điểm sẽ dùng chung kết quả.
//
// KHÔNG dùng OSRM ở đây: máy chủ demo trong lib/map-actions tự ghi chú không
// dành cho production, mà lịch trình gọi nhiều hơn hẳn trang bản đồ.
// (Quyết định §9.1 trong docs/lich-trinh.md.)

export type LegPoint = { id: string; lat: number | null; lng: number | null };

export type Leg = {
  min: number;
  km: number;
  /** true = ước lượng từ đường chim bay vì ORS không trả lời (thiếu key/lỗi mạng) */
  approx: boolean;
};

// Đường bộ dài hơn đường chim bay, và tốc độ trung bình đường Việt Nam thấp.
// Chỉ dùng khi ORS im lặng — kết quả được đánh dấu approx để UI hiện dấu "~".
const ROAD_FACTOR = 1.3;
const AVG_KMH = 38;

export async function getLegs(points: LegPoint[]): Promise<Record<string, Leg>> {
  const out: Record<string, Leg> = {};
  if (points.length < 2) return out;

  const pairs: [LegPoint, LegPoint][] = [];
  for (let i = 0; i < points.length - 1; i++) pairs.push([points[i], points[i + 1]]);

  await Promise.all(
    pairs.map(async ([from, to]) => {
      if (from.lat == null || from.lng == null || to.lat == null || to.lng == null) return;

      const origin: LatLng = { lat: from.lat, lng: from.lng };
      const dest: LatLng = { lat: to.lat, lng: to.lng };

      let leg: Leg | null = null;
      try {
        const rides = await getDrivingDistances(origin, [dest]);
        const ride = Object.values(rides)[0];
        if (ride) leg = { min: ride.min, km: ride.km, approx: false };
      } catch {
        /* rơi xuống ước lượng bên dưới */
      }

      if (!leg) {
        const km = distanceKm(origin.lat, origin.lng, dest.lat, dest.lng) * ROAD_FACTOR;
        leg = { min: (km / AVG_KMH) * 60, km, approx: true };
      }

      out[legKey(from.id, to.id)] = leg;
    }),
  );

  return out;
}

/** Rút gọn về dạng máy tính giờ cần (chỉ số phút). */
export function legMinutes(legs: Record<string, Leg>): Record<string, number> {
  return Object.fromEntries(Object.entries(legs).map(([k, v]) => [k, v.min]));
}
