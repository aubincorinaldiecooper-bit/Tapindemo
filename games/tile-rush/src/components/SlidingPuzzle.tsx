"use client";

import * as React from "react";

export interface PuzzleItem {
  src: string;
  alt?: string;
  title?: string;
}

export interface SlidingPuzzleProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  items: PuzzleItem[];
  size?: number;
  moveDuration?: number;
  onSolved?: (moves: number) => void;
  onMovesChange?: (moves: number) => void;
  ref?: React.Ref<HTMLDivElement>;
}

type Phase = "playing" | "solved";

interface Game {
  n: number;
  board: number[];
  photo: number;
  phase: Phase;
  moves: number;
  path: number[];
}

type Action =
  | { type: "slide"; targets: number[] }
  | { type: "reset"; game: Game };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
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

function solvedBoard(n: number) {
  return Array.from({ length: n * n }, (_, i) => i);
}

function isSolved(board: number[]) {
  return board.every((id, pos) => id === pos);
}

function moveBlank(game: Game, to: number, counted: boolean): Game {
  const blankId = game.n * game.n - 1;
  const from = game.board.indexOf(blankId);
  if (!neighbors(from, game.n).includes(to)) return game;
  const board = game.board.slice();
  board[from] = board[to]!;
  board[to] = blankId;
  const path =
    game.path.length >= 2 && game.path[game.path.length - 2] === to ? game.path.slice(0, -1) : [...game.path, to];
  return { ...game, board, path, moves: game.moves + (counted ? 1 : 0) };
}

function createGame(n: number, photo: number, shuffleMoves: number): Game {
  const n2 = Math.max(3, Math.min(6, Math.round(n)));
  let game: Game = {
    n: n2,
    board: solvedBoard(n2),
    photo,
    phase: "playing",
    moves: 0,
    path: [n2 * n2 - 1],
  };

  // Simple shuffle
  for (let i = 0; i < shuffleMoves; i++) {
    const blankId = n2 * n2 - 1;
    const blank = game.board.indexOf(blankId);
    const options = neighbors(blank, n2);
    const target = options[Math.floor(Math.random() * options.length)]!;
    game = moveBlank(game, target, false);
  }

  return game;
}

function reducer(game: Game, action: Action): Game {
  switch (action.type) {
    case "slide": {
      let next = game;
      for (const target of action.targets) next = moveBlank(next, target, true);
      if (next === game) return game;
      if (isSolved(next.board)) return { ...next, phase: "solved", path: [game.n * game.n - 1] };
      return next;
    }
    case "reset":
      return action.game;
  }
}

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
  items,
  size = 4,
  moveDuration = 150,
  onSolved,
  onMovesChange,
  ref,
  className,
  ...rest
}: SlidingPuzzleProps) {
  const n = Math.max(3, Math.min(6, Math.round(size)));
  const count = items.length;
  const photo = 0; // Single puzzle mode
  const [game, dispatch] = React.useReducer(
    reducer,
    undefined,
    () => createGame(n, photo, 20)
  );
  const rootRef = React.useRef<HTMLDivElement>(null);
  const boardRef = React.useRef<HTMLDivElement>(null);

  const item = items[game.photo];
  const gn = game.n;
  const blankId = gn * gn - 1;
  const solved = game.phase === "solved";

  // Notify moves change
  React.useEffect(() => {
    onMovesChange?.(game.moves);
  }, [game.moves, onMovesChange]);

  // Notify when solved
  React.useEffect(() => {
    if (solved) {
      onSolved?.(game.moves);
    }
  }, [solved, game.moves, onSolved]);

  const slideFrom = (pos: number) => {
    const targets = lineTargets(game.board.indexOf(blankId), pos, gn);
    if (targets.length > 0) dispatch({ type: "slide", targets });
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const blank = game.board.indexOf(blankId);
    const row = Math.floor(blank / gn);
    const col = blank % gn;
    let to = -1;
    if (event.key === "ArrowUp" && row < gn - 1) to = blank + gn;
    else if (event.key === "ArrowDown" && row > 0) to = blank - gn;
    else if (event.key === "ArrowLeft" && col < gn - 1) to = blank + 1;
    else if (event.key === "ArrowRight" && col > 0) to = blank - 1;
    if (to < 0) return;
    event.preventDefault();
    dispatch({ type: "slide", targets: [to] });
  };

  const stepMs = moveDuration;
  const inset = solved ? 0 : 2;
  const gap = 4;

  const setRootRef = (node: HTMLDivElement | null) => {
    rootRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  const piece = (src: string | undefined, id: number): React.CSSProperties => ({
    backgroundImage: src ? `url(${JSON.stringify(src)})` : undefined,
    backgroundSize: `${gn * 100}% ${gn * 100}%`,
    backgroundPosition: `${((id % gn) / (gn - 1)) * 100}% ${(Math.floor(id / gn) / (gn - 1)) * 100}%`,
  });

  return (
    <div
      ref={setRootRef}
      data-slot="sliding-puzzle"
      data-phase={game.phase}
      className={cx("w-full text-foreground", className)}
      {...rest}
    >
      <div className="rounded-2xl bg-muted p-2.5 shadow-lg ring-1 ring-border">
        <div
          ref={boardRef}
          data-board
          role="group"
          tabIndex={0}
          aria-label="Sliding puzzle game. Use arrow keys or click tiles to slide."
          onKeyDown={onKeyDown}
          className="relative aspect-square w-full overflow-hidden rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {game.board.map((id, pos) => {
            const isBlank = id === blankId;
            const style: React.CSSProperties = {
              width: `${100 / gn}%`,
              height: `${100 / gn}%`,
              transform: `translate(${(pos % gn) * 100}%, ${Math.floor(pos / gn) * 100}%)`,
              transitionProperty: "transform",
              transitionDuration: `${stepMs}ms`,
              transitionTimingFunction: "cubic-bezier(0.3, 0.7, 0.2, 1)",
            };

            const layers = (
              <>
                <span
                  aria-hidden
                  className="absolute rounded transition-opacity duration-300"
                  style={{
                    inset: gap / 2,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                    opacity: solved ? 0 : 1,
                  }}
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-muted transition-opacity duration-300"
                  style={{ ...piece(item?.src, id), opacity: 1 }}
                />
              </>
            );

            if (isBlank) {
              return (
                <div key={id} data-blank data-pos={pos} className="absolute left-0 top-0 z-1" style={{ ...style, transitionDuration: "0ms" }}>
                  <span
                    aria-hidden
                    className="absolute rounded bg-foreground/10 transition-opacity duration-200"
                    style={{ inset: gap / 2, opacity: solved ? 0 : 1 }}
                  />
                </div>
              );
            }

            return (
              <button
                key={id}
                type="button"
                tabIndex={-1}
                data-tile={id}
                data-pos={pos}
                aria-label={`Tile ${id + 1}`}
                onClick={() => slideFrom(game.board.indexOf(id))}
                className="absolute left-0 top-0 z-2 cursor-pointer outline-none"
                style={style}
              >
                {layers}
              </button>
            );
          })}

          {item && (
            <img
              src={item.src}
              alt={item.alt ?? item.title ?? ""}
              data-photo-full
              draggable={false}
              className="pointer-events-none absolute inset-0 z-10 size-full object-cover transition-opacity duration-300"
              style={{ opacity: solved ? 1 : 0 }}
            />
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{item?.title ?? ""}</span>
        <span className="font-mono font-bold">{game.moves} moves</span>
      </div>
    </div>
  );
}
