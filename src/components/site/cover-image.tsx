"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

// next/image kèm fallback khi ảnh nguồn chết (404/hostname hỏng) — đổi sang
// ảnh placeholder để card không hiện alt text vỡ layout. onError chỉ chạy ở
// client nên component này tách riêng khỏi các card server component.
export function CoverImage({
  src,
  fallbackSrc,
  alt,
  ...rest
}: ImageProps & { fallbackSrc: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      {...rest}
      alt={alt}
      src={failed ? fallbackSrc : src}
      onError={() => setFailed(true)}
    />
  );
}
