/**
 * Scoring and saved stats for Tile Rush.
 */

/** Photos the player must solve to finish a session. */
export const SOLVES_PER_SESSION = 3;

/** Points for one photo: 1000 at or under par, falling off as moves go over par, never below 100. */
export function calculatePuzzleScore(moves: number, par: number): number {
  if (moves <= 0) return 0;
  return Math.max(100, Math.round(1000 * Math.min(1, par / moves)));
}

export interface Stats {
  puzzlesSolved: number;
  sessionsCompleted: number;
  bestSession: number;
}

const STATS_KEY = "tile-rush-stats";
const EMPTY: Stats = { puzzlesSolved: 0, sessionsCompleted: 0, bestSession: 0 };

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Stats>) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function saveStats(stats: Stats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Storage can be blocked (private mode, sandboxed viewers); the game still runs.
  }
}
