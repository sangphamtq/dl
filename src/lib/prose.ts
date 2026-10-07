// Class hiển thị nội dung rich-text (HTML từ TipTap) trên trang công khai & CMS.
// PHẢI đặt ở module server-safe (KHÔNG "use client"): các trang Server Component
// import hằng này; nếu export từ một file "use client", React RSC trả về một
// "client reference" thay vì chuỗi thật → cn() bỏ qua → mất toàn bộ style prose
// (bullet, heading…). Editor (client) cũng import từ đây để dùng chung một nguồn.
export const proseClass =
  "max-w-none break-words leading-7 text-foreground/90 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_a]:text-primary [&_a]:underline [&_a]:break-words [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg [&_iframe]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:my-4 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2";

// Thân bài blog — dùng chung cho `/blog/[slug]` và tab Di chuyển của điểm đến
// (tab đó render nguyên bài), để hai nơi không lệch nhau.
export const articleProseClass = [
  proseClass,
  "text-base leading-[1.55] text-[#1f2226] dark:text-white/85",
  "[&_p]:!my-4 [&_li]:!leading-[1.55]",
  "[&_a]:!text-[#2c70f5] [&_a]:!no-underline hover:[&_a]:!underline",
  "[&_h2]:!mt-5 [&_h2]:!mb-4 [&_h2]:!text-[1.75rem] [&_h2]:!font-bold [&_h2]:!leading-[1.45] [&_h2]:!text-[#1f2226] dark:[&_h2]:!text-white [&_h2]:scroll-mt-24",
  "[&_h3]:!mt-4 [&_h3]:!mb-3 [&_h3]:!text-[1.5rem] [&_h3]:!font-bold [&_h3]:!leading-[1.5] [&_h3]:!text-[#1f2226] dark:[&_h3]:!text-white [&_h3]:scroll-mt-24",
  "[&_h4]:!text-[1.375rem] [&_h4]:!font-bold [&_h4]:!text-[#1f2226] dark:[&_h4]:!text-white",
  "[&_img]:!my-4 [&_img]:!w-full [&_img]:!rounded-lg",
  "[&_figure]:!my-4 [&_figcaption]:!mt-2 [&_figcaption]:text-center [&_figcaption]:text-[0.875rem] [&_figcaption]:italic [&_figcaption]:text-[#2e2e2e]/55 dark:[&_figcaption]:text-white/40",
  "[&_blockquote]:!my-5 [&_blockquote]:!border-l-2 [&_blockquote]:!border-[#2e2e2e]/20 [&_blockquote]:!pl-4 [&_blockquote]:!italic [&_blockquote]:!text-[#2e2e2e]/70 dark:[&_blockquote]:!border-white/20 dark:[&_blockquote]:!text-white/70",
].join(" ");
