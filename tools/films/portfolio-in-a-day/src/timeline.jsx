// The film as data: every stroke, group and effect, timed to the narration.
// Pure (no DOM): the renderer draws it, the sound script reads its events.
import React from 'react';
import { spring, random } from 'remotion';
import { getLength, getPointAtLength, getBoundingBox, getTangentAtLength } from '@remotion/paths';

export const FPS = 30;
export const NAVY = '#1b2a6b', ORANGE = '#ff6a1a', SOFT = '#5a6aa8', SKY = '#4b8fd6', SAND = '#b07a3a';
export const ORDER = ['hook', 'sand', 'steps', 'bring', 'get', 'proof', 'sky'];
const GAP = 0.62, START0 = 0.35;
export const PAN = 0.62;

export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOut = (x) => 1 - Math.pow(1 - x, 3);
export const val = (v) => (typeof v === 'function' ? v() : v);
// spring that starts at t0 (seconds); 0 before
export const spr = (t, t0, cfg = {}, dur) =>
  t < t0 ? 0 : spring({ frame: (t - t0) * FPS, fps: FPS, config: { damping: 12, stiffness: 120, mass: 0.6, ...cfg }, ...(dur ? { durationInFrames: dur } : {}) });
// a quick punch: up to 1+amp in .1s, then springs back with an overshoot
export const punch = (t, t0, amp = 0.2) => {
  const k = t - t0;
  if (k < 0) return 1;
  if (k < 0.1) return 1 + amp * (k / 0.1);
  return 1 + amp * (1 - spr(t, t0 + 0.1, { damping: 7, stiffness: 170, mass: 0.5 }));
};

export function timing(WORDS) {
  const SC = {};
  let tc = START0;
  ORDER.forEach((id, i) => {
    const w = WORDS[id];
    SC[id] = { id, i, start: tc, words: w, end: tc + w[w.length - 1][1] + w[w.length - 1][2] };
    tc = SC[id].end + GAP;
  });
  const ZOOM_AT = SC.sky.end + 1.0, ZOOM_DUR = 2.6;
  return { SC, ZOOM_AT, ZOOM_DUR, TOTAL: ZOOM_AT + ZOOM_DUR + 2.6 };
}

export function buildFilm(L, WORDS, measure) {
  const W = L === 'h' ? 1920 : 1080, H = L === 'h' ? 1080 : 1920;
  const P = (h, v) => (L === 'h' ? h : v);
  const { SC, ZOOM_AT, ZOOM_DUR, TOTAL } = timing(WORDS);
  const GX = W + 160, GY = H + 160;
  const CELL = [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [2, 1], [1, 1], [0, 1]];
  const cellOrigin = (i) => [CELL[i][0] * GX, CELL[i][1] * GY];
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const jit = (a) => (rnd() - 0.5) * 2 * a;
  // hand-drawn geometry
  const line = (x1, y1, x2, y2, j = 3) => { const mx = (x1 + x2) / 2 + jit(j), my = (y1 + y2) / 2 + jit(j); return `M${x1 + jit(j / 2)},${y1 + jit(j / 2)} Q${mx},${my} ${x2 + jit(j / 2)},${y2 + jit(j / 2)}`; };
  const rrect = (x, y, w, h, j = 4) => {
    const p = [[x + jit(j), y + jit(j)], [x + w + jit(j), y + jit(j)], [x + w + jit(j), y + h + jit(j)], [x + jit(j), y + h + jit(j)], [x + jit(j) + 6, y + jit(j) - 2]];
    let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
    for (let i = 1; i < p.length; i++) { const a = p[i - 1], b = p[i]; d += ` Q${((a[0] + b[0]) / 2 + jit(j)).toFixed(1)},${((a[1] + b[1]) / 2 + jit(j)).toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)}`; }
    return d;
  };
  const ellipse = (cx, cy, rx, ry, j = 0.04, turn = 1.08) => { let d = ''; const n = 40; for (let i = 0; i <= n * turn; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; const r = 1 + jit(j); d += (i ? ' L' : 'M') + (cx + Math.cos(a) * rx * r).toFixed(1) + ',' + (cy + Math.sin(a) * ry * r).toFixed(1); } return d; };
  const arrowD = (x1, y1, x2, y2, bend = 40) => { const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy); const nx = -dy / l, ny = dx / l; const cx = mx + nx * bend, cy = my + ny * bend; const a = Math.atan2(y2 - cy, x2 - cx); const h = 28; return `M${x1},${y1} Q${cx},${cy} ${x2},${y2} M${x2 - h * Math.cos(a - 0.45)},${y2 - h * Math.sin(a - 0.45)} L${x2},${y2} L${x2 - h * Math.cos(a + 0.45)},${y2 - h * Math.sin(a + 0.45)}`; };
  const tickD = (x, y, s = 1) => `M${x},${y} L${x + 18 * s},${y + 22 * s} L${x + 56 * s},${y - 30 * s}`;

  // ---------- builder ----------
  const ITEMS = [], SCENES = [], POPS = [];
  let S = null, stack = null, gstack = [], uid = 0;
  const scene = (id) => {
    S = SC[id];
    const [ox, oy] = cellOrigin(S.i);
    Object.assign(S, { ox, oy, back: [], front: [] });
    stack = [S.front]; gstack = [null];
    SCENES.push(S);
    return S;
  };
  // word lookups bound to a scene, so effects timed lazily still read their own scene
  const wq = (sc) => (word, occ = 1) => { let n = 0; for (const x of sc.words) if (x[0] === word && ++n === occ) return sc.start + x[1]; throw new Error(`word ${word} ${occ} in ${sc.id}`); };
  const wqe = (sc) => (word, occ = 1) => { let n = 0; for (const x of sc.words) if (x[0] === word && ++n === occ) return sc.start + x[1] + x[2]; throw new Error(`word ${word} in ${sc.id}`); };
  const addNode = (node, back) => { node.id = uid++; node.scene = S; node.grp = gstack[gstack.length - 1]; (back ? S.back : stack[stack.length - 1]).push(node); return node; };
  const group = (anim, fn, o = {}) => {
    const g = addNode({ type: 'group', anim, children: [] }, o.back);
    stack.push(g.children); gstack.push(g); fn(g); stack.pop(); gstack.pop();
    return g;
  };
  const fx = (render, o = {}) => addNode({ type: 'fx', render }, o.back);
  const pop = (t, kind = 'pop') => POPS.push({ t, kind });

  function write(txt, x, y, o = {}) {
    const size = o.size || 64, bold = !!o.bold;
    const wd = measure(txt, size, bold);
    const anchor = o.anchor || 'start';
    const x0 = anchor === 'middle' ? x - wd / 2 : anchor === 'end' ? x - wd : x;
    const bb = { x: x0, y: y - size * 0.95, width: wd, height: size * 1.3 };
    const dur = o.dur || clamp(txt.length * 0.055, 0.32, 1.5);
    const it = addNode({ type: 'item', kind: 'write', txt, x, y, size, bold, color: o.color || NAVY, anchor, rot: o.rot || 0, bb, t0: o.t, t1: o.t + dur, emph: o.emph }, o.back);
    it.tip = (p) => {
      const px = bb.x + bb.width * p, py = bb.y + bb.height * 0.58 + Math.sin((p * bb.width) / size * 11) * size * 0.16;
      if (!it.rot) return [px, py];
      const a = (it.rot * Math.PI) / 180, dx = px - x, dy = py - y;
      return [x + dx * Math.cos(a) - dy * Math.sin(a), y + dx * Math.sin(a) + dy * Math.cos(a)];
    };
    ITEMS.push(it);
    return it;
  }
  function draw(d, o = {}) {
    const len = getLength(d);
    const b = getBoundingBox(d);
    const dur = o.dur || clamp(len / 900, 0.25, 1.6);
    const it = addNode({ type: 'item', kind: 'draw', d, len, bb: { x: b.x1, y: b.y1, width: b.width, height: b.height }, color: o.color || NAVY, width: o.width || 6, fill: o.fill, fillOpacity: o.fillOpacity ?? 1, opacity: o.opacity ?? 1, t0: o.t, t1: o.t + dur, nopen: !!o.nopen, popOnDone: !!o.pop, emph: o.emph }, o.back);
    it.tip = (p) => { const pt = getPointAtLength(d, clamp(p) * len); return [pt.x, pt.y]; };
    ITEMS.push(it);
    if (o.pop) pop(() => it.t1, 'pop');
    return it;
  }
  const hl = (x1, y, x2, o = {}) => draw(`M${x1},${y} Q${(x1 + x2) / 2},${y + jit(4)} ${x2},${y + jit(3)}`, { back: true, color: o.color || ORANGE, width: o.width || 34, opacity: o.opacity || 0.35, t: o.t, dur: o.dur || 0.45 });
  const underline = (it, o = {}) => { const b = it.bb; return draw(`M${b.x - 6},${b.y + b.height * 0.92} Q${b.x + b.width / 2},${b.y + b.height * 0.98 + jit(5)} ${b.x + b.width + 10},${b.y + b.height * 0.9}`, { color: o.color || ORANGE, width: o.width || 8, t: o.t, dur: o.dur || 0.35 }); };
  const strike = (it, o = {}) => { const b = it.bb; return draw(`M${b.x - 14},${b.y + b.height * 0.6} L${b.x + b.width + 14},${b.y + b.height * 0.45}`, { color: o.color || ORANGE, width: o.width || 9, t: o.t, dur: o.dur || 0.3 }); };
  const tickAfter = (it, o = {}) => { const b = it.bb; return draw(tickD(b.x + b.width + 30, b.y + b.height * 0.55, o.s || 1), { color: o.color || ORANGE, width: 9, t: o.t, dur: 0.3 }); };

  // ---------- effects ----------
  const STAR = 'M0,-1 C.12,-.12 .12,-.12 1,0 C.12,.12 .12,.12 0,1 C-.12,.12 -.12,.12 -1,0 C-.12,-.12 -.12,-.12 0,-1Z';
  function burst(x, y, tAt, o = {}) {
    const n = o.n || 18, colors = o.colors || [ORANGE, NAVY, '#ffb703', SKY], key = `b${uid}`;
    const life = o.life || 1.3, spread = o.spread || 520, g = o.g ?? 900, size = o.size || 14;
    pop(tAt, o.sound || 'sparkle');
    return fx((t) => {
      const t0 = val(tAt), k = t - t0;
      if (k < 0 || k > life) return null;
      return (
        <g>
          {Array.from({ length: n }, (_, i) => {
            const a = (o.angle ?? -Math.PI / 2) + (random(`${key}a${i}`) - 0.5) * (o.cone ?? Math.PI * 2);
            const sp = spread * (0.35 + 0.65 * random(`${key}s${i}`));
            const px = x + Math.cos(a) * sp * k * (1 - k / (life * 2.2));
            const py = y + Math.sin(a) * sp * k * (1 - k / (life * 2.2)) + g * k * k * 0.5;
            const sz = size * (0.6 + random(`${key}z${i}`)) * (1 - k / life * 0.5);
            const op = 1 - Math.pow(k / life, 2);
            const c = colors[i % colors.length];
            const sh = i % 3;
            const rot = random(`${key}r${i}`) * 360 + k * 540;
            return sh === 0 ? <path key={i} d={STAR} transform={`translate(${px},${py}) rotate(${rot}) scale(${sz})`} fill={c} opacity={op} />
              : sh === 1 ? <circle key={i} cx={px} cy={py} r={sz * 0.45} fill={c} opacity={op} />
                : <rect key={i} x={-sz / 2} y={-sz / 4} width={sz} height={sz / 2} rx={2} transform={`translate(${px},${py}) rotate(${rot})`} fill={c} opacity={op} />;
          })}
        </g>
      );
    });
  }
  function twinkle(x, y, tAt, o = {}) {
    const key = `tw${uid}`, s0 = o.s || 22;
    return fx((t) => {
      const t0 = val(tAt);
      if (t < t0) return null;
      const k = t - t0;
      const sc = spr(t, t0, { damping: 9, stiffness: 160 }) * (0.75 + 0.25 * Math.sin(k * 5 + random(key) * 6));
      return <path d={STAR} transform={`translate(${x},${y}) rotate(${k * 40}) scale(${s0 * sc})`} fill={o.color || '#ffb703'} />;
    });
  }
  function pulseRings(x, y, tAt, o = {}) {
    return fx((t) => {
      const t0 = val(tAt);
      if (t < t0) return null;
      const per = 1.3;
      return <g>{[0, 0.5].map((off) => { const k = ((t - t0 + off * per) % per) / per; return <circle key={off} cx={x} cy={y} r={10 + k * (o.r || 46)} fill="none" stroke={ORANGE} strokeWidth={4 * (1 - k)} opacity={1 - k} />; })}</g>;
    });
  }

  // Pip the pebble, as a group that can hop, squash and blink
  function pip(x, y, o = {}) {
    const s = o.s || 1;
    const st = { x, y, hops: [] };
    const g = group((t) => {
      let px = st.x, py = st.y, sx = 1, sy = 1;
      let land = null;
      for (const [ht, hx, hy, hh] of st.hops) {
        if (t >= ht) {
          const q = clamp((t - ht) / 0.5);
          const e = ease(q);
          px = px + (hx - px) * e; py = py + (hy - py) * e - Math.sin(Math.PI * q) * (hh ?? 120);
          if (q < 0.18) { const a = q / 0.18; sx = 1 + 0.12 * Math.sin(Math.PI * a); sy = 1 - 0.14 * Math.sin(Math.PI * a); }
          else if (q < 1) { sx = 0.9; sy = 1.12; }
          if (q >= 1) land = ht + 0.5;
        }
      }
      if (land !== null && t - land < 0.6) { const k = spr(t, land, { damping: 6, stiffness: 220, mass: 0.4 }); sx = 1 + 0.2 * (1 - k); sy = 1 - 0.2 * (1 - k); }
      const bob = Math.sin(t * 3.1) * 3;
      return { x: px, y: py + bob + (1 - sy) * 50 * s, sx: s * sx, sy: s * sy };
    }, () => {
      draw('M-58,18 C-62,-30 -22,-52 8,-50 C44,-48 64,-22 60,14 C56,40 26,50 -4,50 C-36,50 -56,40 -58,18 Z', { t: o.t, dur: 0.7, fill: '#e9e4f2', width: 5 });
      const blaze = draw('M-14,-30 C-4,-36 16,-36 26,-28', { color: ORANGE, width: 12, t: o.t, dur: 0.2 });
      fx((t) => {
        if (t < blaze.t1) return null;
        const op = clamp((t - blaze.t1) / 0.2);
        const bl = (t % 2.9) < 0.12 ? 0.15 : 1;
        return <g opacity={op}><ellipse cx={-14} cy={0} rx={6} ry={6 * bl} fill={NAVY} /><ellipse cx={16} cy={0} rx={6} ry={6 * bl} fill={NAVY} /><path d="M-10,18 Q2,28 14,18" fill="none" stroke={NAVY} strokeWidth={4} strokeLinecap="round" /></g>;
      });
    });
    st.g = g;
    st.hop = (t, nx, ny, hh) => { st.hops.push([t, nx, ny, hh]); pop(t + 0.5, 'boing'); };
    return st;
  }
  // a photo that drops in on a spring, then floats
  function photo(href, x, y, wd, o = {}) {
    const ar = 0.625, ph = wd * ar, hh = ph + 64;
    const cx = x + wd / 2, cy = y + hh / 2, rot = o.rot || 0, tIn = o.t;
    pop(tIn, 'swoosh');
    const g = group((t) => {
      if (t < tIn) return { op: 0 };
      const k = spr(t, tIn, { damping: 11, stiffness: 110, mass: 0.7 });
      const fl = Math.sin(t * 1.4 + x * 0.01) * 4;
      return { y: (1 - k) * 260 + fl * k, rot: rot + (1 - k) * (o.spin ?? 16), sx: 0.75 + 0.25 * k, sy: 0.75 + 0.25 * k, op: clamp(k * 3), origin: [cx, cy] };
    }, () => {
      fx(() => <g><rect x={x - 12} y={y - 12} width={wd + 24} height={hh + 12} fill="#fff" filter="url(#shadow)" /><image href={o.src} x={x} y={y} width={wd} height={ph} preserveAspectRatio="xMidYMin slice" /><rect x={x - 12} y={y - 12} width={wd + 24} height={hh + 12} fill="none" stroke={NAVY} strokeWidth={3} /></g>);
      fx((t) => { const k = spr(t, tIn + 0.35, { damping: 8, stiffness: 200 }); return k <= 0 ? null : <rect x={cx - 50} y={y - 30} width={100} height={34} fill={ORANGE} opacity={0.6} transform={`translate(${cx},${y - 13}) rotate(${o.tapeRot ?? -4}) scale(${k}) translate(${-cx},${-(y - 13)})`} />; });
      o.cap && write(o.cap, cx, y + ph + 50, { size: o.capSize || 38, anchor: 'middle', t: tIn + 0.45, dur: o.capDur || 0.45 });
    });
    g.origin = [cx, cy];
    return { g, x, y, w: wd, ph, hh, tIn };
  }

  // ================= SCENES =================
  // ---------- 1 HOOK ----------
  scene('hook');
  {
    const w = wq(S), wEnd = wqe(S);
    const big = write('3 hours', P(170, 540), P(330, 300), { size: P(200, 190), bold: 1, anchor: P('start', 'middle'), t: 0.04, dur: 0.85 });
    big.emph = { kind: 'punch', t: () => big.t1 + 0.05, amp: 0.12 };
    pop(() => big.t1 + 0.05, 'pop');
    write('from now', P(186, 540), P(450, 410), { size: 80, anchor: P('start', 'middle'), t: w('from'), dur: 0.5, color: SOFT });
    const bx = P(880, 100), by = P(150, 520), bw = P(880, 880), bh = P(630, 660);
    const frame = draw(rrect(bx, by, bw, bh, 4), { t: w('this') - 0.15, dur: 0.45, width: 6 });
    draw(`${line(bx + 4, by + 80, bx + bw - 4, by + 80, 2)} ${ellipse(bx + 45, by + 40, 9, 9, 0.05)} ${ellipse(bx + 75, by + 40, 9, 9, 0.05)} ${ellipse(bx + 105, by + 40, 9, 9, 0.05)}`, { t: w('address') - 0.1, dur: 0.3, width: 5 });
    draw(rrect(bx + 130, by + 20, bw - 260, 42, 2), { t: w('address'), dur: 0.18, width: 4, color: SOFT });
    write('yourname.in', bx + 150, by + 54, { size: 36, bold: 1, t: w('will'), dur: 0.45 });
    const dot = draw(ellipse(bx + bw - 95, by + 41, 11, 11, 0.05), { t: w('internet'), dur: 0.12, width: 5, color: ORANGE, fill: ORANGE });
    pulseRings(bx + bw - 95, by + 41, () => dot.t1);
    write('live', bx + bw - 76, by + 52, { size: 32, bold: 1, color: ORANGE, t: w('internet'), dur: 0.25 });
    burst(bx + bw - 95, by + 41, () => dot.t1 + 0.1, { n: 16, spread: 380, g: 700, size: 12 });
    const hi = write("Hi, I'm You.", bx + 60, by + 200, { size: P(96, 86), bold: 1, t: w('Your'), dur: 0.55 });
    hi.emph = { kind: 'punch', t: () => w('name') + 0.05, amp: 0.08 };
    underline({ bb: { x: hi.bb.x + hi.bb.width * 0.62, y: hi.bb.y, width: hi.bb.width * 0.34, height: hi.bb.height } }, { t: w('name') + 0.1 });
    const cw = (bw - 160) / 3;
    for (let k = 0; k < 3; k++) {
      const cx = bx + 60 + k * (cw + 20), cy = by + P(290, 300);
      draw(`${rrect(cx, cy, cw, P(280, 300), 3)} M${cx + 20},${cy + P(170, 180)} L${cx + cw * 0.35},${cy + P(90, 100)} L${cx + cw * 0.55},${cy + P(140, 150)} L${cx + cw * 0.72},${cy + P(110, 120)} L${cx + cw - 20},${cy + P(170, 180)} M${cx + 20},${cy + P(215, 230)} L${cx + cw - 30},${cy + P(215, 230)} M${cx + 20},${cy + P(245, 262)} L${cx + cw * 0.6},${cy + P(245, 262)}`, { t: w('work') - 0.3 + k * 0.05, dur: 0.3, width: 4, pop: true });
      // sun in each card, rising
      fx((t) => { const t0 = w('work') + 0.3 + k * 0.15; const q = spr(t, t0, { damping: 10 }); return q <= 0 ? null : <circle cx={cx + cw * 0.78} cy={cy + P(70, 80) + (1 - q) * 40} r={16 * q} fill="#ffb703" opacity={0.85} />; });
    }
    const talk = write('talk', P(180, 160), P(700, 1440), { size: 120, bold: 1, t: w('talking') - 0.1, dur: 0.45 });
    const tk = tickAfter(talk, { t: wEnd('talking'), s: 1.3 });
    burst(talk.bb.x + talk.bb.width + 70, talk.bb.y + 50, () => tk.t1, { n: 12, spread: 300, size: 11, colors: [ORANGE, '#ffb703'] });
    const code = write('code', P(180, 610), P(880, 1440), { size: 120, bold: 1, t: w('not'), dur: 0.45, color: SOFT });
    const sk = strike(code, { t: w('coding') + 0.05, dur: 0.25 });
    code.emph = { kind: 'shake', t: () => sk.t1 };
  }
  // ---------- 2 SAND ----------
  scene('sand');
  {
    const w = wq(S), wEnd = wqe(S);
    const cx = P(480, 540), base = P(700, 600), s = P(1, 0.9);
    const X = (v) => cx + v * s, Y = (v) => base + v * s;
    const castle = `M${X(-220)},${Y(0)} Q${X(0)},${Y(-30)} ${X(220)},${Y(0)} M${X(-150)},${Y(-12)} L${X(-150)},${Y(-180)} L${X(-120)},${Y(-180)} L${X(-120)},${Y(-205)} L${X(-95)},${Y(-205)} L${X(-95)},${Y(-180)} L${X(-60)},${Y(-180)} L${X(-60)},${Y(-110)} L${X(60)},${Y(-110)} L${X(60)},${Y(-180)} L${X(95)},${Y(-180)} L${X(95)},${Y(-205)} L${X(120)},${Y(-205)} L${X(120)},${Y(-180)} L${X(150)},${Y(-180)} L${X(150)},${Y(-12)} M${X(-30)},${Y(-110)} L${X(-30)},${Y(-260)} L${X(30)},${Y(-260)} L${X(30)},${Y(-110)} M${X(0)},${Y(-260)} L${X(0)},${Y(-330)} L${X(50)},${Y(-310)} L${X(0)},${Y(-295)} M${X(-22)},${Y(-12)} Q${X(0)},${Y(-60)} ${X(22)},${Y(-12)}`;
    let wave;
    const washAt = () => wave.t1;
    group((t) => {
      const k = clamp((t - washAt()) / 1.1);
      const e = easeOut(k);
      return { origin: [cx, base], y: 30 * e, rot: -5 * e, sx: 1 + 0.06 * e, sy: 1 - 0.25 * e, op: 1 - 0.6 * e };
    }, () => { draw(castle, { t: w('Most'), dur: 1.3, width: 6, color: SAND, fill: '#f6e7cf', fillOpacity: 0.7 }); });
    const t1 = write('sandcastle', cx, P(250, 190), { size: P(84, 80), bold: 1, anchor: 'middle', t: w('built'), dur: 0.6 });
    write('app builder', cx, P(800, 735), { size: 60, anchor: 'middle', t: w('app'), dur: 0.5, color: SOFT });
    const nv = write('never changes', cx, P(880, 812), { size: 54, anchor: 'middle', t: w('never'), dur: 0.55, color: SOFT });
    nv.emph = { kind: 'wiggle', t: () => nv.t1 };
    group((t) => { const k = clamp((t - (wave ? wave.t1 : 1e9)) / 0.3); return { x: Math.sin(t * 4) * 18 * k, y: Math.sin(t * 2.3) * 5 * k, origin: [cx, base] }; }, () => {
      wave = draw(`M${X(-260)},${Y(40)} q40,-40 80,0 t80,0 t80,0 t80,0 t80,0 t80,0 t80,0`, { t: w("That's"), dur: 0.55, width: 8, color: SKY });
    });
    burst(X(0), Y(20), () => wave.t1 + 0.1, { n: 22, colors: [SKY, '#9cc6f0', '#ffffff'], spread: 420, g: 1300, size: 12, cone: Math.PI * 0.9, sound: 'splash' });
    strike(t1, { t: w('sandcastle') + 0.35, width: 8 });
    const hx = P(1400, 540), hb = P(700, 1560);
    const ax1 = P(800, 540), ay1 = P(520, 880), ax2 = P(1080, 540), ay2 = P(520, 1000);
    draw(arrowD(ax1, ay1, ax2, ay2, P(-50, 50)), { t: w('Today'), dur: 0.45, width: 6, color: ORANGE });
    const hw = 300, hh = 210;
    const house = `M${hx - hw / 2},${hb} L${hx - hw / 2},${hb - hh} L${hx},${hb - hh - 150} L${hx + hw / 2},${hb - hh} L${hx + hw / 2},${hb} Z M${hx - 30},${hb} L${hx - 30},${hb - 100} L${hx + 30},${hb - 100} L${hx + 30},${hb} M${hx - 110},${hb - 150} h50 v50 h-50 z M${hx + 60},${hb - 150} h50 v50 h-50 z M${hx + 70},${hb - hh - 80} v-60 h40 v100`;
    const hs = draw(house, { t: w('house') - 0.2, dur: 0.7, width: 6, fill: '#fff3e8', pop: true });
    // windows light up, chimney smoke
    fx((t) => { const k = clamp((t - hs.t1 - 0.3) / 0.4); return k <= 0 ? null : <g opacity={k}><rect x={hx - 107} y={hb - 147} width={44} height={44} fill="#ffd166" /><rect x={hx + 63} y={hb - 147} width={44} height={44} fill="#ffd166" /></g>; }, { back: true });
    fx((t) => {
      const t0 = hs.t1 + 0.2; if (t < t0) return null;
      return <g>{[0, 1, 2].map((i) => { const k = (((t - t0) / 2.2) + i / 3) % 1; return <circle key={i} cx={hx + 90 + Math.sin(k * 6 + i) * 14} cy={hb - hh - 150 - k * 160} r={12 + k * 26} fill="none" stroke={SOFT} strokeWidth={4} opacity={(1 - k) * 0.7 * clamp((t - t0) / 0.5)} />; })}</g>;
    });
    const t2 = write('house', hx, P(250, 1040), { size: P(84, 80), bold: 1, anchor: 'middle', t: w('one', 1), dur: 0.4 });
    t2.emph = { kind: 'punch', t: () => t2.t1 + 0.02, amp: 0.15 };
    const room = draw(`M${hx + hw / 2},${hb} L${hx + hw / 2 + 160},${hb} L${hx + hw / 2 + 160},${hb - 150} L${hx + hw / 2},${hb - 150} M${hx + hw / 2 + 40},${hb - 110} h50 v50 h-50 z`, { t: w('adding'), dur: 0.45, width: 6, color: ORANGE, pop: true });
    write('+ room', hx + hw / 2 + 80, hb + P(60, 70), { size: 44, anchor: 'middle', color: ORANGE, bold: 1, t: w('rooms'), dur: 0.3 });
    twinkle(hx + hw / 2 + 190, hb - 190, () => room.t1, { s: 20 });
    twinkle(hx - hw / 2 - 40, hb - 260, () => room.t1 + 0.2, { s: 16, color: ORANGE });
  }
  // ---------- 3 STEPS ----------
  scene('steps');
  {
    const w = wq(S), wEnd = wqe(S);
    write('The plan', P(960, 540), P(160, 190), { size: 96, bold: 1, anchor: 'middle', t: w("Here's"), dur: 0.5 });
    const st = L === 'h' ? [[230, 470], [590, 540], [960, 470], [1330, 540], [1690, 470]] : [[310, 420], [310, 700], [310, 980], [310, 1260], [310, 1540]];
    const nums = ['One', 'Two', 'Three', 'Four', 'five'];
    const lab = [['idea.md', 'one page'], ['Claude', 'interview + research'], ['3 docs', 'concept · tech · plan'], ['Claude Code', 'one phase per session'], ['ship', '']];
    const pp = pip(st[0][0] - P(0, 190), st[0][1] - P(140, 0), { t: w("Here's") + 0.45, s: 0.95 });
    st.forEach(([x, y], k) => {
      const t = w(nums[k]);
      if (k > 0) { const [px, py] = st[k - 1]; const d = L === 'h' ? `M${px + 100},${py} Q${(px + x) / 2},${(py + y) / 2 - 60} ${x - 100},${y}` : `M${px + jit(4)},${py + 82} L${x + jit(4)},${y - 82}`; draw(d, { t: t - 0.3, dur: 0.22, width: 4, color: SOFT, back: true }); }
      const stone = draw(ellipse(x, y, 95, P(68, 66), 0.05), { t, dur: 0.35, width: 6, fill: k === 4 ? '#ffe6d6' : '#eef0fa', pop: true });
      const num = write(String(k + 1), x, y + 28, { size: 80, bold: 1, anchor: 'middle', t: t + 0.3, dur: 0.2, color: k === 4 ? ORANGE : NAVY });
      num.emph = { kind: 'punch', t: () => num.t1, amp: 0.3 };
      if (k > 0) pp.hop(t + 0.1, x - P(0, 190), y - P(140, 0), P(120, 70));
      const lx = L === 'h' ? x : x + 135, anc = L === 'h' ? 'middle' : 'start', ly = L === 'h' ? y + 130 : y + 5;
      write(lab[k][0], lx, ly, { size: P(48, 58), bold: 1, anchor: anc, t: t + 0.5, dur: 0.4 });
      if (k < 4) write(lab[k][1], lx, ly + P(52, 56), { size: P(36, 42), anchor: anc, t: t + 0.95, dur: 0.6, color: SOFT });
      void stone;
    });
    const [x, y] = st[4];
    const lx = L === 'h' ? x : x + 135, anc = L === 'h' ? 'middle' : 'start', ly = (L === 'h' ? y + 130 : y + 5) + P(52, 56);
    write('GitHub', lx, ly, { size: P(38, 42), anchor: anc, t: w('GitHub'), dur: 0.35, color: SOFT });
    write('Cloudflare', lx, ly + P(44, 50), { size: P(38, 42), anchor: anc, t: w('Cloudflare'), dur: 0.4, color: SOFT });
    const dm = write('your domain', lx, ly + P(88, 100), { size: P(38, 42), anchor: anc, t: w('domain') - 0.2, dur: 0.4, color: ORANGE, bold: 1 });
    const ud = underline(dm, { t: wEnd('domain') - 0.2, dur: 0.25 });
    burst(x, y - 20, () => ud.t1, { n: 26, spread: 560, size: 14, sound: 'confetti' });
  }
  // ---------- 4 BRING ----------
  scene('bring');
  {
    const w = wq(S), wEnd = wqe(S);
    write('Bring', P(960, 540), P(170, 190), { size: 100, bold: 1, anchor: 'middle', t: w('What'), dur: 0.45 });
    const items = [['a laptop', 'laptop'], ['a free GitHub account', 'GitHub'], ['a folder of your stuff', 'folder'], ['curiosity', 'curiosity']];
    const x0 = P(170, 110), y0 = P(330, 340), dy = P(140, 125);
    items.forEach(([txt, word], k) => {
      const y = y0 + k * dy, t = w(word) - 0.25;
      draw(rrect(x0, y - 50, 60, 60, 3), { t, dur: 0.25, width: 5 });
      const it = write(txt, x0 + 95, y, { size: P(64, 58), bold: k === 2, t: t + 0.05, dur: 0.55, color: k === 3 ? ORANGE : NAVY });
      const tk = draw(tickD(x0 + 8, y - 22, 1), { t: it.t1, dur: 0.2, width: 8, color: ORANGE, pop: true });
      burst(x0 + 40, y - 30, () => tk.t1, { n: 8, spread: 200, size: 9, g: 500, colors: [ORANGE, '#ffb703'], sound: 'tick' });
      if (k === 2) {
        hl(x0 + 90, y - 18, it.bb.x + it.bb.width + 10, { t: wEnd('stuff') });
        const m = write('a must!', it.bb.x + it.bb.width + 30, y - 6, { size: 44, color: ORANGE, bold: 1, t: wEnd('stuff') + 0.3, dur: 0.3, rot: -6 });
        m.emph = { kind: 'wiggle', t: () => m.t1 };
      }
      if (k === 3) it.emph = { kind: 'punch', t: () => it.t1, amp: 0.12 };
    });
    // folder: the stuff rises out of it on springs
    const fx0 = P(1180, 190), fy = P(390, 920), fw = P(540, 700), fh = P(400, 470);
    const rise = (tAt) => (t) => { const t0 = val(tAt); if (t < t0) return { y: 0 }; const k = spr(t, t0, { damping: 9, stiffness: 120 }); return { y: (1 - k) * 120 - Math.sin(t * 2 + t0) * 4 * k }; };
    let fold;
    const tFold = () => fold.t1 + 0.1;
    group(rise(() => Math.max(w('photos') - 0.1, tFold())), () => {
      draw(`${rrect(fx0 + 40, fy - 90, 180, 130, 3)} M${fx0 + 55},${fy + 20} L${fx0 + 112},${fy - 38} L${fx0 + 148},${fy - 5} L${fx0 + 175},${fy - 25} L${fx0 + 205},${fy + 20}`, { t: Math.max(w('photos') - 0.1, 0), dur: 0.4, width: 4, color: SOFT, fill: '#fff' });
    }, { back: true });
    group(rise(() => Math.max(w('projects'), tFold())), () => {
      draw(`${rrect(fx0 + fw * 0.42, fy - 120, 150, 190, 3)} M${fx0 + fw * 0.42 + 25},${fy - 80} h100 M${fx0 + fw * 0.42 + 25},${fy - 50} h90 M${fx0 + fw * 0.42 + 25},${fy - 20} h70`, { t: w('projects') - 0.05, dur: 0.45, width: 4, color: SOFT, fill: '#fff' });
    }, { back: true });
    group(rise(() => Math.max(w('about'), tFold())), () => {
      draw(rrect(fx0 + fw * 0.72, fy - 70, 130, 120, 3), { t: w('lines') - 0.1, dur: 0.25, width: 4, color: ORANGE, fill: '#fff1e4' });
      write('me', fx0 + fw * 0.72 + 65, fy - 5, { size: 46, bold: 1, anchor: 'middle', color: ORANGE, t: w('about'), dur: 0.2 });
    }, { back: true });
    fold = draw(`M${fx0},${fy + fh} L${fx0},${fy - 10} L${fx0 + fw * 0.3},${fy - 10} L${fx0 + fw * 0.36},${fy + 30} L${fx0 + fw},${fy + 30} L${fx0 + fw},${fy + fh} Z`, { t: w('folder') + 0.25, dur: 0.7, width: 6, fill: '#fff6df', fillOpacity: 0.95, pop: true });
    const aq = write('Ask questions.', P(680, 540), P(980, 1580), { size: P(60, 76), anchor: 'middle', bold: 1, color: ORANGE, t: w('Ask'), dur: 0.45, rot: -2 });
    aq.emph = { kind: 'punch', t: () => aq.t1, amp: 0.12 };
    const bt = write('Break things.', P(1260, 540), P(985, 1690), { size: P(60, 76), anchor: 'middle', bold: 1, color: ORANGE, t: w('Break'), dur: 0.45, rot: -2 });
    bt.emph = { kind: 'shake', t: () => bt.t1 };
  }
  // ---------- 5 GET ----------
  scene('get');
  {
    const w = wq(S), wEnd = wqe(S);
    write('You walk out with', P(960, 540), P(170, 190), { size: P(92, 84), bold: 1, anchor: 'middle', t: w('In') - 0.1, dur: 0.55 });
    // a rubber stamp that slams down
    const sx = P(1760, 880), sy = P(150, 1720), tStamp = w('you') + 0.05;
    pop(tStamp + 0.12, 'stamp');
    group((t) => { if (t < tStamp) return { op: 0 }; const k = spr(t, tStamp, { damping: 10, stiffness: 260, mass: 0.6 }); return { origin: [sx, sy - 28], sx: 2.6 - 1.6 * k, sy: 2.6 - 1.6 * k, rot: -18 + 12 * k, op: clamp(k * 4) }; }, () => {
      fx(() => <g><path d={ellipse(sx, sy - 28, P(105, 130), P(62, 78), 0.06)} fill="none" stroke={ORANGE} strokeWidth={7} /><text x={sx} y={sy} fontFamily="Kalam" fontWeight={700} fontSize={P(56, 70)} fill={ORANGE} textAnchor="middle">3 hrs</text></g>);
    });
    const cards = L === 'h' ? [[140, 300], [560, 300], [980, 300], [1400, 300]].map(([x, y]) => [x, y, 380, 420]) : [[90, 330], [570, 330], [90, 900], [570, 900]].map(([x, y]) => [x, y, 420, 520]);
    const spec = [['live', 'a live site', 'on your domain'], ['prompt', 'a prompt pack', 'copy, paste, go'], ['templates', 'templates', 'five, ready'], ['better', 'a way to grow', 'better every day']];
    cards.forEach(([x, y, cw, ch], k) => {
      const t = w(spec[k][0]) - 0.15, cx = x + cw / 2, cy = y + ch * 0.38;
      const card = draw(rrect(x, y, cw, ch, 4), { t: t - 0.1, dur: 0.3, width: 5, color: k === 3 ? ORANGE : NAVY, pop: true });
      if (k === 0) {
        draw(`${ellipse(cx, cy, 80, 80, 0.03)} M${cx - 80},${cy} L${cx + 80},${cy}`, { t: card.t1, dur: 0.3, width: 5 });
        // spinning meridians
        fx((t) => { const t0 = card.t1 + 0.3; if (t < t0) return null; const op = clamp((t - t0) / 0.3); return <g opacity={op} fill="none" stroke={NAVY} strokeWidth={5}>{[0, 1].map((j) => { const ph = (t - t0) * 1.6 + j * Math.PI / 2; const rx = Math.abs(Math.cos(ph)) * 78; return <ellipse key={j} cx={cx} cy={cy} rx={Math.max(rx, 2)} ry={80} />; })}<path d={`M${cx - 70},${cy - 38} Q${cx},${cy - 30} ${cx + 70},${cy - 38} M${cx - 70},${cy + 38} Q${cx},${cy + 30} ${cx + 70},${cy + 38}`} /></g>; });
      }
      if (k === 1) {
        draw(`${rrect(cx - 95, cy - 70, 190, 140, 3)} M${cx - 65},${cy - 25} L${cx - 35},${cy} L${cx - 65},${cy + 25}`, { t: card.t1, dur: 0.35, width: 5 });
        fx((t) => { const t0 = card.t1 + 0.35; if (t < t0) return null; const on = Math.floor((t - t0) * 2.4) % 2 === 0; return on ? <rect x={cx - 20} y={cy + 20} width={60} height={9} rx={3} fill={NAVY} /> : null; });
      }
      if (k === 2) {
        group((t) => { const t0 = card.t1 + 0.45; const kk = spr(t, t0, { damping: 9, stiffness: 140 }); return { origin: [cx - 20, cy + 70], rot: -10 * kk, x: 14 * kk }; }, () => { draw(`${rrect(cx - 55, cy - 80, 120, 150, 3)}`, { t: card.t1, dur: 0.25, width: 5, fill: '#fff' }); }, { back: false });
        draw(`${rrect(cx - 80, cy - 60, 120, 150, 3)} M${cx - 60},${cy - 20} h80 M${cx - 60},${cy + 10} h70 M${cx - 60},${cy + 40} h50`, { t: card.t1 + 0.2, dur: 0.35, width: 5, fill: '#fff' });
      }
      if (k === 3) {
        draw(`M${cx - 90},${cy + 70} L${cx + 95},${cy + 70} M${cx - 90},${cy + 70} L${cx - 90},${cy - 80}`, { t: card.t1, dur: 0.2, width: 5, color: ORANGE });
        // bars grow
        fx((t) => { const t0 = card.t1 + 0.2; return <g>{[0, 1, 2, 3].map((j) => { const kk = spr(t, t0 + j * 0.12, { damping: 10, stiffness: 140 }); const h = (30 + j * 35) * kk; return <rect key={j} x={cx - 72 + j * 42} y={cy + 66 - h} width={28} height={h} rx={4} fill={ORANGE} opacity={0.75} />; })}</g>; }, { back: true });
        const ar = draw(`M${cx - 75},${cy + 30} L${cx - 30},${cy - 5} L${cx + 10},${cy + 10} L${cx + 75},${cy - 65} M${cx + 40},${cy - 68} L${cx + 78},${cy - 68} L${cx + 78},${cy - 30}`, { t: card.t1 + 0.55, dur: 0.35, width: 6, color: NAVY });
        twinkle(cx + 95, cy - 90, () => ar.t1, { s: 18 });
      }
      write(spec[k][1], cx, y + ch * 0.75, { size: P(46, 50), bold: 1, anchor: 'middle', t: t + 0.45, dur: 0.32 });
      const sub = write(spec[k][2], cx, y + ch * 0.75 + P(54, 60), { size: P(36, 40), anchor: 'middle', color: k === 3 ? ORANGE : SOFT, t: t + 0.75, dur: 0.3, bold: k === 3 });
      if (k === 3) { const u = underline(sub, { t: wEnd('day') - 0.1 }); burst(cx, y + ch * 0.75, () => u.t1, { n: 18, spread: 420, size: 12, sound: 'sparkle' }); }
    });
  }
  // ---------- 6 PROOF ----------
  scene('proof');
  {
    const w = wq(S), wEnd = wqe(S);
    write('Built this way', P(960, 540), P(140, 180), { size: P(90, 88), bold: 1, anchor: 'middle', t: w('This'), dur: 0.55 });
    const S5 = L === 'h' ? [[140, 240, 450, -3], [735, 230, 450, 2], [1330, 240, 450, -2], [440, 690, 450, 2.5], [1030, 690, 450, -1.5]] : [[160, 270, 760, -2], [60, 890, 450, 2], [570, 890, 450, -2], [60, 1360, 450, 1.5], [570, 1360, 450, -1.5]];
    const P5 = [['site-home', 'sankettambare.in', 'site'], ['card-desk', 'visiting card', 'visiting'], ['vtbm-desk', 'Vetal Tekdi Birding', 'Vetal'], ['runfolio-desk', 'RunFolio', 'RunFolio'], ['psp-desk', 'pumped storage', 'pumped']];
    const made = P5.map(([src, cap, word], k) => { const [x, y, ww, rot] = S5[k]; return photo(`shots/${src}.webp`, x, y, ww, { rot, cap, src: SHOT(src), t: w(word) - 0.35, capSize: L === 'v' && k > 0 ? 34 : 38, spin: k % 2 ? -16 : 16 }); });
    // five theme swatches cascade in
    {
      const c = made[1];
      const names = ['wanderer', 'terminal', 'sahyadri', 'blueprint', 'holographic'];
      const sw = P(78, 74), gp = 10;
      const bx = c.x + c.w / 2 - (5 * sw + 4 * gp) / 2, by = c.y + c.hh + P(22, 24);
      names.forEach((nm, k) => {
        const tt = w('five') + k * 0.1;
        if (k === 0) pop(tt, 'pop');
        fx((t) => { const kk = spr(t, tt, { damping: 9, stiffness: 180 }); if (kk <= 0) return null; const x = bx + k * (sw + gp), cyy = by + sw * 0.315; return <g transform={`translate(${x + sw / 2},${cyy + (1 - kk) * -40}) scale(${kk})`}><image href={SHOT(`theme-${nm}`)} x={-sw / 2} y={-sw * 0.315} width={sw} height={sw * 0.63} preserveAspectRatio="xMidYMid slice" /><rect x={-sw / 2} y={-sw * 0.315} width={sw} height={sw * 0.63} fill="none" stroke={NAVY} strokeWidth={2} /></g>; });
      });
    }
    // RunFolio: a swinging "in progress" tag
    {
      const c = made[3];
      const ax = c.x + c.w - 70, ay = c.y - 4, tt = w('RunFolio') + 0.7;
      pop(tt, 'pop');
      group((t) => { if (t < tt) return { op: 0 }; const k = t - tt; return { origin: [ax, ay], rot: -8 + 22 * Math.exp(-k * 2.2) * Math.cos(k * 9), op: clamp(k * 6) }; }, () => {
        fx(() => <g><rect x={ax - 100} y={ay} width={190} height={50} rx={10} fill={ORANGE} /><text x={ax - 5} y={ay + 35} fontFamily="Kalam" fontSize={30} fontWeight={700} fill="#fff" textAnchor="middle">in progress</text></g>);
      });
    }
  }
  // ---------- 7 SKY ----------
  scene('sky');
  {
    const w = wq(S), wEnd = wqe(S);
    const lim = write('the limit?', P(960, 540), P(220, 250), { size: 120, bold: 1, anchor: 'middle', t: w("what's"), dur: 0.6 });
    lim.emph = { kind: 'wiggle', t: () => lim.t1 };
    // crossed-out words fall off the board
    const fall = (get, ox, oy) => (t) => { const t0 = get(); const k = Math.max(0, t - t0); return { origin: [ox, oy], y: 900 * k * k, x: 60 * k, rot: 40 * k * k, op: 1 - clamp(k / 0.9) }; };
    let s1, s2;
    group(fall(() => s1.t1 + 0.35, P(620, 300), P(420, 450)), () => { const c1 = write('code', P(620, 300), P(420, 450), { size: P(84, 90), anchor: 'middle', color: SOFT, t: w('code') - 0.1, dur: 0.35 }); s1 = strike(c1, { t: wEnd('code') }); });
    group(fall(() => s2.t1 + 0.35, P(1300, 780), P(420, 450)), () => { const c2 = write('tools', P(1300, 780), P(420, 450), { size: P(84, 90), anchor: 'middle', color: SOFT, t: w('tools') - 0.1, dur: 0.35 }); s2 = strike(c2, { t: wEnd('tools') }); });
    let im;
    if (L === 'h') im = write('your imagination', 960, 640, { size: 150, bold: 1, anchor: 'middle', t: w('Only') + 0.05, dur: 1.0 });
    else { write('your', 540, 700, { size: 130, bold: 1, anchor: 'middle', t: w('Only') + 0.05, dur: 0.35 }); im = write('imagination', 540, 860, { size: 140, bold: 1, anchor: 'middle', t: w('your') + 0.15, dur: 0.75 }); }
    im.emph = { kind: 'glow', t: () => im.t1 };
    const ul = underline(im, { t: wEnd('imagination') - 0.05, width: 12 });
    twinkle(im.bb.x - 30, im.bb.y + 20, () => ul.t1, { s: 26 });
    twinkle(im.bb.x + im.bb.width + 30, im.bb.y + 10, () => ul.t1 + 0.15, { s: 20, color: ORANGE });
    twinkle(im.bb.x + im.bb.width * 0.5, im.bb.y - 30, () => ul.t1 + 0.3, { s: 16 });
    // drifting clouds
    const cl = (x, y, s) => `M${x},${y} q${-10 * s},${-40 * s} ${30 * s},${-45 * s} q${20 * s},${-40 * s} ${70 * s},${-15 * s} q${45 * s},${-20 * s} ${60 * s},${25 * s} q${30 * s},${10 * s} ${10 * s},${35 * s} Z`;
    [[P(1540, 780), P(170, 600), 1.3, w('imagination'), 26], [P(1640, 110), P(430, 1170), 0.9, w('So', 2), -34], [P(160, 120), P(150, 120), 0.8, w('So', 2) + 0.2, 20]].forEach(([x, y, s, t0, v]) => {
      group((t) => ({ x: (t - t0) * v * clamp((t - t0) * 2), y: Math.sin(t * 1.3 + x) * 6, op: clamp((t - t0) / 0.4) }), () => { draw(cl(x, y, s), { t: t0, dur: 0.5, width: 5, color: SOFT, fill: '#eef3ff', nopen: true }); });
    });
    // the paper plane rides its trail, then leaves the board
    const trail = L === 'h' ? 'M200,900 C480,1010 760,820 1000,870 S1480,830 1790,600' : 'M120,1560 C330,1620 420,1360 600,1400 S880,1300 980,1020';
    const tr = draw(trail, { t: w('So', 2) + 0.1, dur: 1.1, width: 5, color: ORANGE });
    pop(() => tr.t0, 'whoosh');
    const tlen = getLength(trail);
    fx((t) => {
      if (t < tr.t0) return null;
      const q = clamp((t - tr.t0) / (tr.t1 - tr.t0));
      const e = q;
      const p = getPointAtLength(trail, e * tlen);
      const tg = getTangentAtLength(trail, Math.min(tlen - 0.01, e * tlen));
      const a = Math.atan2(tg.y, tg.x);
      let x = p.x + Math.cos(a) * 30, y = p.y + Math.sin(a) * 30;
      const extra = Math.max(0, t - tr.t1);
      if (extra > 0) { const dd = extra * extra * 1400 + extra * 600; x += Math.cos(a - 0.2) * dd; y += Math.sin(a - 0.2) * dd; }
      const bank = Math.sin(e * Math.PI * 3) * 0.25;
      const sparks = Array.from({ length: 10 }, (_, i) => { const d = Math.max(0, e * tlen - i * 26); const sp = getPointAtLength(trail, d); return <path key={i} d={STAR} transform={`translate(${sp.x + Math.sin(t * 9 + i) * 6},${sp.y + Math.cos(t * 7 + i) * 6}) scale(${(10 - i) * 1.2 * (extra > 0.6 ? 0 : 1)})`} fill={i % 2 ? '#ffb703' : ORANGE} opacity={(1 - i / 10) * (extra > 0 ? clamp(1 - extra * 2) : 1)} />; });
      return <g>{sparks}<g transform={`translate(${x},${y}) rotate(${(a * 180) / Math.PI}) scale(1.6, ${1.6 * (1 - Math.abs(bank) * 0.6)})`}><path d="M-40,-22 L46,0 L-40,22 L-24,0 Z" fill="#fff" stroke={NAVY} strokeWidth={5} strokeLinejoin="round" /><path d="M-24,0 L46,0 M-30,8 L-6,20" fill="none" stroke={NAVY} strokeWidth={4} strokeLinecap="round" /></g></g>;
    });
    const fly = write('fly!', P(250, 160), P(860, 1440), { size: P(70, 76), bold: 1, color: ORANGE, t: w('fly') - 0.1, dur: 0.3, rot: -8 });
    fly.emph = { kind: 'punch', t: () => fly.t1, amp: 0.3 };
    const lb = write("Let's begin!", P(1400, 540), P(1010, 1760), { size: P(100, 110), bold: 1, anchor: 'middle', t: w("Let's") - 0.05, dur: 0.55 });
    lb.emph = { kind: 'punch', t: () => lb.t1, amp: 0.18 };
    burst(lb.bb.x + lb.bb.width / 2, lb.bb.y + 20, () => lb.t1, { n: 40, spread: 700, size: 16, g: 800, sound: 'confetti' });
  }

  // sequence the pen per scene (one marker can only be in one place)
  for (const sc of SCENES) {
    const its = ITEMS.filter((i) => i.scene === sc && !i.nopen).sort((a, b) => a.t0 - b.t0);
    let e = sc.id === 'hook' ? 0 : sc.start + 0.08;
    for (const it of its) { const d = it.t1 - it.t0; it.req = it.t0; if (it.t0 < e + 0.04) { it.t0 = e + 0.04; it.t1 = it.t0 + d; } e = it.t1; }
  }
  const events = ITEMS.filter((i) => !i.nopen).map((i) => ({ t0: +i.t0.toFixed(3), t1: +i.t1.toFixed(3), k: i.kind }));
  const pops = POPS.map((p) => ({ t: +val(p.t).toFixed(3), k: p.kind }));
  return { L, W, H, GX, GY, cellOrigin, SC, SCENES, ITEMS, ZOOM_AT, ZOOM_DUR, TOTAL, events, pops };
}
// the image resolver is injected by the renderer (staticFile in Remotion)
let SHOT = (n) => `shots/${n}.webp`;
export const setShotResolver = (f) => { SHOT = f; };
