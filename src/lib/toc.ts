import { slugify } from "@/lib/slug";

export type TocItem = { id: string; text: string; level: 2 | 3 };

// Trích mục lục từ HTML thân bài (heading h2/h3) và gắn `id` vào từng heading
// để liên kết neo (#id) nhảy tới được. Trả về HTML đã chèn id + danh sách mục.
// Dùng regex vì nội dung Jodit khá đơn giản; nếu sau này cần chính xác hơn thì
// thay bằng parser DOM.
export function extractToc(html: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const used = new Map<string, number>();

  const uniqueId = (base: string) => {
    const id = base || "muc";
    const n = used.get(id) ?? 0;
    used.set(id, n + 1);
    return n === 0 ? id : `${id}-${n + 1}`;
  };

  const out = html.replace(
    /<h([23])\b([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (full, lvl: string, attrs: string, inner: string) => {
      const text = inner
        .replace(/<[^>]+>/g, "")
        .replace(/&[a-z]+;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!text) return full;

      const level = (lvl === "3" ? 3 : 2) as 2 | 3;
      // Giữ id sẵn có nếu heading đã có; nếu chưa thì tạo từ text.
      const existing = attrs.match(/\sid=["']([^"']+)["']/i);
      const id = existing ? existing[1] : uniqueId(slugify(text));
      toc.push({ id, text, level });

      const newAttrs = existing ? attrs : `${attrs} id="${id}"`;
      return `<h${lvl}${newAttrs}>${inner}</h${lvl}>`;
    },
  );

  return { html: out, toc };
}
