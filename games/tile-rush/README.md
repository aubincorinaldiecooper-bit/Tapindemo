# Tile Rush

A swap picture puzzle. Each level scrambles one of the game's illustrations; drag a tile onto
another (or tap two tiles) to swap them until the picture is whole.

## How it plays

- **Levels:** 3×3 for levels 1–3, 4×4 for 4–10, then 5×5. Every play of a level is a fresh scramble.
- **Moves and stars:** each level has a par (the cheapest known solve). 3 stars at par, 2 stars
  within half as many again; you get twice par in moves before running out.
- **Obstacles:** frozen tiles from level 4 (thaw when a neighbouring tile is in place) and a
  linked pair from level 8 (swaps cost 2 moves until one of them is in place).
- **Gems:** 3 per level, collected when that tile reaches its spot. 10 gems buy a booster.
- **Line bonus:** completing a row or column with a swap gives +1 move.
- **Boosters:** Peek (from the start), Undo (level 5), Magic (level 10).
- **Daily goal:** solve 5 puzzles for one of each booster.
- **Ads (placeholders):** "+10 moves" when out of moves, a booster refill, and an ad break
  every 3 levels. See `AdOverlay` in `src/components/game/ui.tsx`.
- Light/dark mode and sound (on by default) are in Settings. Progress is saved in the browser.

## Run locally

```bash
cd games/tile-rush
npm install
npm run dev
```

`npm run build` writes a static site to `dist/`.

## Where things are

```
src/
├── App.tsx                     Home grid, game screen, docks, popups
├── components/game/
│   ├── swap-puzzle.tsx         The puzzle board: swaps, obstacles, gems, line bonus
│   └── ui.tsx                  Buttons, stars, gem icon, popups, ad placeholder
├── components/ui/
│   ├── motion-confetti.tsx     Confetti on solve
│   └── sliding-puzzle-gallery.tsx  Original sliding puzzle (not used by the game)
└── lib/
    ├── artwork.ts              The illustrations (SVG)
    ├── levels.ts               Size, par, move budget, stars and score per level
    ├── swapLevel.ts            Builds and test-solves each level's board
    ├── progress.ts             Saved progress, gems and daily goal
    ├── sound.ts                Move and tile-placed sounds
    └── theme.ts                Light/dark setting
```
