"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * CỤM NÚT NỔI góc dưới–phải: một cột duy nhất (dựng một lần ở root layout), mọi nút nổi gắn vào bằng `FabSlot` — nhờ vậy
 * các nút tự xếp, không ai phải tính vị trí tránh nhau. `order` nhỏ ở TRÊN, lớn ở DƯỚI (lên đầu trang = 100, sát đáy).
 * Cột neo đáy ⇒ nút ẩn đi (thu chiều cao về 0) thì các nút trên tự trượt xuống. Có thanh điểm đến ở đáy (`PeerBar`) thì
 * cột nâng lên đúng chiều cao thanh đó (`--peer-bar-h`, thanh tự ghi).
 */
const ID = "fab-stack";

export function FabStack() {
  return (
    <div
      id={ID}
      className="pointer-events-none fixed bottom-[calc(1.25rem+var(--bottom-nav-h)+var(--peer-bar-h,0px))] right-4 transition-[bottom] duration-300 z-40 flex flex-col items-center gap-2.5 sm:right-5 [&>*]:pointer-events-auto"
    />
  );
}

const noop = () => () => {};

export function FabSlot({ order, children }: { order: number; children: ReactNode }) {
  // Chỉ có ở client (portal cần nút DOM); server trả null ⇒ không lệch hydration.
  const host = useSyncExternalStore(noop, () => document.getElementById(ID), () => null);
  if (!host) return null;
  return createPortal(<div style={{ order }}>{children}</div>, host);
}
