import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mở dev server cho các origin trong mạng LAN (mở site trên điện thoại thật).
  // Từ Next 15.3 mọi request dev tới từ origin KHÁC `localhost` đều bị chặn nếu
  // không khai ở đây — client HMR không bắt tay được, hậu quả nhìn thấy trên máy
  // là trang TỰ TẢI LẠI liên tục và không kịp bấm gì.
  // Máy khác IP thì thêm vào danh sách này (chỉ ảnh hưởng `next dev`).
  allowedDevOrigins: ["192.168.1.145"],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.ufs.sh" }, // UploadThing
      { protocol: "https", hostname: "utfs.io" }, // UploadThing (legacy)
      { protocol: "https", hostname: "*.tiktokcdn.com" }, // thumbnail TikTok (oEmbed)
      { protocol: "https", hostname: "*.tiktokcdn-us.com" },
      { protocol: "https", hostname: "*.vn" },
    ],
  },
  async headers() {
    return [
      {
        // Service worker phải luôn được kiểm tra lại, nếu không trình duyệt giữ
        // bản cũ và bản cập nhật (đổi VERSION trong sw.js) không bao giờ tới.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
