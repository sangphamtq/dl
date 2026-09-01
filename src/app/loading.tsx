import { PageLoading } from "@/components/site/page-loading";

// Boundary ở ROOT: `/login`, `/offline` và lần đầu vào một trang công khai.
// Điều hướng GIỮA các trang công khai dùng boundary riêng ở `(site)/loading.tsx`
// — lý do ở trong `PageLoading`. (CMS có loading riêng.)
export default function Loading() {
  return <PageLoading />;
}
