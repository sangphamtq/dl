import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { getSettings } from "@/lib/settings";
import { getUnreadCount } from "@/lib/notifications";
import { getProvinces } from "@/lib/locations";
import { getHomeProvince } from "@/lib/home-province";
import { ablyEnabled } from "@/lib/ably";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";
import { NotificationBell } from "./notification-bell";
import { DaDenNavLink } from "./da-den-nav-link";
import { LichTrinhNavLink } from "./lich-trinh-nav-link";
import { HeaderSearch } from "./header-search";
import { SiteNav, type NavEntry, type NavLink } from "./site-nav";
import { HeaderChrome } from "./header-chrome";
import type { HeroLayout } from "@/generated/prisma/enums";
import { TooltipProvider } from "@/components/ui/tooltip";

// Nav: TOÀN LINK PHẲNG, không còn dropdown.
//
// Trước đây bốn mục Điểm đến / Địa điểm / Bản đồ / Lịch trình mẫu nằm trong một
// nhóm "Khám phá ⌄". Gỡ dropdown vì nó bắt trả một cú bấm chỉ để nhìn thấy bốn
// mục; nhãn nhóm lại tự nhận `/diem-den` làm đích nên "Khám phá" và mục con
// "Điểm đến" dẫn về cùng một trang — một nhãn hai nghĩa.
//
// Rồi ĐỊA ĐIỂM và BẢN ĐỒ cũng rời khỏi đây: cả hai là LỐI DUYỆT KHÁC của cùng
// một kho nội dung mà /diem-den đang liệt kê (theo địa điểm cụ thể, theo vị trí
// trên bản đồ), không phải mục ngang hàng với nó. Nay chúng nằm ngay dưới tiêu
// đề trang /diem-den — đúng chỗ người ta đang đứng khi nảy ra ý "hay là xem
// kiểu khác". Xem `src/app/(site)/diem-den/page.tsx`.
//
// TẠM BỎ khỏi header (trang vẫn còn, chỉ không có lối vào từ nav):
//  · "Uy tín" → /sale (Cộng tác viên) và /kiem-tra (Kiểm tra uy tín).
//  · "Cộng đồng" → /cong-dong.
//  · Nhóm thông tin → /cau-hoi-thuong-gap, /lien-he, /dieu-khoan, /bao-mat (cả
//    bốn đều đang "Sắp có") — nay còn một link phẳng "Giới thiệu" đi thẳng tới
//    /gioi-thieu, trang duy nhất có nội dung thật.
// `NavEntry` vẫn nhận cả link phẳng lẫn nhóm, nên muốn dựng lại dropdown thì
// thêm `items` vào một mục là xong.
const NAV: NavEntry[] = [
  {
    href: "/diem-den",
    label: "Điểm đến",
    // Hai lối duyệt khác của cùng kho nội dung, vào từ chính trang /diem-den.
    include: ["/dia-diem", "/ban-do"],
  },
  {
    href: "/lich-trinh",
    label: "Lịch trình mẫu",
    // /lich-trinh/cua-toi là chuyến CỦA NGƯỜI DÙNG, không phải mẫu; /lich-trinh/s
    // là bản chia sẻ của một chuyến như vậy. Cả hai không thuộc mục này.
    exclude: ["/lich-trinh/cua-toi", "/lich-trinh/s"],
  },
  { href: "/blog", label: "Cẩm nang" },
  { href: "/gioi-thieu", label: "Giới thiệu" },
];

// Mobile: sheet dùng chung đúng danh sách này — không còn nhóm nào để trải phẳng.
const MOBILE_LINKS: NavLink[] = NAV as NavLink[];

// Header giờ được render MỘT LẦN ở `src/app/(site)/layout.tsx`, không phải ở
// từng trang. Vì vậy nó không nhận `overlay`/`tone` nữa — `HeaderChrome` tự
// tính rồi công bố kết quả qua `data-tone` trên thẻ <header>. Mọi thứ trong
// này cần biết bản màu thì đọc qua biến thể `group-data-[tone=light]/header:`
// — không thể nhận prop, vì giá trị đó tính ở client còn đây là Server
// Component.
//
// `tone` chỉ có MỘT nguồn: kính đang trong hay đã đục (`deep` trong
// `header-chrome.tsx`). Kính trong ⇒ sau lưng là ẢNH hero ⇒ bản `dark` (chữ
// trắng, bóng chữ, wordmark đảo trắng). Kính đục ⇒ bản `light` (chữ mực,
// wordmark màu gốc). Không còn danh sách route nào phải nhớ khai.
export async function SiteHeader({
  heroLayout,
}: {
  heroLayout: HeroLayout;
}) {
  const [session, settings, provinces] = await Promise.all([
    auth(),
    getSettings(),
    getProvinces(),
  ]);
  const user = session?.user;
  const [unread, homeProvince] = await Promise.all([
    user?.id ? getUnreadCount(user.id) : Promise.resolve(0),
    getHomeProvince(user?.id),
  ]);
  const provinceNames = provinces.map((p) => p.name);

  return (
    <HeaderChrome heroLayout={heroLayout}>
      {/* Băng nền tràn viền do HeaderChrome vẽ; ở đây chỉ bó NỘI DUNG vào
          `max-w-7xl` — trùng container của hero và các section bên dưới nên
          logo/nav thẳng hàng với nội dung trang.
          text-shadow mảnh vì kính rất nhạt: chữ trắng cần một chút viền tối để
          không tan vào nội dung trôi phía sau. Cố ý giữ nhẹ, đậm hơn là nhoè.
          Bản `light` KHÔNG có bóng chữ: mực trên nền sáng thì bóng tối chỉ làm
          chữ bẩn, và ở đây cũng không có ảnh nào trôi phía sau để mà tách. */}
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-1 px-4 [text-shadow:0_1px_2px_rgb(0_0_0/0.28)] group-data-[tone=light]/header:[text-shadow:none] sm:gap-2 sm:px-6">
        {/* Cụm trái — điều hướng mobile + logo */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <MobileNav
            links={MOBILE_LINKS}
            isAuthed={!!user}
            provinces={provinceNames}
            homeProvince={homeProvince}
          />

          {/* Logo — tách mascot & chữ để canh giữa riêng: chữ "halivivu" cắt sát
              nên tâm hộp = tâm chữ, thẳng hàng với nav (ảnh ghép trước đây bị mascot
              đội tâm lên, làm chữ lệch xuống). */}
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <Image
              src="/logo_mark.png"
              alt=""
              width={31}
              height={36}
              priority
              className="h-8 w-auto drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)] group-data-[tone=light]/header:drop-shadow-none sm:h-11"
            />
            {/* Wordmark là chữ MỘT MÀU PHẲNG #0E3E27 (xanh rất tối) → trên băng
                kính tối là chìm, nên đảo thành trắng bằng `brightness-0 invert`.
                Mascot bên trái KHÔNG đụng tới nên logo vẫn giữ màu.
                Bản `light` giữ NGUYÊN màu gốc — đó mới là màu thương hiệu, đảo
                trắng trên nền sáng thì mất hẳn chữ. */}
            <Image
              src="/logo_wordmark.png"
              alt={settings.siteName}
              width={77}
              height={16}
              priority
              className="h-3.5 w-auto brightness-0 invert drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)] group-data-[tone=light]/header:brightness-100 group-data-[tone=light]/header:invert-0 group-data-[tone=light]/header:drop-shadow-none sm:h-4.5"
            />
          </Link>
        </div>

        {/* Desktop nav — căn trái, nối tiếp logo */}
        <SiteNav entries={NAV} className="hidden lg:ml-3 lg:flex xl:ml-6" />

        {/* Cụm phải — tiện ích: tìm kiếm · tài khoản (flex-1, dồn về mút phải) */}
        <TooltipProvider delayDuration={300}>
        <div className="flex flex-1 items-center justify-end gap-1">
          {/* Tìm kiếm — icon mở Command palette (⌘K). Cùng chất với nhóm icon
              bên phải, chỉ khác nét lớn hơn một bậc + vạch ngăn; lý do ở trong
              chính component. */}
          <HeaderSearch />

          {user ? (
            <>
              {/* Cụm tiện ích: icon TRẦN + ĐĨA TRÒN khi hover/active. Bỏ khung
                  segmented mờ vì ba khối nền xếp liền nhau thì nặng, và trên
                  hero ảnh thành ba mảng xám.
                  Ba nút này im lặng lúc nghỉ là CÓ CHỦ Ý: chúng mang trạng thái
                  `active` (đang ở trang đó) — nền chỉ có nghĩa khi nó nói lên
                  điều gì. Nút tìm kiếm bên trái thì ngược lại, luôn có nền và
                  bo `rounded-lg`, nên không nhập vào nhóm này. */}
              {/* Vạch ngăn CÔNG CỤ (tìm kiếm) với NƠI CHỐN CỦA TÔI (nhóm
                  icon). Nằm trong nhánh này, không đặt cạnh `HeaderSearch`:
                  chưa đăng nhập thì nhóm kia không tồn tại, một vạch ngăn giữa
                  một icon lẻ và nút "Đăng nhập" chẳng ngăn cái gì. */}
              <span aria-hidden className="mx-1.5 h-6 w-px bg-foreground/25" />
              <div className="flex items-center gap-0.5">
                <DaDenNavLink />
                {/* Lịch trình (ẩn trên màn rất hẹp — vẫn có trong menu + nút nổi) */}
                <div className="hidden sm:flex">
                  <LichTrinhNavLink />
                </div>
                <NotificationBell
                  initialUnread={unread}
                  userId={user.id}
                  realtimeEnabled={ablyEnabled()}
                />
              </div>
              {/* Hairline ngăn "hành động" (tiện ích) với "tài khoản" */}
              <span
                aria-hidden
                className="mx-1.5 h-6 w-px bg-foreground/25"
              />
              <UserMenu
                user={{
                  name: user.name,
                  email: user.email,
                  image: user.image,
                  role: user.role,
                }}
                provinces={provinceNames}
                homeProvince={homeProvince}
              />
            </>
          ) : (
            /* MỘT nút duy nhất, không phải cặp "Đăng ký · Đăng nhập".
               Lý do: /login chỉ có Google/Facebook — OAuth không phân biệt đăng
               ký với đăng nhập (lần đầu tự tạo tài khoản), nên nút "Đăng ký" cũ
               dẫn tới đúng trang kia, một trang mang tiêu đề "Đăng nhập". Ngoài
               ra ba viên pill cùng cỡ, cùng bo tròn xếp liền nhau (ô tìm kiếm ·
               Đăng ký · Đăng nhập) làm ô tìm kiếm đọc ra như nút thứ ba — ô tìm
               kiếm nay đã là một icon, nhưng cặp hai nút auth thì vẫn thừa. Mọi lối
               vào khác của site (mobile-nav, menu hamburger, LoginDrawer) vốn đã
               chỉ có một nút "Đăng nhập" — nay header khớp.

               XANH LÁ (`primary`) chứ không phải cam (`warm`). Cam là màu duy
               nhất trong header phải ĐI VÁ mới đọc được: `--warm-foreground` ở
               scope sáng là trắng, mà trắng trên #ff8800 chỉ được ~2.4:1 (AA cần
               4.5:1) nên phải ép riêng màu chữ cho từng tone. Cặp
               `brand`/`brand-foreground` thì trắng trên #2e871c được ~4.6:1,
               đạt AA mà không cần ngoại lệ nào. Xanh cũng là màu của chính
               wordmark trong logo, nên nút và logo giờ là một bộ thay vì hai
               điểm màu cãi nhau qua thanh header.

               Dùng `brand` chứ KHÔNG phải `primary`: trong scope `.dark` (tone
               tối của header) `--primary` tự sáng lên thành xanh bạc hà — đúng
               cho chữ/nền xanh trên nền gần đen, nhưng sai cho một viên nút ĐỤC
               vốn tự mang nền của nó đi. Hệ quả là cùng một nút ra hai sắc xanh
               khác hẳn giữa trang có hero và trang nền sáng. `--brand` cố ý
               không khai báo lại trong `.dark` — xem chú thích ở `globals.css`.

               KHÔNG icon, không đĩa, không bóng đổ MÀU: nhãn hai chữ trên nền
               đặc đã là tín hiệu đủ mạnh cạnh một ô tìm kiếm chỉ có hairline.
               Mọi thứ thêm vào đây đều là trang trí.
               Ngoại lệ duy nhất là hai lớp trong `shadow`: một vệt sáng 1px mép
               trên (ánh sáng tới từ trên ⇒ mép trên của vật lồi phải sáng hơn
               thân) và một bóng tiếp xúc 1px màu ĐEN mờ — cùng vật liệu với
               `CtaButton`, và cần thật khi nút này nằm đè lên ảnh hero.

               GÓC: `rounded-lg` (8px — mặc định Tailwind; thang `--radius`
               riêng của dự án đã gỡ 2026-09-04), cùng radius với `Button`
               của shadcn. Trước đây là `rounded-full` với lập luận
               "viên tròn là ngôn ngữ của site — 14 control bo tròn hết cỡ so
               với 9 chỗ bo nhẹ". Đếm lại thì tỉ lệ thật là 21/19, tức sát nhau
               chứ không áp đảo; và cái đọc ra "mặc định" ở đây không phải con
               số bo góc mà là việc nút này với ô tìm kiếm bên cạnh TỪNG là hai
               viên nang cùng cỡ cùng hình — một cặp anh em giả, dù vai trò
               ngược hẳn nhau. Ô tìm kiếm nay là chữ trần (xem `header-search`),
               nên nút này là hình khối ĐẶC DUY NHẤT của thanh: thứ tự đọc tự
               hiện ra.

               ⚠️ Đổi ở đây thì phải đổi cùng lúc với `header-search.tsx` —
               hai thứ chỉ đúng khi đứng cạnh nhau. Phạm vi CỐ Ý dừng ở header:
               chip lọc / ô tìm kiếm của `destination-filter` (ngay dưới header
               ở /diem-den) vẫn `rounded-full`, đó là chênh lệch đã biết và
               chấp nhận.

               `[text-shadow:none]`: hàng cha đắp bóng chữ cho chữ trắng nổi trên
               ảnh hero; trên nền đặc thì không có ảnh nào để tách, bóng tối chỉ
               làm nhãn bẩn. */
            <Link
              href="/login"
              className="ml-1.5 inline-flex h-10 items-center rounded-lg bg-brand px-4.5 text-sm font-semibold text-brand-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_1px_2px_rgb(0_0_0/0.18)] transition-[background-color,transform] duration-200 [text-shadow:none] hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-transparent active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              Đăng nhập
            </Link>
          )}
        </div>
        </TooltipProvider>
      </div>
    </HeaderChrome>
  );
}
