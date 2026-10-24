import * as React from "react";
import type { PuzzleImage } from "../lib/artwork";

export interface SlidingPuzzleProps {
  image: PuzzleImage;
  /** Tiles per side, 3–6. */
  size?: number;
  /** Random moves used to scramble the board. */
  shuffleMoves?: number;
  moveDuration?: number;
  onSolved?: (moves: number) => void;
  onMovesChange?: (moves: number) => void;
  className?: string;
}

function neighbors(pos: number, n: number) {
  const row = Math.floor(pos / n);
  const col = pos % n;
  const out: number[] = [];
  if (row > 0) out.push(pos - n);
  if (row < n - 1) out.push(pos + n);
  if (col > 0) out.push(pos - 1);
  if (col < n - 1) out.push(pos + 1);
  return out;
}

function isSolved(board: number[]) {
  return board.every((id, pos) => id === pos);
}

/** Scramble by walking the gap randomly, which always leaves a solvable board. */
function scramble(n: number, moves: number): number[] {
  const blank = n * n - 1;
  let board: number[];
  do {
    board = Array.from({ length: n * n }, (_, i) => i);
    let at = blank;
    let last = -1;
    for (let i = 0; i < moves; i++) {
      const options = neighbors(at, n).filter((p) => p !== last);
      const next = options[Math.floor(Math.random() * options.length)]!;
      board[at] = board[next]!;
      board[next] = blank;
      last = at;
      at = next;
    }
  } while (isSolved(board));
  return board;
}

/** Positions the gap passes through when the tile at `pos` slides toward it (same row or column only). */
function lineTargets(blank: number, pos: number, n: number) {
  const br = Math.floor(blank / n);
  const bc = blank % n;
  const pr = Math.floor(pos / n);
  const pc = pos % n;
  const targets: number[] = [];
  if (br === pr && bc !== pc) {
    const dir = pc > bc ? 1 : -1;
    for (let c = bc + dir; c !== pc + dir; c += dir) targets.push(br * n + c);
  } else if (bc === pc && br !== pr) {
    const dir = pr > br ? 1 : -1;
    for (let r = br + dir; r !== pr + dir; r += dir) targets.push(r * n + bc);
  }
  return targets;
}

export function SlidingPuzzle({
  image,
  size = 4,
  shuffleMoves = 60,
  moveDuration = 140,
  onSolved,
  onMovesChange,
  className,
}: SlidingPuzzleProps) {
  const n = Math.max(3, Math.min(6, Math.round(size)));
  const blankId = n * n - 1;
  const [board, setBoard] = React.useState(() => scramble(n, shuffleMoves));
  const [moves, setMoves] = React.useState(0);
  const solved = isSolved(board);
  const reported = React.useRef(false);

  // Callbacks change identity on every parent render; keep the latest without re-running effects.
  const onSolvedRef = React.useRef(onSolved);
  const onMovesRef = React.useRef(onMovesChange);
  onSolvedRef.current = onSolved;
  onMovesRef.current = onMovesChange;

  React.useEffect(() => {
    onMovesRef.current?.(moves);
  }, [moves]);

  React.useEffect(() => {
    if (!solved || reported.current) return;
    reported.current = true;
    // Let the finished picture show before the parent moves on.
    const timer = window.setTimeout(() => onSolvedRef.current?.(moves), 900);
    return () => window.clearTimeout(timer);
  }, [solved, moves]);

  const slideTo = (targets: number[]) => {
    if (solved || targets.length === 0) return;
    setBoard((prev) => {
      const next = prev.slice();
      let at = next.indexOf(blankId);
      for (const t of targets) {
        if (!neighbors(at, n).includes(t)) break;
        next[at] = next[t]!;
        next[t] = blankId;
        at = t;
      }
      return next;
    });
    setMoves((m) => m + targets.length);
  };

  const onTile = (pos: number) => slideTo(lineTargets(board.indexOf(blankId), pos, n));

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const blank = board.indexOf(blankId);
    const row = Math.floor(blank / n);
    const col = blank % n;
    let to = -1;
    if (event.key === "ArrowUp" && row < n - 1) to = blank + n;
    else if (event.key === "ArrowDown" && row > 0) to = blank - n;
    else if (event.key === "ArrowLeft" && col < n - 1) to = blank + 1;
    else if (event.key === "ArrowRight" && col > 0) to = blank - 1;
    if (to < 0) return;
    event.preventDefault();
    slideTo([to]);
  };

  const pieceStyle = (id: number): React.CSSProperties => ({
    backgroundImage: `url("${image.src}")`,
    backgroundSize: `${n * 100}% ${n * 100}%`,
    backgroundPosition: `${((id % n) / (n - 1)) * 100}% ${(Math.floor(id / n) / (n - 1)) * 100}%`,
  });

  return (
    <div className={className}>
      <div className="rounded-2xl bg-slate-700/60 p-2 shadow-xl ring-1 ring-slate-600">
        <div
          role="group"
          tabIndex={0}
          aria-label={`Sliding puzzle: ${image.title}. Tap a tile in line with the gap, or use the arrow keys.`}
          onKeyDown={onKeyDown}
          className="relative aspect-square w-full touch-manipulation select-none overflow-hidden rounded-xl bg-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          {board.map((id, pos) => {
            if (id === blankId) return null;
            return (
              <button
                key={id}
                type="button"
                tabIndex={-1}
                aria-label={`Tile ${id + 1}`}
                onClick={() => onTile(pos)}
                className="absolute left-0 top-0 p-[2px]"
                style={{
                  width: `${100 / n}%`,
                  height: `${100 / n}%`,
                  transform: `translate(${(pos % n) * 100}%, ${Math.floor(pos / n) * 100}%)`,
                  transition: `transform ${moveDuration}ms cubic-bezier(0.3, 0.7, 0.2, 1)`,
                }}
              >
                <span className="block size-full rounded-md shadow-md ring-1 ring-black/20" style={pieceStyle(id)} />
              </button>
            );
          })}
          <img
            src={image.src}
            alt={image.title}
            draggable={false}
            className="pointer-events-none absolute inset-0 size-full transition-opacity duration-500"
            style={{ opacity: solved ? 1 : 0 }}
          />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-slate-300">{image.title}</span>
        <span className="font-mono font-bold text-white">{moves} moves</span>
      </div>
    </div>
  );
}
