import type { Metadata } from "next";
import {
  Be_Vietnam_Pro,
  Cabin,
  Geist_Mono,
  Mali,
  Plus_Jakarta_Sans,
  Dancing_Script,
} from "next/font/google";
import { Toaster } from "sonner";
import { getSettings } from "@/lib/settings";
import { BackToTop } from "@/components/site/back-to-top";
import { ItineraryFab } from "@/components/site/itinerary-fab";
import { AnalyticsProvider } from "@/components/site/analytics-provider";
import "./globals.css";

const cabin = Cabin({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
});

// Font tiêu đề (heading h1–h6) — Plus Jakarta Sans (hình học, hiện đại). Có
// subset "vietnamese" (đủ dấu) và trọng lượng 200–800 (đủ cho font-extrabold).
const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
});

// Font display CHỈ dùng cho tên điểm đến ở hero. Đổi font display = đổi đúng
// khối này (biến `--font-display` giữ nguyên tên). Bắt buộc font phải có subset
// "vietnamese" — thiếu thì trình duyệt ghép dấu từ font khác, cỡ lớn lộ ngay.
// Be Vietnam Pro: sans hình học của foundry Việt, dấu là nét nguyên bản trong
// chính bộ chữ (không phải bộ Việt gắn thêm) → cân và đúng vị trí ở cỡ lớn.
// KHÔNG phải variable font → khai báo `weight` tĩnh, và ở chỗ dùng đừng đặt
// `font-variation-settings` (font không có trục nào để chỉnh).
const display = Be_Vietnam_Pro({
  variable: "--font-display",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["700", "800"],
  display: "swap",
});

// Font script (viết tay, calligraphy) cho eyebrow các section — dấu ấn thị
// giác kiểu poster/landing du lịch ("Muôn nơi chờ bạn", "Về chúng tôi"…).
const dancingScript = Dancing_Script({
  variable: "--font-script",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["600", "700"],
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
      className={`${cabin.variable} ${plusJakarta.variable} ${display.variable} ${geistMono.variable} ${mali.variable} ${dancingScript.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ItineraryFab />
        <BackToTop />
        <Toaster richColors position="top-center" />
        <AnalyticsProvider />
      </body>
    </html>
  );
}
