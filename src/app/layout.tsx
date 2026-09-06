import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Cabin, Mali } from "next/font/google";
import { Toaster } from "sonner";
import { getSettings } from "@/lib/settings";
import { BackToTop } from "@/components/site/back-to-top";
import { BottomNav } from "@/components/site/bottom-nav";
import { AnalyticsProvider } from "@/components/site/analytics-provider";
import { PwaRegister } from "@/components/site/pwa-register";
import { InstallPrompt } from "@/components/site/install-prompt";
import "./globals.css";

// ─── FONT ────────────────────────────────────────────────────────────────────

// Chữ thân, mặc định toàn site.
const cabin = Cabin({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const display = Be_Vietnam_Pro({
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const mali = Mali({
  variable: "--font-rounded",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: '#ffffff',
};

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    // Tiêu đề tab là NHÃN, không phải câu: cắt dấu chấm cuối của `tagline`
    // (trường đó còn dùng ở chỗ khác, nơi dấu chấm đúng, nên cắt tại đây chứ
    // không sửa dữ liệu). Ngăn cách bằng — chứ không phải "·": trong <title>
    // không có khoảng trắng rộng để ngăn như trên trang, còn "·" thì cả dự án
    // đã bỏ. Từng trang CHỈ ghi tên của mình, `template` lo phần tên site —
    // đừng gắn thêm "Halivivu" vào title của page (24 trang từng làm vậy và ra
    // "Điểm đến · Halivivu · Halivivu").
    title: {
      default: `${s.siteName} — ${s.tagline.replace(/\.\s*$/, "")}`,
      template: `%s — ${s.siteName}`,
    },
    description: s.description,
    applicationName: s.siteName,
    // <link rel="manifest"> do app/manifest.ts tự sinh; khối này là phần iOS
    // không đọc manifest: tên trên màn hình chính, icon, kiểu thanh trạng thái.
    appleWebApp: {
      capable: true,
      title: s.siteName,
      statusBarStyle: "default",
    },
    // ⚠️ KHÔNG khai `icons` ở đây. Khai một khoá bất kỳ trong đó là ĐÈ LÊN cả
    // bộ file convention, nên bản trước — chỉ khai `apple` — làm HTML mất sạch
    // `<link rel="icon">`: `src/app/icon.png` có tồn tại nhưng chẳng ai trỏ
    // tới, trình duyệt rơi về favicon mặc định. Nay cả hai đều là file
    // convention (`src/app/icon.png`, `src/app/apple-icon.png`), Next tự sinh
    // thẻ link kèm hash — cũng là thứ đường dẫn viết tay không có.
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
