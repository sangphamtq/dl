export function removeDiacritics(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const RESERVED_SLUGS = new Set([
  "diem-den",
  "hoat-dong",
  "dia-diem",
  "dac-san",
  "quan-an",
  "luu-tru",
  "di-chuyen",
  "blog",
  "lich-trinh",
  "cong-dong",
  "sale",
  "kiem-tra",
  "thong-bao",
  "tim-kiem",
  "login",
  "api",
  "cms",
]);

export const RESERVED_TRIP_SLUGS = new Set(["cua-toi", "s", "mau"]);
