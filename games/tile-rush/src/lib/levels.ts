/**
 * Level rules for Tile Rush: board size, scramble length, move budget, stars and score.
 */

export interface Level {
  number: number;
  /** Tiles per side. */
  size: number;
  /** Random moves used to scramble; the board is never more than this many moves from solved, so it is also par. */
  par: number;
  /** Moves the player may use before running out. */
  budget: number;
  /** Which picture this level uses (wraps around the picture list). */
  imageIndex: number;
}

/** Levels 1–3 are 3×3, 4–10 are 4×4, then 5×5. Scrambles get longer as levels go up. */
export function levelConfig(number: number, imageCount: number): Level {
  const size = number <= 3 ? 3 : number <= 10 ? 4 : 5;
  const par =
    size === 3 ? 8 + number * 2 : size === 4 ? Math.min(36, 14 + (number - 4) * 3) : Math.min(60, 34 + (number - 11) * 2);
  return {
    number,
    size,
    par,
    budget: par * 3,
    imageIndex: (number - 1) % Math.max(1, imageCount),
  };
}

/** 3 stars at up to 1.5× par, 2 stars at up to 2.25× par, otherwise 1 star. */
export function starsFor(moves: number, level: Level): 1 | 2 | 3 {
  if (moves <= level.par * 1.5) return 3;
  if (moves <= level.par * 2.25) return 2;
  return 1;
}

/** Moves allowed for each star, for showing the thresholds. */
export function starThresholds(level: Level): [number, number] {
  return [Math.floor(level.par * 1.5), Math.floor(level.par * 2.25)];
}

/** Base points by board size, plus a bonus for every move left in the budget. */
export function scoreFor(moves: number, level: Level, budget: number): number {
  const base = level.size * level.size * 100;
  return base + Math.max(0, budget - moves) * 50;
}
