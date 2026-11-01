/* Bộ bo góc dùng chung cho MỌI trang công khai: 10 / 6 / 4 (nâng một nấc từ 6 / 4 / 3 — 2026-11-01, biên tập chọn theo hộp
   tìm kiếm). Số ghi thẳng ở component theo cùng thang: 10 · 6 · 4 · 3 (chi tiết rất nhỏ).

   Để ở `lib/` chứ không trong một module `"use client"`: nhìn từ Server
   Component, export của module client chỉ là *client reference* — dùng vào sẽ
   ném "is not a function" lúc CHẠY trong khi tsc và lint đều xanh. */
export const R_CARD = "rounded-[10px]";
export const R_CTRL = "rounded-[6px]";
export const R_BADGE = "rounded-[4px]";
