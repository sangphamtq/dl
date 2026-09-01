import { PageLoading } from "@/components/site/page-loading";

// Boundary NẰM TRONG layout `(site)` — thứ thực sự chạy khi đi từ trang công
// khai này sang trang công khai khác. Header, chân trang và nút lịch trình giữ
// nguyên; chỉ vùng nội dung đổi sang màn chờ. Xem `PageLoading`.
export default function Loading() {
  return <PageLoading />;
}
