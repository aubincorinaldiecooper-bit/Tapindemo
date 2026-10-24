"use client";

import * as React from "react";
import type { PuzzleItem } from "@/components/ui/sliding-puzzle-gallery";
import { SwapPuzzle } from "@/components/game/swap-puzzle";
import type { SwapControls } from "@/components/game/swap-puzzle";
import { Confetti } from "@/components/ui/motion-confetti";
import { AdOverlay, Chunky, GemIcon, Icons, Modal, StarIcon, Stars, cx } from "@/components/game/ui";
import { OFFLINE_ITEMS } from "@/lib/artwork";
import { levelConfig, scoreFor, starThresholds, starsFor } from "@/lib/levels";
import { buildLevel } from "@/lib/swapLevel";
import {
  DAILY_GOAL,
  GEM_PRICE,
  addBooster,
  claimDaily,
  loadProgress,
  recordGems,
  recordSolve,
  saveProgress,
  spendGems,
  totalGems,
  totalScore,
  totalStars,
} from "@/lib/progress";
import type { BoosterId, Progress } from "@/lib/progress";
import { playMove, playPlaced, useSound } from "@/lib/sound";
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
/** How long the finished picture and its banner show before the next level loads. */
const SOLVED_PAUSE_MS = 1800;
const PEEK_MS = 1800;

const BOOSTERS: Array<{ id: BoosterId; name: string; help: string }> = [
  { id: "peek", name: "Peek", help: "Shows the finished picture for a moment." },
  { id: "undo", name: "Undo", help: "Takes back your last swap and gives the move back." },
  { id: "magic", name: "Magic", help: `Makes ${MAGIC_STEPS} correct swaps for you, free.` },
];

/** The highest level a player must have reached before each booster can be used. */
const BOOSTER_UNLOCK: Record<BoosterId, number> = { peek: 1, undo: 5, magic: 10 };

type Popup =
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
  const [gemsHere, setGemsHere] = React.useState(0);
  const [cleared, setCleared] = React.useState<{ stars: number; score: number } | null>(null);
  const [theme, toggleTheme] = useTheme();
  const [soundOn, toggleSound] = useSound();
  const controls = React.useRef<SwapControls>(null);
  const confettiRef = React.useRef<{ fire: () => void }>(null);
  const solvedRef = React.useRef(false);

  const cfg = levelConfig(levelNo, ITEMS.length);
  // The scrambled board, obstacles and gems for this level; par is the cheapest known solve.
  const built = React.useMemo(() => buildLevel(cfg), [cfg.number]); // eslint-disable-line react-hooks/exhaustive-deps
  const level = { ...cfg, par: built.par, budget: built.par * 2 };
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
    setGemsHere(0);
    setCleared(null);
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
    setProgress((p) => recordSolve(p, level.number, stars, score));
    setCleared({ stars, score });
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) confettiRef.current?.fire();
    window.setTimeout(nextLevel, SOLVED_PAUSE_MS);
  };

  const onMovesChange = (m: number) => {
    setMoves(m);
    setCanUndo(controls.current?.canUndo() ?? false);
    if (!solvedRef.current && m >= budget) setPopup({ type: "out" });
  };

  const useBooster = (id: BoosterId) => {
    if (progress.unlocked < BOOSTER_UNLOCK[id]) return;
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

  const playing = screen === "play" && !popup && !ad && !peeking && !cleared;
  const liveStars = starsFor(moves, level);
  const backdrop = screen === "play" ? image : ITEMS[(progress.unlocked - 1) % ITEMS.length]!;

  return (
    <div className="relative min-h-screen w-full overflow-x-clip text-panel-ink">
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
          {/* Top bar, styled like the dock: back + target picture, level and moves left, stars and score. */}
          <header className="px-4 pt-3" style={{ paddingTop: "max(12px, env(safe-area-inset-top, 0px))" }}>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl bg-panel/90 p-2 text-panel-ink shadow-lg ring-1 ring-panel-ink/10 backdrop-blur-md">
              <button
                type="button"
                onClick={toMap}
                aria-label="Back to the level map"
                title="Level map"
                className="flex h-12 items-center gap-1.5 justify-self-start rounded-xl pl-1 pr-2 transition-colors hover:bg-panel-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-panel-ink/40"
              >
                {backIcon}
                <span className="size-8 rounded-lg bg-cover bg-center ring-1 ring-panel-ink/15" style={{ backgroundImage: `url(${JSON.stringify(image.src)})` }} />
              </button>
              <div className="flex flex-col items-center leading-tight">
                <span className="text-xs text-panel-muted">Level {level.number}</span>
                <span data-moves-left className={cx("text-2xl font-semibold tabular-nums", movesLeft <= 5 && "text-red-500")}>
                  {movesLeft}
                </span>
                <span className="text-[11px] text-panel-muted">moves left</span>
              </div>
              <div className="flex flex-col items-end gap-0.5 justify-self-end pr-1">
                <Stars count={liveStars} size="size-4" />
                <span className="text-sm font-semibold tabular-nums">{totalScore(progress).toLocaleString()}</span>
                <span data-gems className="flex items-center gap-1 text-xs tabular-nums text-panel-muted" aria-label={`${gemsHere} of ${built.gems.length} gems`}>
                  <GemIcon className="size-3.5" /> {gemsHere}/{built.gems.length}
                </span>
              </div>
            </div>
          </header>

          <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-5">
            <div className="relative w-full max-w-[min(520px,calc(100svh-19rem))]">
              <SwapPuzzle
                key={attempt}
                image={image}
                built={built}
                playable={playing}
                frameClassName="rounded-[26px] bg-white/40 p-2 shadow-2xl ring-4 ring-white/60 backdrop-blur-md"
                controls={controls}
                onSolve={onSolve}
                onMovesChange={onMovesChange}
                onMove={(placed) => (placed ? playPlaced() : playMove())}
                onGemsChange={(count) => {
                  setGemsHere(count);
                  if (count > 0) setProgress((p) => recordGems(p, level.number, count));
                }}
              />
              <Confetti ref={confettiRef} trigger={false} particleCount={90} startVelocity={30} spread={120} />
              {cleared && (
                <div data-cleared className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
                  <div className="flex flex-col items-center gap-1 rounded-3xl bg-panel/95 px-6 py-3 text-panel-ink shadow-2xl ring-4 ring-white/60">
                    <span className="text-lg font-bold">Level {level.number} complete!</span>
                    <Stars count={cleared.stars} size="size-8" />
                    <span className="text-sm font-semibold tabular-nums text-panel-muted">+{cleared.score.toLocaleString()}</span>
                  </div>
                </div>
              )}
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
            {(built.frozen.length > 0 || built.chain) && (
              <p data-hint className="max-w-[min(520px,100%)] rounded-full bg-panel/85 px-4 py-1 text-center text-xs text-panel-muted shadow">
                {[
                  built.frozen.length > 0 && "Frozen tiles thaw when a neighbour is in place",
                  built.chain && "Linked tiles cost 2 moves until one is in place",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </main>

          {/* Dock: boosters and settings. */}
          <footer className="flex justify-center px-4" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))" }}>
            <nav
              aria-label="Boosters"
              className="flex items-center gap-1 rounded-2xl bg-panel/90 p-2 text-panel-ink shadow-lg ring-1 ring-panel-ink/10 backdrop-blur-md"
            >
              {BOOSTERS.map((b) => {
                const count = progress.boosters[b.id];
                const lockedAt = BOOSTER_UNLOCK[b.id];
                const locked = progress.unlocked < lockedAt;
                const disabled = !playing || locked || (b.id === "undo" && count > 0 && !canUndo);
                return (
                  <DockButton
                    key={b.id}
                    data-booster={b.id}
                    label={locked ? `${b.name}: unlocks at level ${lockedAt}` : b.name}
                    onClick={() => useBooster(b.id)}
                    disabled={disabled}
                    aria-label={locked ? `${b.name}: unlocks at level ${lockedAt}` : `${b.name}: ${count} left. ${b.help}`}
                    badge={locked ? undefined : count > 0 ? count : undefined}
                    lock={locked}
                  >
                    {DockIcons[b.id]}
                  </DockButton>
                );
              })}
              <DockButton label="Settings" aria-label="Settings" onClick={() => setPopup({ type: "settings" })}>
                {DockIcons.settings}
              </DockButton>
            </nav>
          </footer>
        </div>
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
          <Chunky
            tone="panel"
            disabled={totalGems(progress) < GEM_PRICE}
            className="h-11 gap-2"
            onClick={() => {
              const id = popup.id;
              setPopup(null);
              setProgress((p) => addBooster(spendGems(p, GEM_PRICE), id, 1));
            }}
          >
            <GemIcon className="size-4" /> {GEM_PRICE} gems: get 1 <span className="text-panel-muted">({totalGems(progress)} owned)</span>
          </Chunky>
          <Chunky tone="panel" onClick={() => setPopup(null)} className="h-11">
            Not now
          </Chunky>
        </Modal>
      )}

      {popup?.type === "settings" && (
        <Modal title="Settings" onClose={() => setPopup(null)}>
          <Chunky tone="panel" onClick={toggleSound} className="h-12 justify-between" data-sound-toggle aria-pressed={soundOn}>
            <span>Sound</span>
            <span className="text-sm text-panel-muted">{soundOn ? "On" : "Off"}</span>
          </Chunky>
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

/** One dock icon: lifts on hover, shows its name as a tooltip, and an optional count badge. */
function DockButton({
  label,
  badge,
  lock,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; badge?: number; lock?: boolean } & Record<`data-${string}`, string>) {
  return (
    <button
      type="button"
      title={label}
      {...rest}
      className="group relative flex size-12 items-center justify-center rounded-xl transition-[transform,background-color] duration-150 hover:-translate-y-1 hover:scale-110 hover:bg-panel-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-panel-ink/40 disabled:pointer-events-none disabled:opacity-40 motion-reduce:transition-none motion-reduce:hover:transform-none"
    >
      {children}
      {lock && (
        <span className="absolute right-1 top-1 flex size-[18px] items-center justify-center rounded-full bg-panel-ink text-panel ring-2 ring-panel">
          <svg viewBox="0 0 24 24" aria-hidden className="size-2.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </span>
      )}
      {badge !== undefined && (
        <span className="absolute right-1 top-1 flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold leading-[18px] text-white ring-2 ring-panel tabular-nums">
          {badge}
        </span>
      )}
    </button>
  );
}

const dockIcon = (path: React.ReactNode) => (
  <svg viewBox="0 0 24 24" aria-hidden className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
);

const backIcon = dockIcon(<path d="M15 5l-7 7 7 7" />);
const playIcon = dockIcon(<path d="M7 4.5v15l12-7.5z" />);
const locateIcon = dockIcon(
  <>
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </>,
);
const moonIcon = dockIcon(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />);
const sunIcon = dockIcon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </>,
);

const DockIcons: Record<BoosterId | "settings", React.ReactNode> = {
  peek: dockIcon(
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>,
  ),
  undo: dockIcon(
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </>,
  ),
  magic: dockIcon(
    <>
      <path d="m4 20 11-11" />
      <path d="m14 4 1.2 2.8L18 8l-2.8 1.2L14 12l-1.2-2.8L10 8l2.8-1.2z" />
      <path d="M19 14v4M17 16h4M6 3v3M4.5 4.5h3" />
    </>,
  ),
  settings: dockIcon(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>,
  ),
};

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
  const shown = Math.max(12, current + 6);
  const levels = Array.from({ length: shown }, (_, i) => i + 1);
  const [selected, setSelected] = React.useState<number | null>(null);
  const daily = progress.daily;
  const solvedToday = Math.min(daily.solved, DAILY_GOAL);
  const currentRef = React.useRef<HTMLButtonElement>(null);
  const jumpToCurrent = (smooth: boolean) =>
    currentRef.current?.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });

  React.useEffect(() => {
    if (current > 4) jumpToCurrent(false);
  }, [current]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col" data-screen="map">
      {/* Top bar, styled like the dock: title, stars and the daily goal. Stays pinned while scrolling. */}
      <header className="sticky z-20 px-4 pt-3" style={{ top: "env(safe-area-inset-top, 0px)", paddingTop: "max(12px, env(safe-area-inset-top, 0px))" }}>
        <div className="flex flex-col gap-2 rounded-2xl bg-panel/90 p-2 text-panel-ink shadow-lg ring-1 ring-panel-ink/10 backdrop-blur-md">
          <div className="flex h-10 items-center justify-between gap-3 px-2">
            <h1 className="text-xl font-semibold tracking-tight">Tile Rush</h1>
            <div className="flex items-center gap-3 text-sm font-semibold tabular-nums">
              <span className="flex items-center gap-1" aria-label={`${totalGems(progress)} gems`} data-gems-total>
                <GemIcon className="size-4" /> {totalGems(progress)}
              </span>
              <span className="flex items-center gap-1" aria-label={`${totalStars(progress)} stars`}>
                <StarIcon filled className="size-4" /> {totalStars(progress)}
              </span>
            </div>
          </div>

          <div data-daily className="flex items-center gap-3 border-t border-panel-ink/10 px-2 pb-1 pt-2">
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2 text-sm">
                <span className="truncate">
                  Daily goal: solve {DAILY_GOAL} <span className="text-panel-muted">· reward 1 of each booster</span>
                </span>
                <span className="font-semibold tabular-nums">
                  {solvedToday}/{DAILY_GOAL}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-panel-ink/10">
                <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${(solvedToday / DAILY_GOAL) * 100}%` }} />
              </div>
            </div>
            {solvedToday >= DAILY_GOAL && !daily.claimed && (
              <button
                type="button"
                onClick={onClaimDaily}
                className="h-8 shrink-0 rounded-lg bg-panel-ink px-3 text-sm font-semibold text-panel transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-panel-ink/40"
              >
                Claim
              </button>
            )}
            {daily.claimed && <span className="shrink-0 text-sm text-panel-muted">Claimed</span>}
          </div>
        </div>
      </header>

      {/* Grid of levels: beaten levels show their picture, the rest stay blurred. */}
      <main className="px-4 pb-32 pt-4">
        <ol aria-label="Levels" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {levels.map((n) => {
            const image = ITEMS[levelConfig(n, ITEMS.length).imageIndex]!;
            const stars = progress.stars[n] ?? 0;
            const beaten = stars > 0;
            const locked = n > current;
            const isCurrent = n === current;
            return (
              <li key={n} className="aspect-square">
                <button
                  type="button"
                  ref={isCurrent ? currentRef : undefined}
                  data-level={n}
                  disabled={locked}
                  onClick={() => setSelected(n)}
                  aria-label={locked ? `Level ${n}, locked` : beaten ? `Level ${n}, ${stars} stars` : `Level ${n}, not beaten yet`}
                  className={cx(
                    "group relative size-full overflow-hidden rounded-2xl text-left shadow-md ring-1 transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white",
                    isCurrent ? "ring-4 ring-brand" : "ring-panel-ink/10",
                    !locked && "hover:-translate-y-0.5 hover:shadow-lg",
                    locked && "cursor-not-allowed",
                  )}
                >
                  <span
                    aria-hidden
                    className={cx(
                      "absolute inset-0 bg-cover bg-center transition-transform duration-300",
                      beaten ? "group-hover:scale-105" : "scale-110 blur-md",
                      locked && "opacity-60",
                    )}
                    style={{ backgroundImage: `url(${JSON.stringify(image.src)})` }}
                  />
                  {!beaten && <span aria-hidden className="absolute inset-0 bg-panel/25" />}
                  <span className="absolute left-2 top-2 rounded-lg bg-panel/90 px-2 py-0.5 text-sm font-semibold tabular-nums text-panel-ink shadow-sm">
                    {n}
                  </span>
                  {beaten && (
                    <span className="absolute bottom-2 left-2 rounded-lg bg-panel/90 px-1.5 py-0.5 shadow-sm">
                      <Stars count={stars} size="size-4" />
                    </span>
                  )}
                  {isCurrent && !beaten && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="rounded-full bg-brand px-4 py-1.5 text-sm font-bold text-brand-ink shadow-lg">Play</span>
                    </span>
                  )}
                  {locked && (
                    <span className="absolute inset-0 flex items-center justify-center text-panel-ink">
                      <span className="flex size-10 items-center justify-center rounded-full bg-panel/85 shadow">{Icons.lock}</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </main>

      {/* Dock, pinned to the bottom: play the current level, jump to it, light/dark. */}
      <nav
        aria-label="Home"
        className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-4"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-center gap-1 rounded-2xl bg-panel/90 p-2 text-panel-ink shadow-lg ring-1 ring-panel-ink/10 backdrop-blur-md">
          <DockButton label={`Play level ${current}`} aria-label={`Play level ${current}`} data-play-current onClick={() => onPlay(current)}>
            {playIcon}
          </DockButton>
          <DockButton label="Go to current level" aria-label="Go to current level" onClick={() => jumpToCurrent(true)}>
            {locateIcon}
          </DockButton>
          <DockButton
            label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            data-theme-toggle
            onClick={onToggleTheme}
          >
            {theme === "dark" ? sunIcon : moonIcon}
          </DockButton>
        </div>
      </nav>

      {selected !== null && (
        <LevelWindow level={selected} onPlay={() => onPlay(selected)} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

/** The window that opens when a level is tapped: the full picture with Play below. Tap outside or Escape closes it. */
function LevelWindow({ level, onPlay, onClose }: { level: number; onPlay: () => void; onClose: () => void }) {
  const config = levelConfig(level, ITEMS.length);
  const image = ITEMS[config.imageIndex]!;
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Level ${level}`}
      data-level-window
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      style={{ paddingLeft: "max(16px, env(safe-area-inset-left, 0px))", paddingRight: "max(16px, env(safe-area-inset-right, 0px))" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <section className="flex w-full max-w-[22rem] flex-col gap-3 rounded-2xl bg-panel p-3 shadow-2xl ring-1 ring-panel-ink/10">
        <div
          className="aspect-square w-full rounded-xl bg-cover bg-center ring-1 ring-panel-ink/10"
          style={{ backgroundImage: `url(${JSON.stringify(image.src)})` }}
          role="img"
          aria-label={image.title ?? "Puzzle picture"}
        />
        <Chunky onClick={onPlay} className="h-12 w-full text-lg" data-play-level autoFocus>
          Play
        </Chunky>
      </section>
    </div>
  );
}
