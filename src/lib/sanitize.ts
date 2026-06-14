import sanitizeHtml from "sanitize-html";

// Làm sạch HTML rich-text (từ Jodit) trước khi lưu — chống XSS, giữ định dạng
// cần thiết (căn lề/kích thước ảnh qua inline style).
export function cleanHtml(dirty: string): string {
  if (!dirty) return "";
  return sanitizeHtml(dirty, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "h1",
      "h2",
      "u",
      "s",
      "span",
      "figure",
      "figcaption",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "style"],
      td: ["colspan", "rowspan", "style"],
      th: ["colspan", "rowspan", "style"],
      "*": ["style"],
    },
    allowedStyles: {
      "*": {
        "text-align": [/^(left|right|center|justify)$/],
        width: [/^\d+(?:px|%)$/],
        height: [/^\d+(?:px|%)$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}
