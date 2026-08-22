import "server-only";
import { after } from "next/server";
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

/**
 * NGÂN SÁCH CHỜ ĐỊNH TUYẾN cho một lần dựng lịch.
 *
 * Vì sao phải có: mỗi lần kéo–thả đổi thứ tự là sinh ra những CẶP LIỀN KỀ MỚI.
 * Khoá cache của ORS là cặp toạ độ, nên cặp mới = cache trượt = một lời gọi
 * HTTPS thật sang api.openrouteservice.org ngay giữa lúc render lại trang. Đo
 * từ máy dev: chỉ riêng bắt tay TLS tới host đó đã ~0,6s, tổng một lượt ~0,8s.
 * Đó chính là quãng "mờ đi một lúc rồi mới được" sau mỗi lần thả — và nó KHÔNG
 * phải lỗi cơ sở dữ liệu (viết lại thứ tự cả một ngày 8 mục chỉ tốn ~24ms).
 *
 * Cách chữa KHÔNG phải là chờ nhanh hơn mà là ĐỪNG CHỜ: quá hạn thì dựng lịch
 * bằng ước lượng chim bay — vốn đã có sẵn ở dưới và được đánh dấu `approx` để
 * UI hiện dấu "~". Lời gọi bị bỏ dở được giao cho `after()` nuôi tiếp cho tới
 * khi nó ghi xong vào `unstable_cache`, nên lần dựng sau (thao tác kế tiếp,
 * hoặc lần tải lại trang) đã có số chính xác. Đổi lại: ngay sau khi kéo thả có
 * thể thấy vài dấu "~" rồi chúng biến mất — thà vậy còn hơn treo cả trang gần
 * một giây.
 *
 * ⚠ `after()` là phần BẮT BUỘC, không phải tối ưu thêm. Trên nền serverless,
 * hàm bị đóng băng ngay khi trả response: bỏ mặc promise thì lời gọi ORS chết
 * nửa chừng, cache không bao giờ được nạp, và mọi lần dựng sau lại hết hạn ở
 * đúng mốc 300ms — số chính xác sẽ KHÔNG BAO GIỜ xuất hiện. `after()` giữ nó
 * sống qua response nên vòng lặp đó không xảy ra.
 */
const ROUTE_BUDGET_MS = 300;

/** Chờ `p` tối đa `ROUTE_BUDGET_MS`; quá hạn trả null và BỎ MẶC promise chạy tiếp. */
async function withinBudget<T>(p: Promise<T | null>): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let overdue = false;
  const clock = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      overdue = true;
      resolve(null);
    }, ROUTE_BUDGET_MS);
  });
  try {
    return await Promise.race([p, clock]);
  } finally {
    clearTimeout(timer);
    // `after` chỉ gọi được trong phạm vi một request. `getLegs` còn được gọi từ
    // script kiểm tra chạy ngoài Next (xem ghi chú ở seed lịch trình), nên phải
    // bọc — ở đó không có gì để nuôi tiếp và cũng không sao.
    if (overdue) {
      try {
        after(() => p);
      } catch {
        /* ngoài phạm vi request — bỏ qua */
      }
    }
  }
}

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
      // `.catch` phải gắn NGAY trên promise gốc, trước khi đua với đồng hồ:
      // nếu nó lỗi sau khi đã quá hạn thì không còn ai `await` nữa, và một
      // rejection không người nhận là đủ để hạ tiến trình Node.
      const rides = await withinBudget(
        getDrivingDistances(origin, [dest]).catch(() => null),
      );
      const ride = rides ? Object.values(rides)[0] : undefined;
      if (ride) leg = { min: ride.min, km: ride.km, approx: false };

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
