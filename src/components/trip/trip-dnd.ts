"use client";

import { useEffect, useRef, useState } from "react";
import type { DayView, ItemView, ResolvedItem } from "@/lib/trip";

// Trạng thái kéo–thả của trang soạn, tách khỏi phần dựng giao diện.
//
// Bài toán là "sortable nhiều vùng chứa": danh sách chưa xếp + mỗi ngày là một vùng, kéo
// được cả TRONG một vùng lẫn GIỮA các vùng. Vì vậy state không giữ nguyên các
// object mục mà giữ **danh sách id theo từng vùng** — đổi chỗ chỉ là hoán vị id.
//
// Vì sao cần bản sao cục bộ thay vì đọc thẳng props: mọi thao tác đều là server
// action rồi revalidate, tức là props chỉ đổi sau một vòng mạng. Không giữ bản
// cục bộ thì mục vừa thả sẽ nhảy về chỗ cũ rồi mới nhảy tới chỗ mới.

export const BACKLOG = "backlog";

export const dayKey = (dayId: string) => `day:${dayId}`;
export const dayIdOf = (key: string) => (key.startsWith("day:") ? key.slice(4) : null);

export type Board = Record<string, string[]>;

/** Giờ chưa tính được (mục vừa kéo từ danh sách chưa xếp sang) — RailItem hiện "···". */
const NO_TIME = -1;

export function toItemView(x: ItemView | ResolvedItem): ItemView {
  if ("arriveMin" in x) return x;
  return {
    ...x,
    arriveMin: NO_TIME,
    leaveMin: NO_TIME,
    effectiveStayMin: x.stayMin ?? 0,
    driveToNextMin: null,
    driveApprox: false,
    warnings: [],
  };
}

function buildBoard(days: DayView[], backlog: ResolvedItem[]): Board {
  const board: Board = { [BACKLOG]: backlog.map((i) => i.id) };
  for (const d of days) board[dayKey(d.id)] = d.items.map((i) => i.id);
  return board;
}

/** Dời một id tới chỗ của `overId` (hoặc vào cuối một vùng rỗng). Hàm THUẦN.
 *  Export để kiểm được bằng script — phép tính chỉ số khi đổi vùng là chỗ dễ sai nhất. */
export function applyMove(prev: Board, activeId: string, overId: string): Board {
  const from = Object.keys(prev).find((k) => prev[k].includes(activeId));
  const to = overId in prev ? overId : Object.keys(prev).find((k) => prev[k].includes(overId));
  if (!from || !to) return prev;
  if (from === to && activeId === overId) return prev;

  // CÙNG một vùng: chỉ số đích phải tính trên danh sách GỐC, trước khi gỡ mục
  // ra. Tính sau khi gỡ thì mọi lần kéo XUỐNG đều lệch một chỗ (kéo a xuống chỗ
  // c ra [b,a,c] thay vì [b,c,a]) — vì gỡ a xong thì c đã tụt lên một bậc.
  if (from === to) {
    const list = [...prev[from]];
    const oldIndex = list.indexOf(activeId);
    // Thả lên chính vùng chứa (khoảng trống dưới danh sách) → xuống cuối.
    const newIndex = overId in prev ? list.length - 1 : list.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0) return prev;
    list.splice(oldIndex, 1);
    list.splice(newIndex, 0, activeId);
    return { ...prev, [from]: list };
  }

  // Khác vùng: `dst` là bản sao của vùng đích và KHÔNG bị gỡ gì, nên chỉ số của
  // `overId` trên đó vốn đã đúng.
  const src = [...prev[from]];
  const dst = [...prev[to]];
  const oldIndex = src.indexOf(activeId);
  if (oldIndex < 0) return prev;

  src.splice(oldIndex, 1);
  const overIndex = overId in prev ? dst.length : dst.indexOf(overId);
  dst.splice(overIndex < 0 ? dst.length : overIndex, 0, activeId);

  return { ...prev, [from]: src, [to]: dst };
}

function signature(board: Board): string {
  return Object.keys(board)
    .sort()
    .map((k) => `${k}:${board[k].join(",")}`)
    .join("|");
}

export function useTripBoard(days: DayView[], backlog: ResolvedItem[]) {
  const [board, setBoard] = useState<Board>(() => buildBoard(days, backlog));
  const [activeId, setActiveId] = useState<string | null>(null);
  const dragging = useRef(false);

  // Đồng bộ lại từ server SAU khi thả. Chỉ nhận khi không đang kéo và khi chữ
  // ký thật sự khác — nếu không, mỗi lần cha render lại là bản cục bộ bị xoá.
  const fromProps = buildBoard(days, backlog);
  const propSig = signature(fromProps);
  const lastSig = useRef(propSig);
  useEffect(() => {
    if (dragging.current) return;
    if (propSig === lastSig.current) return;
    lastSig.current = propSig;
    setBoard(fromProps);
    // fromProps dựng lại mỗi render nhưng chỉ dùng khi chữ ký đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propSig]);

  const byId = new Map<string, ItemView>();
  for (const d of days) for (const i of d.items) byId.set(i.id, i);
  for (const i of backlog) byId.set(i.id, toItemView(i));

  /** Vùng chứa đang giữ một id. */
  function containerOf(id: string): string | null {
    if (id in board) return id; // thả vào vùng rỗng: id chính là vùng
    return Object.keys(board).find((k) => board[k].includes(id)) ?? null;
  }

  /** Dời trong lúc kéo (đổi vùng) — chỉ cập nhật cục bộ, chưa gọi server. */
  function moveLocal(activeId: string, overId: string) {
    setBoard((prev) => applyMove(prev, activeId, overId));
  }

  /**
   * Chốt vị trí khi thả: tính bàn mới, đặt state, VÀ trả về vị trí cuối để gọi
   * server. Phải tính đồng bộ ngay tại đây — đọc `board` ở lượt sau (kể cả qua
   * queueMicrotask) sẽ ra bàn CŨ vì setState chưa kịp áp dụng.
   */
  function commitMove(
    activeId: string,
    overId: string | null,
  ): { dayId: string | null; index: number } | null {
    const next = overId ? applyMove(board, activeId, overId) : board;
    if (overId) setBoard(next);

    const container = Object.keys(next).find((k) => next[k].includes(activeId));
    if (!container) return null;
    return {
      dayId: container === BACKLOG ? null : dayIdOf(container),
      index: next[container].indexOf(activeId),
    };
  }

  // Cờ đang-kéo bọc trong hàm chứ không trả ref ra ngoài: React Compiler cấm
  // sửa thẳng giá trị do hook trả về.
  function beginDrag(id: string) {
    dragging.current = true;
    setActiveId(id);
  }
  function endDrag() {
    dragging.current = false;
    setActiveId(null);
  }

  return {
    board,
    byId,
    activeId,
    beginDrag,
    endDrag,
    containerOf,
    moveLocal,
    commitMove,
    /** Ép nhận lại trạng thái từ server (dùng khi thả thất bại). */
    resetFromProps: () => setBoard(buildBoard(days, backlog)),
  };
}
