import type { Metadata } from "next";
import {
  VariantCard,
  VariantCurrent,
  VariantEdge,
  VariantOnEdge,
  VariantPill,
  type Shot,
} from "./variants";

// Trang nháp: so sánh các kiểu "danh sách ảnh" ở hero trang điểm đến.
// Không đụng dữ liệu thật (ảnh picsum) nên xem được kể cả khi chưa có DB.
// Chốt kiểu nào thì bê JSX của kiểu đó vào place-hero-canvas.tsx.

export const metadata: Metadata = { title: "Nháp · Dải ảnh hero" };

const INTERVAL = 5000;
const TOTAL = 12; // giả lập: hero chỉ quay vòng 5 ảnh, thư viện có 12

const SHOTS: Shot[] = [
  { url: "https://picsum.photos/seed/halong-1/1600/1000", caption: "Vịnh Hạ Long" },
  { url: "https://picsum.photos/seed/halong-2/1600/1000", caption: "Đảo Ti Tốp" },
  { url: "https://picsum.photos/seed/halong-3/1600/1000", caption: "Hang Sửng Sốt" },
  { url: "https://picsum.photos/seed/halong-4/1600/1000", caption: "Bãi Cháy" },
  { url: "https://picsum.photos/seed/halong-5/1600/1000", caption: "Núi Bài Thơ" },
];

const VARIANTS = [
  {
    id: "A",
    name: "Bản đang chạy trên site",
    note: "Hàng ảnh + nhãn ghim theo ảnh đang mở + thanh trượt có xe làm núm. Mốc để so sánh: đầy đủ nhất, nhưng cũng chiếm nhiều chiều cao nhất và ba hàng vẫn là ba hàng.",
    Component: VariantCurrent,
  },
  {
    id: "B",
    name: "Tối giản tràn viền",
    note: "Bỏ hẳn ảnh nhỏ. Thanh chạy bám sát mép dưới hero, tràn hết bề ngang — nó thành đường kết của khung hình chứ không phải một widget đặt lên. Nhẹ nhất, nhường trọn chỗ cho ảnh. Đổi lại không xem trước được ảnh nào cả.",
    Component: VariantEdge,
  },
  {
    id: "C",
    name: "Viên kính gom tất cả",
    note: "Mọi thứ vào MỘT viên kính nổi: tạm dừng · thanh chạy · chấm chọn ảnh · thư viện. Ảnh nhỏ thu thành chấm nên viên gọn mà vẫn nhảy được tới ảnh bất kỳ. Gọn và dứt khoát, nhưng là một khối đặc nằm giữa hero.",
    Component: VariantPill,
  },
  {
    id: "D",
    name: "Thẻ kính lệch góc trái",
    note: "Cụm rời hẳn trục giữa cho tên điểm đến độc chiếm chính giữa. Thẻ cho xem trước ẢNH KẾ TIẾP thay vì cả hàng ảnh — hero đang chiếu ảnh hiện tại rồi, thứ người xem chưa biết là cái sắp tới. Trên mobile sẽ phải tính lại chỗ.",
    Component: VariantCard,
  },
  {
    id: "E",
    name: "Xe chạy trên mép hàng ảnh",
    note: "Không có rãnh riêng: mép trên của hàng ảnh chính là con đường. Ảnh đang mở CAO hơn hẳn — chênh lệch chiều cao thay cho viền đánh dấu. Ít chi tiết thừa nhất trong nhóm còn giữ ảnh nhỏ.",
    Component: VariantOnEdge,
  },
];

export default function DaiAnhPreviewPage() {
  return (
    <div className="min-h-dvh bg-background px-4 py-10 sm:px-6 lg:py-14">
      <div className="mx-auto max-w-[110rem]">
        <header className="mx-auto max-w-2xl text-center">
          <p className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-warm">
            Nháp
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Dải ảnh ở hero điểm đến
          </h1>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            Năm bố cục cho cùng một ý tưởng — chiếc xe máy chạy hết một lượt
            rồi đổi ảnh — đặt trong cùng một khung hero để so sánh cho công bằng. Cả năm đều chạy thật: tự đổi ảnh sau {INTERVAL / 1000}{" "}
            giây, bấm được, tạm dừng được. Chọn xong thì nói mã (A–E).
          </p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:mt-14 xl:grid-cols-2">
          {VARIANTS.map(({ id, name, note, Component }) => (
            <section key={id}>
              <div className="mb-3 flex items-baseline gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {id}
                </span>
                <h2 className="text-lg font-semibold tracking-tight">{name}</h2>
              </div>
              <p className="mb-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
                {note}
              </p>
              <Component shots={SHOTS} intervalMs={INTERVAL} total={TOTAL} />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
