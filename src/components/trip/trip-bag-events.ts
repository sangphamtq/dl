"use client";

const EVT = "halivivu:trip-bag";

export function tripBagChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVT));
}

export function onTripBagChanged(cb: () => void): () => void {
  window.addEventListener(EVT, cb);
  return () => window.removeEventListener(EVT, cb);
}
