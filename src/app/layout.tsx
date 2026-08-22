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
