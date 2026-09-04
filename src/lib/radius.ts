// Bộ bo góc dùng chung — xem `.claude/skills/design/SKILL.md` §Bo góc.
//
// Ba mức chứ không một: phần tử càng nhỏ lấy bán kính càng nhỏ mới CẢM THẤY cùng
// độ mềm (cùng một số trên chip cao 34px sẽ đọc ra tròn hơn hẳn trên thẻ ảnh cao
// 288px).
//
// Để ở `lib/` chứ không khai trong từng component: file này KHÔNG có "use client"
// nên cả Server Component lẫn Client Component đều import được — khai trong một
// module `"use client"` rồi import sang trang server là cái bẫy đã biết của dự án.
export const R_CARD = "rounded-[6px]"; // thẻ ảnh, ô lớn, khối bao
export const R_CTRL = "rounded-[4px]"; // chip, ô nhập, nút, tab, mũi tên, khung bọc
export const R_BADGE = "rounded-[3px]"; // huy hiệu, badge đếm, nút icon nhỏ
