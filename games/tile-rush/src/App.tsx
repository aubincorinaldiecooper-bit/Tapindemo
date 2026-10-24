import React, { useState, useEffect } from "react";
import { SlidingPuzzle } from "./components/SlidingPuzzle";
import {
  GameState,
  RoundResult,
  createGameState,
  addRoundResult,
  calculateOptimalMoves,
  calculatePuzzleScore,
  saveGameState,
  loadGameState,
  isSessionComplete,
  getSessionSummary,
} from "./lib/gameLogic";
import "./App.css";

interface PuzzleImage {
  src: string;
  title: string;
}

const PUZZLE_IMAGES: Record<string, PuzzleImage[]> = {
  animals: [
    {
      src: "https://images.unsplash.com/photo-1639104738898-ec92e9e40a0a?w=800&h=800&fit=crop&q=80",
      title: "Red Fox",
    },
    {
      src: "https://images.unsplash.com/photo-1542880941-1abfea46bba6?w=800&h=800&fit=crop&q=80",
      title: "Red Panda",
    },
    {
      src: "https://images.unsplash.com/photo-1617475762212-da12e5e15f18?w=800&h=800&fit=crop&q=80",
      title: "Tiger",
    },
  ],
  nature: [
    {
      src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=800&fit=crop&q=80",
      title: "Mountain",
    },
    {
      src: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&h=800&fit=crop&q=80",
      title: "Forest",
    },
    {
      src: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&h=800&fit=crop&q=80",
      title: "Ocean",
    },
  ],
};

type GamePhase = "menu" | "playing" | "roundComplete" | "sessionComplete";

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [currentMoves, setCurrentMoves] = useState(0);
  const gridSize = 4;
  const optimalMoves = calculateOptimalMoves(gridSize);
  const category = gameState?.category || "animals";
  const images = PUZZLE_IMAGES[category] || PUZZLE_IMAGES.animals;

  // Load game state on mount
  useEffect(() => {
    const saved = loadGameState();
    if (saved && !isSessionComplete(saved)) {
      setGameState(saved);
      setPhase("playing");
    }
  }, []);

  const startNewSession = () => {
    const newState = createGameState(3);
    setGameState(newState);
    setPhase("playing");
    setCurrentMoves(0);
  };

  const handlePuzzleSolved = (moves: number) => {
    if (!gameState) return;

    const score = calculatePuzzleScore(moves, optimalMoves);
    const result: RoundResult = {
      puzzleIndex: gameState.round - 1,
      moves,
      optimalMoves,
      score,
      timestamp: Date.now(),
    };

    const updatedState = addRoundResult(gameState, result);
    setGameState(updatedState);
    saveGameState(updatedState);

    setPhase("roundComplete");
  };

  const continueToNextRound = () => {
    if (!gameState) return;

    if (isSessionComplete(gameState)) {
      setPhase("sessionComplete");
    } else {
      setPhase("playing");
      setCurrentMoves(0);
    }
  };

  const restartSession = () => {
    startNewSession();
  };

  const exitToMenu = () => {
    setPhase("menu");
    setGameState(null);
  };

  const renderMenu = () => (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="mb-2 text-5xl font-bold text-white">TILE RUSH</h1>
        <p className="mb-8 text-lg text-slate-300">Solve sliding puzzles and earn points</p>

        <button
          onClick={startNewSession}
          className="mb-4 w-full rounded-lg bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 active:scale-95"
        >
          Start New Game
        </button>

        <div className="mt-8 space-y-2 text-sm text-slate-400">
          <p>• Solve the puzzle in fewer moves to earn more points</p>
          <p>• Complete 3 rounds per session</p>
          <p>• Unlock new categories as you progress</p>
        </div>
      </div>
    </div>
  );

  const renderPlaying = () => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-blue-400">
            Round {gameState?.round}/{gameState?.roundsPerSession}
          </span>
          <span className="text-sm text-slate-400">Category: {category}</span>
        </div>

        <SlidingPuzzle
          items={images}
          size={gridSize}
          onMovesChange={setCurrentMoves}
          onSolved={handlePuzzleSolved}
          className="mb-6"
        />

        <div className="rounded-lg bg-slate-800 p-4">
          <div className="mb-2 flex justify-between text-xs text-slate-400">
            <span>Optimal: {optimalMoves}</span>
            <span>Current: {currentMoves}</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {currentMoves > 0 ? calculatePuzzleScore(currentMoves, optimalMoves) : "0"} pts
          </div>
        </div>
      </div>
    </div>
  );

  const renderRoundComplete = () => {
    if (!gameState || gameState.rounds.length === 0) return null;
    const lastRound = gameState.rounds[gameState.rounds.length - 1];

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="w-full max-w-md text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">Great Job! 🎉</h2>
          <div className="mb-6 rounded-lg bg-slate-800 p-6">
            <div className="mb-4 text-5xl font-bold text-blue-400">{lastRound.score}</div>
            <div className="text-sm text-slate-300">Points Earned</div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-left">
              <div>
                <div className="text-xs text-slate-400">Your Moves</div>
                <div className="text-xl font-bold text-white">{lastRound.moves}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Optimal</div>
                <div className="text-xl font-bold text-white">{lastRound.optimalMoves}</div>
              </div>
            </div>
          </div>

          {isSessionComplete(gameState) ? (
            <button
              onClick={continueToNextRound}
              className="w-full rounded-lg bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700 active:scale-95"
            >
              See Final Score
            </button>
          ) : (
            <button
              onClick={continueToNextRound}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 active:scale-95"
            >
              Next Puzzle
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderSessionComplete = () => {
    if (!gameState) return null;
    const summary = getSessionSummary(gameState);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
        <div className="w-full max-w-md text-center">
          <h2 className="mb-6 text-4xl font-bold text-white">Session Complete! 🏆</h2>

          <div className="mb-6 space-y-4">
            <div className="rounded-lg bg-slate-800 p-4">
              <div className="text-4xl font-bold text-yellow-400">{summary.totalScore}</div>
              <div className="text-sm text-slate-400">Total Score</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-800 p-3">
                <div className="text-2xl font-bold text-blue-400">{summary.averageScore}</div>
                <div className="text-xs text-slate-400">Avg Score</div>
              </div>
              <div className="rounded-lg bg-slate-800 p-3">
                <div className="text-2xl font-bold text-purple-400">{summary.averageMoves}</div>
                <div className="text-xs text-slate-400">Avg Moves</div>
              </div>
            </div>
          </div>

          {/* AD PLACEMENT HERE */}
          <div className="mb-6 rounded-lg border-2 border-dashed border-slate-600 bg-slate-800/50 py-8 text-slate-500">
            <div className="text-sm">Advertisement Space</div>
          </div>

          <button
            onClick={restartSession}
            className="mb-2 w-full rounded-lg bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 active:scale-95"
          >
            Play Again
          </button>
          <button
            onClick={exitToMenu}
            className="w-full rounded-lg bg-slate-700 px-6 py-3 font-bold text-white hover:bg-slate-600 active:scale-95"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 text-white">
      {phase === "menu" && renderMenu()}
      {phase === "playing" && renderPlaying()}
      {phase === "roundComplete" && renderRoundComplete()}
      {phase === "sessionComplete" && renderSessionComplete()}
    </div>
  );
}
