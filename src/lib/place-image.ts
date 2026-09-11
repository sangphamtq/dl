type Img = { url: string; isCover: boolean };

export function coverUrl(
  images: Img[],
  seed: string,
  w = 800,
  h = 600,
): string {
  const cover = images.find((i) => i.isCover) ?? images[0];
  return cover?.url ?? `https://picsum.photos/seed/${seed}/${w}/${h}`;
}
