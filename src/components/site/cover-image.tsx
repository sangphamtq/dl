"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

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
