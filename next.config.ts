import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
