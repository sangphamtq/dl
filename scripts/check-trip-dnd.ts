// Kiểm phép tính vị trí của kéo–thả lịch trình (applyMove trong trip-dnd.ts).
// Chạy: pnpm check:trip-dnd
//
// Vì sao có file này: đây là chỗ ĐÃ SAI một lần — kéo xuống trong cùng một ngày
// bị lệch một vị trí vì chỉ số đích được tính SAU khi đã gỡ mục ra. Lỗi kiểu đó
// không lộ ra qua typecheck, cũng không thấy được bằng ảnh chụp.

import { applyMove } from "@/components/trip/trip-dnd";


let pass = 0, fail = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "OK  " : "FAIL"}  ${name}`);
  if (!ok) console.log(`        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`);
  if (ok) pass++;
  else fail++;
}

const B = () => ({ backlog: ["b1", "b2"], "day:1": ["a", "b", "c"], "day:2": ["x"] });

check("đổi chỗ trong cùng ngày: a xuống chỗ c",
  applyMove(B(), "a", "c")["day:1"], ["b", "c", "a"]);

check("đổi chỗ trong cùng ngày: c lên chỗ a",
  applyMove(B(), "c", "a")["day:1"], ["c", "a", "b"]);

check("Túi đồ → ngày 1, thả lên b (chèn trước b)",
  applyMove(B(), "b1", "b")["day:1"], ["a", "b1", "b", "c"]);

check("Túi đồ → ngày 1: rời khỏi túi",
  applyMove(B(), "b1", "b").backlog, ["b2"]);

check("thả vào VÙNG rỗng (id = tên vùng) → xuống cuối",
  applyMove(B(), "a", "day:2")["day:2"], ["x", "a"]);

check("ngày 1 → Túi đồ",
  applyMove(B(), "a", "b2").backlog, ["b1", "a", "b2"]);

check("thả lên chính nó: không đổi",
  applyMove(B(), "a", "a")["day:1"], ["a", "b", "c"]);

check("id lạ: trả nguyên bàn",
  applyMove(B(), "zzz", "a"), B());

const empty = { backlog: [], "day:1": ["a"], "day:2": [] };
check("ngày cuối cùng còn 1 mục → kéo sang ngày rỗng",
  applyMove(empty, "a", "day:2"), { backlog: [], "day:1": [], "day:2": ["a"] });

console.log(`\n${pass} qua · ${fail} hỏng`);
process.exit(fail ? 1 : 0);
