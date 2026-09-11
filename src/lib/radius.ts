/* Bộ bo góc dùng chung cho MỌI trang công khai.

   Để ở `lib/` chứ không trong một module `"use client"`: nhìn từ Server
   Component, export của module client chỉ là *client reference* — dùng vào sẽ
   ném "is not a function" lúc CHẠY trong khi tsc và lint đều xanh. */
export const R_CARD = "rounded-[6px]";
export const R_CTRL = "rounded-[4px]";
export const R_BADGE = "rounded-[3px]";
