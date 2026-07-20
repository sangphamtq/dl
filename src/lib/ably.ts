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

// Tên kênh.
export const postChannel = (slug: string) => `post:${slug}`;
export const threadChannel = (slug: string) => `thread:${slug}`;
export const communityChannel = () => `cong-dong`;
export const placeFeedChannel = (slug: string) => `place-feed:${slug}`;
export const spotFeedChannel = (slug: string) => `spot-feed:${slug}`;
export const userChannel = (userId: string) => `user:${userId}`;

// Phát một sự kiện lên kênh (không chặn luồng chính nếu lỗi).
export async function publishEvent(
  channel: string,
  event: string,
  data: object = {},
): Promise<void> {
  const client = getAblyRest();
  if (!client) return;
  try {
    await client.channels.get(channel).publish(event, data);
  } catch (e) {
    // vd lỗi 40160 = API key thiếu quyền Publish.
    console.error("[Ably] publish thất bại:", e);
  }
}

// Phát tín hiệu "bình luận có thay đổi" để client đang mở bài blog tự làm mới.
export async function publishCommentsChanged(slug: string): Promise<void> {
  await publishEvent(postChannel(slug), "comments:changed");
}
