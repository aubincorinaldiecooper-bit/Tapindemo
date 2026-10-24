"use client";

import * as React from "react";
import { SlidingPuzzleGallery } from "@/components/ui/sliding-puzzle-gallery";
import type { PuzzleItem } from "@/components/ui/sliding-puzzle-gallery";
import { OFFLINE_ITEMS } from "@/lib/artwork";
import { SOLVES_PER_SESSION, calculatePuzzleScore, loadStats, saveStats } from "@/lib/gameLogic";

const settings = {
  size: 4,
  // Tile Rush: the player solves every board, so nothing plays or solves by itself.
  autoplay: false,
  autoSolve: false,
  hold: 2400,
  moveDuration: 150,
  shuffleMoves: 16,
  playable: true,
  numbers: false,
  gap: 4,
};

const PHOTOS = [
  { id: "photo-1579264688258-c0ebf8c7942a", title: "Eurasian eagle-owl", caption: "Ear tufts up, orange eyes locked on the lens." },
  { id: "photo-1639104738898-ec92e9e40a0a", title: "Red fox", caption: "Caught mid-step at the edge of the woods." },
  { id: "photo-1619475762212-da12e5e15f18", title: "Tiger in the snow", caption: "Frost on the whiskers and a steady stare." },
  { id: "photo-1542880941-1abfea46bba6", title: "Red panda", caption: "Round ears, white brows and plenty of curiosity." },
  { id: "photo-1544923408-75c5cef46f14", title: "Scarlet macaw", caption: "Red, yellow and blue, all on one bird." },
  { id: "photo-1745933115134-9cd90e3efcc7", title: "Lion", caption: "A heavy golden mane and a calm, slow look." },
];

const PHOTO_ITEMS: PuzzleItem[] = PHOTOS.map(({ id, title, caption }) => ({
  src: `https://images.unsplash.com/${id}?w=1000&h=1000&fit=crop&q=80&auto=format`,
  alt: title,
  title,
  caption,
}));

// Builds for places that block outside images (previews, sandboxes) set VITE_OFFLINE_ART=1.
const ITEMS: PuzzleItem[] = import.meta.env.VITE_OFFLINE_ART ? OFFLINE_ITEMS : PHOTO_ITEMS;

const CCGATHER_URL = "https://ccgather.com/?utm_source=21st&utm_medium=component&utm_campaign=sliding_puzzle_gallery";

interface Solve {
  index: number;
  moves: number;
  score: number;
}

export default function Demo(props: Partial<typeof settings>) {
  const s = { ...settings, ...props };
  const [session, setSession] = React.useState(0);
  const [solves, setSolves] = React.useState<Solve[]>([]);
  const [stats, setStats] = React.useState(loadStats);

  const total = solves.reduce((sum, x) => sum + x.score, 0);
  const finished = solves.length >= SOLVES_PER_SESSION;
  const last = solves[solves.length - 1];

  const onSolve = ({ index, moves }: { index: number; moves: number }) => {
    if (finished || solves.some((x) => x.index === index)) return;
    const next = [...solves, { index, moves, score: calculatePuzzleScore(moves, s.shuffleMoves) }];
    setSolves(next);
    const done = next.length >= SOLVES_PER_SESSION;
    const sessionTotal = next.reduce((sum, x) => sum + x.score, 0);
    const updated = {
      puzzlesSolved: stats.puzzlesSolved + 1,
      sessionsCompleted: stats.sessionsCompleted + (done ? 1 : 0),
      bestSession: done ? Math.max(stats.bestSession, sessionTotal) : stats.bestSession,
    };
    setStats(updated);
    saveStats(updated);
  };

  const playAgain = () => {
    setSolves([]);
    setSession((n) => n + 1);
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-5 bg-background p-6 text-foreground">
      <div className="flex w-full max-w-3xl items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold tracking-tight">Tile Rush</h1>
        <div className="flex items-baseline gap-4 font-mono text-xs text-muted-foreground">
          <span data-solved>
            <span className="text-base tabular-nums text-foreground">{solves.length}</span>/{SOLVES_PER_SESSION} solved
          </span>
          <span data-score>
            <span className="text-base tabular-nums text-foreground">{total}</span> pts
          </span>
        </div>
      </div>

      <SlidingPuzzleGallery
        key={session}
        items={ITEMS}
        size={s.size}
        autoplay={s.autoplay}
        autoSolve={s.autoSolve}
        hold={s.hold}
        moveDuration={s.moveDuration}
        shuffleMoves={s.shuffleMoves}
        playable={s.playable}
        numbers={s.numbers}
        gap={s.gap}
        onSolve={onSolve}
        className="max-w-3xl"
      />

      {last && !finished && (
        <p data-round-result className="text-sm text-muted-foreground">
          {ITEMS[last.index]?.title} solved in {last.moves} moves:{" "}
          <span className="font-mono text-foreground">+{last.score}</span>. Pick another photo to keep going.
        </p>
      )}

      {finished && (
        <section data-session-complete className="flex w-full max-w-3xl flex-col gap-4 rounded-[22px] bg-muted p-5 ring-1 ring-border">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight">Session complete</h2>
            <span className="font-mono text-2xl tabular-nums">{total} pts</span>
          </div>
          <ul className="grid gap-1 font-mono text-xs text-muted-foreground">
            {solves.map((x) => (
              <li key={x.index} className="flex justify-between gap-3">
                <span>{ITEMS[x.index]?.title}</span>
                <span>
                  {x.moves} moves · <span className="text-foreground">+{x.score}</span>
                </span>
              </li>
            ))}
          </ul>
          {/* Ad slot: one per session, at the natural break. */}
          <div className="rounded-md border border-dashed border-border py-6 text-center text-xs text-muted-foreground">Ad space</div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              Best session {stats.bestSession} pts · {stats.puzzlesSolved} photos solved
            </span>
            <button
              type="button"
              onClick={playAgain}
              className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Play again
            </button>
          </div>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Solve {SOLVES_PER_SESSION} photos per session. Fewer moves, more points.{" "}
        <a href={CCGATHER_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4 transition-colors hover:text-foreground">
          Puzzle by the CCgather team
        </a>
      </p>
    </div>
  );
}
