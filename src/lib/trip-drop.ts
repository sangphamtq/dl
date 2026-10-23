/**
 * Vị trí thả gửi bằng HAI mục lân cận mà người kéo đang thấy, KHÔNG bằng chỉ số:
 * chỉ số chỉ đúng trên đúng bản client đang có, còn "nằm giữa X và Y" vẫn đúng ý
 * khi người khác vừa thêm/dời mục trong cùng ngày.
 */
export type DropAt = "start" | "end" | { afterId: string | null; beforeId: string | null };

export function dropAt(list: string[], id: string): DropAt {
  const i = list.indexOf(id);
  return { afterId: list[i - 1] ?? null, beforeId: list[i + 1] ?? null };
}

/** `ids` là danh sách trên server, ĐÃ gỡ mục đang dời. */
export function placeAt(ids: string[], at: DropAt): number {
  if (at === "start") return 0;
  if (at === "end" || at.beforeId === null) return ids.length;
  if (at.afterId === null) return 0;
  const a = ids.indexOf(at.afterId);
  if (a >= 0) return a + 1;
  const b = ids.indexOf(at.beforeId);
  return b >= 0 ? b : ids.length;
}

/** Chỗ chèn thứ `index` (0 = đầu, `ids.length` = cuối) của một danh sách đang hiện. */
export function insertAt(
  ids: string[],
  index: number,
  nameOf: (id: string) => string,
): { at: DropAt; where?: string } {
  const afterId = ids[index - 1] ?? null;
  const beforeId = ids[index] ?? null;
  if (!beforeId) return { at: "end", where: afterId ? `sau ${nameOf(afterId)}` : undefined };
  return {
    at: { afterId, beforeId },
    where: afterId
      ? `giữa ${nameOf(afterId)} và ${nameOf(beforeId)}`
      : `trước ${nameOf(beforeId)}`,
  };
}
