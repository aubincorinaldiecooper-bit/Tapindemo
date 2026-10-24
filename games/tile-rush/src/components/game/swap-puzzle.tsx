import * as React from "react";
import type { PuzzleItem } from "@/components/ui/sliding-puzzle-gallery";

/** Booster controls the game screen can call. */
export interface SwapControls {
  /** Take back the last swap and refund its move. Returns false when there is nothing to undo. */
  undo: () => boolean;
  /** Make up to `steps` correct swaps for free, one at a time. Returns false when the board is not in play. */
  magic: (steps: number) => boolean;
  canUndo: () => boolean;
}

export interface SwapPuzzleProps {
  image: PuzzleItem;
  /** Tiles per side. */
  size: number;
  /** Fewest swaps needed to solve the scrambled board. */
  par: number;
  /** Same seed, same scramble: a level always starts from the same board. */
  seed: number;
  playable?: boolean;
  /** Print each tile's number. */
  numbers?: boolean;
  frameClassName?: string;
  onSolve?: (result: { moves: number }) => void;
  onMovesChange?: (moves: number) => void;
  controls?: React.Ref<SwapControls>;
}

const SWAP_MS = 220;
const MAGIC_STEP_MS = 320;
const DRAG_PX = 6;
/** Average colour difference (0–255) below which two tiles count as looking the same. */
const LOOK_ALIKE = 6;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Which cycle each position belongs to; the fewest swaps to sort a board is tiles minus cycles. */
function cycleIds(board: number[]): number[] {
  const ids = new Array<number>(board.length).fill(-1);
  let next = 0;
  for (let start = 0; start < board.length; start++) {
    if (ids[start] !== -1) continue;
    for (let p = start; ids[p] === -1; p = board[p]!) ids[p] = next;
    next++;
  }
  return ids;
}

function minSwaps(board: number[]): number {
  return board.length - new Set(cycleIds(board)).size;
}

/** Scramble so the board needs exactly `par` swaps: each swap joins two cycles, adding one needed swap. */
function scramble(tiles: number, par: number, seed: number): number[] {
  const rand = mulberry32(seed);
  const target = Math.max(1, Math.min(tiles - 1, par));
  const board = Array.from({ length: tiles }, (_, i) => i);
  while (minSwaps(board) < target) {
    const a = Math.floor(rand() * tiles);
    const b = Math.floor(rand() * tiles);
    const ids = cycleIds(board);
    if (a === b || ids[a] === ids[b]) continue;
    [board[a], board[b]] = [board[b]!, board[a]!];
  }
  return board;
}

function swapped(board: number[], a: number, b: number): number[] {
  const next = board.slice();
  [next[a], next[b]] = [next[b]!, next[a]!];
  return next;
}

export function SwapPuzzle({
  image,
  size,
  par,
  seed,
  playable = true,
  numbers = false,
  frameClassName,
  onSolve,
  onMovesChange,
  controls,
}: SwapPuzzleProps) {
  const n = size;
  const tiles = n * n;
  const [board, setBoard] = React.useState(() => scramble(tiles, par, seed));
  const [moves, setMoves] = React.useState(0);
  const [history, setHistory] = React.useState<Array<{ board: number[]; moves: number }>>([]);
  const [solved, setSolved] = React.useState(false);
  const [selected, setSelected] = React.useState<number | null>(null); // tile id
  const [drag, setDrag] = React.useState<{ id: number; dx: number; dy: number } | null>(null);
  const [magicLeft, setMagicLeft] = React.useState(0);
  const [cursor, setCursor] = React.useState<number | null>(null); // keyboard position
  const boardRef = React.useRef<HTMLDivElement>(null);
  const pointer = React.useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const looks = React.useRef<Uint8ClampedArray[] | null>(null);
  const canPlay = playable && !solved && magicLeft === 0;

  const onSolveRef = React.useRef(onSolve);
  onSolveRef.current = onSolve;
  const onMovesRef = React.useRef(onMovesChange);
  onMovesRef.current = onMovesChange;

  // What each tile's piece of the picture looks like, so tiles that look the same can stand in for each other.
  React.useEffect(() => {
    looks.current = null;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      try {
        const S = 16;
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = n * S;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, n * S, n * S);
        looks.current = Array.from({ length: tiles }, (_, id) => ctx.getImageData((id % n) * S, Math.floor(id / n) * S, S, S).data);
      } catch {
        looks.current = null; // Picture not readable: fall back to exact positions.
      }
    };
    img.src = image.src;
    return () => {
      cancelled = true;
    };
  }, [image.src, n, tiles]);

  const inPlace = React.useCallback(
    (id: number, pos: number) => {
      if (id === pos) return true;
      const t = looks.current;
      if (!t) return false;
      const x = t[id]!, y = t[pos]!;
      let diff = 0;
      for (let i = 0; i < x.length; i += 4) diff += Math.abs(x[i]! - y[i]!) + Math.abs(x[i + 1]! - y[i + 1]!) + Math.abs(x[i + 2]! - y[i + 2]!);
      return diff / ((x.length / 4) * 3) < LOOK_ALIKE;
    },
    [],
  );

  // Hidden counter of tiles in place; all in place means solved.
  React.useEffect(() => {
    if (solved) return;
    const count = board.filter((id, pos) => inPlace(id, pos)).length;
    if (count === tiles) {
      setSolved(true);
      setSelected(null);
      setMagicLeft(0);
      setBoard(Array.from({ length: tiles }, (_, i) => i));
      onSolveRef.current?.({ moves });
    }
  }, [board, solved, tiles, inPlace, moves]);

  React.useEffect(() => {
    onMovesRef.current?.(moves);
  }, [moves]);

  // Magic booster: one correct swap at a time, free of charge.
  React.useEffect(() => {
    if (magicLeft <= 0 || solved) return;
    const timer = window.setTimeout(() => {
      setBoard((b) => {
        const pos = b.findIndex((id, p) => !inPlace(id, p));
        if (pos < 0) return b;
        return swapped(b, pos, b.indexOf(pos));
      });
      setMagicLeft((m) => m - 1);
    }, MAGIC_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [magicLeft, solved, board, inPlace]);

  const doSwap = (a: number, b: number) => {
    if (!canPlay || a === b) return;
    setHistory((h) => [...h.slice(-49), { board, moves }]);
    setBoard(swapped(board, a, b));
    setMoves((m) => m + 1);
    setSelected(null);
  };

  React.useImperativeHandle(
    controls,
    () => ({
      undo: () => {
        const prev = history[history.length - 1];
        if (!prev || !canPlay) return false;
        setBoard(prev.board);
        setMoves(prev.moves);
        setHistory((h) => h.slice(0, -1));
        setSelected(null);
        return true;
      },
      magic: (steps: number) => {
        if (!canPlay) return false;
        setSelected(null);
        setMagicLeft(steps);
        return true;
      },
      canUndo: () => canPlay && history.length > 0,
    }),
    [history, canPlay],
  );

  const tap = (pos: number) => {
    if (!canPlay) return;
    const id = board[pos]!;
    if (selected === null) setSelected(id);
    else if (selected === id) setSelected(null);
    else doSwap(board.indexOf(selected), pos);
  };

  const posFromPoint = (x: number, y: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return -1;
    const col = Math.floor(((x - rect.left) / rect.width) * n);
    const row = Math.floor(((y - rect.top) / rect.height) * n);
    if (col < 0 || row < 0 || col >= n || row >= n) return -1;
    return row * n + col;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canPlay) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-tile]");
    if (!el) return;
    pointer.current = { id: Number(el.dataset.tile), x: e.clientX, y: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    setCursor(null);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointer.current;
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!p.moved && Math.hypot(dx, dy) > DRAG_PX) p.moved = true;
    if (p.moved) setDrag({ id: p.id, dx, dy });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointer.current;
    pointer.current = null;
    setDrag(null);
    if (!p) return;
    const from = board.indexOf(p.id);
    if (p.moved) {
      const to = posFromPoint(e.clientX, e.clientY);
      if (to >= 0 && to !== from) doSwap(from, to);
      else setSelected(null);
    } else {
      tap(from);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const at = cursor ?? 0;
    const row = Math.floor(at / n);
    const col = at % n;
    let next = at;
    if (e.key === "ArrowLeft" && col > 0) next = at - 1;
    else if (e.key === "ArrowRight" && col < n - 1) next = at + 1;
    else if (e.key === "ArrowUp" && row > 0) next = at - n;
    else if (e.key === "ArrowDown" && row < n - 1) next = at + n;
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (cursor !== null) tap(cursor);
      else setCursor(0);
      return;
    } else if (e.key === "Escape") {
      setSelected(null);
      return;
    } else return;
    e.preventDefault();
    setCursor(cursor === null ? 0 : next);
  };

  return (
    <div className={frameClassName ?? "rounded-[22px] bg-muted p-2.5 ring-1 ring-border"}>
      <div
        ref={boardRef}
        role="group"
        tabIndex={0}
        aria-label={`Swap puzzle of ${image.title ?? "a picture"}. Drag a tile onto another to swap them, or tap two tiles. With a keyboard, use the arrow keys and Enter.`}
        data-board
        data-phase={solved ? "solved" : "playing"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          pointer.current = null;
          setDrag(null);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setCursor(null)}
        className="relative aspect-square w-full touch-none select-none overflow-hidden rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {board.map((id, pos) => {
          const dragging = drag?.id === id;
          const isSelected = selected === id;
          const col = pos % n;
          const row = Math.floor(pos / n);
          const offset = dragging ? `translate(${drag.dx}px, ${drag.dy}px)` : "";
          return (
            <div
              key={id}
              data-tile={id}
              data-pos={pos}
              className={canPlay ? "absolute left-0 top-0 cursor-grab" : "absolute left-0 top-0"}
              style={{
                width: `${100 / n}%`,
                height: `${100 / n}%`,
                transform: `translate(${col * 100}%, ${row * 100}%) ${offset}`,
                transition: dragging ? "none" : `transform ${SWAP_MS}ms cubic-bezier(0.3, 0.7, 0.2, 1)`,
                zIndex: dragging ? 20 : isSelected ? 10 : 1,
              }}
            >
              <span
                aria-hidden
                className="absolute rounded-[7px] transition-[transform,box-shadow] duration-150"
                style={{
                  inset: 2,
                  backgroundImage: `url(${JSON.stringify(image.src)})`,
                  backgroundSize: `${n * 100}% ${n * 100}%`,
                  backgroundPosition: `${((id % n) / (n - 1)) * 100}% ${(Math.floor(id / n) / (n - 1)) * 100}%`,
                  boxShadow: dragging
                    ? "0 14px 28px -6px rgba(0,0,0,0.5)"
                    : "0 1px 2px rgba(0,0,0,0.3), 0 4px 10px -3px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 0 rgba(0,0,0,0.22)",
                  transform: dragging || isSelected ? "scale(1.06)" : undefined,
                  outline: isSelected ? "3px solid white" : cursor === pos ? "3px dashed white" : undefined,
                  outlineOffset: -3,
                }}
              />
              {numbers && (
                <span
                  aria-hidden
                  className="absolute left-[10%] top-[10%] rounded-full bg-black/55 px-1.5 font-mono text-[10px] leading-4 text-white"
                >
                  {id + 1}
                </span>
              )}
            </div>
          );
        })}
        <img
          src={image.src}
          alt={image.alt ?? image.title ?? ""}
          draggable={false}
          className="pointer-events-none absolute inset-0 z-30 size-full object-cover transition-opacity duration-500"
          style={{ opacity: solved ? 1 : 0, transitionDelay: solved ? "200ms" : "0ms" }}
        />
      </div>
    </div>
  );
}
