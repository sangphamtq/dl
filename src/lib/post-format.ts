// Tự nhận link trong các đoạn text (bỏ qua phần nằm trong thẻ HTML).
// Nội dung bài đã được sanitize khi lưu nên ở đây chỉ thêm <a> cho URL trần.

function linkify(text: string): string {
  return text.replace(/(https?:\/\/[^\s<]+)/g, (u) => {
    const m = u.match(/[.,!?;:)\]]+$/);
    const tail = m ? m[0] : "";
    const url = tail ? u.slice(0, -tail.length) : u;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>${tail}`;
  });
}

export function renderPostBody(html: string): string {
  return html
    .split(/(<[^>]+>)/g)
    .map((seg) => (seg.startsWith("<") ? seg : linkify(seg)))
    .join("");
}
