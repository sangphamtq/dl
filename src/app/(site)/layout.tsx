import { getSettings } from "@/lib/settings";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { FooterGate } from "@/components/site/footer-gate";

// Vỏ chung của MỌI trang công khai.
//
// Vì sao là một route group `(site)` chứ không phải root layout: root layout
// bọc cả `/cms`, `/login` và `/offline` — hai cái đầu không có header, còn
// `/offline` là `force-static` và `SiteHeader` thì gọi `auth()`, đặt lên root
// là phá luôn khả năng precache của trang dự phòng (xem CLAUDE.md).
// Route group không đổi URL: `(site)` chỉ là chỗ chứa, `/blog` vẫn là `/blog`.
//
// Lợi ích thật của việc gom vào đây: khi điều hướng giữa các trang công khai,
// Next chỉ thay phần `children` — header ĐỨNG NGUYÊN, không dựng lại. Trước đây
// mỗi trang tự render `<SiteHeader />` bên trong `page.tsx` của mình, nên mỗi
// lần chuyển trang là `auth()` + `getSettings()` + `getProvinces()` +
// `getUnreadCount()` + `getHomeProvince()` chạy lại một lượt, và mọi state
// client trong header (menu đang mở, độ đậm kính theo vị trí cuộn) reset.
//
// `heroLayout` phải lấy ở đây rồi chuyền xuống: quyết định header có "chìm"
// trên hero hay không nay do `HeaderChrome` tự tra theo đường dẫn, mà nó là
// client component nên không đọc được cấu hình từ DB.
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { heroLayout } = await getSettings();

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader heroLayout={heroLayout} />
      {children}
      {/* Hai trang bản đồ cao đúng một màn hình và không có chân trang. Trước
          đây chúng thể hiện điều đó bằng cách đơn giản là không render
          `<SiteFooter />`; giờ chân trang nằm ở layout nên phải có một cổng
          chặn theo đường dẫn. */}
      <FooterGate>
        <SiteFooter />
      </FooterGate>
    </div>
  );
}
