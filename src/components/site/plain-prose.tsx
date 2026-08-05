import { cn } from "@/lib/utils";

// Render văn bản THUẦN (mô tả do biên tập gõ tay, không phải rich text) thành
// nhiều ĐOẠN.
//
// Vì sao không dùng `whitespace-pre-line` như trước: nó biến `\n` thành một lần
// xuống dòng với đúng `line-height` của đoạn, nên chỗ người viết cố ý ngắt ý
// nhìn y hệt chỗ chữ tự động xuống dòng khi hết bề ngang — cả khối chữ thành
// một mảng đều tăm tắp, mất hết nhịp mà người viết đã đặt.
//
// Ở đây mỗi lần Enter thành một `<p>` riêng, cách nhau `space-y-3` (12px) — đủ
// để mắt thấy "sang ý khác" nhưng chưa thành một quãng nghỉ lớn như giữa các
// mục. Gõ Enter một lần hay nhiều lần liên tiếp đều ra cùng khoảng cách này
// (`\n+`): người gõ không phải nhớ quy ước một-dòng-trống-hay-hai.
export function PlainProse({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const paragraphs = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
