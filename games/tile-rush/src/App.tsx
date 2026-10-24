"use client";

import * as React from "react";
import { SlidingPuzzleGallery } from "@/components/ui/sliding-puzzle-gallery";
import type { PuzzleControls, PuzzleItem } from "@/components/ui/sliding-puzzle-gallery";
import { AdOverlay, Chunky, Icons, Modal, StarIcon, Stars, cx } from "@/components/game/ui";
import { OFFLINE_ITEMS } from "@/lib/artwork";
import { levelConfig, scoreFor, starThresholds, starsFor } from "@/lib/levels";
import {
  DAILY_GOAL,
  addBooster,
  claimDaily,
  loadProgress,
  recordSolve,
  saveProgress,
  totalScore,
  totalStars,
} from "@/lib/progress";
import type { BoosterId, Progress } from "@/lib/progress";
import { useTheme } from "@/lib/theme";

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

const MAGIC_STEPS = 5;
const AD_MOVES = 10;
/** An ad break plays after every this-many completed levels. */
const AD_BREAK_EVERY = 3;
const SOLVED_PAUSE_MS = 1100;
const PEEK_MS = 1800;

const BOOSTERS: Array<{ id: BoosterId; name: string; help: string }> = [
  { id: "peek", name: "Peek", help: "Shows the finished picture for a moment." },
  { id: "undo", name: "Undo", help: "Takes back your last slide and gives the move back." },
  { id: "magic", name: "Magic", help: `Plays ${MAGIC_STEPS} moves toward the solution for free.` },
];

type Popup =
  | { type: "complete"; stars: number; score: number; moves: number; best: boolean }
  | { type: "out" }
  | { type: "settings" }
  | { type: "booster"; id: BoosterId };

type Ad = { kind: "reward" | "break"; reward?: string; onDone: () => void };

export default function App() {
  const [progress, setProgressState] = React.useState<Progress>(loadProgress);
  const [screen, setScreen] = React.useState<"map" | "play">("map");
  const [levelNo, setLevelNo] = React.useState(() => progress.unlocked);
  const [attempt, setAttempt] = React.useState(0);
  const [moves, setMoves] = React.useState(0);
  const [bonusMoves, setBonusMoves] = React.useState(0);
  const [popup, setPopup] = React.useState<Popup | null>(null);
  const [ad, setAd] = React.useState<Ad | null>(null);
  const [peeking, setPeeking] = React.useState(false);
  const [canUndo, setCanUndo] = React.useState(false);
  const [theme, toggleTheme] = useTheme();
  const controls = React.useRef<PuzzleControls>(null);
  const solvedRef = React.useRef(false);

  const level = levelConfig(levelNo, ITEMS.length);
  const image = ITEMS[level.imageIndex]!;
  const budget = level.budget + bonusMoves;
  const movesLeft = Math.max(0, budget - moves);

  const setProgress = (update: (p: Progress) => Progress) =>
    setProgressState((p) => {
      const next = update(p);
      saveProgress(next);
      return next;
    });

  const startLevel = (n: number) => {
    setLevelNo(n);
    setAttempt((a) => a + 1);
    setMoves(0);
    setBonusMoves(0);
    setPopup(null);
    setPeeking(false);
    setCanUndo(false);
    solvedRef.current = false;
    setScreen("play");
  };

  const toMap = () => {
    setPopup(null);
    setScreen("map");
  };

  const onSolve = ({ moves: used }: { moves: number }) => {
    solvedRef.current = true;
    const stars = starsFor(used, level);
    const score = scoreFor(used, level, budget);
    const best = score > (progress.best[level.number] ?? 0);
    setProgress((p) => recordSolve(p, level.number, stars, score));
    window.setTimeout(() => setPopup({ type: "complete", stars, score, moves: used, best }), SOLVED_PAUSE_MS);
  };

  const onMovesChange = (m: number) => {
    setMoves(m);
    setCanUndo(controls.current?.canUndo() ?? false);
    if (!solvedRef.current && m >= budget) setPopup({ type: "out" });
  };

  const useBooster = (id: BoosterId) => {
    if (progress.boosters[id] <= 0) {
      setPopup({ type: "booster", id });
      return;
    }
    let used = false;
    if (id === "peek") {
      setPeeking(true);
      window.setTimeout(() => setPeeking(false), PEEK_MS);
      used = true;
    } else if (id === "undo") {
      used = controls.current?.undo() ?? false;
    } else if (id === "magic") {
      used = controls.current?.magic(MAGIC_STEPS) ?? false;
    }
    if (used) setProgress((p) => addBooster(p, id, -1));
  };

  const nextLevel = () => {
    const next = level.number + 1;
    if (level.number % AD_BREAK_EVERY === 0) {
      setPopup(null);
      setAd({ kind: "break", onDone: () => startLevel(next) });
    } else {
      startLevel(next);
    }
  };

  const playing = screen === "play" && !popup && !ad && !peeking;
  const liveStars = starsFor(moves, level);
  const backdrop = screen === "play" ? image : ITEMS[(progress.unlocked - 1) % ITEMS.length]!;

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden text-panel-ink">
      {/* Blurred copy of the current picture as the backdrop. */}
      <div aria-hidden className="fixed inset-0 -z-10 bg-scrim">
        <div
          className="absolute inset-[-40px] bg-cover bg-center opacity-80 blur-2xl"
          style={{ backgroundImage: `url(${JSON.stringify(backdrop.src)})` }}
        />
        <div className="absolute inset-0 bg-scrim/45" />
      </div>

      {screen === "map" ? (
        <MapScreen
          progress={progress}
          theme={theme}
          onToggleTheme={toggleTheme}
          onPlay={startLevel}
          onClaimDaily={() => setProgress(claimDaily)}
        />
      ) : (
        <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col" data-screen="play">
          {/* HUD band: target picture, level and moves left, stars and score. */}
          <header className="rounded-b-[28px] bg-gradient-to-b from-band-from to-band-to px-4 pb-4 pt-3 text-band-ink shadow-lg">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <button
                type="button"
                onClick={toMap}
                aria-label="Back to the level map"
                className="flex items-center gap-2 justify-self-start rounded-2xl bg-white/15 p-1.5 pr-3 ring-2 ring-white/25 transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-white"
              >
                {Icons.back}
                <span className="size-10 rounded-xl bg-cover bg-center ring-2 ring-white/60" style={{ backgroundImage: `url(${JSON.stringify(image.src)})` }} />
              </button>
              <div className="flex flex-col items-center">
                <span className="text-sm font-semibold tracking-wide opacity-90">~ Level {level.number} ~</span>
                <span
                  data-moves-left
                  className={cx(
                    "mt-0.5 flex size-[74px] flex-col items-center justify-center rounded-full bg-white text-band-to shadow-[inset_0_-4px_0_rgba(0,0,0,0.12)] ring-4 ring-white/40",
                    movesLeft <= 5 && "text-candy",
                  )}
                >
                  <span className="text-4xl font-bold leading-none tabular-nums">{movesLeft}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">moves</span>
                </span>
              </div>
              <div className="flex flex-col items-end gap-1 justify-self-end">
                <Stars count={liveStars} size="size-6" />
                <span className="rounded-full bg-black/20 px-3 py-0.5 text-sm font-semibold tabular-nums">
                  {totalScore(progress).toLocaleString()}
                </span>
              </div>
            </div>
          </header>

          <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-5">
            <div className="relative w-full max-w-[min(520px,calc(100svh-19rem))]">
              <SlidingPuzzleGallery
                key={attempt}
                items={ITEMS}
                defaultIndex={level.imageIndex}
                size={level.size}
                shuffleMoves={level.par}
                autoplay={false}
                autoSolve={false}
                playable={playing}
                bare
                frameClassName="rounded-[26px] bg-white/40 p-2 shadow-2xl ring-4 ring-white/60 backdrop-blur-md"
                controls={controls}
                onSolve={onSolve}
                onMovesChange={onMovesChange}
              />
              {peeking && (
                <div data-peek className="pointer-events-none absolute inset-2 overflow-hidden rounded-[18px] ring-4 ring-brand">
                  <img src={image.src} alt={image.title ?? ""} className="size-full object-cover" />
                  <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white">Peek</span>
                </div>
              )}
            </div>
            <p className="rounded-full bg-panel/85 px-4 py-1 text-sm font-semibold text-panel-ink shadow">
              {image.title} · <span className="text-panel-muted">3★ in {starThresholds(level)[0]} moves or fewer</span>
            </p>
          </main>

          {/* Boosters and settings. */}
          <footer className="flex items-end justify-center gap-4 px-4" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))" }}>
            {BOOSTERS.map((b) => {
              const count = progress.boosters[b.id];
              const disabled = !playing || (b.id === "undo" && count > 0 && !canUndo);
              return (
                <button
                  key={b.id}
                  type="button"
                  data-booster={b.id}
                  onClick={() => useBooster(b.id)}
                  disabled={disabled}
                  aria-label={`${b.name}: ${count} left. ${b.help}`}
                  title={b.help}
                  className="flex flex-col items-center gap-1 focus-visible:outline-none disabled:opacity-50 [&:focus-visible>span:first-child]:ring-white"
                >
                  <span
                    className="btn-chunky relative flex size-16 items-center justify-center rounded-full bg-gradient-to-b from-candy to-candy-edge text-white ring-4 ring-white/60"
                    style={{ ["--edge" as string]: "hsl(var(--candy-edge))" }}
                  >
                    {Icons[b.id]}
                    <span
                      className={cx(
                        "absolute -bottom-1 -left-1 flex size-7 items-center justify-center rounded-full text-sm font-bold ring-2 ring-white",
                        count > 0 ? "bg-brand text-brand-ink" : "bg-mint text-white",
                      )}
                    >
                      {count > 0 ? count : "+"}
                    </span>
                  </span>
                  <span className="rounded-full bg-panel/85 px-2 text-xs font-semibold text-panel-ink">{b.name}</span>
                </button>
              );
            })}
            <Chunky tone="brand" aria-label="Settings" onClick={() => setPopup({ type: "settings" })} className="ml-2 size-14 rounded-full px-0">
              {Icons.gear}
            </Chunky>
          </footer>
        </div>
      )}

      {popup?.type === "complete" && (
        <Modal title="Level complete!">
          <div className="flex flex-col items-center gap-2">
            <Stars count={popup.stars} size="size-14" />
            <span className="text-4xl font-bold tabular-nums">{popup.score.toLocaleString()}</span>
            <span className="text-sm text-panel-muted">
              {popup.moves} moves{popup.best ? " · new best!" : ""}
            </span>
          </div>
          <Chunky onClick={nextLevel} className="h-14 text-xl" autoFocus>
            Next level
          </Chunky>
          <div className="grid grid-cols-2 gap-3">
            <Chunky tone="panel" onClick={() => startLevel(level.number)} className="h-11">
              Replay
            </Chunky>
            <Chunky tone="panel" onClick={toMap} className="h-11">
              Map
            </Chunky>
          </div>
        </Modal>
      )}

      {popup?.type === "out" && (
        <Modal title="Out of moves!">
          <p className="text-center text-panel-muted">So close. Keep this board and get {AD_MOVES} more moves?</p>
          <Chunky
            tone="candy"
            className="h-14 text-xl"
            autoFocus
            onClick={() => {
              setPopup(null);
              setAd({ kind: "reward", reward: `+${AD_MOVES} moves`, onDone: () => setBonusMoves((b) => b + AD_MOVES) });
            }}
          >
            ▶ Watch ad: +{AD_MOVES} moves
          </Chunky>
          <div className="grid grid-cols-2 gap-3">
            <Chunky tone="panel" onClick={() => startLevel(level.number)} className="h-11">
              Retry
            </Chunky>
            <Chunky tone="panel" onClick={toMap} className="h-11">
              Map
            </Chunky>
          </div>
        </Modal>
      )}

      {popup?.type === "booster" && (
        <Modal title={`Out of ${boosterName(popup.id)}`} onClose={() => setPopup(null)}>
          <p className="text-center text-panel-muted">{BOOSTERS.find((b) => b.id === popup.id)!.help}</p>
          <Chunky
            tone="candy"
            className="h-14 text-lg"
            autoFocus
            onClick={() => {
              const id = popup.id;
              setPopup(null);
              setAd({ kind: "reward", reward: `1 ${boosterName(id)}`, onDone: () => setProgress((p) => addBooster(p, id, 1)) });
            }}
          >
            ▶ Watch ad: get 1
          </Chunky>
          <Chunky tone="panel" onClick={() => setPopup(null)} className="h-11">
            Not now
          </Chunky>
        </Modal>
      )}

      {popup?.type === "settings" && (
        <Modal title="Settings" onClose={() => setPopup(null)}>
          <Chunky tone="panel" onClick={toggleTheme} className="h-12 justify-between" data-theme-toggle>
            <span>{theme === "dark" ? "Dark mode" : "Light mode"}</span>
            <span className="text-sm text-panel-muted">Switch to {theme === "dark" ? "light" : "dark"}</span>
          </Chunky>
          <Chunky tone="panel" onClick={() => startLevel(level.number)} className="h-12">
            Restart level
          </Chunky>
          <Chunky tone="panel" onClick={toMap} className="h-12">
            Level map
          </Chunky>
          <Chunky onClick={() => setPopup(null)} className="h-12" autoFocus>
            Keep playing
          </Chunky>
        </Modal>
      )}

      {ad && (
        <AdOverlay
          kind={ad.kind}
          reward={ad.reward}
          onDone={() => {
            const done = ad.onDone;
            setAd(null);
            done();
          }}
        />
      )}
    </div>
  );
}

function boosterName(id: BoosterId) {
  return BOOSTERS.find((b) => b.id === id)!.name;
}

function MapScreen({
  progress,
  theme,
  onToggleTheme,
  onPlay,
  onClaimDaily,
}: {
  progress: Progress;
  theme: string;
  onToggleTheme: () => void;
  onPlay: (level: number) => void;
  onClaimDaily: () => void;
}) {
  const current = progress.unlocked;
  const shown = Math.max(12, current + 5);
  // The path runs bottom to top, like climbing a map: furthest levels first in the list.
  const levels = Array.from({ length: shown }, (_, i) => shown - i);
  const daily = progress.daily;
  const solvedToday = Math.min(daily.solved, DAILY_GOAL);
  const currentRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "center" });
  }, []);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col" data-screen="map">
      <header
        className="sticky z-20 rounded-b-[28px] bg-gradient-to-b from-band-from to-band-to px-4 pb-4 pt-3 text-band-ink shadow-lg"
        style={{ top: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight drop-shadow">Tile Rush</h1>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-black/20 px-3 py-1 text-sm font-semibold tabular-nums">
              <StarIcon filled className="size-5" /> {totalStars(progress)}
            </span>
            <button
              type="button"
              data-theme-toggle
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="flex size-9 items-center justify-center rounded-full bg-white/15 text-lg ring-2 ring-white/25 hover:bg-white/25 focus-visible:outline-none focus-visible:ring-white"
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
          </div>
        </div>

        <div data-daily className="mt-3 flex items-center gap-3 rounded-2xl bg-white/15 p-3 ring-2 ring-white/20">
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-sm font-semibold">
              <span>Daily goal: solve {DAILY_GOAL}</span>
              <span className="tabular-nums">
                {solvedToday}/{DAILY_GOAL}
              </span>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-black/25">
              <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${(solvedToday / DAILY_GOAL) * 100}%` }} />
            </div>
            <div className="mt-1 text-xs opacity-80">Reward: 1 of each booster</div>
          </div>
          {solvedToday >= DAILY_GOAL && !daily.claimed && (
            <Chunky onClick={onClaimDaily} className="h-10 shrink-0 text-sm">
              Claim
            </Chunky>
          )}
          {daily.claimed && <span className="shrink-0 text-sm font-semibold">Claimed ✓</span>}
        </div>
      </header>

      <ol className="flex flex-col items-center gap-3 px-6 py-8">
        {levels.map((n, i) => {
          const locked = n > current;
          const stars = progress.stars[n] ?? 0;
          const isCurrent = n === current;
          const offset = ["translate-x-0", "translate-x-14", "translate-x-20", "translate-x-14", "translate-x-0", "-translate-x-14", "-translate-x-20", "-translate-x-14"][n % 8];
          return (
            <li key={n} className={cx("flex flex-col items-center", offset)} style={{ zIndex: shown - i }}>
              <button
                type="button"
                ref={isCurrent ? currentRef : undefined}
                data-level={n}
                disabled={locked}
                onClick={() => onPlay(n)}
                aria-label={locked ? `Level ${n}, locked` : `Play level ${n}${stars ? `, ${stars} stars` : ""}`}
                className={cx(
                  "btn-chunky flex items-center justify-center rounded-full text-xl font-bold ring-4 focus-visible:outline-none focus-visible:ring-white",
                  isCurrent ? "size-20 bg-brand text-2xl text-brand-ink ring-white" : "size-16",
                  !isCurrent && !locked && "bg-gradient-to-b from-candy to-candy-edge text-white ring-white/70",
                  locked && "bg-panel/80 text-panel-muted ring-white/30",
                )}
                style={{
                  ["--edge" as string]: isCurrent ? "hsl(var(--brand-edge))" : locked ? "hsl(var(--panel-ink) / 0.15)" : "hsl(var(--candy-edge))",
                }}
              >
                {locked ? Icons.lock : n}
              </button>
              {!locked && stars > 0 && <Stars count={stars} size="size-5" className="mt-1" />}
              {isCurrent && <span className="mt-1 rounded-full bg-panel px-3 py-0.5 text-xs font-bold text-panel-ink shadow">Play</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
