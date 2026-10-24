/**
 * Builds a swap-puzzle level: the scrambled board plus its obstacles and gems.
 * Every level is checked by playing it with a simple solver, so a level can always be finished
 * and its par is a score that can actually be reached.
 */
import type { Level } from "@/lib/levels";

export interface Built {
  size: number;
  /** board[position] = id of the tile sitting there; a tile's id is its home position. */
  board: number[];
  /** Tiles frozen at the start; each thaws once a neighbouring tile is in place. */
  frozen: number[];
  /** Two linked tiles; swapping either costs 2 moves until one of them is in place. */
  chain: [number, number] | null;
  /** Tiles carrying a gem, collected when the tile reaches its home. */
  gems: number[];
  /** Cheapest known solve, in moves: 3 stars at or under this. */
  par: number;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
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
    if (a === b || cycleIds(board)[a] === cycleIds(board)[b]) continue;
    [board[a], board[b]] = [board[b]!, board[a]!];
  }
  return board;
}

export function neighbourPositions(pos: number, n: number): number[] {
  const row = Math.floor(pos / n);
  const col = pos % n;
  const out: number[] = [];
  if (row > 0) out.push(pos - n);
  if (row < n - 1) out.push(pos + n);
  if (col > 0) out.push(pos - 1);
  if (col < n - 1) out.push(pos + 1);
  return out;
}

/** Keys of the rows ("r0") and columns ("c2") whose tiles are all in place. */
export function completeLines(board: number[], n: number, inPlace: (id: number, pos: number) => boolean): string[] {
  const out: string[] = [];
  for (let r = 0; r < n; r++) {
    if (Array.from({ length: n }, (_, c) => r * n + c).every((p) => inPlace(board[p]!, p))) out.push(`r${r}`);
  }
  for (let c = 0; c < n; c++) {
    if (Array.from({ length: n }, (_, r) => r * n + c).every((p) => inPlace(board[p]!, p))) out.push(`c${c}`);
  }
  return out;
}

/** Plays the level with the game's own rules, always taking the cheapest legal swap that places a tile. */
function simulate(start: number[], n: number, frozen: number[], chain: [number, number] | null): number | null {
  const b = start.slice();
  const thawed = new Set<number>();
  let chainBroken = false;
  const refresh = () => {
    for (const f of frozen) {
      if (!thawed.has(f) && neighbourPositions(b.indexOf(f), n).some((r) => b[r] === r)) thawed.add(f);
    }
    if (chain && !chainBroken && chain.some((t) => b.indexOf(t) === t)) chainBroken = true;
  };
  const isFrozen = (id: number) => frozen.includes(id) && !thawed.has(id);
  const isChained = (id: number) => !!chain && !chainBroken && chain.includes(id);
  refresh();
  let cost = 0;
  for (let guard = 0; guard < 200; guard++) {
    let best: { p: number; q: number; c: number } | null = null;
    for (let p = 0; p < b.length; p++) {
      if (b[p] === p) continue;
      const q = b.indexOf(p);
      const x = b[p]!;
      const y = b[q]!;
      if (isFrozen(x) || isFrozen(y)) continue;
      const c = 1 + (isChained(x) || isChained(y) ? 1 : 0);
      if (!best || c < best.c) best = { p, q, c };
    }
    if (!best) return b.every((id, pos) => id === pos) ? cost : null;
    [b[best.p], b[best.q]] = [b[best.q]!, b[best.p]!];
    cost += best.c;
    refresh();
  }
  return null;
}

export function buildLevel(cfg: Level): Built {
  const n = cfg.size;
  const tiles = n * n;
  for (let attempt = 0; attempt < 60; attempt++) {
    const seed = cfg.number * 7919 + attempt * 104729;
    const board = scramble(tiles, cfg.par, seed);
    const rand = mulberry32(seed ^ 0x9e3779b9);
    const wrong = shuffle(
      board.filter((id, pos) => id !== pos),
      rand,
    );
    const frozen = wrong.slice(0, cfg.frozen);
    const pair = cfg.chains ? wrong.slice(cfg.frozen, cfg.frozen + 2) : [];
    if (frozen.length < cfg.frozen || pair.length < (cfg.chains ? 2 : 0)) continue;
    // Frozen tiles must start frozen: none of their neighbours may already be in place.
    if (frozen.some((f) => neighbourPositions(board.indexOf(f), n).some((r) => board[r] === r))) continue;
    const chain = pair.length === 2 ? ([pair[0]!, pair[1]!] as [number, number]) : null;
    const par = simulate(board, n, frozen, chain);
    if (par === null) continue;
    return { size: n, board, frozen, chain, gems: shuffle(wrong, rand).slice(0, cfg.gems), par };
  }
  // No obstacle layout worked out: fall back to a plain board.
  const board = scramble(tiles, cfg.par, cfg.number * 7919);
  const rand = mulberry32(cfg.number);
  return {
    size: n,
    board,
    frozen: [],
    chain: null,
    gems: shuffle(
      board.filter((id, pos) => id !== pos),
      rand,
    ).slice(0, cfg.gems),
    par: cfg.par,
  };
}
