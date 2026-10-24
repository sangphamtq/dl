import { isTask, type TripItemKind } from "@/lib/trip-time";

/**
 * Một hàng "Ở đâu | Làm gì" của dòng thời gian.
 * - `place`: mục làm cột trái (địa điểm, quán, chỗ ở…), hoặc null khi nơi đó KHÔNG phải
 *   một mục của chuyến — hoạt động đứng riêng (nơi = `placeName`, Spot đầu tiên của nó)
 *   hay việc đứng đầu ngày trước mọi nơi (`placeName` cũng null).
 * - `doings`: hoạt động đang lồng + việc tự thêm diễn ra tại đó, đúng thứ tự trong ngày.
 * - `first`/`last`: chỉ số mục đầu/cuối của hàng trong ngày — để chèn ngay sau hàng.
 */
export type Stop<T> = {
  place: T | null;
  placeName: string | null;
  doings: T[];
  first: number;
  last: number;
  no: number;
};

type StopInput = {
  id: string;
  kind: TripItemKind;
  parentId?: string | null;
  customPlace?: boolean;
  lat?: number | null;
  lng?: number | null;
  atName?: string | null;
};

/**
 * Danh sách đã PHẲNG theo `flatten()` (mục gốc rồi ngay sau là các việc của nó).
 * Mục gốc là một nơi ⇒ một hàng có nơi. Mục gốc là việc / hoạt động ⇒ hàng không có mục nơi
 * (hoạt động thì ghi nơi của nó), chính nó đứng đầu cột "Làm gì".
 */
export function groupStops<T extends StopInput>(items: T[]): Stop<T>[] {
  const out: Stop<T>[] = [];
  items.forEach((item, i) => {
    const cur = out[out.length - 1];
    if (item.parentId && cur) {
      cur.doings.push(item);
      cur.last = i;
      return;
    }
    const no = out.length + 1;
    if (isTask(item) || item.kind === "activity") {
      out.push({
        place: null,
        placeName: item.kind === "activity" ? (item.atName ?? null) : null,
        doings: [item],
        first: i,
        last: i,
        no,
      });
      return;
    }
    out.push({ place: item, placeName: null, doings: [], first: i, last: i, no });
  });
  return out;
}
