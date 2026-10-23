import { applyMove } from "@/components/trip/trip-dnd";
import { dropAt, insertAt, placeAt, type DropAt } from "@/lib/trip-drop";
import { scheduleDay, legKey } from "@/lib/trip-time";


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

// Mô phỏng server: gỡ mục đang dời khỏi danh sách MỚI NHẤT rồi đặt theo ý định.
function serverMove(list: string[], id: string, at: DropAt) {
  const ids = list.filter((x) => x !== id);
  ids.splice(placeAt(ids, at), 0, id);
  return ids;
}

// §3 docs/lich-trinh-cong-tac.md: A kéo c lên đầu, B (còn thấy [a,b,c]) kéo b xuống cuối.
check("đụng độ: B kéo b xuống cuối trên bản cũ → b vẫn ở cuối",
  serverMove(["c", "a", "b"], "b", dropAt(["a", "c", "b"], "b")), ["c", "a", "b"]);

check("đụng độ: A vừa chèn x, B đặt b ngay sau a → vẫn ngay sau a",
  serverMove(["x", "a", "c", "b"], "b", dropAt(["a", "b", "c"], "b")), ["x", "a", "b", "c"]);

check("mục neo đã bị xoá → rơi về mục neo còn lại",
  serverMove(["c", "b"], "b", { afterId: "gone", beforeId: "c" }), ["b", "c"]);

check("cả hai mục neo đã mất → xuống cuối",
  serverMove(["c", "b"], "b", { afterId: "gone", beforeId: "gone2" }), ["c", "b"]);

check("\"start\" → lên đầu", serverMove(["a", "b"], "b", "start"), ["b", "a"]);
check("\"end\" → xuống cuối", serverMove(["a", "b"], "a", "end"), ["b", "a"]);

// Chèn liên tiếp vào cùng một khe: mốc trôi theo mục vừa thêm nên A rồi B giữ đúng thứ tự.
{
  let list = ["x", "y"];
  const slot = insertAt(list, 1, (id) => id);
  check("khe giữa x và y: mô tả", slot.where, "giữa x và y");
  list = serverMove([...list, "A"], "A", slot.at);
  const next: DropAt = { afterId: "A", beforeId: (slot.at as { beforeId: string }).beforeId };
  list = serverMove([...list, "B"], "B", next);
  check("chèn A rồi B vào giữa x và y", list, ["x", "A", "B", "y"]);
  check("khe đầu ngày: trước x", insertAt(["x"], 0, (id) => id).where, "trước x");
  check("khe cuối ngày: \"end\"", insertAt(["x"], 1, (id) => id).at, "end");
}

// Việc (mục tự thêm không toạ độ) nằm giữa hai nơi không được cắt đôi chặng.
const PA = { id: "A", kind: "spot" as const, name: "A", stayMin: 90, lat: 10, lng: 106 };
const PB = { id: "B", kind: "spot" as const, name: "B", stayMin: 60, lat: 10.1, lng: 106.1 };
const wait = { id: "w", kind: "custom" as const, name: "Chờ người", stayMin: null, lat: null, lng: null };
const car = { id: "c", kind: "custom" as const, name: "Đặt xe", stayMin: 15, lat: null, lng: null };
const sd = scheduleDay(8 * 60, [PA, wait, PB], { [legKey("A", "B")]: 20 });

check("việc: không vẽ chặng A → việc", sd.items[0].legHidden, true);
check("việc: chặng đi tiếp tính từ A tới B", sd.items[1].legKey, "A->B");
check("việc: giờ tới B = 8:00 + 90 + 30 (mặc định việc) + 20", sd.items[2].arriveMin, 8 * 60 + 90 + 30 + 20);
check("việc: không có cảnh báo thiếu toạ độ",
  sd.items.flatMap((i) => i.warnings.map((w) => w.code)).includes("noCoords"), false);

const sd2 = scheduleDay(8 * 60, [car, PA], {});
check("việc đầu ngày: không vẽ chặng (chưa có nơi nào để đi từ đó)", sd2.items[0].legHidden, true);
check("việc đầu ngày: giữ thời lượng đã đặt", sd2.items[1].arriveMin, 8 * 60 + 15);

// Tắt tự tính đường đi: giờ đến nối thẳng giờ rời mục trước, không chặng, không cảnh báo.
{
  const off = scheduleDay(8 * 60, [PA, PB], { [legKey("A", "B")]: 200 }, { travel: false });
  check("tắt tự tính: giờ tới B = 8:00 + 90", off.items[1].arriveMin, 8 * 60 + 90);
  check("tắt tự tính: không vẽ chặng", off.items[0].legHidden, true);
  check("tắt tự tính: không cảnh báo chặng dài",
    off.items.flatMap((i) => i.warnings.map((w) => w.code)).includes("longDrive"), false);
}

console.log(`\n${pass} qua · ${fail} hỏng`);
process.exit(fail ? 1 : 0);
