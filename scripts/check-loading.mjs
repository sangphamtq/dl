// Kiểm MÀN CHỜ có thật sự hiện khi chuyển trang hay không.
// Chạy: pnpm check:loading   (cần `pnpm dev` đang chạy ở cổng 3000)
//
// Vì sao đáng có bộ kiểm riêng: `loading.tsx` đặt SAI TẦNG thì không có gì báo
// lỗi — typecheck sạch, lint sạch, build sạch, trang vẫn chạy, chỉ là màn chờ
// im lặng. Đã xảy ra một lần: boundary nằm ở `(site)/loading.tsx`, mà `(site)`
// là route group nên không tạo segment URL — nó không chạy cho route lồng dưới.
//
// Cách kiểm: Chrome headless qua CDP, bóp mạng xuống 3G, BẤM THẬT một link rồi
// hỏi DOM liên tục xem `.page-loading` có xuất hiện không.
//
// ⚠️ Đã thử và bỏ hai cách đo "thông minh" hơn, đừng quay lại: MutationObserver
// ghi vào `sessionStorage`, và `Page.addScriptToEvaluateOnNewDocument`. Cả hai
// cho ÂM TÍNH GIẢ — link nào gây điều hướng cứng thì context JS bị thay và bộ
// theo dõi chết theo. Hỏi thẳng DOM thì thô nhưng không nói dối.
import { spawn } from "node:child_process";

const PORT = 9222;
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const CHROME =
  process.env.CHROME ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// [từ trang, bộ chọn link để bấm]
const CASES = [
  ["/diem-den", 'a[href^="/diem-den/"]'],
  ["/dia-diem", 'a[href^="/dia-diem/"]'],
  ["/blog", 'a[href^="/blog/"]'],
  ["/lich-trinh", 'a[href^="/lich-trinh/"]'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=/tmp/_check-loading-${process.pid}`,
  "about:blank",
]);
process.on("exit", () => chrome.kill());

async function wsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (
        await fetch(`http://127.0.0.1:${PORT}/json/list`)
      ).json();
      const p = list.find((t) => t.type === "page");
      if (p?.webSocketDebuggerUrl) return p.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("không kết nối được Chrome debug port");
}

const ws = new WebSocket(await wsUrl());
await new Promise((r) => (ws.onopen = r));

let id = 0;
const waiters = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && waiters.has(msg.id)) {
    waiters.get(msg.id)(msg.result ?? msg.error);
    waiters.delete(msg.id);
  }
};
const send = (method, params = {}) =>
  new Promise((res) => {
    const n = ++id;
    waiters.set(n, res);
    ws.send(JSON.stringify({ id: n, method, params }));
  });
const evaluate = async (expression) =>
  (
    await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
  )?.result?.value;

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
// Slow 3G: ~400 kbps, RTT 400ms — đủ chậm để vượt ngưỡng hoãn 120ms của màn chờ.
await send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 400,
  downloadThroughput: (400 * 1024) / 8,
  uploadThroughput: (400 * 1024) / 8,
});

let pass = 0;
let fail = 0;
let skip = 0;

for (const [from, selector] of CASES) {
  await send("Page.navigate", { url: `${BASE}${from}` });
  for (let i = 0; i < 160; i++) {
    if (await evaluate(`document.readyState === "complete"`)) break;
    await sleep(500);
  }
  await sleep(2000); // chờ hydrate: bấm sớm quá thì thành điều hướng cứng

  const href = await evaluate(`
    (() => {
      const a = [...document.querySelectorAll(${JSON.stringify(selector)})]
        .find(x => !x.getAttribute('href').includes('?'));
      if (!a) return null;
      a.click();
      return a.getAttribute('href');
    })()
  `);

  if (!href) {
    // Không có link để bấm = trang chưa có dữ liệu, KHÔNG phải màn chờ hỏng.
    console.log(`SKIP  ${from} — không có link khớp ${selector} (thiếu dữ liệu?)`);
    skip++;
    continue;
  }

  const t0 = Date.now();
  let hits = 0;
  for (let i = 0; i < 60; i++) {
    if (await evaluate(`!!document.querySelector('.page-loading')`)) hits++;
    const moved = await evaluate(
      `location.pathname !== ${JSON.stringify(from)}`,
    );
    if (moved && hits > 0) break;
    await sleep(30);
  }
  const took = Date.now() - t0;
  const seen = hits > 0;

  console.log(`${seen ? "OK  " : "FAIL"}  ${from} → ${href}  (~${took}ms)`);
  if (seen) pass++;
  else fail++;
}

ws.close();
chrome.kill();
console.log(`\n${pass} qua · ${fail} hỏng · ${skip} bỏ qua`);
process.exit(fail ? 1 : 0);
