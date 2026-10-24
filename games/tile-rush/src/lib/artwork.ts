/**
 * Tile Rush's puzzle illustrations, drawn as SVG and built into the game, so they
 * load instantly and work offline. Each scene has distinct shapes in every area of
 * the picture so tiles can be told apart while solving.
 */


function svg(body: string): string {
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">${body}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(doc)}`;
}

const sunset = svg(`
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1e1b4b"/><stop offset="0.55" stop-color="#f97316"/><stop offset="1" stop-color="#fde047"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#sky)"/>
  <circle cx="290" cy="215" r="62" fill="#fef3c7"/>
  <circle cx="70" cy="60" r="3" fill="#fff"/><circle cx="150" cy="35" r="2" fill="#fff"/><circle cx="330" cy="50" r="2.5" fill="#fff"/>
  <path d="M0 290 L90 200 L160 260 L240 180 L330 270 L400 220 L400 400 L0 400 Z" fill="#7c2d12"/>
  <path d="M0 340 L70 290 L150 330 L230 280 L320 335 L400 300 L400 400 L0 400 Z" fill="#431407"/>
  <rect x="40" y="350" width="12" height="40" fill="#1c1917"/><circle cx="46" cy="340" r="22" fill="#14532d"/>
  <rect x="345" y="345" width="10" height="45" fill="#1c1917"/><circle cx="350" cy="335" r="18" fill="#166534"/>
`);

const ocean = svg(`
  <rect width="400" height="400" fill="#0ea5e9"/>
  <rect y="0" width="400" height="170" fill="#bae6fd"/>
  <circle cx="80" cy="70" r="40" fill="#fde047"/>
  <ellipse cx="260" cy="60" rx="55" ry="18" fill="#fff"/><ellipse cx="300" cy="50" rx="35" ry="16" fill="#fff"/>
  <path d="M0 170 Q50 150 100 170 T200 170 T300 170 T400 170 V400 H0 Z" fill="#0284c7"/>
  <path d="M0 250 Q50 230 100 250 T200 250 T300 250 T400 250 V400 H0 Z" fill="#0369a1"/>
  <path d="M0 330 Q50 310 100 330 T200 330 T300 330 T400 330 V400 H0 Z" fill="#075985"/>
  <path d="M210 120 L210 200 L260 200 Z" fill="#fff"/><path d="M205 125 L205 200 L170 200 Z" fill="#f1f5f9"/>
  <path d="M160 200 H275 L260 222 H175 Z" fill="#b91c1c"/>
  <path d="M60 300 q20 -25 40 0 q-20 -10 -40 0" fill="#f97316"/><circle cx="330" cy="290" r="10" fill="#fbbf24"/>
`);

const forest = svg(`
  <rect width="400" height="400" fill="#dcfce7"/>
  <circle cx="320" cy="80" r="45" fill="#facc15"/>
  <path d="M0 230 Q100 180 200 220 T400 210 V400 H0 Z" fill="#86efac"/>
  <g fill="#15803d">
    <path d="M60 120 L110 250 H10 Z"/><path d="M160 90 L220 250 H100 Z"/><path d="M270 140 L315 260 H225 Z"/>
  </g>
  <g fill="#78350f"><rect x="52" y="250" width="16" height="40"/><rect x="152" y="250" width="16" height="45"/><rect x="262" y="260" width="16" height="35"/></g>
  <path d="M0 300 Q100 270 200 300 T400 290 V400 H0 Z" fill="#4ade80"/>
  <circle cx="90" cy="345" r="9" fill="#ef4444"/><circle cx="200" cy="360" r="9" fill="#a855f7"/><circle cx="330" cy="340" r="9" fill="#f43f5e"/>
  <path d="M340 230 q15 -30 30 0 z" fill="#7c3aed"/>
`);

const city = svg(`
  <rect width="400" height="400" fill="#312e81"/>
  <circle cx="320" cy="70" r="35" fill="#e0e7ff"/><circle cx="335" cy="60" r="35" fill="#312e81"/>
  <g fill="#fff"><circle cx="40" cy="40" r="2"/><circle cx="120" cy="80" r="2"/><circle cx="200" cy="30" r="2"/><circle cx="250" cy="110" r="2"/></g>
  <g fill="#1e1b4b">
    <rect x="10" y="190" width="70" height="210"/><rect x="90" y="140" width="60" height="260"/>
    <rect x="160" y="210" width="80" height="190"/><rect x="250" y="120" width="55" height="280"/><rect x="315" y="180" width="75" height="220"/>
  </g>
  <g fill="#facc15">
    <rect x="25" y="210" width="12" height="12"/><rect x="50" y="250" width="12" height="12"/><rect x="105" y="160" width="10" height="12"/>
    <rect x="125" y="220" width="10" height="12"/><rect x="180" y="240" width="14" height="10"/><rect x="210" y="300" width="14" height="10"/>
    <rect x="265" y="150" width="10" height="14"/><rect x="285" y="230" width="10" height="14"/><rect x="335" y="200" width="12" height="12"/>
    <rect x="360" y="290" width="12" height="12"/>
  </g>
  <rect x="0" y="370" width="400" height="30" fill="#f472b6"/>
`);

const desert = svg(`
  <rect width="400" height="400" fill="#fed7aa"/>
  <rect width="400" height="160" fill="#7dd3fc"/>
  <circle cx="300" cy="80" r="40" fill="#fbbf24"/>
  <path d="M0 200 Q120 140 240 200 T400 180 V400 H0 Z" fill="#fdba74"/>
  <path d="M0 290 Q100 250 220 290 T400 280 V400 H0 Z" fill="#fb923c"/>
  <g fill="#16a34a">
    <rect x="80" y="190" width="20" height="110" rx="10"/><rect x="55" y="220" width="15" height="45" rx="7"/><rect x="108" y="210" width="15" height="40" rx="7"/>
    <rect x="300" y="230" width="16" height="80" rx="8"/><rect x="282" y="250" width="12" height="30" rx="6"/>
  </g>
  <path d="M170 160 L220 100 L270 160 Z" fill="#d97706"/>
  <circle cx="200" cy="350" r="12" fill="#a16207"/><circle cx="60" cy="360" r="8" fill="#92400e"/>
`);

const space = svg(`
  <rect width="400" height="400" fill="#020617"/>
  <g fill="#fff"><circle cx="30" cy="50" r="2"/><circle cx="110" cy="120" r="1.5"/><circle cx="190" cy="40" r="2"/><circle cx="360" cy="140" r="2"/>
    <circle cx="60" cy="300" r="1.5"/><circle cx="330" cy="360" r="2"/><circle cx="220" cy="330" r="1.5"/></g>
  <circle cx="130" cy="230" r="80" fill="#f97316"/><path d="M50 230 Q130 200 210 230 Q130 250 50 230" fill="#c2410c"/>
  <ellipse cx="130" cy="230" rx="120" ry="20" fill="none" stroke="#fde68a" stroke-width="6"/>
  <circle cx="310" cy="80" r="35" fill="#38bdf8"/><circle cx="300" cy="70" r="10" fill="#22c55e"/>
  <path d="M300 300 l30 -60 l10 60 z" fill="#e2e8f0"/><path d="M308 300 h22 l-11 25 z" fill="#ef4444"/>
`);

/** The puzzle pictures: Tile Rush's own illustrations. */
export const ILLUSTRATIONS = [
  { src: sunset, alt: "Sunset Ridge", title: "Sunset Ridge", caption: "Low sun behind two rows of peaks." },
  { src: forest, alt: "Pine Forest", title: "Pine Forest", caption: "Three pines and a field of berries." },
  { src: ocean, alt: "Open Sea", title: "Open Sea", caption: "A red sailboat on rolling water." },
  { src: city, alt: "Night City", title: "Night City", caption: "Lit windows under a crescent moon." },
  { src: desert, alt: "Desert Day", title: "Desert Day", caption: "Cacti and dunes under a hot sun." },
  { src: space, alt: "Deep Space", title: "Deep Space", caption: "A ringed planet and a passing rocket." },
];
