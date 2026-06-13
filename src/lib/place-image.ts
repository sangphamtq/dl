type Img = { url: string; isCover: boolean };

// Chọn ảnh bìa của một entity (ưu tiên isCover, rồi ảnh đầu). Nếu chưa có ảnh,
// trả về ảnh placeholder picsum theo seed (slug) để layout không vỡ.
export function coverUrl(
  images: Img[],
  seed: string,
  w = 800,
  h = 600,
): string {
  const cover = images.find((i) => i.isCover) ?? images[0];
  return cover?.url ?? `https://picsum.photos/seed/${seed}/${w}/${h}`;
}
