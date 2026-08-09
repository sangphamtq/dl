import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Halivivu — Cẩm nang";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await prisma.post.findUnique({
    where: { slug },
    select: { title: true, excerpt: true },
  });

  const title = post?.title ?? "Cẩm nang du lịch";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f766e 100%)",
          color: "white",
          padding: 72,
        }}
      >
        <div style={{ fontSize: 30, opacity: 0.85, display: "flex" }}>
          Cẩm nang · Halivivu
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.15,
            marginTop: 16,
            display: "flex",
          }}
        >
          {title.length > 90 ? title.slice(0, 90) + "…" : title}
        </div>
      </div>
    ),
    size,
  );
}
