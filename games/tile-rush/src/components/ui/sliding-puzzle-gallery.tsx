"use client";

import * as React from "react";

export interface PuzzleItem {
  src: string;
  alt?: string;
  title?: string;
  caption?: string;
}

export interface SlidingPuzzleGalleryProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  items: PuzzleItem[];
  /** Tiles per side, 3–6. The bottom-right piece is held back to make the empty slot. */
  size?: number;
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Solve, rest, shuffle and move on to the next photo by itself. */
  autoplay?: boolean;
  /** How long a solved photo stays up before the next shuffle, in milliseconds. */
  hold?: number;
  /** Milliseconds for a tile to slide one cell while solving. */
  moveDuration?: number;
  /** Random moves used to shuffle each photo. */
  shuffleMoves?: number;
  /** Let people slide tiles themselves with a click, a tap or the arrow keys. */
  playable?: boolean;
  /** Print the classic tile numbers on each piece. */
  numbers?: boolean;
  /** Gap between tiles in pixels while the puzzle is open. */
  gap?: number;
  /** Tile Rush: solve shuffled boards by itself. Turn off so the player has to solve them. */
  autoSolve?: boolean;
  /** Tile Rush: called once each time the player (not the auto-solver) completes a photo. */
  onSolve?: (result: { index: number; moves: number }) => void;
  /** Tile Rush: target move count shown beside the moves when `look.heroMoves` is on. */
  par?: number;
  /** Tile Rush: shown at the top of the side panel (beside the board) when `look.alignTop` is on. */
  panelHeader?: React.ReactNode;
  /** Tile Rush: design options being compared. */
  look?: PuzzleLook;
  /** Tile Rush: show only the board, without the side panel. */
  bare?: boolean;
  /** Tile Rush: classes for the frame around the board (replaces the default frame). */
  frameClassName?: string;
  /** Tile Rush: called after every change to the move count. */
  onMovesChange?: (moves: number) => void;
  /** Tile Rush: booster controls for the parent (undo, magic moves). */
  controls?: React.Ref<PuzzleControls>;
  /** React 19 passes `ref` as a regular prop. */
  ref?: React.Ref<HTMLDivElement>;
}

export interface PuzzleControls {
  /** Take back the last slide and refund its moves. Returns false when there is nothing to undo. */
  undo: () => boolean;
  /** Play up to `steps` moves toward the solution for free. Returns false when the board is not in play. */
  magic: (steps: number) => boolean;
  canUndo: () => boolean;
}

export interface PuzzleLook {
  /** Shuffle is the filled main button; Solve becomes a quiet text link. */
  primaryShuffle?: boolean;
  /** Large move count with the par beside it. */
  heroMoves?: boolean;
  /** Darker, inset empty slot. */
  insetBlank?: boolean;
  /** Panel lines up with the top of the board and holds `panelHeader`. */
  alignTop?: boolean;
}

type Phase = "solving" | "solved" | "shuffling" | "playing";

interface Game {
  n: number;
  board: number[];
  photo: number;
  incoming: number | null;
  phase: Phase;
  moves: number;
  path: number[];
  pending: number[];
  spread: number;
  wait: number;
  shuffleStep: number;
  solveStep: number;
  round: number;
  /** Tile Rush: when false, a finished shuffle hands the board to the player instead of solving it. */
  autoSolve: boolean;
  /** Tile Rush: true when the current solved state came from the player's own slide. */
  playerSolved: boolean;
  /** Tile Rush: board states before each player slide, for Undo. */
  history: Array<{ board: number[]; path: number[]; moves: number }>;
  /** Tile Rush: moves left in a Magic booster run; 0 when no run is active. */
  magicSteps: number;
}

type Action =
  | { type: "step" }
  | { type: "shuffle"; to: number; walk: number[] }
  | { type: "slide"; targets: number[] }
  | { type: "solve" }
  | { type: "jump"; to: number }
  | { type: "timing"; shuffleStep: number; solveStep: number }
  | { type: "reset"; game: Game }
  | { type: "undo" }
  | { type: "magic"; steps: number };

const IDLE_MS = 4000;
const START_MS = 450;
const SETTLE_MS = 380;
const STACK_BELOW_PX = 600;
const SIDE_BOARD_MAX = "min(560px, calc(100svh - 6rem))";
const STACKED_BOARD_MAX = "min(560px, calc(100svh - 15rem))";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

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

/** A random walk of the empty slot that never steps straight back, so every move adds real disorder. */
function shuffleWalk(from: number, previous: number | undefined, n: number, count: number, seed: number) {
  const rand = mulberry32(seed);
  const walk: number[] = [];
  let at = from;
  let last = previous;
  for (let i = 0; i < count; i++) {
    const options = neighbors(at, n).filter((p) => p !== last);
    const next = options[Math.floor(rand() * options.length)]!;
    walk.push(next);
    last = at;
    at = next;
  }
  return walk;
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

function createGame(
  n: number,
  photo: number,
  shuffleMoves: number,
  moveDuration: number,
  scrambled: boolean,
  autoSolve = true,
): Game {
  let game: Game = {
    n,
    board: solvedBoard(n),
    photo,
    incoming: null,
    phase: autoSolve ? "solving" : "playing",
    moves: 0,
    path: [n * n - 1],
    pending: [],
    spread: 0,
    wait: START_MS,
    shuffleStep: Math.max(45, Math.round(moveDuration * 0.5)),
    solveStep: moveDuration,
    round: 0,
    autoSolve,
    playerSolved: false,
    history: [],
    magicSteps: 0,
  };
  if (!scrambled) return { ...game, phase: "solved" };
  const start = game;
  // Tile Rush: a walk can land back on the solved board; try the next seed so a level never starts finished.
  for (let attempt = 0; attempt < 8; attempt++) {
    game = start;
    for (const target of shuffleWalk(n * n - 1, undefined, n, shuffleMoves, 7919 * (photo + 1) + n + 104729 * attempt)) {
      game = moveBlank(game, target, false);
    }
    if (!isSolved(game.board)) return game;
  }
  return { ...game, phase: "solved", path: [n * n - 1] };
}

function reducer(game: Game, action: Action): Game {
  switch (action.type) {
    case "timing":
      return { ...game, shuffleStep: action.shuffleStep, solveStep: action.solveStep };
    case "reset":
      return action.game;
    case "shuffle":
      return {
        ...game,
        incoming: action.to,
        phase: "shuffling",
        pending: action.walk,
        spread: action.walk.length,
        moves: 0,
        wait: 260,
        round: game.round + 1,
        playerSolved: false,
      };
    case "jump":
      return {
        ...game,
        board: solvedBoard(game.n),
        path: [game.n * game.n - 1],
        photo: action.to,
        incoming: null,
        phase: "solved",
        pending: [],
        moves: 0,
        round: game.round + 1,
        playerSolved: false,
      };
    case "solve":
      return game.phase === "playing" ? { ...game, phase: "solving", wait: 120 } : game;
    case "undo": {
      const prev = game.history[game.history.length - 1];
      if (!prev || game.phase !== "playing") return game;
      return { ...game, ...prev, history: game.history.slice(0, -1), phase: "playing" };
    }
    case "magic":
      if (game.phase !== "playing" || action.steps <= 0) return game;
      return { ...game, phase: "solving", magicSteps: action.steps, wait: 120 };
    case "slide": {
      if (game.phase === "shuffling" || game.magicSteps > 0) return game;
      const snapshot = { board: game.board, path: game.path, moves: game.moves };
      let next: Game = { ...game, history: [...game.history.slice(-49), snapshot] };
      for (const target of action.targets) next = moveBlank(next, target, true);
      if (next.board === game.board) return game;
      if (isSolved(next.board)) return { ...next, phase: "solved", path: [game.n * game.n - 1], playerSolved: true };
      return { ...next, phase: "playing" };
    }
    case "step": {
      if (game.phase === "shuffling") {
        const [target, ...rest] = game.pending;
        let next = target === undefined ? game : moveBlank(game, target, false);
        if (rest.length > 0) return { ...next, pending: rest, wait: game.shuffleStep };
        next = { ...next, pending: [], photo: game.incoming ?? game.photo, incoming: null, moves: 0 };
        if (isSolved(next.board)) return { ...next, phase: "solved", path: [game.n * game.n - 1] };
        if (!game.autoSolve) return { ...next, phase: "playing" };
        return { ...next, phase: "solving", wait: SETTLE_MS };
      }
      if (game.phase === "solving" && game.magicSteps > 0) {
        // Magic booster: free moves back along the scramble, then hand the board back.
        if (game.path.length <= 1 || isSolved(game.board)) {
          return { ...game, phase: "solved", path: [game.n * game.n - 1], magicSteps: 0, playerSolved: true };
        }
        const next = moveBlank(game, game.path[game.path.length - 2]!, false);
        if (next.path.length <= 1 || isSolved(next.board)) {
          return { ...next, phase: "solved", path: [game.n * game.n - 1], magicSteps: 0, playerSolved: true };
        }
        const left = game.magicSteps - 1;
        return left > 0 ? { ...next, magicSteps: left, wait: game.solveStep } : { ...next, magicSteps: 0, phase: "playing" };
      }
      if (game.phase === "solving") {
        if (game.path.length <= 1 || isSolved(game.board)) return { ...game, phase: "solved", path: [game.n * game.n - 1] };
        const next = moveBlank(game, game.path[game.path.length - 2]!, true);
        if (next.path.length <= 1 || isSolved(next.board)) return { ...next, phase: "solved", path: [game.n * game.n - 1] };
        return { ...next, wait: game.solveStep };
      }
      return game;
    }
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

export function SlidingPuzzleGallery({
  items,
  size = 4,
  index: controlledIndex,
  defaultIndex = 0,
  onIndexChange,
  autoplay = true,
  hold = 2400,
  moveDuration = 150,
  shuffleMoves = 16,
  playable = true,
  numbers = false,
  gap = 4,
  autoSolve = true,
  onSolve,
  par,
  panelHeader,
  look = {},
  bare = false,
  frameClassName,
  onMovesChange,
  controls,
  ref,
  className,
  ...rest
}: SlidingPuzzleGalleryProps) {
  const n = Math.max(3, Math.min(6, Math.round(size)));
  const count = items.length;
  const startPhoto = Math.min(Math.max(0, controlledIndex ?? defaultIndex), Math.max(0, count - 1));
  const [game, dispatch] = React.useReducer(reducer, undefined, () =>
    createGame(n, startPhoto, shuffleMoves, moveDuration, autoplay || !autoSolve, autoSolve),
  );
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [stacked, setStacked] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const sheenRef = React.useRef<HTMLDivElement>(null);
  const boardRef = React.useRef<HTMLDivElement>(null);
  const shuffleSeed = React.useRef(0);
  const target = game.incoming ?? game.photo;
  const item = items[game.photo];
  const targetItem = items[target];
  const gn = game.n;
  const blankId = gn * gn - 1;
  const solved = game.phase === "solved";

  // Tile Rush: report each player solve once, keeping the latest callback without re-running effects.
  const onSolveRef = React.useRef(onSolve);
  onSolveRef.current = onSolve;
  const reportedRound = React.useRef(-1);
  React.useEffect(() => {
    if (!solved || !game.playerSolved || reportedRound.current === game.round) return;
    reportedRound.current = game.round;
    onSolveRef.current?.({ index: game.photo, moves: game.moves });
  }, [solved, game.playerSolved, game.round, game.photo, game.moves]);

  const onMovesRef = React.useRef(onMovesChange);
  onMovesRef.current = onMovesChange;
  React.useEffect(() => {
    onMovesRef.current?.(game.moves);
  }, [game.moves]);

  React.useImperativeHandle(
    controls,
    () => ({
      undo: () => {
        if (game.phase !== "playing" || game.history.length === 0) return false;
        dispatch({ type: "undo" });
        return true;
      },
      magic: (steps: number) => {
        if (game.phase !== "playing") return false;
        dispatch({ type: "magic", steps });
        return true;
      },
      canUndo: () => game.phase === "playing" && game.history.length > 0,
    }),
    [game.phase, game.history.length],
  );

  React.useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => setReducedMotion(motion.matches);
    onMotion();
    motion.addEventListener("change", onMotion);
    return () => motion.removeEventListener("change", onMotion);
  }, []);

  React.useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => setStacked(root.clientWidth < STACK_BELOW_PX);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    dispatch({ type: "timing", shuffleStep: Math.max(45, Math.round(moveDuration * 0.5)), solveStep: moveDuration });
  }, [moveDuration]);

  React.useEffect(() => {
    if (game.n === n) return;
    dispatch({
      type: "reset",
      game: {
        ...createGame(n, game.incoming ?? game.photo, shuffleMoves, moveDuration, autoplay || !autoSolve, autoSolve),
        round: game.round + 1,
      },
    });
    // Rebuild only when the grid size changes; the other values are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  React.useEffect(() => {
    if (reducedMotion) dispatch({ type: "jump", to: game.incoming ?? game.photo });
    // Only a change of the motion preference should snap the board; the photo is read once at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  React.useEffect(() => {
    let done = false;
    const markReady = () => {
      if (!done) setReady(true);
      done = true;
    };
    items.forEach((it, i) => {
      const image = new Image();
      image.decoding = "async";
      if (i === startPhoto) {
        image.onload = markReady;
        image.onerror = markReady;
      }
      image.src = it.src;
    });
    if (items.length === 0) markReady();
    const fallback = window.setTimeout(markReady, 3000);
    return () => {
      done = true;
      window.clearTimeout(fallback);
    };
    // The first photo decides when the opening solve may start; later photos are only warmed up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const goTo = React.useCallback(
    (to: number) => {
      if (count === 0) return;
      const next = ((to % count) + count) % count;
      onIndexChange?.(next);
      if (reducedMotion) {
        dispatch({ type: "jump", to: next });
        return;
      }
      const blank = game.board.indexOf(blankId);
      const previous = game.path.length >= 2 ? game.path[game.path.length - 2] : undefined;
      shuffleSeed.current += 1;
      const walk = shuffleWalk(blank, previous, gn, shuffleMoves, 104729 * shuffleSeed.current + 31 * next + gn);
      dispatch({ type: "shuffle", to: next, walk });
    },
    [count, onIndexChange, reducedMotion, game.board, game.path, blankId, gn, shuffleMoves],
  );

  React.useEffect(() => {
    if (controlledIndex === undefined || count === 0) return;
    if (controlledIndex !== target) goTo(controlledIndex);
    // Follow the controlled index only; goTo changes on every move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledIndex]);

  React.useEffect(() => {
    if (game.phase === "shuffling" || game.phase === "solving") {
      if (!ready && game.round === 0) return undefined;
      const timer = window.setTimeout(() => dispatch({ type: "step" }), game.wait);
      return () => window.clearTimeout(timer);
    }
    if (game.phase === "playing" && game.autoSolve) {
      const timer = window.setTimeout(() => dispatch({ type: "solve" }), IDLE_MS);
      return () => window.clearTimeout(timer);
    }
    if (game.phase === "solved" && autoplay && count > 0) {
      const timer = window.setTimeout(() => goTo(game.photo + 1), hold);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [game, ready, autoplay, hold, count, goTo]);

  React.useEffect(() => {
    if (!solved || reducedMotion) return;
    const sheen = sheenRef.current;
    if (!sheen || typeof sheen.animate !== "function") return;
    const animation = sheen.animate(
      [
        { transform: "translateX(-120%)", opacity: 0 },
        { opacity: 1, offset: 0.2 },
        { transform: "translateX(120%)", opacity: 0 },
      ],
      { duration: 1100, delay: 260, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
    );
    return () => animation.cancel();
  }, [solved, game.round, game.photo, reducedMotion]);

  const slideFrom = (pos: number) => {
    if (!playable) return;
    const targets = lineTargets(game.board.indexOf(blankId), pos, gn);
    if (targets.length > 0) dispatch({ type: "slide", targets });
  };

  // Tile Rush: swipe or drag a tile toward the gap, with a mouse or a finger.
  const swipe = React.useRef<{ x: number; y: number; pos: number | null } | null>(null);
  const swiped = React.useRef(false);
  const SWIPE_PX = 14;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!playable) return;
    const tile = (event.target as HTMLElement).closest<HTMLElement>("[data-pos]");
    swipe.current = { x: event.clientX, y: event.clientY, pos: tile ? Number(tile.dataset.pos) : null };
    swiped.current = false;
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || !playable) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return; // a tap: the tile's click handles it
    swiped.current = true;
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const blank = game.board.indexOf(blankId);
    const br = Math.floor(blank / gn);
    const bc = blank % gn;
    // Swiped a tile that sits in line with the gap, toward the gap: slide it (and any tiles between).
    if (start.pos !== null && start.pos !== blank) {
      const pr = Math.floor(start.pos / gn);
      const pc = start.pos % gn;
      const towardGap = horizontal
        ? pr === br && Math.sign(bc - pc) === Math.sign(dx)
        : pc === bc && Math.sign(br - pr) === Math.sign(dy);
      if (towardGap) {
        const targets = lineTargets(blank, start.pos, gn);
        if (targets.length > 0) dispatch({ type: "slide", targets });
        return;
      }
    }
    // Otherwise move the tile next to the gap in the swipe's direction, like the arrow keys.
    let to = -1;
    if (horizontal && dx < 0 && bc < gn - 1) to = blank + 1;
    else if (horizontal && dx > 0 && bc > 0) to = blank - 1;
    else if (!horizontal && dy < 0 && br < gn - 1) to = blank + gn;
    else if (!horizontal && dy > 0 && br > 0) to = blank - gn;
    if (to >= 0) dispatch({ type: "slide", targets: [to] });
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!playable) return;
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

  const stepMs = reducedMotion ? 0 : game.phase === "shuffling" ? game.shuffleStep : game.solveStep;
  const piece = (src: string | undefined, id: number): React.CSSProperties => ({
    backgroundImage: src ? `url(${JSON.stringify(src)})` : undefined,
    backgroundSize: `${gn * 100}% ${gn * 100}%`,
    backgroundPosition: `${((id % gn) / (gn - 1)) * 100}% ${(Math.floor(id / gn) / (gn - 1)) * 100}%`,
  });
  const inset = solved ? 0 : gap / 2;

  const setRootRef = (node: HTMLDivElement | null) => {
    rootRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  const overPar = par !== undefined && game.moves > par;
  const movesCount = look.heroMoves ? (
    <span className="inline-flex items-baseline gap-2">
      <span data-moves className="font-display text-5xl font-semibold leading-none tabular-nums text-foreground">
        {game.moves}
      </span>
      {par !== undefined && (
        <span className={cx("font-mono text-xs tabular-nums", overPar ? "text-brand" : "text-muted-foreground")}>/ par {par}</span>
      )}
    </span>
  ) : (
    <span data-moves className="font-mono text-base tabular-nums text-foreground">
      {game.moves}
    </span>
  );
  const buttonClass =
    "inline-flex h-8 flex-1 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
  const primaryClass =
    "inline-flex h-10 flex-1 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-brand-foreground shadow-sm transition-[filter,transform] hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50";
  const linkClass =
    "inline-flex h-10 shrink-0 items-center justify-center rounded-md px-3 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:hover:no-underline";
  const busy = game.phase === "shuffling" || game.phase === "solving";
  const shuffleButton = (
    <button
      type="button"
      data-action="shuffle"
      onClick={() => goTo(game.photo)}
      disabled={busy}
      className={look.primaryShuffle ? primaryClass : buttonClass}
    >
      Shuffle
    </button>
  );
  const solveButton = (
    <button
      type="button"
      data-action="solve"
      onClick={() => dispatch({ type: "solve" })}
      disabled={game.phase !== "playing"}
      className={look.primaryShuffle ? linkClass : buttonClass}
    >
      {look.primaryShuffle ? "Give up & solve" : "Solve"}
    </button>
  );
  const headerInPanel = look.alignTop && !stacked && panelHeader;

  return (
    <div
      ref={setRootRef}
      data-slot="sliding-puzzle-gallery"
      data-phase={game.phase}
      data-photo={game.photo}
      data-target={target}
      data-layout={stacked ? "stacked" : "side"}
      className={cx("w-full text-foreground", className)}
      {...rest}
    >
      {look.alignTop && stacked && panelHeader}
      <div className={cx("flex", look.alignTop && !stacked ? "items-start" : "items-center", stacked ? "flex-col gap-3" : "flex-wrap gap-6")}>
        <div
          className={cx("min-w-0", bare ? "w-full" : stacked ? "w-full" : "flex-[4_1_360px]")}
          style={bare ? undefined : { maxWidth: stacked ? STACKED_BOARD_MAX : SIDE_BOARD_MAX }}
        >
          <div className={frameClassName ?? "rounded-[22px] bg-muted p-2.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.14)] ring-1 ring-border"}>
            <div
              ref={boardRef}
              data-board
              role="group"
              tabIndex={playable ? 0 : undefined}
              aria-label={`Sliding puzzle of ${item?.title ?? item?.alt ?? "a photo"}. Use the arrow keys to slide a tile into the gap.`}
              onKeyDown={onKeyDown}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={() => (swipe.current = null)}
              className="relative aspect-square w-full touch-none select-none overflow-hidden rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted"
            >
              {game.board.map((id, pos) => {
                const isBlank = id === blankId;
                const style: React.CSSProperties = {
                  width: `${100 / gn}%`,
                  height: `${100 / gn}%`,
                  transform: `translate(${(pos % gn) * 100}%, ${Math.floor(pos / gn) * 100}%)`,
                  transitionProperty: "transform",
                  transitionDuration: `${stepMs}ms`,
                  transitionTimingFunction: game.phase === "shuffling" ? "linear" : "cubic-bezier(0.3, 0.7, 0.2, 1)",
                };
                const delay = game.incoming === null ? 0 : ((id * 7919) % 97) / 97;
                const layers = (
                  <>
                    <span
                      aria-hidden
                      className="absolute rounded-[7px] transition-opacity duration-300"
                      style={{ inset: gap / 2, boxShadow: "0 1px 2px rgba(0,0,0,0.3), 0 4px 10px -3px rgba(0,0,0,0.35)", opacity: solved ? 0 : 1 }}
                    />
                    <span
                      aria-hidden
                      className="absolute inset-0 bg-muted transition-[clip-path] duration-300"
                      style={{ ...piece(item?.src, id), clipPath: `inset(${inset}px round ${solved ? 0 : 7}px)` }}
                    />
                    <span
                      aria-hidden
                      data-incoming={game.incoming === null ? undefined : true}
                      className="absolute inset-0 transition-opacity"
                      style={{
                        ...piece(targetItem?.src, id),
                        clipPath: `inset(${inset}px round 7px)`,
                        opacity: game.incoming === null ? 0 : 1,
                        transitionDuration: game.incoming === null ? "0ms" : "420ms",
                        transitionDelay: `${Math.round(delay * game.spread * game.shuffleStep * 0.8)}ms`,
                      }}
                    />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute rounded-[7px] transition-opacity duration-300"
                      style={{
                        inset: gap / 2,
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 0 rgba(0,0,0,0.22), inset 0 0 0 1px rgba(0,0,0,0.12)",
                        opacity: solved ? 0 : 1,
                      }}
                    />
                    {numbers && (
                      <span
                        aria-hidden
                        className="absolute left-[10%] top-[10%] rounded-full bg-black/55 px-1.5 font-mono text-[10px] leading-4 text-white backdrop-blur-sm transition-opacity duration-300"
                        style={{ opacity: solved ? 0 : 1 }}
                      >
                        {id + 1}
                      </span>
                    )}
                  </>
                );
                if (isBlank) {
                  return (
                    <div key={id} data-blank data-pos={pos} className="absolute left-0 top-0 z-[1]" style={{ ...style, transitionDuration: "0ms" }}>
                      <span
                        aria-hidden
                        className={cx(
                          "absolute rounded-[7px] transition-opacity duration-200",
                          look.insetBlank
                            ? "bg-foreground/[0.16] shadow-[inset_0_3px_8px_rgba(0,0,0,0.45),inset_0_-1px_0_rgba(255,255,255,0.08)]"
                            : "bg-foreground/[0.07] shadow-[inset_0_2px_6px_rgba(0,0,0,0.28)]",
                        )}
                        style={{ inset: gap / 2, opacity: solved ? 0 : 1 }}
                      />
                      <span
                        aria-hidden
                        className="absolute inset-0 transition-[opacity,transform] duration-300 ease-out"
                        style={{ opacity: solved ? 1 : 0, transform: solved ? "scale(1)" : "scale(1.18)" }}
                      >
                        {layers}
                      </span>
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
                    onClick={() => {
                      if (swiped.current) {
                        swiped.current = false;
                        return;
                      }
                      slideFrom(game.board.indexOf(id));
                    }}
                    className={cx("absolute left-0 top-0 z-[2] outline-none", playable ? "cursor-pointer" : "cursor-default")}
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
                  className="pointer-events-none absolute inset-0 z-[3] size-full object-cover transition-opacity duration-300"
                  style={{ opacity: solved ? 1 : 0, transitionDelay: solved ? "220ms" : "0ms" }}
                />
              )}
              <div
                ref={sheenRef}
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[4] opacity-0"
                style={{ background: "linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.5) 50%, transparent 62%)" }}
              />
            </div>
          </div>
        </div>

        {!bare && (<div
          data-panel
          className={cx(
            "flex flex-col",
            stacked ? "w-full gap-3" : "min-w-[200px] flex-[1_1_200px]",
            !stacked && (look.alignTop ? "gap-6 pt-1" : "gap-5"),
          )}
          style={stacked ? { maxWidth: STACKED_BOARD_MAX } : undefined}
        >
          {headerInPanel}
          <div className={cx("flex justify-between gap-3", stacked && !look.heroMoves ? "items-baseline" : stacked ? "items-end" : "flex-col")}>
            <h3 className={cx("truncate font-display font-semibold tracking-tight", stacked ? "text-base" : "text-xl")}>{targetItem?.title ?? ""}</h3>
            <span className={cx("inline-flex gap-2 text-xs text-muted-foreground", look.heroMoves ? "flex-col" : "items-baseline")}>
              <span className={look.heroMoves ? "uppercase tracking-wider" : undefined}>Moves</span>
              {movesCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {shuffleButton}
            {solveButton}
          </div>
        </div>)}
      </div>
    </div>
  );
}

export default SlidingPuzzleGallery;
