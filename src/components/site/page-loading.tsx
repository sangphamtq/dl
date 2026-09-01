import Image from "next/image";
import { LoadingFlag } from "./loading-flag";

// Màn chờ dùng chung cho các `loading.tsx` (Suspense fallback khi điều hướng).
//
// Có HAI file loading, không phải một, và đó là chuyện bắt buộc chứ không phải
// trùng lặp:
//   · `src/app/loading.tsx`        — boundary ở root: dùng cho `/login`,
//                                    `/offline` và LẦN ĐẦU vào một trang công khai;
//   · `src/app/(site)/loading.tsx` — boundary NẰM TRONG layout `(site)`.
//
// Vì sao cần cái thứ hai: từ khi header/chân trang dồn vào `(site)/layout.tsx`,
// điều hướng giữa hai trang công khai chỉ thay phần `children` của layout đó —
// layout được giữ nguyên, nên boundary ở root (vốn bọc từ NGOÀI layout) không
// bao giờ bị kích hoạt lại. Kết quả: bấm sang trang khác thì trình duyệt đứng
// im ở trang cũ suốt thời gian chờ dữ liệu (đo được ~530ms khi vào một trang
// điểm đến), không có dấu hiệu nào cho biết nó đang tải.
//
// ─── HÌNH THỨC: MASCOT TRONG MỘT VÒNG CUNG XOAY ────────────────────────────
//
// Đã thử và bỏ hai bản trước, ghi lại để khỏi quay vòng:
//   · **ảnh GIF mascot 1,7MB** đặt giữa trang — bóp băng thông xuống ~0,5 Mbps
//     để thử thì đúng lúc cần nhất (mạng chậm, chờ lâu) lại là lúc chính cái
//     ảnh chưa kịp về, màn chờ hiện ra trống trơn. Hạ xuống WebP 170KB vẫn là
//     một tệp phải tải trước khi thấy được gì;
//   · **vạch tiến trình 2px rồi 4px ở mép trên** — nhẹ và luôn đúng với mọi
//     trang, nhưng mảnh tới mức đọc ra như đường viền của header.
//
// Bản này lấy chỗ đứng của con mèo cũ (giữa vùng nội dung) nhưng bỏ hẳn tệp
// ảnh động: vòng cung là SVG vẽ tay, còn hình ở giữa là `logo_mark.png` — CÙNG
// tệp mà header và chân trang đã nạp ở mọi trang công khai, nên tới lúc màn chờ
// cần đến thì nó đã nằm sẵn trong cache. Không có byte nào phải chờ.
//
// Kèm `<LoadingFlag />`: một mảnh client không render gì, chỉ bật cờ
// `loading-state.ts` trong lúc màn chờ còn hiện. Header đọc cờ đó để KHÔNG dùng
// bản kính trong/chữ trắng — sau lưng nó lúc này là nền trang trống, không phải
// ảnh hero. Thiếu cờ này thì đúng lúc chờ vào một trang có hero, cả cụm chữ
// trên header biến mất (trắng trên trắng).
export function PageLoading() {
  return (
    <>
      <LoadingFlag />
      {/* `min-h-svh` (một màn hình đầy) để chân trang nằm dưới mép dưới trong
          lúc chờ — để `70vh` thì nó nhảy vọt lên giữa màn hình rồi lại tụt
          xuống khi nội dung về.
          `.page-loading` hoãn 120ms rồi mới hiện: chuyển trang nào xong nhanh
          hơn thế thì không ai thấy gì, khỏi một hình nháy lên rồi tắt. */}
      <div
        className="page-loading grid min-h-svh flex-1 place-items-center"
        role="status"
        aria-label="Đang tải trang"
      >
        <div className="relative grid size-[5.5rem] place-items-center">
          {/* Vòng cung: một đường tròn hairline làm nền + một cung ~27% chu vi
              xoay quanh. Cung tô bằng chuyển sắc xanh brand → cam, cùng cặp màu
              site vẫn dùng. r=22 ⇒ chu vi ≈ 138, nên `dasharray 38 100`.
              `motion-reduce:animate-none`: tắt hiệu ứng thì cung đứng yên —
              vẫn là một hình hoàn chỉnh, không biến mất. */}
          <svg
            aria-hidden
            viewBox="0 0 48 48"
            className="absolute inset-0 size-full animate-spin [animation-duration:1.4s] motion-reduce:animate-none"
          >
            <defs>
              {/* `userSpaceOnUse` + toạ độ đặt ĐÚNG hai đầu của cung: đuôi
                  cung ở 3 giờ (46,24) là xanh, đầu cung ở ~6 giờ rưỡi (21,46)
                  là cam. Dùng toạ độ mặc định (0→1 theo hộp bao) thì cung chỉ
                  cắt trúng một khúc của chuyển sắc nên nhìn ra MỘT màu, và vì
                  cả thẻ <svg> cùng xoay nên màu đó không bao giờ đổi. */}
              <linearGradient
                id="page-loading-arc"
                gradientUnits="userSpaceOnUse"
                x1="46"
                y1="24"
                x2="21"
                y2="46"
              >
                <stop offset="0%" stopColor="var(--brand)" />
                <stop offset="100%" stopColor="var(--warm)" />
              </linearGradient>
            </defs>
            <circle
              cx="24"
              cy="24"
              r="22"
              fill="none"
              strokeWidth="1.5"
              className="stroke-border"
            />
            <circle
              cx="24"
              cy="24"
              r="22"
              fill="none"
              stroke="url(#page-loading-arc)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="38 100"
            />
          </svg>
          {/* Mascot ĐỨNG YÊN giữa vòng: chỉ một thứ chuyển động, nếu cả hai
              cùng động thì mắt không biết bám vào đâu.
              Cỡ mascot ăn gần hết lòng vòng (48px trong vòng ~81px): để nhỏ
              hơn thì nó lọt thỏm, đọc ra như một cái huy hiệu rỗng ruột. */}
          <Image
            src="/logo_mark.png"
            alt=""
            width={48}
            height={56}
            priority
            className="h-12 w-auto"
          />
        </div>
      </div>
    </>
  );
}
