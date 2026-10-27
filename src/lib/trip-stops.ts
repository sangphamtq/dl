import { isTask, type TripItemKind } from "@/lib/trip-time";

/**
 * Một hàng của dòng thời gian: một mục gốc có giờ (nơi, hoạt động đứng riêng, việc tự gõ) và
 * các THẺ hoạt động của nó ("làm gì ở đây" — không giờ).
 * - `no`: số trên mốc, chỉ đếm NƠI và hoạt động; việc tự gõ (đặt xe, chờ người) không lấy số.
 * - `first`/`last`: chỉ số mục đầu/cuối của hàng trong ngày.
 */
export type Stop<T> = {
  item: T;
  tags: T[];
  first: number;
  last: number;
  no: number | null;
};

type StopInput = {
  id: string;
  kind: TripItemKind;
  parentId?: string | null;
  customPlace?: boolean;
  lat?: number | null;
  lng?: number | null;
};

/** Danh sách đã PHẲNG theo `flatten()` (mục gốc rồi ngay sau là các thẻ của nó). */
export function groupStops<T extends StopInput>(items: T[]): Stop<T>[] {
  const out: Stop<T>[] = [];
  let num = 0;
  items.forEach((item, i) => {
    const cur = out[out.length - 1];
    if (item.parentId && cur) {
      cur.tags.push(item);
      cur.last = i;
      return;
    }
    out.push({ item, tags: [], first: i, last: i, no: isTask(item) ? null : ++num });
  });
  return out;
}
