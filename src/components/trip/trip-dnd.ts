"use client";

import { useEffect, useRef, useState } from "react";
import type { DayView, ItemView, ResolvedItem } from "@/lib/trip";

export const BACKLOG = "backlog";

export const dayKey = (dayId: string) => `day:${dayId}`;
export const dayIdOf = (key: string) => (key.startsWith("day:") ? key.slice(4) : null);

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
    warnings: [],
  };
}

function buildBoard(days: DayView[], backlog: ResolvedItem[]): Board {
  const board: Board = { [BACKLOG]: backlog.map((i) => i.id) };
  for (const d of days) board[dayKey(d.id)] = d.items.map((i) => i.id);
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
  const [activeId, setActiveId] = useState<string | null>(null);
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

  function containerOf(id: string): string | null {
    if (id in board) return id;
    return Object.keys(board).find((k) => board[k].includes(id)) ?? null;
  }

  function moveLocal(activeId: string, overId: string) {
    setBoard((prev) => applyMove(prev, activeId, overId));
  }

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
    resetFromProps: () => setBoard(buildBoard(days, backlog)),
  };
}
