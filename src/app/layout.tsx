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
