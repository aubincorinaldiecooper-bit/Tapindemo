/**
 * Level rules for Tile Rush: board size, swaps needed (par), move budget, stars and score.
 */

export interface Level {
  number: number;
  /** Tiles per side. */
  size: number;
  /** Fewest swaps that solve the scrambled board (exact). */
  par: number;
  /** Moves the player may use before running out. */
  budget: number;
  /** Which picture this level uses (wraps around the picture list). */
  imageIndex: number;
}

/** Levels 1–3 are 3×3, 4–10 are 4×4, then 5×5. Each level needs a few more swaps than the last. */
export function levelConfig(number: number, imageCount: number): Level {
  const size = number <= 3 ? 3 : number <= 10 ? 4 : 5;
  const maxPar = size * size - 1;
  const par = Math.min(maxPar, size === 3 ? 3 + number : size === 4 ? 4 + number : 6 + number);
  return {
    number,
    size,
    par,
    budget: par * 2,
    imageIndex: (number - 1) % Math.max(1, imageCount),
  };
}

/** 3 stars at par, 2 stars within half as many again, otherwise 1 star. */
export function starsFor(moves: number, level: Level): 1 | 2 | 3 {
  if (moves <= level.par) return 3;
  if (moves <= Math.ceil(level.par * 1.5)) return 2;
  return 1;
}

/** Moves allowed for 3 and 2 stars. */
export function starThresholds(level: Level): [number, number] {
  return [level.par, Math.ceil(level.par * 1.5)];
}

/** Base points by board size, plus a bonus for every move left in the budget. */
export function scoreFor(moves: number, level: Level, budget: number): number {
  const base = level.size * level.size * 100;
  return base + Math.max(0, budget - moves) * 50;
}
