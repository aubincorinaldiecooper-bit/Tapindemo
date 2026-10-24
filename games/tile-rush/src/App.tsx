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

type Theme = "light" | "dark";
const THEME_KEY = "tile-rush-theme";

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Light/dark switch. Starts from the saved choice, else the device setting, and sets data-theme on <html>. */
function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      // Storage can be blocked; fall back to the device setting.
    }
    const fromPage = document.documentElement.dataset.theme;
    return fromPage === "light" || fromPage === "dark" ? fromPage : systemTheme();
  });

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const next: Theme = theme === "dark" ? "light" : "dark";
  const toggle = () => {
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Not saved; the switch still works for this visit.
    }
  };

  return (
    <button
      type="button"
      data-theme-toggle
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="inline-flex size-8 items-center justify-center self-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
          <circle cx="8" cy="8" r="3" />
          <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round">
          <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z" />
        </svg>
      )}
    </button>
  );
}

export default function Demo(props: Partial<typeof settings>) {
  const s = { ...settings, ...props };
  // Scores of the current session; a solve after a full session starts the next one.
  const [scores, setScores] = React.useState<number[]>([]);
  const total = scores.reduce((sum, x) => sum + x, 0);
  const [look, setLook] = React.useState<Record<LookId, boolean>>(DEFAULT_LOOK);
  const shownTotal = useCountUp(total, look.reward);
  const [gain, setGain] = React.useState<{ id: number; score: number } | null>(null);

  // Accent colour and display font are page-wide, so they switch classes on <html>.
  React.useEffect(() => {
    const root = document.documentElement.classList;
    root.toggle("look-accent", look.accent);
    root.toggle("look-font", look.font);
  }, [look.accent, look.font]);

  const onSolve = ({ moves }: { moves: number }) => {
    const score = calculatePuzzleScore(moves, s.shuffleMoves);
    setScores((prev) => (prev.length >= SOLVES_PER_SESSION ? [score] : [...prev, score]));
    setGain({ id: Date.now(), score });
  };

  const solvedCount = scores.length;
  const wordmark = (
    <h1 className={cx("whitespace-nowrap font-display font-semibold tracking-tight", look.font ? "text-2xl font-extrabold" : "text-lg")}>
      Tile Rush
    </h1>
  );
  const progress = (
    <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
        {look.dots ? (
          <span data-solved aria-label={`${solvedCount} of ${SOLVES_PER_SESSION} solved`} className="flex items-center gap-1.5">
            {Array.from({ length: SOLVES_PER_SESSION }, (_, i) => (
              <span
                key={i}
                className={cx(
                  "size-2.5 rounded-full transition-colors duration-300",
                  i < solvedCount ? "bg-brand" : "bg-foreground/15",
                )}
              />
            ))}
          </span>
        ) : (
          <span data-solved>
            <span className="text-base tabular-nums text-foreground">{solvedCount}</span>/{SOLVES_PER_SESSION} solved
          </span>
        )}
        <span data-score className="relative">
          <span className={cx("tabular-nums", look.dots || look.font ? "font-display text-xl font-semibold" : "text-base", look.accent ? "text-brand-strong" : "text-foreground")}>
            {shownTotal}
          </span>{" "}
          pts
          {look.reward && gain && (
            <span
              key={gain.id}
              aria-hidden
              className="float-up pointer-events-none absolute -top-5 right-0 whitespace-nowrap font-display text-sm font-bold text-brand-strong"
            >
              +{gain.score}
            </span>
          )}
        </span>
    </div>
  );
  const bar = look.layout ? (
    <div data-score-bar className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        {wordmark}
        <ThemeToggle />
      </div>
      {progress}
    </div>
  ) : (
    <div data-score-bar className="flex w-full max-w-3xl items-center justify-between gap-4">
      {wordmark}
      <div className="flex items-center gap-4">
        {progress}
        <ThemeToggle />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-5 bg-background px-6 pb-28 pt-6 text-foreground">
      {!look.layout && bar}
      <SlidingPuzzleGallery
        items={look.photos ? PHOTO_ITEMS : ITEMS}
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
        par={s.shuffleMoves}
        panelHeader={look.layout ? bar : undefined}
        look={{ primaryShuffle: look.buttons, heroMoves: look.moves, insetBlank: look.blank, alignTop: look.layout }}
        className="max-w-3xl"
      />
      <DesignOptions look={look} onChange={setLook} />
    </div>
  );
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Animates a number toward its new value; jumps straight there when off or when motion is reduced. */
function useCountUp(value: number, enabled: boolean) {
  const [shown, setShown] = React.useState(value);
  const from = React.useRef(value);
  React.useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!enabled || reduce || value <= from.current) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 700);
      setShown(Math.round(start + (value - start) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, enabled]);
  return shown;
}

type LookId = "photos" | "buttons" | "moves" | "accent" | "dots" | "reward" | "font" | "blank" | "layout";

const LOOK_OPTIONS: Array<{ id: LookId; label: string; note?: string }> = [
  { id: "photos", label: "Real photos", note: "Blocked in this preview; works when hosted" },
  { id: "buttons", label: "Shuffle as the main button" },
  { id: "moves", label: "Big move count with par" },
  { id: "accent", label: "Amber accent colour" },
  { id: "dots", label: "Progress dots" },
  { id: "reward", label: "Points pop and count up" },
  { id: "font", label: "Display font" },
  { id: "blank", label: "Inset empty slot" },
  { id: "layout", label: "Score bar beside the board" },
];

const DEFAULT_LOOK: Record<LookId, boolean> = {
  photos: false,
  buttons: true,
  moves: true,
  accent: true,
  dots: true,
  reward: true,
  font: true,
  blank: true,
  layout: true,
};

/** Temporary panel for comparing the design options. Remove once the picks are made. */
function DesignOptions({ look, onChange }: { look: Record<LookId, boolean>; onChange: (next: Record<LookId, boolean>) => void }) {
  // Open by default where there is room beside the game; collapsed on phones.
  const [open, setOpen] = React.useState(() => window.innerWidth >= 1400);
  const setAll = (on: boolean) =>
    onChange(Object.fromEntries(LOOK_OPTIONS.map((o) => [o.id, o.id === "photos" ? look.photos : on])) as Record<LookId, boolean>);

  return (
    <div
      data-design-options
      className="fixed z-50 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-border bg-background/95 text-foreground shadow-lg backdrop-blur"
      style={{
        right: "max(1rem, env(safe-area-inset-right, 0px))",
        bottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Design options
        <span className="font-mono text-xs font-normal text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-1 px-4 pb-4">
          {LOOK_OPTIONS.map((o, i) => (
            <label key={o.id} htmlFor={`look-${o.id}`} className="flex cursor-pointer items-start gap-2.5 rounded-md py-1 text-sm">
              <input
                id={`look-${o.id}`}
                type="checkbox"
                checked={look[o.id]}
                onChange={(e) => onChange({ ...look, [o.id]: e.target.checked })}
                className="mt-0.5 size-4 accent-current"
              />
              <span className="flex flex-col">
                <span>
                  <span className="mr-1.5 font-mono text-xs text-muted-foreground">{i + 1}</span>
                  {o.label}
                </span>
                {o.note && <span className="text-xs text-muted-foreground">{o.note}</span>}
              </span>
            </label>
          ))}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setAll(true)}
              className="h-8 flex-1 rounded-md border border-border text-xs font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              All on
            </button>
            <button
              type="button"
              onClick={() => setAll(false)}
              className="h-8 flex-1 rounded-md border border-border text-xs font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              All off
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
