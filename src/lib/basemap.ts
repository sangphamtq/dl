// Tile nền của mọi bản đồ trong site (CARTO raster).
//
// Ba bản đồ — toàn quốc (`/ban-do`), theo điểm đến (`/diem-den/[slug]/ban-do`)
// và lịch trình — trước đây mỗi cái tự ghép URL riêng. Gộp về đây vì URL nay có
// thêm API key: ba bản chép thì chắc chắn có ngày một cái bị bỏ quên và lại hiện
// watermark "API key required".
//
// ⚠️ Key này KHÔNG bí mật được. Trình duyệt phải tự gọi tile nên nó luôn nằm
// trong URL request, ai mở devtools cũng thấy — dùng `NEXT_PUBLIC_` là đúng bản
// chất, không phải cẩu thả. Muốn chặn người khác xài ké thì giới hạn domain
// trong bảng điều khiển CARTO, đừng trông vào việc giấu chuỗi.
//
// Thiếu key thì bản đồ VẪN CHẠY, chỉ là có watermark — cùng cách xử lý với
// Ably/PostHog: thiếu cấu hình thì giảm chất lượng chứ không vỡ.
const KEY = process.env.NEXT_PUBLIC_CARTO_KEY;

export type BasemapStyle = "voyager" | "dark_all";

export function cartoTileUrl(style: BasemapStyle): string {
  const url = `https://{s}.basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}.png`;
  return KEY ? `${url}?key=${KEY}` : url;
}

export const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
