import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, random } from 'remotion';
import { measureText } from '@remotion/layout-utils';
import { noise2D } from '@remotion/noise';
import WORDS from './words.json';
import { buildFilm, setShotResolver, FPS, ORDER, PAN, NAVY, ORANGE, SOFT, clamp, ease, spr, punch, val } from './timeline.jsx';

const SHOTS = ['site-home', 'card-desk', 'vtbm-desk', 'runfolio-desk', 'psp-desk', 'theme-wanderer', 'theme-terminal', 'theme-sahyadri', 'theme-blueprint', 'theme-holographic'];
const STAR = 'M0,-1 C.12,-.12 .12,-.12 1,0 C.12,.12 .12,.12 0,1 C-.12,.12 -.12,.12 -1,0 C-.12,-.12 -.12,-.12 0,-1Z';

async function prepare() {
  const faces = [new FontFace('Kalam', `url(${staticFile('kalam-400.woff2')})`, { weight: '400' }), new FontFace('Kalam', `url(${staticFile('kalam-700.woff2')})`, { weight: '700' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  await document.fonts.ready;
  await Promise.all(SHOTS.map((n) => new Promise((r) => { const i = new Image(); i.onload = i.onerror = r; i.src = staticFile(`shots/${n}.webp`); })));
}

// ---------- group transforms ----------
const gtf = (a = {}) => {
  const [ox, oy] = a.origin || [0, 0];
  return `translate(${ox + (a.x || 0)},${oy + (a.y || 0)}) rotate(${a.rot || 0}) scale(${a.sx ?? 1},${a.sy ?? 1}) translate(${-ox},${-oy})`;
};
const mapThrough = (a = {}, [px, py]) => {
  const [ox, oy] = a.origin || [0, 0];
  let x = (px - ox) * (a.sx ?? 1), y = (py - oy) * (a.sy ?? 1);
  const r = ((a.rot || 0) * Math.PI) / 180;
  const rx = x * Math.cos(r) - y * Math.sin(r), ry = x * Math.sin(r) + y * Math.cos(r);
  return [rx + ox + (a.x || 0), ry + oy + (a.y || 0)];
};

function emphTransform(it, t) {
  const e = it.emph; if (!e) return undefined;
  const t0 = val(e.t); if (t < t0) return undefined;
  const k = t - t0, cx = it.bb.x + it.bb.width / 2, cy = it.bb.y + it.bb.height / 2;
  if (e.kind === 'punch') { const s = punch(t, t0, e.amp || 0.15); return `translate(${cx},${cy}) scale(${s}) translate(${-cx},${-cy})`; }
  if (e.kind === 'shake') return `translate(${Math.sin(k * 55) * 14 * Math.exp(-k * 6)},0)`;
  if (e.kind === 'wiggle') { const r = Math.sin(k * 7) * (1.5 + 4 * Math.exp(-k * 3)); return `rotate(${r} ${cx} ${cy})`; }
  if (e.kind === 'glow') { const s = punch(t, t0, 0.06); return `translate(${cx},${cy}) scale(${s}) translate(${-cx},${-cy})`; }
  return undefined;
}

function Item({ it, t }) {
  if (t < it.t0) return null;
  const prog = clamp((t - it.t0) / (it.t1 - it.t0));
  if (it.kind === 'write') {
    const b = it.bb;
    const glow = it.emph && it.emph.kind === 'glow' && t > val(it.emph.t) ? (0.25 + 0.18 * Math.sin((t - val(it.emph.t)) * 4)) * clamp((t - val(it.emph.t)) / 0.4) : 0;
    const txt = (extra) => <text x={it.x} y={it.y} fontFamily="Kalam" fontWeight={it.bold ? 700 : 400} fontSize={it.size} textAnchor={it.anchor} transform={it.rot ? `rotate(${it.rot} ${it.x} ${it.y})` : undefined} {...extra}>{it.txt}</text>;
    return (
      <g transform={emphTransform(it, t)}>
        <clipPath id={`c${it.id}`} clipPathUnits="userSpaceOnUse"><rect x={b.x - 12} y={b.y - 40} width={prog >= 1 ? b.width + 60 : (b.width + 12) * prog} height={b.height + 80} /></clipPath>
        {glow > 0 && txt({ fill: 'none', stroke: ORANGE, strokeWidth: 22, opacity: glow, filter: 'url(#blur8)', strokeLinejoin: 'round' })}
        {txt({ fill: it.color, clipPath: `url(#c${it.id})` })}
      </g>
    );
  }
  const fo = it.fill ? clamp((t - it.t1) / 0.35) * it.fillOpacity : 0;
  let tf;
  if (it.popOnDone && t >= it.t1) { const s = punch(t, it.t1, 0.07); const cx = it.bb.x + it.bb.width / 2, cy = it.bb.y + it.bb.height / 2; tf = `translate(${cx},${cy}) scale(${s}) translate(${-cx},${-cy})`; }
  const sh = emphTransform(it, t);
  return <path d={it.d} transform={[tf, sh].filter(Boolean).join(' ') || undefined} fill={it.fill || 'none'} fillOpacity={fo} stroke={it.color} strokeWidth={it.width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - prog} opacity={it.opacity} />;
}

function Node({ n, t }) {
  if (n.type === 'item') return <Item it={n} t={t} />;
  if (n.type === 'fx') return n.render(t);
  const a = n.anim(t) || {};
  if (a.op === 0) return null;
  return <g transform={gtf(a)} opacity={a.op ?? 1}>{n.children.map((c) => <Node key={c.id} n={c} t={t} />)}</g>;
}

// ---------- camera ----------
function camera(F, t) {
  const { W, H, SC, cellOrigin, ZOOM_AT, ZOOM_DUR, L } = F;
  const center = (i) => { const [ox, oy] = cellOrigin(i); return [ox + W / 2, oy + H / 2]; };
  let k = 0;
  ORDER.forEach((id, i) => { if (t >= SC[id].start - PAN) k = i; });
  const sc = SC[ORDER[k]];
  const drift = (s, tt) => 1 + 0.03 * ease(clamp((tt - s.start) / (s.end - s.start + 0.6)));
  let [cx, cy] = center(k), z = drift(sc, t), rot = 0;
  const st = sc.start - PAN;
  if (k > 0 && t < st + 1.2) {
    const q = spr(t, st, { damping: 15, stiffness: 80, mass: 0.9 }, 24);
    const [px, py] = center(k - 1);
    const qc = Math.min(q, 1.04);
    cx = px + (cx - px) * qc; cy = py + (cy - py) * qc;
    const prevZ = drift(SC[ORDER[k - 1]], 1e9);
    const bump = Math.sin(Math.PI * clamp(q));
    z = (prevZ + (z - prevZ) * clamp(q)) * (1 - 0.12 * bump);
    rot = bump * 1.6 * (k % 2 ? 1 : -1);
  }
  // the stamp shakes the board
  const ts = F.pops.filter((p) => p.k === 'stamp').map((p) => p.t);
  let sx = 0, sy = 0;
  for (const s of ts) { const kk = t - s; if (kk > 0 && kk < 0.5) { sx += Math.sin(kk * 70) * 16 * Math.exp(-kk * 9); sy += Math.cos(kk * 60) * 10 * Math.exp(-kk * 9); } }
  if (t > ZOOM_AT) {
    const q = ease(clamp((t - ZOOM_AT) / ZOOM_DUR));
    if (L === 'h') {
      const bw = 3 * F.GX + W, bh = F.GY + H; const fz = Math.min(W / (bw + 240), H / (bh + 240));
      cx += (bw / 2 - cx) * q; cy += (bh / 2 - cy) * q; z = z + (fz - z) * q;
    } else {
      const [ex, ey] = center(7); cx += (ex - cx) * q; cy += (ey - cy) * q; z = z * (1 - q) + q - 0.6 * Math.sin(Math.PI * q);
    }
    rot = 0;
  }
  return { cx: cx - sx / z, cy: cy - sy / z, z, rot };
}
const toScreen = (F, cam, sc, [x, y]) => {
  const wx = sc.ox + x - cam.cx, wy = sc.oy + y - cam.cy;
  const r = (cam.rot * Math.PI) / 180;
  const rx = (wx * Math.cos(r) - wy * Math.sin(r)) * cam.z, ry = (wx * Math.sin(r) + wy * Math.cos(r)) * cam.z;
  return [rx + F.W / 2, ry + F.H / 2];
};

// ---------- the marker ----------
function penPose(F, t, cam) {
  const pens = F.penItems;
  let act = null, prev = null, next = null;
  for (const it of pens) {
    if (t >= it.t0 && t <= it.t1) act = it;
    if (it.t1 < t && (!prev || it.t1 > prev.t1)) prev = it;
    if (it.t0 > t && (!next || it.t0 < next.t0)) next = it;
  }
  const tipOf = (it, p) => {
    let pt = it.tip(p);
    for (let g = it.grp; g; g = g.grp) pt = mapThrough(g.anim(t) || {}, pt);
    return toScreen(F, cam, it.scene, pt);
  };
  const REST = [F.W + 80, F.H + 260];
  if (act) return { pt: tipOf(act, clamp((t - act.t0) / (act.t1 - act.t0))), color: act.color, lift: 0 };
  if (prev && next) {
    const g = next.t0 - prev.t1, a = tipOf(prev, 1), b = tipOf(next, 0), q = (t - prev.t1) / g;
    if (g < 0.9) { const e = ease(q); return { pt: [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e - Math.sin(Math.PI * q) * 40], color: next.color, lift: Math.sin(Math.PI * q) }; }
    const out = Math.min(0.35, g / 3), tt = t - prev.t1;
    if (tt < out) { const e = ease(tt / out); return { pt: [a[0] + (REST[0] - a[0]) * e, a[1] + (REST[1] - a[1]) * e], color: prev.color, lift: 1 }; }
    if (t > next.t0 - out) { const e = ease(1 - (next.t0 - t) / out); return { pt: [REST[0] + (b[0] - REST[0]) * e, REST[1] + (b[1] - REST[1]) * e], color: next.color, lift: 1 }; }
    return { pt: REST, color: next.color, lift: 1 };
  }
  if (prev) { const a = tipOf(prev, 1), e = ease(clamp((t - prev.t1) / 0.4)); return { pt: [a[0] + (REST[0] - a[0]) * e, a[1] + (REST[1] - a[1]) * e], color: prev.color, lift: 1 }; }
  if (next) { const b = tipOf(next, 0), e = ease(clamp(1 - (next.t0 - t) / 0.4)); return { pt: [REST[0] + (b[0] - REST[0]) * e, REST[1] + (b[1] - REST[1]) * e], color: next.color, lift: 1 }; }
  return { pt: REST, color: NAVY, lift: 1 };
}
function Pen({ F, t, cam }) {
  const ps = penPose(F, t, cam);
  const s = (F.L === 'h' ? 1 : 1.15) * (1 + 0.05 * ps.lift);
  // a little writing tilt while drawing
  const tilt = ps.lift < 0.5 ? Math.sin(t * 22) * 2.5 : 0;
  const op = t > F.ZOOM_AT ? clamp(1 - (t - F.ZOOM_AT) / 0.5) : 1;
  return (
    <g transform={`translate(${ps.pt[0]},${ps.pt[1]}) rotate(${tilt}) scale(${s})`} opacity={op}>
      <g opacity={0.16} transform={`translate(${14 + 22 * ps.lift},${16 + 22 * ps.lift})`}><path d="M0,0 L22,-14 L190,-200 L222,-170 L52,14 Z" fill={NAVY} filter="url(#blur6)" /></g>
      <path d="M0,0 L10,-24 L28,-10 Z" fill={ps.color} />
      <path d="M8,-20 L26,-36 L44,-18 L26,-6 Z" fill="#cfd3e2" />
      <path d="M24,-36 L176,-188 L208,-156 L42,-18 Z" fill="#f7f7f7" stroke="#c9ccd8" strokeWidth={2} />
      <path d="M86,-98 L116,-128 L148,-96 L118,-66 Z" fill={ps.color} />
      <path d="M176,-188 L196,-208 Q206,-216 214,-208 L228,-194 Q236,-186 228,-178 L208,-156 Z" fill={ps.color} />
    </g>
  );
}

// ---------- background doodles, drifting on a slower plane ----------
function Doodles({ F, t, cam }) {
  const f = 0.72, n = 110;
  const bw = (3 * F.GX + F.W) * f + F.W, bh = (F.GY + F.H) * f + F.H;
  return (
    <g transform={`translate(${F.W / 2},${F.H / 2}) rotate(${cam.rot * 0.6}) scale(${0.6 + cam.z * 0.4}) translate(${-cam.cx * f},${-cam.cy * f})`} opacity={0.09}>
      {Array.from({ length: n }, (_, i) => {
        const x = random(`dx${i}`) * bw - F.W / 2, y = random(`dy${i}`) * bh - F.H / 2;
        const dx = noise2D('nx', i, t * 0.15) * 30, dy = noise2D('ny', i, t * 0.15) * 30;
        const kind = i % 4, s = 10 + random(`ds${i}`) * 18, r = t * 20 * (random(`dr${i}`) - 0.5);
        const tf = `translate(${x + dx},${y + dy}) rotate(${r})`;
        if (kind === 0) return <path key={i} d={STAR} transform={`${tf} scale(${s})`} fill={NAVY} />;
        if (kind === 1) return <circle key={i} cx={x + dx} cy={y + dy} r={s * 0.6} fill="none" stroke={NAVY} strokeWidth={4} />;
        if (kind === 2) return <path key={i} d={`M${-s},0 L${s},0 M0,${-s} L0,${s}`} transform={tf} stroke={NAVY} strokeWidth={5} strokeLinecap="round" />;
        return <path key={i} d={`M${-s * 1.5},0 q${s * 0.75},${-s} ${s * 1.5},0 t${s * 1.5},0`} transform={tf} fill="none" stroke={ORANGE} strokeWidth={5} strokeLinecap="round" />;
      })}
    </g>
  );
}

// ---------- the end card ----------
function EndCard({ F, t }) {
  const [ox, oy] = F.cellOrigin(7), W = F.W, L = F.L;
  const t0 = F.ZOOM_AT + 0.7;
  if (t < t0 - 0.1) return null;
  const words = L === 'h' ? [['Portfolio', 'in', 'a', 'Day']] : [['Portfolio'], ['in', 'a', 'Day']];
  const size = L === 'h' ? 190 : 160;
  const lines = words.map((ws, li) => {
    const y = L === 'h' ? 500 : 800 + li * 175;
    const widths = ws.map((wd) => measureText({ text: wd, fontFamily: 'Kalam', fontSize: size, fontWeight: '700' }).width);
    const gap = size * 0.28, total = widths.reduce((a, b) => a + b, 0) + gap * (ws.length - 1);
    let x = W / 2 - total / 2;
    return ws.map((wd, i) => {
      const idx = li * 1 + i + (li ? 1 : 0), k = spr(t, t0 + idx * 0.12, { damping: 9, stiffness: 140 });
      const cx = x + widths[i] / 2; x += widths[i] + gap;
      return <text key={`${li}-${i}`} x={cx} y={y} fontFamily="Kalam" fontWeight={700} fontSize={size} fill={NAVY} textAnchor="middle" opacity={clamp(k * 3)} transform={`translate(${cx},${y}) scale(${k}) rotate(${(1 - k) * -12}) translate(${-cx},${-y})`}>{wd}</text>;
    });
  });
  const ku = clamp((t - t0 - 0.6) / 0.5);
  const sub = spr(t, t0 + 0.8, { damping: 12 });
  const ud = L === 'h' ? 'M480,560 Q960,600 1440,555' : 'M190,1040 Q540,1070 890,1035';
  return (
    <g transform={`translate(${ox},${oy})`}>
      {lines}
      <path d={ud} stroke={ORANGE} strokeWidth={14} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ku} />
      <text x={W / 2} y={L === 'h' ? 660 : 1150} fontFamily="Kalam" fontWeight={700} fontSize={L === 'h' ? 84 : 72} fill={ORANGE} textAnchor="middle" opacity={sub} transform={`translate(0,${(1 - sub) * 40})`}>and better every day after.</text>
    </g>
  );
}

export const Film = ({ L }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const [F, setF] = useState(null);
  const [handle] = useState(() => delayRender('build the board'));
  useEffect(() => {
    prepare().then(() => {
      setShotResolver((n) => staticFile(`shots/${n}.webp`));
      const film = buildFilm(L, WORDS, (txt, size, bold) => measureText({ text: txt, fontFamily: 'Kalam', fontSize: size, fontWeight: bold ? '700' : '400' }).width);
      film.penItems = film.ITEMS.filter((i) => !i.nopen).sort((a, b) => a.t0 - b.t0);
      setF(film);
      continueRender(handle);
    });
  }, []);
  if (!F) return null;
  const cam = camera(F, t);
  const { W, H } = F;
  return (
    <AbsoluteFill style={{ background: '#fbfaf6' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <radialGradient id="sheen" cx="35%" cy="25%" r="90%"><stop offset="0" stopColor="#ffffff" /><stop offset=".65" stopColor="#fbfaf6" /><stop offset="1" stopColor="#eeebe2" /></radialGradient>
          <radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset=".6" stopColor="#1b2a6b" stopOpacity="0" /><stop offset="1" stopColor="#1b2a6b" stopOpacity=".10" /></radialGradient>
          <pattern id="grain" width="512" height="512" patternUnits="userSpaceOnUse"><image href={staticFile('grain.png')} width="512" height="512" /></pattern>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#1b2a6b" floodOpacity=".2" /></filter>
          <filter id="blur6"><feGaussianBlur stdDeviation="6" /></filter>
          <filter id="blur8" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="8" /></filter>
        </defs>
        <rect width={W} height={H} fill="url(#sheen)" />
        <Doodles F={F} t={t} cam={cam} />
        <g transform={`translate(${W / 2},${H / 2}) rotate(${cam.rot}) scale(${cam.z}) translate(${-cam.cx},${-cam.cy})`}>
          {F.SCENES.map((sc) => (
            <g key={sc.id} transform={`translate(${sc.ox},${sc.oy})`}>
              {sc.back.map((n) => <Node key={n.id} n={n} t={t} />)}
              {sc.front.map((n) => <Node key={n.id} n={n} t={t} />)}
            </g>
          ))}
          <EndCard F={F} t={t} />
        </g>
        <rect width={W} height={H} fill="url(#grain)" />
        <rect width={W} height={H} fill="url(#vig)" />
        <Pen F={F} t={t} cam={cam} />
      </svg>
      <Audio src={staticFile(`mix-${L}.wav`)} />
    </AbsoluteFill>
  );
};
