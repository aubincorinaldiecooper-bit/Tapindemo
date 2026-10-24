/**
 * Saved progress for Tile Rush: unlocked levels, stars, best scores, boosters and the daily goal.
 * Kept in this browser's localStorage; every read and write tolerates storage being blocked.
 */

export type BoosterId = "peek" | "undo" | "magic";

export interface Progress {
  /** Highest level the player may play. */
  unlocked: number;
  stars: Record<number, number>;
  best: Record<number, number>;
  boosters: Record<BoosterId, number>;
  daily: { date: string; solved: number; claimed: boolean };
}

export const DAILY_GOAL = 5;
const KEY = "tile-rush-progress";

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fresh(): Progress {
  return {
    unlocked: 1,
    stars: {},
    best: {},
    boosters: { peek: 3, undo: 3, magic: 2 },
    daily: { date: today(), solved: 0, claimed: false },
  };
}

export function loadProgress(): Progress {
  let p = fresh();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) p = { ...p, ...(JSON.parse(raw) as Partial<Progress>) };
  } catch {
    // Blocked or corrupt storage: start fresh.
  }
  // A new day resets the daily goal.
  if (p.daily.date !== today()) p = { ...p, daily: { date: today(), solved: 0, claimed: false } };
  return p;
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Not saved; the game keeps working for this visit.
  }
}

export function recordSolve(p: Progress, level: number, stars: number, score: number): Progress {
  const daily = p.daily.date === today() ? p.daily : { date: today(), solved: 0, claimed: false };
  return {
    ...p,
    unlocked: Math.max(p.unlocked, level + 1),
    stars: { ...p.stars, [level]: Math.max(p.stars[level] ?? 0, stars) },
    best: { ...p.best, [level]: Math.max(p.best[level] ?? 0, score) },
    daily: { ...daily, solved: daily.solved + 1 },
  };
}

/** Daily goal reward: one of each booster. */
export function claimDaily(p: Progress): Progress {
  if (p.daily.claimed || p.daily.solved < DAILY_GOAL) return p;
  return {
    ...p,
    boosters: { peek: p.boosters.peek + 1, undo: p.boosters.undo + 1, magic: p.boosters.magic + 1 },
    daily: { ...p.daily, claimed: true },
  };
}

export function addBooster(p: Progress, id: BoosterId, amount: number): Progress {
  return { ...p, boosters: { ...p.boosters, [id]: Math.max(0, p.boosters[id] + amount) } };
}

export function totalStars(p: Progress): number {
  return Object.values(p.stars).reduce((sum, s) => sum + s, 0);
}

export function totalScore(p: Progress): number {
  return Object.values(p.best).reduce((sum, s) => sum + s, 0);
}
