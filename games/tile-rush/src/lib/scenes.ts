/**
 * 100 generated illustrations in Tile Rush's flat style: 10 scene types × 10 moods.
 * Each picture is drawn from a fixed seed, so it looks the same every time. Small details
 * (stars, birds, flowers, fish, bubbles) are spread over every part of the picture so tiles
 * can be told apart even on a 5×5 board.
 */

type Rand = () => number;

function mulberry32(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

interface Mood {
  skyTop: string;
  skyBottom: string;
  /** Scales the lightness of ground colours (night is darker). */
  light: number;
  night: boolean;
  sun: string;
  aurora?: boolean;
  /** Grey sky with rain streaks. */
  rain?: boolean;
  /** Greens turn orange. */
  autumn?: boolean;
  /** Grounds pale toward snow. */
  winter?: boolean;
  /** Pastel tint. */
  pastel?: boolean;
}

const MOODS: Mood[] = [
  { skyTop: "#5b6fb3", skyBottom: "#ffb38a", light: 0.88, night: false, sun: "#ffe3a3" }, // dawn
  { skyTop: "#3fa7f0", skyBottom: "#c4e8ff", light: 1, night: false, sun: "#ffd93d" }, // day
  { skyTop: "#f2913d", skyBottom: "#ffe7a3", light: 0.95, night: false, sun: "#fff1b8" }, // golden hour
  { skyTop: "#3b2a6b", skyBottom: "#f47c5a", light: 0.72, night: false, sun: "#ffc79a" }, // dusk
  { skyTop: "#0b0f30", skyBottom: "#2b2f6b", light: 0.48, night: true, sun: "#f1f5ff" }, // night
  { skyTop: "#04121f", skyBottom: "#123b4a", light: 0.48, night: true, sun: "#e8fff7", aurora: true }, // northern lights
  { skyTop: "#7d889a", skyBottom: "#cdd4dd", light: 0.82, night: false, sun: "#eef0f3", rain: true }, // overcast
  { skyTop: "#c9a3e8", skyBottom: "#ffd1e3", light: 0.98, night: false, sun: "#fff4fb", pastel: true }, // pastel
  { skyTop: "#e9874f", skyBottom: "#ffd9a8", light: 0.95, night: false, sun: "#fff0c2", autumn: true }, // autumn
  { skyTop: "#9fc2e6", skyBottom: "#f0f7ff", light: 1, night: false, sun: "#ffffff", winter: true }, // winter
];

/** A colour for this mood: night darkens, autumn turns greens orange, winter pales, pastel softens. */
function tone(m: Mood, h: number, s: number, l: number): string {
  let hue = h;
  let sat = s;
  let lig = l;
  if (m.autumn && hue >= 70 && hue <= 170) hue = 28 + ((hue - 70) / 100) * 18;
  if (m.winter) {
    lig = lig + (100 - lig) * 0.45;
    sat *= 0.55;
  }
  if (m.pastel) {
    lig = lig + (100 - lig) * 0.3;
    sat *= 0.8;
  }
  if (m.night) sat *= 0.7;
  lig *= m.light;
  return `hsl(${f(hue)},${f(clamp(sat))}%,${f(clamp(lig))}%)`;
}

interface Kit {
  /** Where the sun or moon sits, for the light glow laid over the finished scene. */
  light: { x: number; y: number };
  r: Rand;
  m: Mood;
  rnd: (a: number, b: number) => number;
  pick: <T>(items: T[]) => T;
  c: (h: number, s: number, l: number) => string;
}

function kit(seed: number, m: Mood): Kit {
  const r = mulberry32(seed);
  return {
    light: { x: 80 + r() * 240, y: 60 },
    r,
    m,
    rnd: (a, b) => a + r() * (b - a),
    pick: (items) => items[Math.floor(r() * items.length)]!,
    c: (h, s, l) => tone(m, h, s, l),
  };
}

/* ---------- shared pieces ---------- */

function sky(k: Kit): string {
  const { m, rnd } = k;
  let out = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m.skyTop}"/><stop offset="1" stop-color="${m.skyBottom}"/></linearGradient></defs><rect width="400" height="400" fill="url(#sky)"/>`;
  if (m.aurora) {
    const colours = ["#34d399", "#22d3ee", "#a78bfa"];
    for (let i = 0; i < 3; i++) {
      const y = rnd(40, 140);
      out += `<path d="M-10 ${f(y)} Q100 ${f(y - rnd(40, 80))} 200 ${f(y)} T410 ${f(y - rnd(-20, 30))} L410 ${f(y + 30)} Q300 ${f(y + 10)} 200 ${f(y + 35)} T-10 ${f(y + 25)} Z" fill="${colours[i]}" opacity="0.32"/>`;
    }
  }
  return out;
}

function celestial(k: Kit, x: number, y: number, r: number): string {
  const { m } = k;
  k.light = { x, y };
  if (m.night) {
    return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.8)}" fill="${m.sun}"/><circle cx="${f(x + r * 0.35)}" cy="${f(y - r * 0.2)}" r="${f(r * 0.7)}" fill="${m.skyTop}" opacity="0.92"/>`;
  }
  if (m.rain) return "";
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 1.35)}" fill="${m.sun}" opacity="0.25"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${m.sun}"/>`;
}

function cloud(k: Kit, x: number, y: number, s: number): string {
  const fill = k.m.rain ? "#aab3c0" : k.m.night ? "#3a3f6e" : "#ffffff";
  const op = k.m.night ? 0.7 : 0.9;
  return `<g fill="${fill}" opacity="${op}"><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(28 * s)}" ry="${f(12 * s)}"/><circle cx="${f(x - 10 * s)}" cy="${f(y - 6 * s)}" r="${f(11 * s)}"/><circle cx="${f(x + 9 * s)}" cy="${f(y - 9 * s)}" r="${f(13 * s)}"/></g>`;
}

function star(x: number, y: number, r: number, colour = "#ffffff"): string {
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 3.2)}" fill="${colour}" opacity="0.18"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${colour}"/>`;
}

function bird(x: number, y: number, s: number, colour: string): string {
  return `<path d="M${f(x - 7 * s)} ${f(y)} q${f(3.5 * s)} ${f(-5 * s)} ${f(7 * s)} 0 q${f(3.5 * s)} ${f(-5 * s)} ${f(7 * s)} 0" fill="none" stroke="${colour}" stroke-width="${f(1.6 * s)}" stroke-linecap="round"/>`;
}

function flower(x: number, y: number, s: number, petal: string, centre = "#fde047"): string {
  let out = `<path d="M${f(x)} ${f(y)} v${f(10 * s)}" stroke="#3f8f3f" stroke-width="${f(1.4 * s)}"/>`;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    out += `<circle cx="${f(x + Math.cos(a) * 3.6 * s)}" cy="${f(y + Math.sin(a) * 3.6 * s)}" r="${f(2.8 * s)}" fill="${petal}"/>`;
  }
  return out + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(2 * s)}" fill="${centre}"/>`;
}

function fish(x: number, y: number, s: number, colour: string, left: boolean): string {
  const d = left ? -1 : 1;
  return `<g><ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(11 * s)}" ry="${f(6 * s)}" fill="${colour}"/><path d="M${f(x - d * 10 * s)} ${f(y)} l${f(-d * 8 * s)} ${f(-6 * s)} v${f(12 * s)} z" fill="${colour}"/><circle cx="${f(x + d * 5 * s)}" cy="${f(y - 1.5 * s)}" r="${f(1.4 * s)}" fill="#1f2937"/></g>`;
}

function pine(x: number, base: number, h: number, colour: string, snow: boolean, trunk = "#5b3a1e"): string {
  const w = h * 0.42;
  let out = `<rect x="${f(x - h * 0.04)}" y="${f(base - h * 0.15)}" width="${f(h * 0.08)}" height="${f(h * 0.15)}" fill="${trunk}"/>`;
  for (let i = 0; i < 3; i++) {
    const top = base - h + i * h * 0.25;
    const bot = base - h * 0.12 - (2 - i) * h * 0.18;
    const half = w * (0.55 + i * 0.22);
    out += `<path d="M${f(x)} ${f(top)} L${f(x + half)} ${f(bot)} L${f(x - half)} ${f(bot)} Z" fill="${colour}"/>`;
    if (snow) out += `<path d="M${f(x)} ${f(top)} L${f(x + half * 0.35)} ${f(top + (bot - top) * 0.35)} L${f(x - half * 0.35)} ${f(top + (bot - top) * 0.35)} Z" fill="#ffffff"/>`;
  }
  return out;
}

/** A soft rolling hill line from left to right, filled down to the bottom. */
function hill(k: Kit, y: number, amp: number, fill: string, bumps = 3): string {
  const step = 400 / bumps;
  let d = `M0 ${f(y + k.rnd(-amp, amp))}`;
  for (let i = 0; i < bumps; i++) {
    const x1 = step * i + step / 2;
    const x2 = step * (i + 1);
    d += ` Q${f(x1)} ${f(y - k.rnd(0.3, 1) * amp * 2)} ${f(x2)} ${f(y + k.rnd(-amp, amp) * 0.6)}`;
  }
  return `<path d="${d} L400 400 L0 400 Z" fill="${fill}"/>`;
}

/** A jagged mountain range filled down to the bottom; returns the path and its peak points. */
function range(k: Kit, base: number, height: number, peaks: number, fill: string) {
  const pts: Array<[number, number]> = [[0, base - k.rnd(0, height * 0.4)]];
  for (let i = 0; i < peaks; i++) {
    const px = ((i + 0.5) / peaks) * 400 + k.rnd(-20, 20);
    pts.push([px, base - k.rnd(height * 0.6, height)]);
    pts.push([((i + 1) / peaks) * 400 + k.rnd(-10, 10), base - k.rnd(0, height * 0.35)]);
  }
  pts[pts.length - 1]![0] = 400;
  const path = `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L")} L400 400 L0 400 Z" fill="${fill}"/>`;
  return { path, peaks: pts.filter((_, i) => i % 2 === 1) };
}

/** One small detail inside every cell of a 5×5 grid, so no two tiles look the same. */
function scatter(k: Kit, horizon: number, skyDetail: (x: number, y: number) => string, groundDetail: (x: number, y: number) => string): string {
  let out = "";
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      for (let i = 0; i < 2; i++) {
        const x = col * 80 + (i === 0 ? k.rnd(10, 40) : k.rnd(42, 70));
        const y = row * 80 + (i === 0 ? k.rnd(10, 70) : k.rnd(10, 70));
        out += y < horizon ? skyDetail(x, y) : groundDetail(x, y);
      }
    }
  }
  return out;
}

function skyDetailFor(k: Kit) {
  return (x: number, y: number) => {
    if (k.m.night) return star(x, y, k.rnd(1.4, 2.8));
    if (k.m.rain) return `<path d="M${f(x)} ${f(y)} l-4 12 M${f(x + 10)} ${f(y + 6)} l-4 12" stroke="#e5e9ef" stroke-width="1.4" stroke-linecap="round"/>`;
    return k.r() < 0.45 ? bird(x, y, k.rnd(0.9, 1.4), k.m.skyTop === "#3b2a6b" ? "#2a1d4d" : "#33415c") : cloud(k, x, y, k.rnd(0.45, 0.75));
  };
}

/* ---------- scene types ---------- */

type Scene = (k: Kit) => string;

const mountains: Scene = (k) => {
  const { rnd, c, m } = k;
  const sunX = rnd(60, 340);
  let s = sky(k) + celestial(k, sunX, rnd(60, 120), rnd(26, 38));
  const far = range(k, 260, 170, 3, c(225, 25, 62));
  s += far.path;
  for (const [px, py] of far.peaks) s += `<path d="M${f(px)} ${f(py)} l-18 26 l10 -4 l8 8 l8 -8 l10 4 z" fill="#ffffff" opacity="0.92"/>`;
  s += range(k, 300, 120, 4, c(215, 22, 45)).path;
  s += scatter(k, 230, skyDetailFor(k), (x, y) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rnd(2, 4))}" fill="${c(30, 15, 70)}"/>`);
  s += hill(k, 335, 14, c(120, 38, 38), 4);
  for (let i = 0; i < 7; i++) s += pine(rnd(10, 390), rnd(370, 400), rnd(40, 70), c(140, 45, 24), !!m.winter);
  return s;
};

const ocean: Scene = (k) => {
  const { rnd, c, m } = k;
  let s = sky(k) + celestial(k, rnd(60, 340), rnd(55, 110), rnd(24, 34));
  s += cloud(k, rnd(60, 340), rnd(40, 90), rnd(0.8, 1.3));
  const horizon = rnd(170, 200);
  const bands = [c(205, 70, 48), c(208, 72, 40), c(212, 74, 32), c(216, 76, 25)];
  bands.forEach((fill, i) => {
    const y = horizon + i * ((400 - horizon) / 4);
    s += `<path d="M0 ${f(y)} Q50 ${f(y - 12)} 100 ${f(y)} T200 ${f(y)} T300 ${f(y)} T400 ${f(y)} V400 H0 Z" fill="${fill}"/>`;
  });
  if (k.r() < 0.5) {
    const lx = k.pick([40, 340]);
    s += `<path d="M${lx - 30} ${f(horizon + 30)} q30 -26 60 0 z" fill="${c(30, 20, 30)}"/><rect x="${lx - 7}" y="${f(horizon - 40)}" width="14" height="58" fill="#f8fafc"/><rect x="${lx - 7}" y="${f(horizon - 26)}" width="14" height="9" fill="#ef4444"/><rect x="${lx - 9}" y="${f(horizon - 50)}" width="18" height="11" fill="${m.night ? "#fde047" : "#334155"}"/>`;
  }
  s += scatter(k, horizon, skyDetailFor(k), (x, y) =>
    k.r() < 0.5 ? `<path d="M${f(x - 8)} ${f(y)} q8 -6 16 0" fill="none" stroke="#e0f2fe" stroke-width="2" stroke-linecap="round" opacity="0.8"/>` : `<path d="M${f(x)} ${f(y)} l6 -10 l4 10 z" fill="#1e293b" opacity="0.7"/>`,
  );
  const bx = rnd(120, 280);
  const by = horizon + rnd(30, 60);
  s += `<path d="M${f(bx)} ${f(by - 62)} L${f(bx)} ${f(by - 4)} L${f(bx + 40)} ${f(by - 4)} Z" fill="#f8fafc"/><path d="M${f(bx - 4)} ${f(by - 54)} L${f(bx - 4)} ${f(by - 4)} L${f(bx - 30)} ${f(by - 4)} Z" fill="#e2e8f0"/><path d="M${f(bx - 40)} ${f(by - 2)} H${f(bx + 50)} L${f(bx + 38)} ${f(by + 14)} H${f(bx - 30)} Z" fill="${k.pick(["#b91c1c", "#1d4ed8", "#ca8a04", "#7c3aed"])}"/>`;
  return s;
};

const forest: Scene = (k) => {
  const { rnd, c, m } = k;
  let s = sky(k) + celestial(k, rnd(60, 340), rnd(55, 100), rnd(24, 34));
  s += hill(k, 230, 22, c(130, 30, 52), 3);
  s += hill(k, 280, 18, c(125, 40, 42), 4);
  for (let i = 0; i < 6; i++) s += pine(rnd(0, 400), rnd(250, 290), rnd(60, 95), c(150, 40, 30), !!m.winter);
  s += scatter(k, 210, skyDetailFor(k), (x, y) =>
    k.r() < 0.5
      ? `<circle cx="${f(x)}" cy="${f(y)}" r="3.5" fill="${k.pick(["#ef4444", "#a855f7", "#f43f5e", "#3b82f6"])}"/>`
      : `<path d="M${f(x - 6)} ${f(y + 4)} a6 5 0 0 1 12 0 z" fill="#dc2626"/><rect x="${f(x - 1.5)}" y="${f(y + 4)}" width="3" height="6" fill="#fef3c7"/>`,
  );
  s += hill(k, 345, 12, c(120, 45, 34), 3);
  for (let i = 0; i < 4; i++) s += pine(rnd(0, 400), rnd(385, 405), rnd(90, 130), c(155, 45, 20), !!m.winter);
  return s;
};

const city: Scene = (k) => {
  const { rnd, c, m } = k;
  let s = sky(k) + celestial(k, rnd(60, 340), rnd(50, 95), rnd(22, 32));
  s += scatter(k, 170, skyDetailFor(k), () => "");
  let x = -5;
  const lit = m.night || m.skyTop === "#3b2a6b" ? "#fde047" : "#bfdbfe";
  while (x < 400) {
    const w = rnd(42, 72);
    const h = rnd(110, 250);
    const top = 360 - h;
    s += `<rect x="${f(x)}" y="${f(top)}" width="${f(w)}" height="${f(h)}" fill="${c(rnd(220, 260), 25, rnd(22, 38))}"/>`;
    if (k.r() < 0.35) s += `<rect x="${f(x + w / 2 - 2)}" y="${f(top - 22)}" width="4" height="22" fill="${c(230, 20, 30)}"/>`;
    for (let wy = top + 12; wy < 345; wy += 18) {
      for (let wx = x + 7; wx < x + w - 10; wx += 13) {
        if (k.r() < 0.55) s += `<rect x="${f(wx)}" y="${f(wy)}" width="7" height="9" fill="${lit}" opacity="${f(rnd(0.55, 1))}"/>`;
      }
    }
    x += w + rnd(0, 6);
  }
  s += `<rect y="360" width="400" height="40" fill="${c(230, 12, 22)}"/>`;
  for (let i = 0; i < 6; i++) s += `<rect x="${f(i * 70 + rnd(0, 30))}" y="378" width="26" height="4" fill="#facc15"/>`;
  for (let i = 0; i < 3; i++) {
    const cx = rnd(10, 360);
    s += `<rect x="${f(cx)}" y="364" width="34" height="11" rx="4" fill="${k.pick(["#ef4444", "#3b82f6", "#f59e0b", "#10b981"])}"/><circle cx="${f(cx + 8)}" cy="376" r="3.5" fill="#111827"/><circle cx="${f(cx + 26)}" cy="376" r="3.5" fill="#111827"/>`;
  }
  return s;
};

const desert: Scene = (k) => {
  const { rnd, c } = k;
  let s = sky(k) + celestial(k, rnd(60, 340), rnd(55, 110), rnd(28, 40));
  if (k.r() < 0.6) {
    const px = rnd(90, 310);
    const peak = rnd(130, 160);
    s += `<path d="M${f(px)} ${f(peak)} L${f(px + 70)} 225 L${f(px - 70)} 225 Z" fill="${c(35, 60, 50)}"/><path d="M${f(px)} ${f(peak)} L${f(px + 70)} 225 L${f(px + 20)} 225 Z" fill="${c(30, 55, 40)}"/>`;
  }
  s += scatter(k, 205, skyDetailFor(k), (x, y) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rnd(2, 4.5))}" fill="${c(28, 45, 40)}"/>`);
  s += hill(k, 215, 16, c(38, 70, 68), 3);
  s += hill(k, 290, 20, c(32, 75, 58), 3);
  for (let i = 0; i < 3; i++) {
    const cx = rnd(30, 370);
    const base = rnd(300, 380);
    const h = rnd(60, 100);
    const g = c(130, 50, 34);
    s += `<rect x="${f(cx - 7)}" y="${f(base - h)}" width="14" height="${f(h)}" rx="7" fill="${g}"/><rect x="${f(cx - 24)}" y="${f(base - h * 0.75)}" width="10" height="${f(h * 0.35)}" rx="5" fill="${g}"/><rect x="${f(cx - 24)}" y="${f(base - h * 0.45)}" width="20" height="9" rx="4.5" fill="${g}"/><rect x="${f(cx + 14)}" y="${f(base - h * 0.85)}" width="10" height="${f(h * 0.4)}" rx="5" fill="${g}"/><rect x="${f(cx + 4)}" y="${f(base - h * 0.5)}" width="20" height="9" rx="4.5" fill="${g}"/>`;
  }
  s += hill(k, 360, 10, c(28, 80, 50), 2);
  return s;
};

/** Per space scene (same order as its names): background hue, planet hue and planet saturation. */
const SPACE_LOOK: Array<[number, number, number]> = [
  [270, 35, 70], [220, 205, 75], [35, 45, 80], [350, 8, 75], [230, 280, 55],
  [160, 140, 60], [25, 30, 35], [310, 330, 70], [215, 190, 70], [195, 195, 25],
];

const space: Scene = (k) => {
  const { rnd } = k;
  const look = Math.max(0, MOODS.indexOf(k.m));
  const [hue, planetHue, planetSat] = SPACE_LOOK[look]!;
  let s = `<rect width="400" height="400" fill="hsl(${hue},45%,8%)"/>`;
  for (let i = 0; i < 3; i++) s += `<circle cx="${f(rnd(0, 400))}" cy="${f(rnd(0, 400))}" r="${f(rnd(80, 150))}" fill="hsl(${f(hue + rnd(-40, 40))},70%,45%)" opacity="0.18"/>`;
  s += scatter(k, 400, (x, y) => star(x, y, rnd(0.8, 2.2)) + star(x + rnd(-25, 25), y + rnd(-25, 25), rnd(0.6, 1.4)), () => "");
  const px = rnd(110, 290);
  const py = rnd(150, 260);
  const pr = rnd(55, 85);
  const ph = planetHue;
  const pl = look === 9 ? 85 : 55;
  s += `<circle cx="${f(px)}" cy="${f(py)}" r="${f(pr)}" fill="hsl(${ph},${planetSat}%,${pl}%)"/><path d="M${f(px - pr)} ${f(py)} Q${f(px)} ${f(py - pr * 0.35)} ${f(px + pr)} ${f(py)} Q${f(px)} ${f(py + pr * 0.25)} ${f(px - pr)} ${f(py)}" fill="hsl(${ph},${planetSat}%,${pl - 13}%)"/><circle cx="${f(px - pr * 0.35)}" cy="${f(py + pr * 0.4)}" r="${f(pr * 0.15)}" fill="hsl(${ph},${planetSat}%,${pl - 10}%)"/>`;
  if (look === 4) s += `<circle cx="${f(rnd(280, 360))}" cy="${f(rnd(60, 120))}" r="${f(rnd(14, 20))}" fill="hsl(40,30%,80%)"/>`;
  if (look === 6) for (let i = 0; i < 14; i++) s += `<ellipse cx="${f(rnd(0, 400))}" cy="${f(rnd(280, 340) + (i % 3) * 8)}" rx="${f(rnd(4, 10))}" ry="${f(rnd(3, 7))}" fill="hsl(30,20%,${f(rnd(35, 55))}%)"/>`;
  if (look === 0 || k.r() < 0.5) s += `<ellipse cx="${f(px)}" cy="${f(py)}" rx="${f(pr * 1.55)}" ry="${f(pr * 0.28)}" fill="none" stroke="hsl(${(ph + 40) % 360},80%,75%)" stroke-width="6" opacity="0.85"/>`;
  s += `<circle cx="${f(rnd(40, 120))}" cy="${f(rnd(40, 110))}" r="${f(rnd(18, 30))}" fill="hsl(${(hue + 90) % 360},60%,65%)"/>`;
  const rx = rnd(280, 360);
  const ry = rnd(300, 360);
  s += `<path d="M${f(rx)} ${f(ry)} l14 -40 l14 40 z" fill="#e2e8f0"/><circle cx="${f(rx + 14)}" cy="${f(ry - 18)}" r="4.5" fill="#38bdf8"/><path d="M${f(rx + 4)} ${f(ry)} h20 l-10 20 z" fill="#f97316"/>`;
  if (look === 8 || k.r() < 0.4) {
    const cx = rnd(200, 360);
    const cy = rnd(30, 90);
    s += `<path d="M${f(cx)} ${f(cy)} l-70 30" stroke="#ffffff" stroke-width="2.5" opacity="0.5" stroke-linecap="round"/><circle cx="${f(cx)}" cy="${f(cy)}" r="5" fill="#ffffff"/>`;
  }
  return s;
};

const farm: Scene = (k) => {
  const { rnd, c, m } = k;
  let s = sky(k) + celestial(k, rnd(60, 340), rnd(50, 95), rnd(24, 34));
  s += cloud(k, rnd(60, 340), rnd(50, 100), rnd(0.8, 1.2));
  const horizon = 210;
  const stripes = [c(95, 50, 55), c(60, 70, 60), c(110, 45, 45), c(45, 75, 58), c(100, 50, 40)];
  stripes.forEach((fill, i) => {
    const y = horizon + i * 38;
    s += `<path d="M0 ${f(y + rnd(-6, 6))} Q200 ${f(y - 14)} 400 ${f(y + rnd(-6, 6))} V400 H0 Z" fill="${fill}"/>`;
  });
  s += scatter(k, horizon, skyDetailFor(k), (x, y) =>
    k.r() < 0.5 ? flower(x, y, 0.8, k.pick(["#f472b6", "#fbbf24", "#ffffff", "#a78bfa"])) : `<g><ellipse cx="${f(x)}" cy="${f(y)}" rx="10" ry="7" fill="#f8fafc"/><circle cx="${f(x + 9)}" cy="${f(y - 2)}" r="4" fill="#1f2937"/></g>`,
  );
  const bx = rnd(40, 240);
  s += `<rect x="${f(bx)}" y="170" width="80" height="62" fill="#b91c1c"/><path d="M${f(bx - 8)} 172 L${f(bx + 40)} 138 L${f(bx + 88)} 172 Z" fill="#7f1d1d"/><rect x="${f(bx + 28)}" y="198" width="24" height="34" fill="#fef3c7"/><path d="M${f(bx + 28)} 198 l24 34 M${f(bx + 52)} 198 l-24 34" stroke="#b91c1c" stroke-width="3"/>`;
  const wx = bx < 200 ? rnd(290, 350) : rnd(50, 110);
  s += `<path d="M${f(wx - 8)} 232 L${f(wx - 4)} 150 H${f(wx + 4)} L${f(wx + 8)} 232 Z" fill="#e5e7eb"/>`;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rnd(0, 1);
    s += `<path d="M${f(wx)} 152 L${f(wx + Math.cos(a) * 42)} ${f(152 + Math.sin(a) * 42)}" stroke="#f8fafc" stroke-width="7" stroke-linecap="round"/>`;
  }
  s += `<circle cx="${f(wx)}" cy="152" r="5" fill="#475569"/>`;
  for (let i = 0; i < 9; i++) s += `<rect x="${f(i * 46 + 6)}" y="330" width="6" height="34" fill="${c(30, 40, 45)}"/>`;
  s += `<rect y="338" width="400" height="5" fill="${c(30, 40, 50)}"/><rect y="352" width="400" height="5" fill="${c(30, 40, 50)}"/>`;
  if (m.autumn) for (let i = 0; i < 3; i++) s += `<circle cx="${f(rnd(20, 380))}" cy="${f(rnd(370, 392))}" r="10" fill="#f97316"/>`;
  return s;
};

const underwater: Scene = (k) => {
  const { rnd, m } = k;
  const deep = m.night ? "#020617" : m.autumn ? "#14532d" : m.winter ? "#7dd3fc" : m.pastel ? "#a5b4fc" : "#0c4a6e";
  const top = m.night ? "#0f172a" : m.autumn ? "#4d7c0f" : m.winter ? "#e0f2fe" : m.pastel ? "#fbcfe8" : m.rain ? "#64748b" : "#38bdf8";
  let s = `<defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${deep}"/></linearGradient></defs><rect width="400" height="400" fill="url(#sea)"/>`;
  for (let i = 0; i < 4; i++) {
    const x = rnd(0, 400);
    s += `<path d="M${f(x)} 0 L${f(x + 40)} 0 L${f(x - 40)} 300 L${f(x - 80)} 300 Z" fill="#ffffff" opacity="0.07"/>`;
  }
  s += `<path d="M0 340 Q100 320 200 338 T400 330 V400 H0 Z" fill="${m.night ? "#334155" : "#fcd34d"}"/>`;
  for (let i = 0; i < 6; i++) {
    const x = rnd(10, 390);
    s += `<path d="M${f(x)} 360 q-14 -30 0 -60 q14 -30 0 -60" fill="none" stroke="${m.autumn ? "#a16207" : "#15803d"}" stroke-width="6" stroke-linecap="round"/>`;
  }
  for (let i = 0; i < 3; i++) {
    const x = rnd(30, 370);
    const col = k.pick(["#f472b6", "#fb7185", "#f97316", "#c084fc"]);
    s += `<circle cx="${f(x)}" cy="340" r="16" fill="${col}"/><circle cx="${f(x - 14)}" cy="330" r="10" fill="${col}"/><circle cx="${f(x + 13)}" cy="328" r="11" fill="${col}"/>`;
  }
  s += scatter(k, 400, (x, y) =>
    k.r() < 0.55
      ? `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rnd(2.5, 5))}" fill="none" stroke="#e0f2fe" stroke-width="1.5" opacity="0.8"/><circle cx="${f(x + 6)}" cy="${f(y - 9)}" r="2" fill="none" stroke="#e0f2fe" stroke-width="1.2" opacity="0.7"/>`
      : fish(x, y, rnd(0.6, 0.9), k.pick(["#facc15", "#fb923c", "#f472b6", "#22d3ee", "#a3e635"]), k.r() < 0.5),
  () => "");
  s += fish(rnd(120, 280), rnd(140, 240), 2.2, k.pick(["#f97316", "#facc15", "#ec4899"]), k.r() < 0.5);
  if (m.night || m.aurora) for (let i = 0; i < 3; i++) {
    const x = rnd(40, 360);
    const y = rnd(60, 200);
    s += `<path d="M${f(x - 14)} ${f(y)} a14 12 0 0 1 28 0 z" fill="#c084fc" opacity="0.8"/><path d="M${f(x - 8)} ${f(y)} q2 16 -2 26 M${f(x)} ${f(y)} q2 18 0 30 M${f(x + 8)} ${f(y)} q-2 16 2 26" stroke="#c084fc" stroke-width="2" fill="none" opacity="0.7"/>`;
  }
  return s;
};

const snow: Scene = (k) => {
  const { rnd, m } = k;
  const snowFill = (l: number) => `hsl(210,${m.night ? 25 : 35}%,${f(l * (m.night ? 0.55 : 1))}%)`;
  let s = sky(k) + celestial(k, rnd(60, 340), rnd(50, 95), rnd(22, 32));
  s += hill(k, 220, 20, snowFill(88), 3);
  for (let i = 0; i < 5; i++) s += pine(rnd(0, 400), rnd(235, 265), rnd(50, 80), `hsl(150,35%,${m.night ? 14 : 26}%)`, true);
  s += hill(k, 280, 16, snowFill(94), 3);
  const cx = rnd(60, 260);
  s += `<rect x="${f(cx)}" y="230" width="90" height="60" fill="#92400e"/><path d="M${f(cx - 10)} 232 L${f(cx + 45)} 196 L${f(cx + 100)} 232 Z" fill="#f8fafc"/><rect x="${f(cx + 64)}" y="200" width="12" height="22" fill="#78350f"/><rect x="${f(cx + 14)}" y="246" width="20" height="18" fill="${m.night || m.aurora ? "#fde047" : "#bae6fd"}"/><rect x="${f(cx + 52)}" y="254" width="22" height="36" fill="#451a03"/>`;
  s += `<circle cx="${f(cx + 72)}" cy="188" r="7" fill="#e2e8f0" opacity="0.7"/><circle cx="${f(cx + 80)}" cy="174" r="9" fill="#e2e8f0" opacity="0.55"/>`;
  const sx = cx < 180 ? rnd(270, 350) : rnd(40, 110);
  s += `<circle cx="${f(sx)}" cy="350" r="24" fill="#ffffff"/><circle cx="${f(sx)}" cy="314" r="17" fill="#ffffff"/><circle cx="${f(sx - 5)}" cy="310" r="2" fill="#111827"/><circle cx="${f(sx + 5)}" cy="310" r="2" fill="#111827"/><path d="M${f(sx)} 316 l10 3 l-10 2 z" fill="#f97316"/><path d="M${f(sx - 14)} 328 h28" stroke="#dc2626" stroke-width="5"/>`;
  s += scatter(k, 400, (x, y) => star(x, y, rnd(1.6, 3.2), "#ffffff") + star(x + rnd(-20, 20), y + rnd(-20, 20), rnd(1, 2), "#ffffff"), () => "");
  return s;
};

const garden: Scene = (k) => {
  const { rnd, c, m } = k;
  let s = sky(k) + celestial(k, rnd(60, 340), rnd(50, 95), rnd(24, 34));
  s += hill(k, 230, 14, c(110, 45, 52), 3);
  for (let i = 0; i < 4; i++) {
    const x = rnd(20, 380);
    s += `<circle cx="${f(x)}" cy="236" r="${f(rnd(22, 34))}" fill="${c(130, 45, 34)}"/>`;
  }
  for (let i = 0; i < 12; i++) s += `<rect x="${f(i * 34 + 4)}" y="258" width="14" height="44" fill="${m.night ? "#94a3b8" : "#f8fafc"}"/><path d="M${f(i * 34 + 4)} 258 l7 -9 l7 9 z" fill="${m.night ? "#94a3b8" : "#f8fafc"}"/>`;
  s += `<rect y="270" width="400" height="6" fill="${m.night ? "#94a3b8" : "#f1f5f9"}"/><rect y="288" width="400" height="6" fill="${m.night ? "#94a3b8" : "#f1f5f9"}"/>`;
  s += `<rect y="300" width="400" height="100" fill="${c(115, 50, 40)}"/>`;
  s += `<path d="M170 400 Q200 350 230 300 L260 300 Q240 350 250 400 Z" fill="${c(35, 35, 70)}"/>`;
  const petals = m.night ? ["#fde047", "#fef9c3"] : ["#f472b6", "#fb7185", "#facc15", "#a78bfa", "#60a5fa", "#ffffff", "#f97316"];
  s += scatter(k, 240, (x, y) => (m.night ? star(x, y, rnd(1.2, 2.4), "#fde047") : k.r() < 0.5 ? skyDetailFor(k)(x, y) : `<path d="M${f(x)} ${f(y)} q-8 -8 -10 2 q2 6 10 -2 q8 -8 10 2 q-2 6 -10 -2" fill="${k.pick(["#f472b6", "#facc15", "#60a5fa"])}"/>`), (x, y) => flower(x, y, rnd(1, 1.5), k.pick(petals)));
  return s;
};

const SCENES: Array<{ draw: Scene; names: string[] }> = [
  { draw: mountains, names: ["Alpine Dawn", "Summit Day", "Golden Peaks", "Dusk Range", "Moonlit Peaks", "Aurora Peaks", "Misty Heights", "Lilac Ridge", "Autumn Pass", "Frosted Summit"] },
  { draw: ocean, names: ["Harbor Dawn", "Blue Bay", "Golden Tide", "Dusk Sail", "Night Sea", "Aurora Shore", "Grey Swell", "Pastel Coast", "Amber Waves", "Winter Coast"] },
  { draw: forest, names: ["Forest Dawn", "Green Woods", "Golden Glade", "Dusk Grove", "Owl Night", "Aurora Pines", "Rainy Woods", "Fairy Wood", "Autumn Woods", "Snowy Woods"] },
  { draw: city, names: ["City Sunrise", "Downtown Day", "Golden Hour", "City Dusk", "Neon Night", "Aurora City", "Grey Skyline", "Candy Town", "Autumn Avenue", "Winter City"] },
  { draw: desert, names: ["Desert Dawn", "Dune Day", "Golden Sands", "Dusk Dunes", "Desert Stars", "Aurora Dunes", "Dust Storm", "Pink Sands", "Canyon Glow", "Cold Desert"] },
  { draw: space, names: ["Ringed Giant", "Blue Moonrise", "Golden Nebula", "Red Planet", "Twin Moons", "Green Nebula", "Asteroid Belt", "Pink Galaxy", "Comet Trail", "Ice World"] },
  { draw: farm, names: ["Farm Dawn", "Sunny Fields", "Harvest Gold", "Barn at Dusk", "Starry Farm", "Aurora Fields", "Rainy Meadow", "Blossom Farm", "Pumpkin Patch", "Snowy Farm"] },
  { draw: underwater, names: ["Shallow Reef", "Coral Garden", "Sunlit Shoal", "Twilight Reef", "Deep Glow", "Jelly Lights", "Murky Depths", "Pastel Lagoon", "Kelp Forest", "Arctic Waters"] },
  { draw: snow, names: ["Cabin Dawn", "Bright Snow", "Golden Frost", "Snowy Dusk", "Silent Night", "Northern Lights", "Blizzard", "Candy Snow", "First Snow", "Ice Valley"] },
  { draw: garden, names: ["Morning Garden", "Sunny Garden", "Golden Meadow", "Evening Garden", "Firefly Night", "Moon Garden", "Rain Garden", "Rose Garden", "Autumn Garden", "Frost Garden"] },
];

/**
 * Soft light spreading from the sun or moon, brightest near it and fading across the picture,
 * with a gentle shadow in the far corner. Besides looking natural, it gives every area of the
 * picture its own tone, so plain stretches (sky, sea, sand) differ from tile to tile.
 */
function glow(k: Kit): string {
  const { x, y } = k.light;
  const colour = k.m.night ? "#c7d2fe" : k.m.sun;
  const far = { x: x < 200 ? 400 : 0, y: 400 };
  return `<defs><radialGradient id="glow" gradientUnits="userSpaceOnUse" cx="${f(x)}" cy="${f(y)}" r="420"><stop offset="0" stop-color="${colour}" stop-opacity="${k.m.night ? 0.32 : 0.5}"/><stop offset="0.55" stop-color="${colour}" stop-opacity="0.12"/><stop offset="1" stop-color="${colour}" stop-opacity="0"/></radialGradient><radialGradient id="shade" gradientUnits="userSpaceOnUse" cx="${far.x}" cy="${far.y}" r="360"><stop offset="0" stop-color="#000" stop-opacity="0.28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><rect width="400" height="400" fill="url(#glow)"/><rect width="400" height="400" fill="url(#shade)"/>`;
}

export interface GeneratedScene {
  src: string;
  alt: string;
  title: string;
}

/**
 * The 100 scenes in play order. Consecutive levels use different scene types, and the moods
 * are staggered so the first ten aren't all dawn.
 */
export function generateScenes(): GeneratedScene[] {
  const out: GeneratedScene[] = [];
  for (let i = 0; i < 100; i++) {
    const type = i % 10;
    const moodIndex = (Math.floor(i / 10) + type * 3) % 10;
    const scene = SCENES[type]!;
    // Space has no time of day; its "mood" picks which space look (planet colour, moons, comet) to draw.
    const k = kit(1000 + type * 97 + moodIndex * 13, MOODS[moodIndex]!);
    const body = scene.draw(k);
    const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">${body}${glow(k)}</svg>`;
    const title = scene.names[moodIndex]!;
    out.push({ src: `data:image/svg+xml;utf8,${encodeURIComponent(doc)}`, alt: title, title });
  }
  return out;
}
