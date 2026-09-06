// Sinh favicon `src/app/icon.png` từ hình vẽ nội tuyến bên dưới.
// Chạy: pnpm build:favicon
//
// VÌ SAO KHÔNG DÙNG THẲNG MASCOT như bộ `public/icons/`: favicon sống ở 16px.
// Ở cỡ đó bản mascot đầy đủ rã thành MỘT Ô XANH ĐẶC chạm cả bốn mép — mặt,
// bánh xe, tay, viền đều biến mất, chỉ còn một vệt vàng mờ ở đỉnh (đo bằng
// cách hạ ảnh xuống 16×16 rồi đọc từng pixel). Nó không sai màu, nó chỉ không
// còn là một dấu hiệu nhận ra được giữa hàng chục tab.
//
// Nên favicon lấy đúng hai thứ SỐNG SÓT ở 16px: nền xanh thương hiệu và bóng
// chiếc NÓN LÁ — chi tiết đặc trưng nhất của mascot và cũng là hình đơn giản
// nhất trong đó. Bộ `public/icons/` (192–512px, màn hình chính) vẫn giữ mascot
// đầy đủ: ở cỡ ấy chi tiết đọc được nên không có lý do gì rút gọn.
//
// Ô ĐẶC chứ không phải hình nền trong suốt: nền trong suốt thì trên thanh tab
// sáng lẫn tối đều mất mép, và cả site vốn chạy ngôn ngữ hình khối vuông.
import sharp from "sharp";

const BRAND = "#2e871c"; // --brand trong globals.css
const HAT = "#fdf1cf"; // kem ấm, cùng họ với --warm-bright

// Nón lá nhìn thẳng: chóp trên, vành dưới cong VÕNG XUỐNG hai bên.
// Vẽ trên khung 512 rồi hạ cỡ — mọi kích thước dùng chung một nguồn.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BRAND}"/>
  <path fill="${HAT}" d="M256 84 Q288 148 466 358 Q256 430 46 358 Q224 148 256 84 Z"/>
</svg>`;

const out = "src/app/icon.png";
await sharp(Buffer.from(svg)).resize(256, 256).png().toFile(out);
console.log(`✓ ${out} — 256×256`);
