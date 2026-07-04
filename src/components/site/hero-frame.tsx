"use client";

import Image from "next/image";
import { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";

// Setter để PlaceHeroStack báo ảnh đang xem → nền ambient đổi theo.
type SetActive = (index: number) => void;
const HeroAmbientCtx = createContext<SetActive | null>(null);
export const useHeroAmbient = () => useContext(HeroAmbientCtx);

// Khung hero: giữ index ảnh đang xem (chung với PlaceHeroStack qua context) và
// render nền ambient — các lớp ảnh blur mạnh, crossfade theo ảnh hero bên phải.
export function HeroFrame({
  images,
  children,
}: {
  images: string[];
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(0);

  return (
    <HeroAmbientCtx.Provider value={setActive}>
      <section className="relative isolate overflow-hidden bg-background">
        {images.length > 0 && (
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            {images.map((url, i) => (
              <Image
                key={`${url}-${i}`}
                src={url}
                alt=""
                fill
                priority={i === 0}
                quality={20}
                sizes="100vw"
                className={cn(
                  "scale-125 object-cover blur-3xl transition-opacity duration-700 ease-out",
                  i === active ? "opacity-100" : "opacity-0",
                )}
              />
            ))}
            {/* Phủ nền sáng → "màu nền mở" mềm, chữ vẫn đọc rõ */}
            <div className="absolute inset-0 bg-background/75 dark:bg-background/82" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background" />
          </div>
        )}
        {children}
      </section>
    </HeroAmbientCtx.Provider>
  );
}
