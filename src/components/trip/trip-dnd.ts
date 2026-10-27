"use client";

import { useEffect, useRef, useState } from "react";
import type { DayView, ItemView, ResolvedItem } from "@/lib/trip";
import { dropAt, type DropAt } from "@/lib/trip-drop";
import { isTask } from "@/lib/trip-time";

export const BACKLOG = "backlog";

export const dayKey = (dayId: string) => `day:${dayId}`;
export const dayIdOf = (key: string) => (key.startsWith("day:") ? key.slice(4) : null);
/** Dải thẻ hoạt động của một mục gốc — đi theo hàng khi kéo, bản thân không kéo được. */
export const doingsKey = (parentId: string) => `in:${parentId}`;
export const parentIdOf = (key: string) => (key.startsWith("in:") ? key.slice(3) : null);

/** Mục mà thời lượng là "mất bao lâu" (một việc) chứ không phải "ở lại bao lâu" (một nơi). */
export function canBeDoing(item: { kind: ItemView["kind"]; lat?: number | null; lng?: number | null; customPlace?: boolean }) {
  return item.kind === "activity" || isTask(item);
}

export type Board = Record<string, string[]>;

const NO_TIME = -1;

function toItemView(x: ItemView | ResolvedItem): ItemView {
  if ("arriveMin" in x) return x;
  return {
    ...x,
    arriveMin: NO_TIME,
    leaveMin: NO_TIME,
    effectiveStayMin: x.stayMin ?? 0,
    driveToNextMin: null,
    driveApprox: false,
    legHidden: false,
    driveKm: null,
    nested: false,
    stopNo: null,
    atName: null,
    warnings: [],
  };
}

/**
 * Vùng gốc (`backlog`, `day:X`) chỉ chứa MỤC GỐC; thẻ của mỗi mục gốc nằm ở `in:<id>` (luôn có,
 * kể cả rỗng). Danh sách vào đã phẳng: gốc rồi con.
 */
function buildBoard(days: DayView[], backlog: ResolvedItem[]): Board {
  const board: Board = {};
  const fill = (key: string, list: { id: string; parentId: string | null }[]) => {
    board[key] = [];
    for (const i of list)
      if (!i.parentId) {
        board[key].push(i.id);
        board[doingsKey(i.id)] = [];
      }
    for (const i of list) if (i.parentId) board[doingsKey(i.parentId)]?.push(i.id);
  };
  fill(BACKLOG, backlog);
  for (const d of days) fill(dayKey(d.id), d.items);
  return board;
}

export function applyMove(prev: Board, activeId: string, overId: string): Board {
  const from = Object.keys(prev).find((k) => prev[k].includes(activeId));
  const to = overId in prev ? overId : Object.keys(prev).find((k) => prev[k].includes(overId));
  if (!from || !to) return prev;
  if (from === to && activeId === overId) return prev;

  if (from === to) {
    const list = [...prev[from]];
    const oldIndex = list.indexOf(activeId);
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
  const dragging = useRef(false);

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

  function containerOf(id: string, b: Board = board): string | null {
    if (id in b) return id;
    return Object.keys(b).find((k) => b[k].includes(id)) ?? null;
  }

  /** Thẻ không kéo được, nên lỡ chạm vào dải thẻ của một hàng thì coi như thả lên CHÍNH hàng đó. */
  function resolveOver(overId: string): string {
    const to = containerOf(overId);
    return (to && parentIdOf(to)) || overId;
  }

  function commitMove(
    activeId: string,
    overId: string | null,
  ): { dayId: string | null; parentId: string | null; at: DropAt } | null {
    const target = overId ? resolveOver(overId) : null;
    const next = target && target !== activeId ? applyMove(board, activeId, target) : board;
    if (next !== board) setBoard(next);

    const container = containerOf(activeId, next);
    if (!container || container === activeId) return null;
    const parentId = parentIdOf(container);
    const home = parentId ? containerOf(parentId, next) : container;
    return {
      dayId: !home || home === BACKLOG ? null : dayIdOf(home),
      parentId,
      at: dropAt(next[container], activeId),
    };
  }

  // KHÔNG setState ở đây: bắt đầu kéo mà dựng lại cả trang soạn là khung hình đầu tiên giật.
  function beginDrag() {
    dragging.current = true;
  }
  function endDrag() {
    dragging.current = false;
  }

  return {
    board,
    byId,
    beginDrag,
    endDrag,
    containerOf,
    commitMove,
    resetFromProps: () => setBoard(buildBoard(days, backlog)),
  };
}
