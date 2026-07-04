import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Halivivu";

export default async function Image({
  params,
}: {
  params: Promise<{ placeSlug: string }>;
}) {
  const { placeSlug } = await params;
  const place = await prisma.place.findUnique({
    where: { slug: placeSlug },
    select: { name: true, tagline: true, kind: true },
  });

  const name = place?.name ?? "Halivivu";
  const tagline =
    place?.tagline ??
    (place?.kind === "province" ? "Tỉnh / Thành phố" : "Điểm đến");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          background: "linear-gradient(135deg, #064e3b 0%, #0f766e 60%, #115e59 100%)",
          color: "white",
          padding: 72,
        }}
      >
        <div style={{ fontSize: 30, opacity: 0.85, display: "flex" }}>
          Halivivu
        </div>
        <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.1, marginTop: 16 }}>
          {name}
        </div>
        <div style={{ fontSize: 36, opacity: 0.9, marginTop: 12 }}>{tagline}</div>
      </div>
    ),
    size,
  );
}
