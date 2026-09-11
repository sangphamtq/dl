import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  async redirects() {
    return [
      { source: "/lich-trinh/mau", destination: "/lich-trinh", permanent: true },
      { source: "/lich-trinh/mau/:slug", destination: "/lich-trinh/:slug", permanent: true },
    ];
  },
  async headers() {
    return [
      {
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
