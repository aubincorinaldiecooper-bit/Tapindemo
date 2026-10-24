/**
 * Game logic and scoring for Tile Rush.
 */

export interface RoundConfig {
  size: number;
  /** Random moves used to scramble. The board is never more than this many moves from solved, so it doubles as par. */
  shuffleMoves: number;
}

/** Difficulty ramps up across a session: a quick win first, harder boards after. */
export const ROUNDS: RoundConfig[] = [
  { size: 3, shuffleMoves: 20 },
  { size: 4, shuffleMoves: 30 },
  { size: 4, shuffleMoves: 45 },
];

export interface RoundResult {
  round: number;
  moves: number;
  par: number;
  score: number;
  timestamp: number;
}

export interface GameState {
  round: number;
  roundsPerSession: number;
  totalScore: number;
  rounds: RoundResult[];
  currentStreak: number;
  bestStreak: number;
  category: string;
  totalPuzzlesSolved: number;
}

const STORAGE_KEY = "tile-rush-game-state";

export function roundConfig(round: number): RoundConfig {
  return ROUNDS[Math.min(round, ROUNDS.length) - 1]!;
}

/** Points for one puzzle: 1000 at or under par, falling off as moves go over par, never below 100. */
export function calculatePuzzleScore(moves: number, par: number): number {
  if (moves <= 0) return 0;
  const efficiency = Math.min(1, par / moves);
  return Math.max(100, Math.round(1000 * efficiency));
}

export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private mode, sandboxed viewers); the game still runs.
  }
}

export function loadGameState(): GameState | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? (JSON.parse(data) as GameState) : null;
  } catch {
    return null;
  }
}

export function createGameState(category = "nature", previous?: GameState | null): GameState {
  return {
    round: 1,
    roundsPerSession: ROUNDS.length,
    totalScore: 0,
    rounds: [],
    currentStreak: previous?.currentStreak ?? 0,
    bestStreak: previous?.bestStreak ?? 0,
    category,
    totalPuzzlesSolved: previous?.totalPuzzlesSolved ?? 0,
  };
}

export function addRoundResult(state: GameState, result: RoundResult): GameState {
  const currentStreak = state.currentStreak + 1;
  return {
    ...state,
    rounds: [...state.rounds, result],
    totalScore: state.totalScore + result.score,
    currentStreak,
    bestStreak: Math.max(state.bestStreak, currentStreak),
    totalPuzzlesSolved: state.totalPuzzlesSolved + 1,
    round: state.round + 1,
  };
}

export function isSessionComplete(state: GameState): boolean {
  return state.round > state.roundsPerSession;
}

export function getSessionSummary(state: GameState) {
  const count = state.rounds.length;
  return {
    totalScore: state.totalScore,
    averageScore: count ? Math.round(state.totalScore / count) : 0,
    averageMoves: count ? Math.round(state.rounds.reduce((sum, r) => sum + r.moves, 0) / count) : 0,
    roundsCompleted: count,
    bestRound: count ? Math.max(...state.rounds.map((r) => r.score)) : 0,
  };
}
