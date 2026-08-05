import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUnreadCount } from "@/lib/notifications";
import { getProvinces } from "@/lib/locations";
import { getHomeProvince } from "@/lib/home-province";

// Dữ liệu cho bảng menu ở mobile (BottomNav → MobileMenuSheet).
//
// Vì sao phải là API chứ không truyền props như header cũ: BottomNav render ở
// ROOT LAYOUT, mà layout gốc KHÔNG được gọi `auth()` — nó sẽ phá `force-static`
// của `/offline` (xem CLAUDE.md). Nên phần cần biết người dùng phải lấy ở
// client, và chỉ lấy KHI MỞ BẢNG: người không mở menu thì không tốn request nào.
//
// Gộp cả bốn thứ vào một lượt gọi (người dùng · số thông báo chưa đọc · danh
// sách tỉnh · tỉnh đang chọn) thay vì bốn endpoint — bảng cần đủ chúng cùng lúc
// mới vẽ được.
export const dynamic = "force-dynamic";

export async function GET() {
  const [session, provinces] = await Promise.all([auth(), getProvinces()]);
  const user = session?.user;
  const [unread, homeProvince] = await Promise.all([
    user?.id ? getUnreadCount(user.id) : Promise.resolve(0),
    getHomeProvince(user?.id),
  ]);

  return NextResponse.json(
    {
      user: user
        ? {
            name: user.name ?? null,
            email: user.email ?? null,
            image: user.image ?? null,
            role: user.role ?? null,
          }
        : null,
      unread,
      provinces: provinces.map((p) => p.name),
      homeProvince,
    },
    // Dữ liệu riêng của từng người → tuyệt đối không cho cache ở bất kỳ tầng nào.
    { headers: { "Cache-Control": "no-store" } },
  );
}
