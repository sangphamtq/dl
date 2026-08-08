import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Cabin, Mali } from "next/font/google";
import { Toaster } from "sonner";
import { getSettings } from "@/lib/settings";
import { BackToTop } from "@/components/site/back-to-top";
import { BottomNav } from "@/components/site/bottom-nav";
import { AnalyticsProvider } from "@/components/site/analytics-provider";
import { PwaRegister } from "@/components/site/pwa-register";
import { InstallPrompt } from "@/components/site/install-prompt";
import { THEME_COLOR } from "@/lib/pwa";
import "./globals.css";

// ─── FONT ────────────────────────────────────────────────────────────────────
// Site chỉ nạp BA họ chữ. Mỗi họ thêm vào là ~35–50 KB tải về ở lần vào đầu
// tiên, nên trước khi thêm font mới hãy chắc nó có VAI TRÒ mà ba họ dưới không
// làm được. Từng có 6 họ (Dancing Script, Plus Jakarta Sans, Geist Mono) —
// preload 26 file ≈ 306 KB mỗi trang, phần lớn là byte không bao giờ hiện lên.
//
// KHÔNG khai `latin-ext` ở bất kỳ font nào. `next/font` preload MỌI subset đã
// khai, mà chữ Việt có dấu KHÔNG nằm trong latin-ext: `ă đ ơ ư ạ ệ ợ` thuộc
// subset `vietnamese` (U+0102, U+0110, U+01A0, U+1EA0–1EF9). latin-ext là dành
// cho tiếng Ba Lan/Séc/Thổ (`ł ě ș`) — site tải về rồi để không, ~110 KB. Đánh
// đổi đã chấp nhận: tên riêng nước ngoài có `ș/ł/č` rơi về font hệ thống.

// Chữ thân, mặc định toàn site.
const cabin = Cabin({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

// Font display VÀ font tiêu đề — một họ chữ cho cả hai vai (`--font-heading`
// trong globals.css trỏ thẳng vào `--font-display`). Dùng cho: tên điểm đến ở
// hero, eyebrow tỉnh cha, tiêu đề section lớn, các con số/nhãn nhấn, toàn bộ
// h1–h6, và chữ nav. Đổi font display = đổi đúng khối này.
// (Trước đây tiêu đề là Plus Jakarta Sans, một họ sans hình học riêng đứng cạnh
// Be Vietnam Pro cũng hình học — hai giọng gần giống nhau tốn thêm ~56 KB mà
// người đọc gần như không phân biệt được. Gộp về một họ.)
// Bắt buộc font phải có subset "vietnamese" — thiếu thì trình duyệt ghép dấu từ
// font khác, cỡ lớn lộ ngay (Poppins là ví dụ: chỉ có latin + latin-ext, thiếu
// gần hết khối U+1EA0–1EF9 nên "Hạ Long" ra hai font trong một từ).
// Be Vietnam Pro: sans hình học của foundry Việt, dấu là nét nguyên bản trong
// chính bộ chữ (không phải bộ Việt gắn thêm) → cân và đúng vị trí ở cỡ lớn.
// KHÔNG phải variable font → khai báo `weight` tĩnh, và ở chỗ dùng đừng đặt
// `font-variation-settings` (font không có trục nào để chỉnh).
// CHỈ CÓ 600/700/800, mỗi weight là một file tải riêng (~18 KB). 600 có mặt vì
// 129/221 heading trong site đang là `font-semibold`; thiếu nó thì cả trăm tiêu
// đề tự nhảy lên 700. Đừng dùng `font-normal`/`font-medium` với họ này.
const display = Be_Vietnam_Pro({
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700", "800"],
  display: "swap",
});

// Font viết tay, thân thiện (dòng nhấn kiểu poster du lịch, checklist "Đã đến")
// — GIỌNG VIẾT TAY DUY NHẤT của site. Trước đây còn Dancing Script ở biến
// `--font-script` làm việc chồng lấn (eyebrow + tiêu đề section): đã bỏ hẳn,
// phần việc đó chuyển sang `--font-display`.
// Chỉ 500 + 700: mọi chỗ gọi `font-rounded` đều là `font-medium` (500), riêng
// checklist "Đã đến" (da-den-board) có vài dòng `font-bold` bên trong khối đã
// đặt Mali. Bỏ luôn 700 thì trình duyệt tự bôi đậm giả — nét viết tay bị bệt.
const mali = Mali({
  variable: "--font-rounded",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "700"],
  display: "swap",
});

// PWA: màu thanh trạng thái khi chạy dạng app (Android/Chrome đọc từ đây).
// Cố ý KHÔNG đặt `viewportFit: "cover"` — nội dung sẽ tràn vào vùng tai thỏ và
// thanh home của iPhone, mà các phần tử fixed hiện có (nút lên đầu trang)
// chưa chừa `safe-area-inset`. Muốn tràn viền thì làm cùng lúc với việc đó.
export const viewport: Viewport = {
  themeColor: THEME_COLOR,
};

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: { default: `${s.siteName} — ${s.tagline}`, template: `%s · ${s.siteName}` },
    description: s.description,
    applicationName: s.siteName,
    // <link rel="manifest"> do app/manifest.ts tự sinh; khối này là phần iOS
    // không đọc manifest: tên trên màn hình chính, icon, kiểu thanh trạng thái.
    appleWebApp: {
      capable: true,
      title: s.siteName,
      statusBarStyle: "default",
    },
    // Favicon vẫn do app/icon.png (file convention) lo; ở đây chỉ bổ sung icon
    // màn hình chính của iOS — bản 180×180, nền đục (iOS không nhận alpha).
    icons: {
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { siteName } = await getSettings();

  return (
    <html
      lang="vi"
      className={`${cabin.variable} ${display.variable} ${mali.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* Thanh nav dưới (mobile) — đặt TRƯỚC các nút nổi khác vì nó gắn
            `data-bottom-nav` để những nút đó biết mà né chỗ. */}
        <BottomNav />
        <BackToTop />
        <Toaster richColors position="top-center" />
        <AnalyticsProvider />
        <PwaRegister />
        <InstallPrompt siteName={siteName} />
      </body>
    </html>
  );
}
