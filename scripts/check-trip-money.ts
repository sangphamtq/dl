// Kiểm phần TOÁN CHIA TIỀN của mục Chi phí (docs/lich-trinh-cong-cu-nhom.md §13).
// Chạy: pnpm check:trip-money   — thuần logic, không cần DB.
//
// Tiền bạc là chỗ sai một đồng cũng thành mất niềm tin, mà lỗi chia lẻ thì
// không bao giờ lộ qua typecheck.
import { balances, ceilTo, settlements, splitEven, splitShares } from "@/lib/trip-money";

let pass = 0, fail = 0;
function ok(name: string, cond: boolean, got?: unknown) {
  console.log(`${cond ? "OK  " : "FAIL"}  ${name}${cond ? "" : "  → " + JSON.stringify(got)}`);
  if (cond) pass++;
  else fail++;
}
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const A = "a", B = "b", C = "c";

// ── chia đều, không rơi mất đồng nào ────────────────────────────────
ok("100.000 chia 3 → tổng vẫn đúng", sum(splitEven(100_000, 3)) === 100_000, splitEven(100_000, 3));
ok("100.000 chia 3 → 33334/33333/33333", JSON.stringify(splitEven(100_000, 3)) === "[33334,33333,33333]", splitEven(100_000, 3));
ok("chia cho 0 người → rỗng", splitEven(1000, 0).length === 0);
ok("chia hết thì đều tăm tắp", JSON.stringify(splitEven(900, 3)) === "[300,300,300]");

// ── chia LÀM TRÒN LÊN NGHÌN, tổng vẫn đúng ──────────────────────────
const sh = splitShares(100_000, [A, B, C], A); // A ứng tiền → A hứng phần lẻ
ok("100k chia 3, A ứng tiền → B và C mỗi người 34.000 tròn",
  sh.get(B) === 34_000 && sh.get(C) === 34_000, [...sh]);
ok("… A chịu phần lẻ 32.000", sh.get(A) === 32_000, [...sh]);
ok("… tổng vẫn đúng 100.000", sum([...sh.values()]) === 100_000, [...sh]);
ok("người phải chuyển khoản luôn được số TRÒN NGHÌN",
  [B, C].every((id) => (sh.get(id) ?? 0) % 1000 === 0), [...sh]);

const sh2 = splitShares(900_000, [A, B, C], A);
ok("chia hết sẵn thì không đẻ ra số lẻ", [...sh2.values()].every((v) => v === 300_000), [...sh2]);

// Khoản quá nhỏ so với số người: làm tròn lên sẽ vượt quá số gốc → quay về chia
// đều chính xác, thà số lẻ còn hơn bịa ra tiền không có.
const sh3 = splitShares(1_000, [A, B, C], A);
ok("khoản quá nhỏ → quay về chia đều chính xác", sum([...sh3.values()]) === 1_000, [...sh3]);

ok("người ứng tiền không nằm trong danh sách chia → người đầu hứng lẻ",
  sum([...splitShares(100_000, [B, C], A).values()]) === 100_000);

ok("ceilTo làm tròn LÊN", ceilTo(33_333) === 34_000 && ceilTo(34_000) === 34_000 && ceilTo(1) === 1_000);

// ── số dư ───────────────────────────────────────────────────────────
const bal1 = balances(
  [{ amount: 900_000, paidById: A, shareIds: [A, B, C] }],
  [A, B, C],
);
ok("A ứng 900k cho 3 người → A +600k", bal1.get(A) === 600_000, [...bal1]);
ok("… B và C mỗi người −300k", bal1.get(B) === -300_000 && bal1.get(C) === -300_000);
ok("tổng số dư luôn bằng 0", sum([...bal1.values()]) === 0);

// Bất biến quan trọng nhất sau khi làm tròn: số phải CHUYỂN luôn tròn nghìn.
const balOdd = balances([{ amount: 100_000, paidById: A, shareIds: [A, B, C] }], [A, B, C]);
ok("số dư sau làm tròn vẫn tổng 0", sum([...balOdd.values()]) === 0, [...balOdd]);
ok("mọi lượt chuyển khoản đều tròn nghìn",
  settlements(balOdd).every((s) => s.amount % 1000 === 0), settlements(balOdd));

const bal2 = balances(
  [
    { amount: 900_000, paidById: A, shareIds: [A, B, C] },
    { amount: 300_000, paidById: B, shareIds: [A, B, C] },
    { amount: 100_000, paidById: C, shareIds: [B, C] }, // A không ăn bữa này
  ],
  [A, B, C],
);
ok("nhiều khoản: tổng vẫn bằng 0", sum([...bal2.values()]) === 0, [...bal2]);
ok("khoản chỉ chia cho 2 người thì A không chịu", bal2.get(A) === 900_000 - 300_000 - 100_000, [...bal2]);

// Người đã rời chuyến vẫn phải được tính, nếu không tổng lệch khỏi 0.
const bal3 = balances([{ amount: 300_000, paidById: "gone", shareIds: [A, B] }], [A, B]);
ok("người đã rời chuyến vẫn vào sổ", sum([...bal3.values()]) === 0, [...bal3]);

// ── ai trả ai ───────────────────────────────────────────────────────
const st = settlements(bal1);
ok("một chủ nợ, hai con nợ → 2 lượt", st.length === 2, st);
ok("… đều trả về A", st.every((s) => s.toId === A), st);
ok("… tổng trả đúng bằng phần A ứng thêm", sum(st.map((s) => s.amount)) === 600_000, st);
ok("hoà nhau thì không có lượt nào", settlements(new Map([[A, 0], [B, 0]])).length === 0);

console.log(`\n${pass} qua · ${fail} hỏng`);
if (fail) process.exit(1);
