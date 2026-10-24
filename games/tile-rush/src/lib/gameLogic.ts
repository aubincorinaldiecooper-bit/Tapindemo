/**
 * Game logic and scoring for Tile Rush
 */

export interface RoundResult {
  puzzleIndex: number;
  moves: number;
  optimalMoves: number;
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

export interface PuzzleCategory {
  id: string;
  name: string;
  images: Array<{ src: string; title: string }>;
  unlocked: boolean;
}

// Calculate optimal moves for a given grid size using Manhattan distance
export function calculateOptimalMoves(gridSize: number): number {
  // Approximate heuristic: average solves for a shuffled puzzle
  // 4x4 (16 tiles): ~52 moves optimal
  // 3x3 (9 tiles): ~24 moves optimal
  const lookup: Record<number, number> = {
    3: 24,
    4: 52,
    5: 105,
  };
  return lookup[gridSize] || 52;
}

// Calculate score based on moves vs optimal
export function calculatePuzzleScore(moves: number, optimalMoves: number): number {
  const efficiency = optimalMoves / moves;

  if (efficiency >= 1) {
    // Perfect or better than expected
    return Math.round(1000 * efficiency);
  } else if (efficiency >= 0.8) {
    // Good
    return Math.round(800 * efficiency);
  } else if (efficiency >= 0.6) {
    // Acceptable
    return Math.round(500 * efficiency);
  } else {
    // Below average
    return Math.max(100, Math.round(300 * efficiency));
  }
}

// Persist game state to localStorage
export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem("tile-rush-game-state", JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save game state:", e);
  }
}

// Load game state from localStorage
export function loadGameState(): GameState | null {
  try {
    const data = localStorage.getItem("tile-rush-game-state");
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn("Failed to load game state:", e);
    return null;
  }
}

// Create new game state
export function createGameState(roundsPerSession: number = 3): GameState {
  return {
    round: 1,
    roundsPerSession,
    totalScore: 0,
    rounds: [],
    currentStreak: 0,
    bestStreak: 0,
    category: "animals",
    totalPuzzlesSolved: 0,
  };
}

// Add round result and update state
export function addRoundResult(state: GameState, result: RoundResult): GameState {
  const updated = { ...state };
  updated.rounds.push(result);
  updated.totalScore += result.score;
  updated.currentStreak += 1;
  updated.bestStreak = Math.max(updated.bestStreak, updated.currentStreak);
  updated.totalPuzzlesSolved += 1;

  if (result.score > 0) {
    updated.round += 1;
  }

  return updated;
}

// Check if session is complete
export function isSessionComplete(state: GameState): boolean {
  return state.round > state.roundsPerSession;
}

// Get session summary
export function getSessionSummary(state: GameState) {
  const avgScore = state.rounds.length > 0 ? Math.round(state.totalScore / state.rounds.length) : 0;
  const avgMoves = state.rounds.length > 0 ? Math.round(state.rounds.reduce((sum, r) => sum + r.moves, 0) / state.rounds.length) : 0;

  return {
    totalScore: state.totalScore,
    averageScore: avgScore,
    averageMoves: avgMoves,
    roundsCompleted: state.rounds.length,
    bestRound: state.rounds.length > 0 ? Math.max(...state.rounds.map((r) => r.score)) : 0,
  };
}
