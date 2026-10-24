"use client";

import * as React from "react";
import { SlidingPuzzleGallery } from "@/components/ui/sliding-puzzle-gallery";
import type { PuzzleItem } from "@/components/ui/sliding-puzzle-gallery";
import { OFFLINE_ITEMS } from "@/lib/artwork";
import { SOLVES_PER_SESSION, calculatePuzzleScore } from "@/lib/gameLogic";

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

export default function Demo(props: Partial<typeof settings>) {
  const s = { ...settings, ...props };
  // Scores of the current session; a solve after a full session starts the next one.
  const [scores, setScores] = React.useState<number[]>([]);
  const total = scores.reduce((sum, x) => sum + x, 0);

  const onSolve = ({ moves }: { moves: number }) => {
    const score = calculatePuzzleScore(moves, s.shuffleMoves);
    setScores((prev) => (prev.length >= SOLVES_PER_SESSION ? [score] : [...prev, score]));
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-5 bg-background p-6 text-foreground">
      <div className="flex w-full max-w-3xl items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold tracking-tight">Tile Rush</h1>
        <div className="flex items-baseline gap-4 font-mono text-xs text-muted-foreground">
          <span data-solved>
            <span className="text-base tabular-nums text-foreground">{scores.length}</span>/{SOLVES_PER_SESSION} solved
          </span>
          <span data-score>
            <span className="text-base tabular-nums text-foreground">{total}</span> pts
          </span>
        </div>
      </div>
      <SlidingPuzzleGallery
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
    </div>
  );
}
