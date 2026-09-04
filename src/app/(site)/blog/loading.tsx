import { PageLoading } from "@/components/site/page-loading";

// `loading.tsx` phải nằm trong một SEGMENT URL THẬT. Bản ở `(site)/loading.tsx`
// không bao giờ chạy cho các route lồng bên dưới vì `(site)` là route group —
// nó không tạo ra segment nào trong URL. Đã đo: xem `pnpm check:loading`.
export default function Loading() {
  return <PageLoading />;
}
