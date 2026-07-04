import type { Metadata } from "next";
import { Cabin, Geist_Mono, Mali, Be_Vietnam_Pro } from "next/font/google";
import { Toaster } from "sonner";
import { getSettings } from "@/lib/settings";
import { BackToTop } from "@/components/site/back-to-top";
import { ItineraryFab } from "@/components/site/itinerary-fab";
import "./globals.css";

const cabin = Cabin({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
});

// Font tiêu đề (heading h1–h6) — trung tính, chắc khỏe, dấu tiếng Việt gọn.
const beVietnamPro = Be_Vietnam_Pro({
    variable: "--font-heading",
    subsets: ["latin", "latin-ext", "vietnamese"],
    weight: ["300", "400", "500", "600", "700", "800"],
    display: "swap",
  });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

// Font viết tay, thân thiện (checklist "Đã đến") — gợi cảm giác poster du lịch.
const mali = Mali({
  variable: "--font-rounded",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: { default: `${s.siteName} — ${s.tagline}`, template: `%s · ${s.siteName}` },
    description: s.description,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${cabin.variable} ${beVietnamPro.variable} ${geistMono.variable} ${mali.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ItineraryFab />
        <BackToTop />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
