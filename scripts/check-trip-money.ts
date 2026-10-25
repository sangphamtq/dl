import { balances, ceilTo, fundSummary, partsOf, personSummary, settlements, splitEven, splitShares } from "@/lib/trip-money";

let pass = 0, fail = 0;
function ok(name: string, cond: boolean, got?: unknown) {
  console.log(`${cond ? "OK  " : "FAIL"}  ${name}${cond ? "" : "  → " + JSON.stringify(got)}`);
  if (cond) pass++;
  else fail++;
}
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const A = "a", B = "b", C = "c";

ok("100.000 chia 3 → tổng vẫn đúng", sum(splitEven(100_000, 3)) === 100_000, splitEven(100_000, 3));
ok("100.000 chia 3 → 33334/33333/33333", JSON.stringify(splitEven(100_000, 3)) === "[33334,33333,33333]", splitEven(100_000, 3));
ok("chia cho 0 người → rỗng", splitEven(1000, 0).length === 0);
ok("chia hết thì đều tăm tắp", JSON.stringify(splitEven(900, 3)) === "[300,300,300]");

const sh = splitShares(100_000, [A, B, C], A);
ok("100k chia 3, A ứng tiền → B và C mỗi người 34.000 tròn",
  sh.get(B) === 34_000 && sh.get(C) === 34_000, [...sh]);
ok("… A chịu phần lẻ 32.000", sh.get(A) === 32_000, [...sh]);
ok("… tổng vẫn đúng 100.000", sum([...sh.values()]) === 100_000, [...sh]);
ok("người phải chuyển khoản luôn được số TRÒN NGHÌN",
  [B, C].every((id) => (sh.get(id) ?? 0) % 1000 === 0), [...sh]);

const sh2 = splitShares(900_000, [A, B, C], A);
ok("chia hết sẵn thì không đẻ ra số lẻ", [...sh2.values()].every((v) => v === 300_000), [...sh2]);

const sh3 = splitShares(1_000, [A, B, C], A);
ok("khoản quá nhỏ → quay về chia đều chính xác", sum([...sh3.values()]) === 1_000, [...sh3]);

ok("người ứng tiền không nằm trong danh sách chia → người đầu hứng lẻ",
  sum([...splitShares(100_000, [B, C], A).values()]) === 100_000);

ok("ceilTo làm tròn LÊN", ceilTo(33_333) === 34_000 && ceilTo(34_000) === 34_000 && ceilTo(1) === 1_000);

const bal1 = balances(
  [{ amount: 900_000, paidById: A, shareIds: [A, B, C] }],
  [A, B, C],
);
ok("A ứng 900k cho 3 người → A +600k", bal1.get(A) === 600_000, [...bal1]);
ok("… B và C mỗi người −300k", bal1.get(B) === -300_000 && bal1.get(C) === -300_000);
ok("tổng số dư luôn bằng 0", sum([...bal1.values()]) === 0);

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

const bal3 = balances([{ amount: 300_000, paidById: "gone", shareIds: [A, B] }], [A, B]);
ok("người đã rời chuyến vẫn vào sổ", sum([...bal3.values()]) === 0, [...bal3]);

const st = settlements(bal1);
ok("một chủ nợ, hai con nợ → 2 lượt", st.length === 2, st);
ok("… đều trả về A", st.every((s) => s.toId === A), st);
ok("… tổng trả đúng bằng phần A ứng thêm", sum(st.map((s) => s.amount)) === 600_000, st);
ok("hoà nhau thì không có lượt nào", settlements(new Map([[A, 0], [B, 0]])).length === 0);

// --- Quỹ chung: A giữ quỹ, cả ba góp 500k, quỹ chi 900k chia ba ---
const fundEx = [
  { amount: 500_000, paidById: A, shareIds: [], kind: "contribution" as const },
  { amount: 500_000, paidById: B, shareIds: [], kind: "contribution" as const },
  { amount: 500_000, paidById: C, shareIds: [], kind: "contribution" as const },
  { amount: 900_000, paidById: null, shareIds: [A, B, C], fromFund: true },
];
const fb = balances(fundEx, [A, B, C], A);
ok("quỹ: tổng số dư vẫn bằng 0", sum([...fb.values()]) === 0, [...fb]);
ok("quỹ dư 600k → B và C mỗi người được nhận lại 200k", fb.get(B) === 200_000 && fb.get(C) === 200_000, [...fb]);
const fst = settlements(fb);
ok("… người GIỮ quỹ trả lại, đúng 2 lượt", fst.length === 2 && fst.every((t) => t.fromId === A), fst);
const fs = fundSummary(fundEx);
ok("tóm tắt quỹ: góp 1,5tr, chi 900k, còn 600k", fs.contributed === 1_500_000 && fs.spent === 900_000 && fs.left === 600_000, fs);
const pB = personSummary(fundEx, B);
ok("từng người: B tiêu 300k, trả hộ 0, góp 500k", pB.spent === 300_000 && pB.paid === 0 && pB.contributed === 500_000, pB);

// Quỹ hụt: góp 300k, quỹ chi 900k ⇒ người dùng quỹ phải góp thêm cho người giữ.
const short = balances(
  [
    { amount: 300_000, paidById: A, shareIds: [], kind: "contribution" as const },
    { amount: 900_000, paidById: null, shareIds: [A, B, C], fromFund: true },
  ],
  [A, B, C],
  A,
);
ok("quỹ hụt: tổng vẫn bằng 0", sum([...short.values()]) === 0, [...short]);
ok("… B và C mỗi người góp thêm 300k cho người giữ", short.get(B) === -300_000 && short.get(C) === -300_000, [...short]);

// Trộn: quỹ + một người ứng riêng.
const mix = balances(
  [
    { amount: 600_000, paidById: B, shareIds: [], kind: "contribution" as const },
    { amount: 300_000, paidById: null, shareIds: [A, B, C], fromFund: true },
    { amount: 90_000, paidById: C, shareIds: [A, B, C] },
  ],
  [A, B, C],
  A,
);
ok("trộn quỹ + ứng riêng: tổng vẫn bằng 0", sum([...mix.values()]) === 0, [...mix]);

// --- Chia KHÔNG đều: A trả 500k, A chịu 100k, B 150k, C 250k ---
const uneven = { amount: 500_000, paidById: A, shareIds: [A, B, C], shareAmounts: { [A]: 100_000, [B]: 150_000, [C]: 250_000 } };
const pu = partsOf(uneven);
ok("không đều: lấy đúng số đã nhập", pu.get(B) === 150_000 && pu.get(C) === 250_000, [...pu]);
const bu = balances([uneven], [A, B, C]);
ok("không đều: A được nhận 400k, B trả 150k, C trả 250k",
  bu.get(A) === 400_000 && bu.get(B) === -150_000 && bu.get(C) === -250_000, [...bu]);
ok("không đều: tổng số dư vẫn bằng 0", sum([...bu.values()]) === 0, [...bu]);
ok("không đều + quỹ trả: tổng vẫn bằng 0",
  sum([...balances([{ ...uneven, paidById: null, fromFund: true }], [A, B, C], A).values()]) === 0);
ok("từng người: C tiêu đúng 250k", personSummary([uneven], C).spent === 250_000);

console.log(`\n${pass} qua · ${fail} hỏng`);
if (fail) process.exit(1);
