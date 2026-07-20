// Class hiển thị nội dung rich-text (HTML từ TipTap) trên trang công khai & CMS.
// PHẢI đặt ở module server-safe (KHÔNG "use client"): các trang Server Component
// import hằng này; nếu export từ một file "use client", React RSC trả về một
// "client reference" thay vì chuỗi thật → cn() bỏ qua → mất toàn bộ style prose
// (bullet, heading…). Editor (client) cũng import từ đây để dùng chung một nguồn.
export const proseClass =
  "max-w-none break-words leading-7 text-foreground/90 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_a]:text-primary [&_a]:underline [&_a]:break-words [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg [&_iframe]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:my-4 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2";
