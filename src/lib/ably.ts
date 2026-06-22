import "server-only";
import * as Ably from "ably";

// Realtime qua Ably. Server giữ ABLY_API_KEY (bí mật) để PHÁT tín hiệu; browser
// đăng ký qua token (route /api/ably/token) nên không bao giờ thấy key.
// Chưa cấu hình key → các hàm này im lặng bỏ qua, hệ thống tự rơi về polling.

let rest: Ably.Rest | null = null;

export function getAblyRest(): Ably.Rest | null {
  const key = process.env.ABLY_API_KEY;
  if (!key) return null;
  rest ??= new Ably.Rest(key);
  return rest;
}

export const ablyEnabled = () => !!process.env.ABLY_API_KEY;

// Tên kênh cho từng bài viết.
export const postChannel = (slug: string) => `post:${slug}`;

// Phát tín hiệu "bình luận có thay đổi" để client đang mở bài tự làm mới.
export async function publishCommentsChanged(slug: string): Promise<void> {
  const client = getAblyRest();
  if (!client) return;
  try {
    await client.channels.get(postChannel(slug)).publish("comments:changed", {});
  } catch (e) {
    // Không chặn luồng chính nếu publish lỗi, nhưng log để dễ chẩn đoán
    // (vd lỗi 40160 = API key thiếu quyền Publish).
    console.error("[Ably] publish thất bại:", e);
  }
}
