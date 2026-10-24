import * as React from "react";
import type { PuzzleItem } from "@/components/ui/sliding-puzzle-gallery";
import { GemIcon } from "@/components/game/ui";
import { completeLines, neighbourPositions } from "@/lib/swapLevel";
import type { Built } from "@/lib/swapLevel";

/** Booster controls the game screen can call. */
export interface SwapControls {
  /** Take back the last swap and refund its moves. Returns false when there is nothing to undo. */
  undo: () => boolean;
  /** Make up to `steps` correct swaps for free, one at a time. Returns false when the board is not in play. */
  magic: (steps: number) => boolean;
  canUndo: () => boolean;
}

export interface SwapPuzzleProps {
  image: PuzzleItem;
  /** The scrambled board with its obstacles and gems. */
  built: Built;
  playable?: boolean;
  frameClassName?: string;
  onSolve?: (result: { moves: number }) => void;
  onMovesChange?: (moves: number) => void;
  /** Called with how many gems have been collected so far on this level. */
  onGemsChange?: (count: number) => void;
  /** Called whenever tiles visibly move (a swap, an undo or a Magic step); `placed` is true when a tile landed in its right spot. */
  onMove?: (placed: boolean) => void;
  controls?: React.Ref<SwapControls>;
}

type Snapshot = { board: number[]; moves: number; thawed: number[]; chainBroken: boolean; lines: string[] };

const SWAP_MS = 220;
const MAGIC_STEP_MS = 320;
const DRAG_PX = 6;
const TOAST_MS = 1800;
/** Average colour difference (0–255) below which two tiles count as looking the same. */
const LOOK_ALIKE = 6;

function swapped(board: number[], a: number, b: number): number[] {
  const next = board.slice();
  [next[a], next[b]] = [next[b]!, next[a]!];
  return next;
}

export function SwapPuzzle({
  image,
  built,
  playable = true,
  frameClassName,
  onSolve,
  onMovesChange,
  onGemsChange,
  onMove,
  controls,
}: SwapPuzzleProps) {
  const n = built.size;
  const tiles = n * n;
  const { frozen: frozenIds, chain, gems: gemIds } = built;
  const [board, setBoard] = React.useState(() => built.board);
  const [moves, setMoves] = React.useState(0);
  const [history, setHistory] = React.useState<Snapshot[]>([]);
  const [solved, setSolved] = React.useState(false);
  const [selected, setSelected] = React.useState<number | null>(null); // tile id
  const [drag, setDrag] = React.useState<{ id: number; dx: number; dy: number } | null>(null);
  const [magicLeft, setMagicLeft] = React.useState(0);
  const [cursor, setCursor] = React.useState<number | null>(null); // keyboard position
  const [thawed, setThawed] = React.useState<number[]>([]);
  const [chainBroken, setChainBroken] = React.useState(false);
  const [gemsFound, setGemsFound] = React.useState<number[]>([]);
  // Lines already complete at the start (or already rewarded) pay nothing.
  const [lines, setLines] = React.useState<string[]>(() => completeLines(built.board, n, (id, pos) => id === pos));
  const [toast, setToast] = React.useState<{ id: number; text: string } | null>(null);
  const boardRef = React.useRef<HTMLDivElement>(null);
  const pointer = React.useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const looks = React.useRef<Uint8ClampedArray[] | null>(null);
  const bonusEligible = React.useRef(false);
  // A level can't finish before the first swap or Magic step, even if the scramble happens to look solved.
  const acted = React.useRef(false);
  const canPlay = playable && !solved && magicLeft === 0;

  const onSolveRef = React.useRef(onSolve);
  onSolveRef.current = onSolve;
  const onMovesRef = React.useRef(onMovesChange);
  onMovesRef.current = onMovesChange;
  const onGemsRef = React.useRef(onGemsChange);
  onGemsRef.current = onGemsChange;
  const onMoveRef = React.useRef(onMove);
  onMoveRef.current = onMove;

  const isFrozen = (id: number) => frozenIds.includes(id) && !thawed.includes(id);
  const isChained = (id: number) => !!chain && !chainBroken && chain.includes(id);
  const showToast = (text: string) => setToast({ id: Date.now(), text });

  React.useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

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

  const inPlace = React.useCallback((id: number, pos: number) => {
    if (id === pos) return true;
    const t = looks.current;
    if (!t) return false;
    const x = t[id]!;
    const y = t[pos]!;
    let diff = 0;
    for (let i = 0; i < x.length; i += 4) diff += Math.abs(x[i]! - y[i]!) + Math.abs(x[i + 1]! - y[i + 1]!) + Math.abs(x[i + 2]! - y[i + 2]!);
    return diff / ((x.length / 4) * 3) < LOOK_ALIKE;
  }, []);

  // Hidden counter of tiles in place; all in place means solved.
  React.useEffect(() => {
    if (solved || !acted.current) return;
    if (board.filter((id, pos) => inPlace(id, pos)).length === tiles) {
      setSolved(true);
      setSelected(null);
      setMagicLeft(0);
      setBoard(Array.from({ length: tiles }, (_, i) => i));
      onSolveRef.current?.({ moves });
    }
  }, [board, solved, tiles, inPlace, moves]);

  // After every board change: collect gems, thaw frozen tiles, break the chain, reward finished lines.
  React.useEffect(() => {
    const newGems = gemIds.filter((g) => !gemsFound.includes(g) && inPlace(g, board.indexOf(g)));
    if (newGems.length) setGemsFound((found) => [...found, ...newGems]);
    if (solved) return;
    const eligible = bonusEligible.current;
    bonusEligible.current = false;

    const nowThawed = frozenIds.filter(
      (f) => !thawed.includes(f) && neighbourPositions(board.indexOf(f), n).some((r) => inPlace(board[r]!, r)),
    );
    if (nowThawed.length) {
      setThawed((t) => [...t, ...nowThawed]);
      showToast(nowThawed.length > 1 ? "Ice cracked!" : "Ice cracked! The tile is free.");
    }
    if (chain && !chainBroken && chain.some((t) => inPlace(t, board.indexOf(t)))) {
      setChainBroken(true);
      showToast("Chain broken!");
    }

    const allHome = board.every((id, pos) => inPlace(id, pos));
    const fresh = completeLines(board, n, inPlace).filter((k) => !lines.includes(k));
    if (fresh.length) {
      setLines((l) => [...l, ...fresh]);
      if (eligible && !allHome) {
        setMoves((m) => Math.max(0, m - fresh.length));
        showToast(fresh.length > 1 ? `Lines complete! +${fresh.length} moves` : "Line complete! +1 move");
      }
    }
  }, [board, solved, gemIds, gemsFound, frozenIds, thawed, chain, chainBroken, lines, n, inPlace]);

  React.useEffect(() => {
    onGemsRef.current?.(gemsFound.length);
  }, [gemsFound.length]);

  React.useEffect(() => {
    onMovesRef.current?.(moves);
  }, [moves]);

  // Magic booster: one correct swap at a time, free of charge, never touching frozen tiles.
  React.useEffect(() => {
    if (magicLeft <= 0 || solved) return;
    const timer = window.setTimeout(() => {
      bonusEligible.current = false;
      const pos = board.findIndex((id, p) => !inPlace(id, p) && !isFrozen(id) && !isFrozen(board[board.indexOf(p)]!));
      if (pos < 0) {
        setMagicLeft(0);
        return;
      }
      onMoveRef.current?.(true);
      acted.current = true;
      setBoard(swapped(board, pos, board.indexOf(pos)));
      setMagicLeft((m) => m - 1);
    }, MAGIC_STEP_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [magicLeft, solved, board, inPlace, thawed]);

  const doSwap = (a: number, b: number) => {
    if (!canPlay || a === b) return;
    const x = board[a]!;
    const y = board[b]!;
    if (isFrozen(x) || isFrozen(y)) {
      showToast("Frozen! Put a neighbouring tile in place to thaw it.");
      setSelected(null);
      return;
    }
    const cost = 1 + (isChained(x) || isChained(y) ? 1 : 0);
    if (cost > 1) showToast("Linked tile: that swap costs 2 moves.");
    setHistory((h) => [...h.slice(-49), { board, moves, thawed, chainBroken, lines }]);
    bonusEligible.current = true;
    acted.current = true;
    const after = swapped(board, a, b);
    const placed = (inPlace(after[a]!, a) && !inPlace(board[a]!, a)) || (inPlace(after[b]!, b) && !inPlace(board[b]!, b));
    onMoveRef.current?.(placed);
    setBoard(after);
    setMoves((m) => m + cost);
    setSelected(null);
  };

  React.useImperativeHandle(
    controls,
    () => ({
      undo: () => {
        const prev = history[history.length - 1];
        if (!prev || !canPlay) return false;
        bonusEligible.current = false;
        onMoveRef.current?.(false);
        setBoard(prev.board);
        setMoves(prev.moves);
        setThawed(prev.thawed);
        setChainBroken(prev.chainBroken);
        setLines(prev.lines);
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
    if (isFrozen(id)) {
      showToast("Frozen! Put a neighbouring tile in place to thaw it.");
      return;
    }
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
    const id = Number(el.dataset.tile);
    if (isFrozen(id)) {
      showToast("Frozen! Put a neighbouring tile in place to thaw it.");
      return;
    }
    pointer.current = { id, x: e.clientX, y: e.clientY, moved: false };
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
          const frozenNow = isFrozen(id);
          const chainedNow = isChained(id);
          const hasGem = gemIds.includes(id) && !gemsFound.includes(id);
          const col = pos % n;
          const row = Math.floor(pos / n);
          const offset = dragging ? `translate(${drag.dx}px, ${drag.dy}px)` : "";
          return (
            <div
              key={id}
              data-tile={id}
              data-pos={pos}
              data-frozen={frozenNow ? "true" : undefined}
              data-chained={chainedNow ? "true" : undefined}
              data-gem={hasGem ? "true" : undefined}
              className={canPlay && !frozenNow ? "absolute left-0 top-0 cursor-grab" : "absolute left-0 top-0"}
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
                  outline: isSelected ? "3px solid white" : cursor === pos ? "3px dashed white" : chainedNow ? "3px solid #fbbf24" : undefined,
                  outlineOffset: -3,
                }}
              />
              {frozenNow && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute flex items-center justify-center rounded-[7px] bg-sky-200/60 text-white ring-1 ring-white/80 backdrop-blur-[1.5px]"
                  style={{ inset: 2 }}
                >
                  <svg viewBox="0 0 24 24" className="size-7 drop-shadow" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                    <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" />
                  </svg>
                </span>
              )}
              {chainedNow && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-[9%] top-[9%] flex size-5 items-center justify-center rounded-full bg-amber-400 text-amber-950 ring-2 ring-white"
                >
                  <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
                  </svg>
                </span>
              )}
              {hasGem && (
                <span aria-hidden className="pointer-events-none absolute bottom-[9%] right-[9%] drop-shadow">
                  <GemIcon className="size-5" />
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
        {toast && !solved && (
          <div
            key={toast.id}
            role="status"
            data-toast
            className="pointer-events-none absolute left-1/2 top-2 z-40 max-w-[92%] -translate-x-1/2 rounded-full bg-panel px-3 py-1 text-center text-xs font-semibold text-panel-ink shadow-lg ring-1 ring-panel-ink/10"
          >
            {toast.text}
          </div>
        )}
      </div>
    </div>
  );
}
