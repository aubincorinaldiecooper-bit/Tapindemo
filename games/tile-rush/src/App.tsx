import { useEffect, useState } from "react";
import { SlidingPuzzle } from "./components/SlidingPuzzle";
import { CATEGORIES } from "./lib/artwork";
import {
  GameState,
  addRoundResult,
  calculatePuzzleScore,
  createGameState,
  getSessionSummary,
  isSessionComplete,
  loadGameState,
  roundConfig,
  saveGameState,
} from "./lib/gameLogic";

type GamePhase = "menu" | "playing" | "roundComplete" | "sessionComplete";

const primaryButton =
  "w-full rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-500 active:scale-[0.98]";
const secondaryButton =
  "w-full rounded-xl bg-slate-700 px-6 py-3 font-bold text-white transition hover:bg-slate-600 active:scale-[0.98]";

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 to-slate-800 p-4 text-white">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [currentMoves, setCurrentMoves] = useState(0);
  // Remounts the puzzle so each round gets a fresh scramble.
  const [puzzleKey, setPuzzleKey] = useState(0);

  useEffect(() => {
    const saved = loadGameState();
    if (saved) setGameState(saved);
  }, []);

  const resumable = gameState && gameState.rounds.length > 0 && !isSessionComplete(gameState);
  const category = gameState?.category ?? "nature";
  const images = CATEGORIES[category] ?? CATEGORIES.nature!;
  const round = gameState?.round ?? 1;
  const config = roundConfig(round);
  const image = images[(round - 1) % images.length]!;

  const startNewSession = (nextCategory = category) => {
    const next = createGameState(nextCategory, gameState);
    setGameState(next);
    saveGameState(next);
    setCurrentMoves(0);
    setPuzzleKey((k) => k + 1);
    setPhase("playing");
  };

  const resume = () => {
    setCurrentMoves(0);
    setPuzzleKey((k) => k + 1);
    setPhase("playing");
  };

  const handlePuzzleSolved = (moves: number) => {
    if (!gameState) return;
    const next = addRoundResult(gameState, {
      round: gameState.round,
      moves,
      par: config.shuffleMoves,
      score: calculatePuzzleScore(moves, config.shuffleMoves),
      timestamp: Date.now(),
    });
    setGameState(next);
    saveGameState(next);
    setPhase("roundComplete");
  };

  const continueToNextRound = () => {
    if (!gameState) return;
    if (isSessionComplete(gameState)) {
      setPhase("sessionComplete");
    } else {
      setCurrentMoves(0);
      setPuzzleKey((k) => k + 1);
      setPhase("playing");
    }
  };

  if (phase === "menu") {
    return (
      <Screen>
        <div className="text-center">
          <h1 className="mb-2 text-6xl font-black tracking-tight">
            TILE <span className="text-blue-400">RUSH</span>
          </h1>
          <p className="mb-8 text-lg text-slate-300">Slide the tiles. Fix the picture.</p>

          <div className="mb-6 grid grid-cols-2 gap-3">
            {Object.entries(CATEGORIES).map(([id, list]) => (
              <button
                key={id}
                onClick={() => setGameState((s) => (s ? { ...s, category: id } : createGameState(id)))}
                className={`overflow-hidden rounded-xl ring-2 transition ${
                  category === id ? "ring-blue-400" : "ring-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img src={list[0]!.src} alt="" className="aspect-[4/3] w-full object-cover" />
                <div className="bg-slate-800 py-1.5 text-sm font-semibold capitalize">{id}</div>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {resumable && (
              <button onClick={resume} className={primaryButton}>
                Continue (Round {gameState.round}/{gameState.roundsPerSession})
              </button>
            )}
            <button onClick={() => startNewSession()} className={resumable ? secondaryButton : primaryButton}>
              Start New Game
            </button>
          </div>

          {gameState && gameState.totalPuzzlesSolved > 0 && (
            <div className="mt-6 flex justify-center gap-6 text-sm text-slate-400">
              <span>Solved: {gameState.totalPuzzlesSolved}</span>
              <span>Best streak: {gameState.bestStreak}</span>
            </div>
          )}
        </div>
      </Screen>
    );
  }

  if (phase === "playing" && gameState) {
    return (
      <Screen>
        <div className="mb-4 flex items-center justify-between text-sm">
          <button onClick={() => setPhase("menu")} className="text-slate-400 hover:text-white">
            ← Menu
          </button>
          <span className="font-semibold text-blue-400">
            Round {gameState.round}/{gameState.roundsPerSession}
          </span>
          <span className="text-slate-400">{gameState.totalScore} pts</span>
        </div>

        <SlidingPuzzle
          key={puzzleKey}
          image={image}
          size={config.size}
          shuffleMoves={config.shuffleMoves}
          onMovesChange={setCurrentMoves}
          onSolved={handlePuzzleSolved}
        />

        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-800 p-4">
          <div className="text-xs text-slate-400">
            <div>Par: {config.shuffleMoves}</div>
            <div>Moves: {currentMoves}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {currentMoves > 0 ? calculatePuzzleScore(currentMoves, config.shuffleMoves) : 1000}
            </div>
            <div className="text-xs text-slate-400">points if solved now</div>
          </div>
        </div>
      </Screen>
    );
  }

  if (phase === "roundComplete" && gameState && gameState.rounds.length > 0) {
    const last = gameState.rounds[gameState.rounds.length - 1]!;
    const done = isSessionComplete(gameState);
    return (
      <Screen>
        <div className="text-center">
          <h2 className="mb-4 text-3xl font-bold">Solved! 🎉</h2>
          <div className="mb-6 rounded-xl bg-slate-800 p-6">
            <div className="text-5xl font-black text-blue-400">+{last.score}</div>
            <div className="mt-1 text-sm text-slate-300">points</div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-left">
              <div>
                <div className="text-xs text-slate-400">Moves</div>
                <div className="text-xl font-bold">{last.moves}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Par</div>
                <div className="text-xl font-bold">{last.par}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Streak</div>
                <div className="text-xl font-bold">{gameState.currentStreak}🔥</div>
              </div>
            </div>
          </div>
          <button onClick={continueToNextRound} className={primaryButton}>
            {done ? "See Final Score" : "Next Puzzle"}
          </button>
        </div>
      </Screen>
    );
  }

  if (phase === "sessionComplete" && gameState) {
    const summary = getSessionSummary(gameState);
    return (
      <Screen>
        <div className="text-center">
          <h2 className="mb-6 text-4xl font-bold">Session Complete! 🏆</h2>
          <div className="mb-4 rounded-xl bg-slate-800 p-5">
            <div className="text-5xl font-black text-yellow-400">{summary.totalScore}</div>
            <div className="text-sm text-slate-400">Total score</div>
          </div>
          <div className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-800 p-3">
              <div className="text-xl font-bold text-blue-400">{summary.averageScore}</div>
              <div className="text-xs text-slate-400">Avg score</div>
            </div>
            <div className="rounded-xl bg-slate-800 p-3">
              <div className="text-xl font-bold text-purple-400">{summary.averageMoves}</div>
              <div className="text-xs text-slate-400">Avg moves</div>
            </div>
            <div className="rounded-xl bg-slate-800 p-3">
              <div className="text-xl font-bold text-emerald-400">{summary.bestRound}</div>
              <div className="text-xs text-slate-400">Best round</div>
            </div>
          </div>

          {/* Ad slot: shown once per session, at the natural break. */}
          <div className="mb-6 rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/50 py-8 text-sm text-slate-500">
            Ad space
          </div>

          <div className="space-y-3">
            <button onClick={() => startNewSession()} className={primaryButton}>
              Play Again
            </button>
            <button onClick={() => setPhase("menu")} className={secondaryButton}>
              Back to Menu
            </button>
          </div>
        </div>
      </Screen>
    );
  }

  return null;
}
