import * as React from "react";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type Tone = "brand" | "candy" | "panel";

const TONES: Record<Tone, { cls: string; edge: string }> = {
  brand: { cls: "bg-brand text-brand-ink", edge: "hsl(var(--brand-edge))" },
  candy: { cls: "bg-candy text-white", edge: "hsl(var(--candy-edge))" },
  panel: { cls: "bg-panel text-panel-ink ring-2 ring-panel-ink/10", edge: "hsl(var(--panel-ink) / 0.18)" },
};

/** Big rounded game button with a pressable bottom edge. */
export function Chunky({
  tone = "brand",
  className,
  style,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  const t = TONES[tone];
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        "btn-chunky inline-flex items-center justify-center gap-2 rounded-2xl px-5 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 disabled:opacity-50",
        t.cls,
        className,
      )}
      style={{ ["--edge" as string]: t.edge, ...style }}
    />
  );
}

export function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z"
        fill={filled ? "hsl(var(--star))" : "currentColor"}
        fillOpacity={filled ? 1 : 0.25}
        stroke={filled ? "hsl(28 90% 40%)" : "none"}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GemIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className ?? "size-4"}>
      <path d="M6 3h12l4 6-10 12L2 9z" fill="#22d3ee" stroke="#0e7490" strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M2 9h20M9 3 7 9l5 12 5-12-2-6" fill="none" stroke="#a5f3fc" strokeWidth={1} strokeLinejoin="round" />
    </svg>
  );
}

export function Stars({ count, size = "size-6", className }: { count: number; size?: string; className?: string }) {
  return (
    <span className={cx("inline-flex items-end gap-0.5", className)} aria-label={`${count} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <StarIcon key={i} filled={i < count} className={cx(size, i === 1 && "-translate-y-1")} />
      ))}
    </span>
  );
}

/** Centered popup over a dimmed screen. */
export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose?: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm"
      style={{
        paddingLeft: "max(16px, env(safe-area-inset-left, 0px))",
        paddingRight: "max(16px, env(safe-area-inset-right, 0px))",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-[28px] bg-panel text-panel-ink shadow-2xl ring-4 ring-white/40">
        <div className="bg-gradient-to-b from-band-from to-band-to px-6 py-4 text-center text-2xl font-bold text-band-ink">{title}</div>
        <div className="flex flex-col gap-4 p-6">{children}</div>
      </div>
    </div>
  );
}

/**
 * Stand-in for a real ad. A rewarded ad grants its reward when it finishes; an ad break
 * just continues. Replace the body with the ad network's player.
 */
export function AdOverlay({ kind, reward, onDone }: { kind: "reward" | "break"; reward?: string; onDone: () => void }) {
  const [left, setLeft] = React.useState(3);
  React.useEffect(() => {
    if (left <= 0) return;
    const t = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left]);

  return (
    <div data-ad className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-black/90 px-6 text-center text-white">
      <span className="rounded-full bg-white/15 px-3 py-1 text-xs uppercase tracking-widest">Ad placeholder</span>
      <p className="max-w-xs text-lg">
        {kind === "reward" ? `A rewarded video plays here. Watching it gives ${reward}.` : "An ad break plays here between levels."}
      </p>
      {left > 0 ? (
        <span className="text-5xl font-bold tabular-nums">{left}</span>
      ) : (
        <Chunky onClick={onDone} className="h-12 min-w-40 text-lg">
          {kind === "reward" ? `Collect ${reward}` : "Continue"}
        </Chunky>
      )}
    </div>
  );
}

export const Icons = {
  peek: (
    <svg viewBox="0 0 24 24" aria-hidden className="size-7" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  undo: (
    <svg viewBox="0 0 24 24" aria-hidden className="size-7" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  ),
  magic: (
    <svg viewBox="0 0 24 24" aria-hidden className="size-7" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 20 11-11" />
      <path d="m14 4 1.2 2.8L18 8l-2.8 1.2L14 12l-1.2-2.8L10 8l2.8-1.2z" fill="currentColor" />
      <path d="M19 14v4M17 16h4M6 3v3M4.5 4.5h3" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 24 24" aria-hidden className="size-7" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  ),
  back: (
    <svg viewBox="0 0 24 24" aria-hidden className="size-6" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  ),
};
