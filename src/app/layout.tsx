import type { Metadata, Viewport } from "next";
import { Mali } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { getSettings } from "@/lib/settings";
import { BackToTop } from "@/components/site/back-to-top";
import { BottomNav } from "@/components/site/bottom-nav";
import { AnalyticsProvider } from "@/components/site/analytics-provider";
import { PwaRegister } from "@/components/site/pwa-register";
import { InstallPrompt } from "@/components/site/install-prompt";
import "./globals.css";

// MỘT họ chữ cho cả site: SVN-Gilroy — chữ thân (`--font-sans`) VÀ tiêu đề (`--font-display` trỏ về đây trong globals.css,
// Be Vietnam Pro đã bỏ). SVN-Gilroy (bản Việt hoá — đủ dấu tiếng Việt), tự host từ `app/fonts/gilroy/` qua `next/font/local`.
// Chỉ 4 độ đậm site dùng (400–700), WOFF2. Cần độ đậm khác thì thêm file + một dòng ở đây; đừng để trình duyệt tự "giả đậm".
// ⚠️ Gilroy là font thương mại — giấy phép web phải có trước khi lên production.
const gilroy = localFont({
  variable: "--font-sans",
  src: [
    { path: "./fonts/gilroy/gilroy-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/gilroy/gilroy-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/gilroy/gilroy-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/gilroy/gilroy-700.woff2", weight: "700", style: "normal" },
  ],
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
    title: {
      default: `${s.siteName} — ${s.tagline.replace(/\.\s*$/, "")}`,
      template: `%s — ${s.siteName}`,
    },
    description: s.description,
    applicationName: s.siteName,
    appleWebApp: {
      capable: true,
      title: s.siteName,
      statusBarStyle: "default",
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
      className={`${gilroy.variable} ${mali.variable} h-full antialiased`}
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
