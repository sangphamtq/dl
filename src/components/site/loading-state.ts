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
export const getServerPageLoading = () => false;
