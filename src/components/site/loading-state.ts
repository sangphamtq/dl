// Cờ "màn chờ điều hướng đang hiện", chia sẻ giữa `PageLoading` và
// `HeaderChrome`.
//
// Vì sao cần: header quyết định bản màu theo câu hỏi "sau lưng mình là ảnh hay
// là nền trang" (xem `header-chrome.tsx`), và nó suy ra điều đó từ ĐƯỜNG DẪN —
// trang có hero + chưa cuộn ⇒ đang nằm trên ảnh ⇒ kính trong, chữ trắng. Trong
// lúc chờ tải thì suy luận đó SAI: đường dẫn đã là trang mới nhưng hero chưa
// tồn tại, sau lưng chỉ có nền trắng, và chữ trắng trên nền trắng thì mất hút.
//
// Không dùng context được: màn chờ là Suspense fallback nằm ở nhánh `children`
// của layout, còn header là anh em của nó — không ai bọc ai. Nên dùng một store
// ngoài React, đúng khuôn `useSyncExternalStore` mà `HeaderChrome` vốn đã dùng
// cho vị trí cuộn.
let loading = false;
const subs = new Set<() => void>();

export function setPageLoading(next: boolean) {
  if (loading === next) return;
  loading = next;
  for (const cb of subs) cb();
}

export function subscribePageLoading(cb: () => void) {
  subs.add(cb);
  return () => subs.delete(cb);
}

export const getPageLoading = () => loading;
// Server luôn thấy `false`: HTML dựng sẵn không có màn chờ nào đang hiện.
export const getServerPageLoading = () => false;
