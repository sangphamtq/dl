import { slugify } from "@/lib/slug";
import { cleanHtml } from "@/lib/sanitize";

export type TocItem = { id: string; text: string; level: 2 | 3 };

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
      const existing = attrs.match(/\sid=["']([^"']+)["']/i);
      const id = existing ? existing[1] : uniqueId(slugify(text));
      toc.push({ id, text, level });

      const newAttrs = existing ? attrs : `${attrs} id="${id}"`;
      return `<h${lvl}${newAttrs}>${inner}</h${lvl}>`;
    },
  );

  return { html: out, toc };
}

// Mọi nơi render CÙNG một bài phải đi qua đây: id tiêu đề sinh theo thứ tự xuất
// hiện, lệch pipeline là link `#muc` từ trang này sang trang kia trỏ sai chỗ.
export function prepareArticle(content: string) {
  return extractToc(cleanHtml(content));
}

export function readingMinutes(html: string): number {
  const words = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
