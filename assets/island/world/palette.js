// Time-of-day palette. One number, the scene hour (0–24.99), decides every
// colour on the island and in the overlay UI. Colours are sRGB hex, and the
// composite shader writes them to the screen untouched.

export const KEYS = [
  // hour, paper, paper2 (sky/sea wash), ink, accent (rust), glow
  // Paper and ink swap brightness twice a day. Each swap is kept short and sits
  // between stops (04:55–05:25 and 19:05–19:35), so no panel ever reads mid-swap.
  [0.0, '#0f2a47', '#0b2139', '#dfe9f1', '#e0864f', '#ffb56b'],
  [4.55, '#10284a', '#0b2139', '#dbe6f1', '#e0864f', '#ffb56b'],
  [4.95, '#35385c', '#2a3052', '#efe3df', '#e98c5a', '#ffb56b'],
  [5.3, '#e6d3d3', '#dac3c9', '#3a2d3d', '#cf5f36', '#ffcf8f'],
  [6.3, '#f1d9c4', '#ebcab4', '#3a2d33', '#cf5f36', '#ffcf8f'],
  [7.6, '#f2e6d2', '#eadcc2', '#2e2823', '#c4642f', '#ffcf8f'],
  [12.0, '#f4ecda', '#e6dcc4', '#2b2620', '#c4642f', '#ffcf8f'],
  [16.6, '#f3e7d1', '#e7d6bb', '#2d2620', '#c35d2b', '#ffcf8f'],
  [18.2, '#ecc9a2', '#e2b48e', '#3a2822', '#b24c28', '#ffc27a'],
  [19.05, '#e2b894', '#d6a585', '#3a2622', '#b24c28', '#ffc27a'],
  [19.4, '#4b4263', '#3c3a5a', '#f2e2d6', '#e58a55', '#ffb56b'],
  [20.4, '#15304f', '#0f2640', '#e1eaf2', '#e0864f', '#ffb56b'],
  [25.0, '#0f2a47', '#0b2139', '#dfe9f1', '#e0864f', '#ffb56b'],
];

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const PARSED = KEYS.map(([t, ...cols]) => [t, cols.map(hex)]);
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const smooth = (t) => t * t * (3 - 2 * t);

export function wrapHour(h) {
  return ((h % 24) + 24) % 24;
}

/** Palette at an hour: { paper, paper2, ink, accent, glow } as [r,g,b] 0–1. */
export function paletteAt(hour) {
  const h = wrapHour(hour);
  let i = 0;
  while (i < PARSED.length - 2 && PARSED[i + 1][0] <= h) i++;
  const [t0, c0] = PARSED[i];
  const [t1, c1] = PARSED[i + 1];
  const t = smooth(Math.min(1, Math.max(0, (h - t0) / (t1 - t0))));
  const [paper, paper2, ink, accent, glow] = c0.map((c, k) => mix(c, c1[k], t));
  return { paper, paper2, ink, accent, glow };
}

/** 0 by day, 1 at night — how much the cyanotype, window glow and stars show. */
export function nightness(hour) {
  const h = wrapHour(hour);
  const dusk = smooth(Math.min(1, Math.max(0, (h - 18.9) / 0.9)));
  const dawn = 1 - smooth(Math.min(1, Math.max(0, (h - 4.8) / 0.8)));
  return Math.max(h >= 12 ? dusk : 0, h < 12 ? dawn : 0);
}

/**
 * Sun and moon for Pune-ish latitude. Sunrise ~06:10 due east, noon high in
 * the south, sunset ~18:40 due west. Returns unit vectors (y up, -z north)
 * and intensities.
 */
export function sky(hour) {
  const h = wrapHour(hour);
  const rise = 6.15, set = 18.65;
  const dayT = (h - rise) / (set - rise); // 0 at sunrise, 1 at sunset
  const sunAz = Math.PI * dayT; // 0 = east, PI = west, via south
  const sunUp = Math.sin(Math.PI * Math.min(1, Math.max(0, dayT)));
  const elev = dayT > 0 && dayT < 1 ? 0.12 + 1.02 * sunUp : -0.2;
  const sun = [Math.cos(sunAz) * Math.cos(elev), Math.sin(elev), Math.sin(sunAz) * Math.cos(elev) * 0.85 + 0.25];
  norm(sun);
  const sunI = dayT > -0.02 && dayT < 1.02 ? Math.min(1, Math.max(0, (dayT < 0.5 ? dayT : 1 - dayT) * 9)) : 0;
  // Moon: rises in the east at dusk, rides high by 00:30.
  const mh = (h + 24 - 18.5) % 24; // 0 at moonrise
  const mT = mh / 12;
  const moonAz = Math.PI * mT;
  const mElev = 0.25 + 0.9 * Math.sin(Math.PI * Math.min(1, Math.max(0, mT)));
  const moon = [Math.cos(moonAz) * Math.cos(mElev), Math.sin(mElev), Math.sin(moonAz) * Math.cos(mElev) * 0.7 + 0.2];
  norm(moon);
  const moonI = nightness(h);
  return { sun, sunI, moon, moonI, night: nightness(h) };
}

function norm(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  v[0] /= l; v[1] /= l; v[2] /= l;
  return v;
}

const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const DAY_UI = { paper: hex('#f4ecda'), ink: hex('#2b2620') };
const NIGHT_UI = { paper: hex('#0f2a47'), ink: hex('#dfe9f1') };

/**
 * Panel colours for the overlay UI: they follow the scene's hue, but the
 * paper is pushed away from mid-grey and the ink snapped to the far side, so
 * text always keeps its contrast while the sun moves.
 */
export function uiPalette(p) {
  const L = lum(p.paper);
  const day = L >= 0.42;
  const base = day ? DAY_UI : NIGHT_UI;
  const push = day ? smooth(Math.min(1, Math.max(0, (0.78 - L) / 0.36))) : smooth(Math.min(1, Math.max(0, (L - 0.12) / 0.3)));
  const paper = mix(p.paper, base.paper, 0.35 + 0.65 * push);
  const paper2 = mix(p.paper2, base.paper, 0.35 + 0.65 * push);
  return { paper, paper2, ink: base.ink, accent: p.accent, dark: !day };
}

export const toCss = (c) => `rgb(${c.map((v) => Math.round(v * 255)).join(' ')})`;
