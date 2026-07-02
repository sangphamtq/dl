// "Tỉnh của bạn" — nơi ở / điểm xuất phát do khách tự chọn. Lưu song song:
//   - Cookie (mọi khách, kể cả chưa đăng nhập) — nguồn hiển thị chính, đọc ở RSC.
//   - User.homeProvince (khi đã đăng nhập) — giữ lựa chọn qua nhiều thiết bị.
// Giá trị là TÊN tỉnh/thành (vd "Hà Nội") theo danh sách getProvinces() — dạng
// text ổn định, khớp trực tiếp Transport.fromName để cá nhân hoá sau này.
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const HOME_PROVINCE_COOKIE = "home-province";

// Đọc tỉnh đang chọn: ưu tiên cookie; nếu trống mà đã đăng nhập thì lấy từ DB
// (khách đăng nhập trên thiết bị mới, chưa có cookie).
export async function getHomeProvince(userId?: string): Promise<string | null> {
  const store = await cookies();
  const fromCookie = store.get(HOME_PROVINCE_COOKIE)?.value?.trim();
  if (fromCookie) return fromCookie;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { homeProvince: true },
    });
    return user?.homeProvince?.trim() || null;
  }
  return null;
}
