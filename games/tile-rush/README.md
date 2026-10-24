# Tile Rush

A sliding puzzle game with a reward loop designed for ad-revenue monetization.

**Game Loop:**
- Solve sliding tile puzzles (4×4 grid by default)
- Score based on move efficiency vs optimal moves
- Complete 3 rounds per session
- Earn points, unlock categories
- Persistent leaderboards (localStorage initially)

**Tech Stack:**
- React 18 + TypeScript
- Vite + Tailwind CSS
- No dependencies for game logic (pure React)

## Run locally

```bash
cd games/tile-rush
npm install
npm run dev
```

Visit `http://localhost:5173`

## Project Structure

```
src/
├── components/
│   └── SlidingPuzzle.tsx     # Puzzle component (manual-only)
├── lib/
│   └── gameLogic.ts          # Scoring, state management, persistence
├── App.tsx                   # Main game loop (menu → playing → complete)
├── App.css                   # Tailwind styles
└── main.tsx                  # Entry point

index.html                     # HTML entry
package.json                   # Dependencies
vite.config.ts                # Vite build config
tailwind.config.js            # Tailwind configuration
postcss.config.js             # PostCSS config
```

## Game Phases

1. **Menu** — Start new session or continue
2. **Playing** — Solve the puzzle (3 rounds)
3. **Round Complete** — Show score, move to next or finish
4. **Session Complete** — Final stats + ad placement + replay option

## Scoring

Points are calculated based on **move efficiency**:

```
efficiency = optimal_moves / actual_moves
```

- **≥1.0** (better than optimal): 1000× efficiency
- **0.8–1.0** (good): 800× efficiency
- **0.6–0.8** (acceptable): 500× efficiency
- **<0.6** (below average): 300× efficiency (min 100)

## Ad Placement

- **Between rounds** (natural break after solving)
- **After session complete** (placeholder in App.tsx, line ~320)
- **Optional reward ads** (watch for hints, undo, 2x multiplier)

## Data Persistence

Game state saved to `localStorage` as `tile-rush-game-state`:

```typescript
{
  round: number,              // Current round (1-3)
  totalScore: number,         // Sum of all round scores
  rounds: RoundResult[],      // History of solved puzzles
  currentStreak: number,      // Puzzles solved in a row
  bestStreak: number,         // Best streak recorded
  category: string,           // Current image category
  totalPuzzlesSolved: number  // Lifetime stat
}
```

## Next Steps (Refine Loop)

1. **Add category progression** — Unlock "nature", "cities" etc. at score milestones
2. **Timed mode** — Solve N puzzles in 60 seconds
3. **Daily challenge** — Fixed puzzle, compete on move count
4. **Hint system** — Reveal tile positions (costs coins)
5. **Leaderboard backend** — Post scores to a server
6. **Sound effects** — Tile slide, solve, round complete
7. **Mobile optimization** — Touch events for mobile
8. **Difficulty levels** — 3×3 (easy), 4×4 (normal), 5×5 (hard)
