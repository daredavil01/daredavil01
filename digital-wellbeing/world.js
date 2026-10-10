// world.js — the living backdrop of The Wanderer's Digital Escape.
//
// A single 2D canvas draws one continuous night, 22:00 → sunrise: the sky
// is a function of the clock, the land is a parallax of procedural layers for
// each world, and a small wanderer walks east carrying a lantern whose light
// is your four meters. The game only talks to it through World.set(),
// World.walk() and World.pulse(); nothing here knows about React.
(function () {
  'use strict';

  // ── tiny maths ──────────────────────────────────────────────────────────────
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const ease = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
  function hash(i, s) {
    let h = Math.imul((i | 0) ^ Math.imul(s | 0, 0x27d4eb2d), 0x9e3779b1);
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(s, x) {
    const i = Math.floor(x), f = x - i;
    return lerp(hash(i, s), hash(i + 1, s), smooth(f));
  }
  const fbm = (s, x) => vnoise(s, x) * 0.62 + vnoise(s + 9, x * 2.13) * 0.26 + vnoise(s + 17, x * 4.7) * 0.12;
  const ridged = (s, x) => {
    const n = 1 - Math.abs(vnoise(s, x) * 2 - 1);
    return n * n * 0.7 + vnoise(s + 5, x * 2.7) * 0.3;
  };

  // colours as [r,g,b]
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const rgb = (c, a) => (a === undefined ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`);
  const INK = hex('#03040a');

  // The night, keyed by minutes after 22:00: sky top, middle, horizon, stars.
  const SKY = [
    [0, '#06050f', '#0e0c22', '#1d1838', 1],
    [120, '#020309', '#070a1a', '#121731', 1],
    [270, '#03030b', '#0b0a1f', '#1b1736', 1],
    [360, '#040a1d', '#0f1a3b', '#28335f', 0.9],
    [425, '#0b1834', '#2a3b67', '#8b7088', 0.6],
    [455, '#16294b', '#4c5b86', '#d99c7f', 0.32],
    [490, '#2b5691', '#b98b86', '#ffc690', 0.06],
    [530, '#4a84c1', '#f0b07f', '#ffe7be', 0],
  ].map(([m, a, b, c, s]) => ({ m, top: hex(a), mid: hex(b), hor: hex(c), stars: s }));

  function skyAt(min) {
    let i = 0;
    while (i < SKY.length - 2 && SKY[i + 1].m < min) i++;
    const a = SKY[i], b = SKY[i + 1];
    const t = clamp((min - a.m) / (b.m - a.m), 0, 1);
    return { top: mix(a.top, b.top, t), mid: mix(a.mid, b.mid, t), hor: mix(a.hor, b.hor, t), stars: lerp(a.stars, b.stars, t) };
  }

  // Per-world tint: horizon glow, star visibility, fog
  const BIOMES = {
    intro: { glow: [hex('#6d4bd1'), 0.28], glow2: null, stars: 0.18, tint: hex('#2a1f4a') },
    swamp: { glow: [hex('#2f8a57'), 0.26], glow2: null, stars: 0.55, tint: hex('#16382a') },
    arcade: { glow: [hex('#d02bb5'), 0.4], glow2: [hex('#18b4e0'), 0.25], stars: 0.15, tint: hex('#3a0f45') },
    city: { glow: [hex('#3d6fd6'), 0.3], glow2: null, stars: 0.3, tint: hex('#18284d') },
    trail: { glow: null, glow2: null, stars: 1, tint: null },
    beach: { glow: null, glow2: null, stars: 1, tint: null },
  };

  const METER_RGB = { focus: hex('#7dd3fc'), dopamine: hex('#fbbf6a'), oneness: hex('#c4b5fd'), tranquility: hex('#86efac') };

  // ── state ───────────────────────────────────────────────────────────────────
  const S = {
    canvas: null, ctx: null, w: 1, h: 1, dpr: 1, running: false, raf: 0, last: 0, t: 0,
    reduced: false,
    mode: 'title',
    biome: 'beach', pending: null, haze: 0, hazeDir: 0,
    time: 410, timeTarget: 410,
    light: { focus: 30, dopamine: 40, oneness: 25, tranquility: 20 },
    lightTarget: { focus: 30, dopamine: 40, oneness: 25, tranquility: 20 },
    ghost: 0, ghostTarget: 0,
    boss: 0, bossTarget: 0,
    lean: 0, leanTarget: 0,
    lamp: 1, lampTarget: 1, // 0 = phone glow, 1 = lantern
    pulse: 0, pulseColor: hex('#ffffff'),
    cam: 0, speed: 0, speedTarget: 0, walkUntil: 0, running_: false,
    phase: 0,
    px: 0, py: 0, pxT: 0, pyT: 0,
    dim: 0, dimTarget: 0,
    stars: [], motes: [], birds: [], gulls: [], hearts: [], shoot: null,
    grain: null,
  };

  // ── setup ───────────────────────────────────────────────────────────────────
  function mount(canvas) {
    S.canvas = canvas;
    S.ctx = canvas.getContext('2d', { alpha: false });
    const mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    S.reduced = !!(mq && mq.matches);
    if (mq && mq.addEventListener) mq.addEventListener('change', (e) => (S.reduced = e.matches));
    resize();
    addEventListener('resize', resize);
    addEventListener('pointermove', (e) => {
      S.pxT = (e.clientX / S.w) * 2 - 1;
      S.pyT = (e.clientY / S.h) * 2 - 1;
    }, { passive: true });
    document.addEventListener('visibilitychange', () => (document.hidden || S.sleeping ? stop() : start()));
    makeStars();
    makeGrain();
    start();
  }

  function resize() {
    const c = S.canvas;
    S.w = c.clientWidth || innerWidth;
    S.h = c.clientHeight || innerHeight;
    const small = S.w * S.h < 600000;
    S.dpr = Math.min(window.devicePixelRatio || 1, small ? 1.75 : 1.5);
    c.width = Math.round(S.w * S.dpr);
    c.height = Math.round(S.h * S.dpr);
    makeMotes();
  }

  function makeStars() {
    S.stars = [];
    for (let i = 0; i < 260; i++) {
      S.stars.push({ x: hash(i, 3), y: Math.pow(hash(i, 4), 1.6), r: 0.4 + hash(i, 5) * 1.1, tw: hash(i, 6) * TAU, sp: 0.6 + hash(i, 7) * 2 });
    }
  }

  function makeMotes() {
    const n = Math.round(clamp((S.w * S.h) / 26000, 24, 70));
    S.motes = [];
    for (let i = 0; i < n; i++) {
      S.motes.push({ x: Math.random(), y: Math.random(), d: 0.3 + Math.random() * 1.2, ph: Math.random() * TAU, s: Math.random() });
    }
  }

  function makeGrain() {
    const g = document.createElement('canvas');
    g.width = g.height = 128;
    const x = g.getContext('2d');
    const img = x.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    // composited by the browser, not redrawn every frame
    const fx = document.createElement('div');
    fx.className = 'world-fx';
    fx.setAttribute('aria-hidden', 'true');
    fx.style.setProperty('--grain', `url(${g.toDataURL()})`);
    S.canvas.after(fx);
  }

  function start() {
    if (S.running || !S.ctx || S.sleeping) return;
    S.running = true;
    S.last = performance.now();
    S.raf = requestAnimationFrame(frame);
  }
  function stop() {
    S.running = false;
    cancelAnimationFrame(S.raf);
  }

  // ── public API ──────────────────────────────────────────────────────────────
  function toMinutes(hhmm) {
    const [h, m] = String(hhmm).split(':').map(Number);
    return ((h + 2) % 24) * 60 + m; // minutes after 22:00
  }

  function set(o) {
    if (!o) return;
    if (o.mode) S.mode = o.mode;
    if (o.time !== undefined) {
      S.timeTarget = typeof o.time === 'string' ? toMinutes(o.time) : o.time;
      if (o.instant || S.reduced) S.time = S.timeTarget;
    }
    if (o.biome && o.biome !== S.biome && o.biome !== S.pending) {
      if (o.instant) { S.biome = o.biome; S.pending = null; S.haze = 0; S.hazeDir = 0; }
      else { S.pending = o.biome; S.hazeDir = 1; }
    }
    if (o.light) S.lightTarget = Object.assign({}, S.lightTarget, o.light);
    if (o.instant && o.light) S.light = Object.assign({}, S.lightTarget);
    if (o.ghost !== undefined) S.ghostTarget = o.ghost ? 1 : 0;
    if (o.boss !== undefined) S.bossTarget = o.boss ? 1 : 0;
    if (o.lean !== undefined) S.leanTarget = clamp(o.lean, -1, 1);
    if (o.lamp !== undefined) { S.lampTarget = o.lamp === 'phone' ? 0 : 1; if (o.instant) S.lamp = S.lampTarget; }
    if (o.dim !== undefined) S.dimTarget = o.dim;
    if (o.sleep !== undefined) {
      S.sleeping = !!o.sleep;
      if (S.sleeping) stop();
      else if (!document.hidden) start();
    }
    if (o.running !== undefined) {
      S.running_ = !!o.running;
      S.speedTarget = o.running ? 1.7 : 0;
    }
  }

  function walk(seconds, speed) {
    const now = performance.now();
    S.walkUntil = Math.max(S.walkUntil, now + (seconds || 2) * 1000);
    S.speedTarget = Math.max(S.speedTarget, speed || 1);
    if (S.reduced) S.cam += 260 * (seconds || 2);
  }

  function pulse(color) {
    S.pulse = 1;
    S.pulseColor = hex(color || '#ffffff');
  }

  // ── geometry helpers ────────────────────────────────────────────────────────
  function layout() {
    const portrait = S.h > S.w * 1.05;
    const L = { portrait };
    if (S.mode === 'end') {
      L.horizon = S.h * (portrait ? 0.4 : 0.6);
      L.ground = S.h * (portrait ? 0.52 : 0.84);
      L.heroX = S.w * 0.5;
    } else if (S.mode === 'title') {
      L.horizon = S.h * (portrait ? 0.5 : 0.62);
      L.ground = S.h * (portrait ? 0.66 : 0.84);
      L.heroX = S.w * (portrait ? 0.5 : 0.7);
    } else {
      L.horizon = S.h * (portrait ? 0.27 : 0.63);
      L.ground = S.h * (portrait ? 0.355 : 0.82);
      L.heroX = S.w * (portrait ? 0.5 : 0.72);
    }
    L.unit = Math.min(S.h, S.w * 1.2);
    return L;
  }

  // x-offset of a layer at a given parallax depth
  const off = (d) => S.cam * d + S.px * 18 * d;

  function ridgeY(seed, sx, d, base, amp, period, sharp) {
    const x = (sx + off(d)) / period;
    return base - amp * (sharp ? ridged(seed, x) : fbm(seed, x));
  }

  function fillRidge(ctx, seed, d, base, amp, period, color, sharp, step) {
    step = step || 8;
    ctx.beginPath();
    ctx.moveTo(-20, S.h + 20);
    for (let sx = -20; sx <= S.w + 20; sx += step) ctx.lineTo(sx, ridgeY(seed, sx, d, base, amp, period, sharp));
    ctx.lineTo(S.w + 20, S.h + 20);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  // call fn(screenX, k, r) for each prop slot visible on a layer
  function slots(d, spacing, seed, fn, margin) {
    margin = margin || 200;
    const o = off(d);
    const a = Math.floor((o - margin) / spacing), b = Math.floor((o + S.w + margin) / spacing);
    for (let k = a; k <= b; k++) {
      const sx = k * spacing - o + (hash(k, seed + 1) - 0.5) * spacing * 0.7;
      fn(sx, k, hash(k, seed));
    }
  }

  // ── frame ───────────────────────────────────────────────────────────────────
  function frame(now) {
    if (!S.running) return;
    const dt = Math.min(0.05, (now - S.last) / 1000);
    S.last = now;
    S.t += dt;
    step(dt, now);
    draw();
    S.raf = requestAnimationFrame(frame);
  }

  function step(dt, now) {
    const m = S.reduced ? 0.35 : 1;
    S.time = ease(S.time, S.timeTarget, 0.9, dt);
    for (const k in S.light) S.light[k] = ease(S.light[k], S.lightTarget[k], 2.2, dt);
    S.ghost = ease(S.ghost, S.ghostTarget, 1.6, dt);
    S.boss = ease(S.boss, S.bossTarget, 1.4, dt);
    S.lean = ease(S.lean, S.leanTarget, 3, dt);
    S.lamp = ease(S.lamp, S.lampTarget, 1.2, dt);
    S.dim = ease(S.dim, S.dimTarget, 2, dt);
    S.pulse = Math.max(0, S.pulse - dt * 0.9);
    if (!S.reduced) {
      S.px = ease(S.px, S.pxT, 1.5, dt);
      S.py = ease(S.py, S.pyT, 1.5, dt);
    }
    // walking
    const walking = now < S.walkUntil || S.running_;
    const tgt = walking ? Math.max(S.speedTarget, 1) : 0;
    if (!walking) S.speedTarget = 0;
    S.speed = ease(S.speed, tgt, walking ? 2.2 : 3.2, dt);
    if (!S.reduced) S.cam += S.speed * 120 * dt * m;
    S.phase += S.speed * dt * 7.2;
    // biome haze transition: fade into mist, swap, fade out
    if (S.hazeDir > 0) {
      S.haze = Math.min(1, S.haze + dt / (S.reduced ? 0.25 : 0.9));
      if (S.haze >= 1) {
        if (S.pending) { S.biome = S.pending; S.pending = null; }
        S.hazeDir = -1;
      }
    } else if (S.hazeDir < 0) {
      S.haze = Math.max(0, S.haze - dt / (S.reduced ? 0.3 : 1.4));
      if (S.haze <= 0) S.hazeDir = 0;
    }
  }

  function draw() {
    const ctx = S.ctx;
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    const L = layout();
    const sky = skyAt(S.time);
    const B = BIOMES[S.biome] || BIOMES.trail;
    const P = palette(sky, B);

    drawSky(ctx, L, sky, B, P);
    const draw = DRAW[S.biome] || DRAW.trail;
    draw(ctx, L, P, sky);
    drawHero(ctx, L, P);
    if (S.biome === 'beach') drawBeachFront(ctx, L, P);
    if (S.biome === 'trail') drawTrailFront(ctx, L, P);
    drawMotes(ctx, L, P);
    post(ctx, L, P, sky);
  }

  function palette(sky, B) {
    let hor = sky.hor;
    if (B.tint) hor = mix(hor, B.tint, 0.35);
    return {
      hor,
      far: mix(hor, INK, 0.5),
      far2: mix(hor, INK, 0.62),
      mid: mix(hor, INK, 0.74),
      mid2: mix(hor, INK, 0.82),
      near: mix(hor, INK, 0.9),
      fg: mix(hor, INK, 0.96),
      dawn: clamp((S.time - 400) / 120, 0, 1),
    };
  }

  // ── sky ─────────────────────────────────────────────────────────────────────
  function drawSky(ctx, L, sky, B, P) {
    const g = ctx.createLinearGradient(0, 0, 0, L.horizon);
    g.addColorStop(0, rgb(sky.top));
    g.addColorStop(0.62, rgb(sky.mid));
    g.addColorStop(1, rgb(P.hor));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S.w, S.h);

    // stars
    const sa = sky.stars * B.stars * (1 - S.ghost * 0.6) * (0.75 + Math.max(0, S.lean) * 0.35);
    if (sa > 0.02) {
      ctx.fillStyle = '#fff';
      const sh = L.horizon * 0.98;
      for (const st of S.stars) {
        const y = st.y * sh;
        const a = sa * (0.45 + 0.55 * Math.sin(S.t * st.sp + st.tw)) * (1 - y / sh) ** 0.6;
        if (a < 0.03) continue;
        const x = ((st.x * S.w - off(0.015)) % S.w + S.w) % S.w;
        ctx.globalAlpha = a;
        ctx.fillRect(x, y, st.r, st.r);
      }
      ctx.globalAlpha = 1;
      // a shooting star now and then
      if (!S.shoot && !S.reduced && sa > 0.4 && Math.random() < 0.0025) {
        S.shoot = { x: Math.random() * S.w * 0.8, y: Math.random() * L.horizon * 0.4, life: 0 };
      }
      if (S.shoot) {
        const s = S.shoot;
        s.life += 0.016;
        const len = 120, k = s.life / 0.9;
        const x = s.x + k * 380, y = s.y + k * 150;
        const lg = ctx.createLinearGradient(x, y, x - len, y - len * 0.4);
        lg.addColorStop(0, `rgba(255,255,255,${0.8 * (1 - k)})`);
        lg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = lg;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len, y - len * 0.4); ctx.stroke();
        if (k >= 1) S.shoot = null;
      }
    }

    // moon until the blue hour, sun after it
    const moonA = clamp((430 - S.time) / 60, 0, 1);
    if (moonA > 0) {
      const mx = S.w * (L.portrait ? 0.78 : 0.82) - off(0.02) * 0.2, my = L.horizon * 0.22, r = Math.max(12, L.unit * 0.022);
      const halo = ctx.createRadialGradient(mx, my, r * 0.5, mx, my, r * 7);
      halo.addColorStop(0, `rgba(220,225,255,${0.14 * moonA})`);
      halo.addColorStop(1, 'rgba(220,225,255,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(mx - r * 7, my - r * 7, r * 14, r * 14);
      ctx.globalAlpha = moonA;
      ctx.drawImage(moonSprite(r), mx - r - 2, my - r - 2);
      ctx.globalAlpha = 1;
    }

    // horizon glows (the world's own light pollution)
    const glowAt = (c, a, x) => {
      const gr = ctx.createRadialGradient(x, L.horizon, 0, x, L.horizon, S.w * 0.7);
      gr.addColorStop(0, rgb(c, a));
      gr.addColorStop(1, rgb(c, 0));
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, S.w, L.horizon + S.h * 0.2);
    };
    if (B.glow) glowAt(B.glow[0], B.glow[1] * (0.85 + 0.15 * Math.sin(S.t * 0.7)), S.w * 0.35);
    if (B.glow2) glowAt(B.glow2[0], B.glow2[1] * (0.8 + 0.2 * Math.sin(S.t * 1.1 + 2)), S.w * 0.8);

    // dawn: sun glow low on the horizon
    if (P.dawn > 0) {
      const sx = S.mode === 'end' ? S.w * 0.5 : S.w * (L.portrait ? 0.62 : 0.6);
      const gr = ctx.createRadialGradient(sx, L.horizon, 0, sx, L.horizon, S.w * 0.65);
      gr.addColorStop(0, `rgba(255,196,130,${0.55 * P.dawn})`);
      gr.addColorStop(0.4, `rgba(255,150,110,${0.18 * P.dawn})`);
      gr.addColorStop(1, 'rgba(255,150,110,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, S.w, S.h);
    }
  }

  // a crescent, cut out of a disc once and reused
  function moonSprite(r) {
    r = Math.round(r);
    if (S.moon && S.moon.r === r) return S.moon.c;
    const c = document.createElement('canvas');
    c.width = c.height = r * 2 + 4;
    const x = c.getContext('2d');
    x.fillStyle = 'rgba(244,240,228,0.95)';
    x.beginPath(); x.arc(r + 2, r + 2, r, 0, TAU); x.fill();
    x.globalCompositeOperation = 'destination-out';
    x.beginPath(); x.arc(r + 2 - r * 0.42, r + 2 - r * 0.2, r * 0.9, 0, TAU); x.fill();
    S.moon = { r, c };
    return c;
  }

  function sunPos(L) {
    // altitude: below the horizon until ~06:05, then rising
    const alt = clamp((S.time - 485) / 70, -0.2, 1);
    const sx = S.mode === 'end' ? S.w * 0.5 : S.w * (L.portrait ? 0.62 : 0.6);
    const r = Math.max(18, L.unit * 0.05);
    return { x: sx, y: L.horizon + r * 0.9 - alt * L.horizon * 0.35, r, alt };
  }

  // ── worlds ──────────────────────────────────────────────────────────────────
  const DRAW = {};

  DRAW.intro = function (ctx, L, P) {
    // the city of feeds, far off and glowing
    const base = L.horizon;
    slots(0.05, 26, 101, (sx, k, r) => {
      const hgt = L.unit * (0.02 + r * 0.07) * (0.6 + 0.4 * vnoise(102, k * 0.15));
      const w = 14 + hash(k, 103) * 16;
      ctx.fillStyle = rgb(P.far);
      ctx.fillRect(sx, base - hgt, w, hgt + 4);
      if (hash(k, 104) > 0.45) {
        ctx.fillStyle = `rgba(170,140,255,${0.25 + 0.2 * Math.sin(S.t * 0.8 + k)})`;
        for (let j = 0; j < 3; j++) ctx.fillRect(sx + 3 + j * 4, base - hgt + 4 + hash(k + j, 105) * hgt * 0.6, 1.5, 1.5);
      }
    });
    fillRidge(ctx, 111, 0.22, base + L.unit * 0.04, L.unit * 0.05, 340, rgb(P.mid));
    fillRidge(ctx, 112, 0.55, base + L.unit * 0.1, L.unit * 0.04, 260, rgb(P.mid2));
    fillRidge(ctx, 113, 1, L.ground, L.unit * 0.025, 400, rgb(P.near));
    grass(ctx, L, P, 1, 114, 0.6);
  };

  DRAW.swamp = function (ctx, L, P) {
    const hz = L.horizon;
    fillRidge(ctx, 201, 0.06, hz, L.unit * 0.05, 400, rgb(P.far));
    // far cypress line
    slots(0.14, 44, 202, (sx, k, r) => {
      if (r < 0.25) return;
      const by = ridgeY(201, sx, 0.06, hz, L.unit * 0.05, 400) + 4;
      cypress(ctx, sx, by, L.unit * (0.07 + r * 0.09), rgb(P.far2), k);
    });
    fogBand(ctx, hz + L.unit * 0.01, L.unit * 0.05, mix(P.hor, hex('#bfe8cc'), 0.25), 0.28, 0.08);
    // mid bank and willows
    const mb = hz + L.unit * 0.05;
    fillRidge(ctx, 203, 0.32, mb, L.unit * 0.025, 300, rgb(P.mid));
    slots(0.32, 120, 204, (sx, k, r) => {
      if (r < 0.2) return;
      const by = ridgeY(203, sx, 0.32, mb, L.unit * 0.025, 300) + 6;
      willow(ctx, sx, by, L.unit * (0.16 + r * 0.14), rgb(P.mid), k);
    });
    // still black water with glints
    const wy = mb + L.unit * 0.012;
    const wg = ctx.createLinearGradient(0, wy, 0, L.ground);
    wg.addColorStop(0, rgb(mix(P.mid, P.hor, 0.15)));
    wg.addColorStop(1, rgb(P.near));
    ctx.fillStyle = wg;
    ctx.fillRect(0, wy, S.w, L.ground - wy + 40);
    ctx.strokeStyle = rgb(mix(P.hor, hex('#d8ffe6'), 0.5), 0.18);
    ctx.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
      const y = wy + 6 + hash(i, 205) * (L.ground - wy - 10);
      const x = ((hash(i, 206) * S.w * 1.4 - off(0.5) * 0.5 + Math.sin(S.t * 0.4 + i) * 8) % S.w + S.w) % S.w;
      const len = 10 + hash(i, 207) * 40;
      ctx.globalAlpha = 0.4 + 0.6 * Math.sin(S.t * 1.3 + i * 2);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    fogBand(ctx, wy + L.unit * 0.02, L.unit * 0.06, mix(P.hor, hex('#cdeed8'), 0.2), 0.22, -0.05);
    // near bank, reeds
    fillRidge(ctx, 208, 1, L.ground, L.unit * 0.02, 380, rgb(P.near));
    reeds(ctx, L, P, 1, 209);
    // fireflies and wisps of phone light
    for (let i = 0; i < 22; i++) {
      const d = 0.4 + hash(i, 211) * 0.8;
      const bx = ((hash(i, 212) * S.w * 1.5 - off(d) * 0.6) % (S.w + 60) + S.w + 60) % (S.w + 60) - 30;
      const by = hz + hash(i, 213) * (L.ground - hz + 20) - 20 + Math.sin(S.t * 0.6 + i) * 10;
      const a = 0.5 + 0.5 * Math.sin(S.t * (1 + hash(i, 214) * 2) + i);
      const wisp = i % 6 === 0;
      const c = wisp ? hex('#9fb4ff') : hex('#d9ff9a');
      const gr = ctx.createRadialGradient(bx, by, 0, bx, by, wisp ? 10 : 7);
      gr.addColorStop(0, rgb(c, 0.8 * a));
      gr.addColorStop(1, rgb(c, 0));
      ctx.fillStyle = gr;
      ctx.fillRect(bx - 10, by - 10, 20, 20);
      if (wisp) { ctx.fillStyle = rgb(c, 0.7 * a); ctx.fillRect(bx - 2, by - 3, 4, 6); }
    }
  };

  DRAW.arcade = function (ctx, L, P) {
    const hz = L.horizon;
    // far blocks
    slots(0.08, 34, 301, (sx, k, r) => {
      const hgt = L.unit * (0.04 + r * 0.12);
      ctx.fillStyle = rgb(P.far);
      ctx.fillRect(sx, hz - hgt, 30, hgt + 4);
    });
    const NEON = [hex('#ff4fd8'), hex('#3ef0ff'), hex('#ffb547'), hex('#a78bfa'), hex('#ff6b6b')];
    const street = L.ground - L.unit * 0.02;
    // mid buildings with neon
    slots(0.3, 150, 302, (sx, k, r) => {
      const w = 80 + hash(k, 303) * 60;
      const hgt = L.unit * (0.16 + r * 0.22);
      const top = street - hgt;
      ctx.fillStyle = rgb(P.mid);
      ctx.fillRect(sx, top, w, hgt + 10);
      const c = NEON[(k % NEON.length + NEON.length) % NEON.length];
      const flick = hash(Math.floor(S.t * 7) + k * 13, 304) < 0.04 ? 0.15 : 1;
      const a = (0.65 + 0.35 * Math.sin(S.t * 2 + k)) * flick;
      const kind = Math.floor(hash(k, 305) * 4);
      const cx = sx + w / 2, cy = top + hgt * 0.32;
      ctx.lineWidth = 6;
      ctx.strokeStyle = rgb(c, 0.16 * a);
      neonShape(ctx, kind, cx, cy, w);
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = rgb(mix(c, hex('#ffffff'), 0.35), a);
      neonShape(ctx, kind, cx, cy, w);
      // reflection on the wet street
      const rg = ctx.createLinearGradient(0, street, 0, S.h);
      rg.addColorStop(0, rgb(c, 0.22 * a));
      rg.addColorStop(1, rgb(c, 0));
      ctx.fillStyle = rg;
      ctx.fillRect(cx - w * 0.22, street, w * 0.44, S.h - street);
      // windows
      ctx.fillStyle = rgb(c, 0.12);
      for (let j = 0; j < 6; j++) if (hash(k * 7 + j, 306) > 0.5) ctx.fillRect(sx + 8 + (j % 3) * (w / 3.4), top + hgt * 0.55 + Math.floor(j / 3) * 16, 8, 6);
    });
    // street
    ctx.fillStyle = rgb(mix(P.near, P.mid, 0.3), 0.92);
    ctx.fillRect(0, street, S.w, S.h - street);
    ctx.strokeStyle = rgb(hex('#ff8ad8'), 0.2);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, street + 1); ctx.lineTo(S.w, street + 1); ctx.stroke();
    // foreground cabinets
    slots(1.35, 360, 307, (sx, k, r) => {
      if (r < 0.35) return;
      const cw = L.unit * 0.07, chh = L.unit * 0.16, by = S.h + L.unit * 0.02;
      ctx.fillStyle = rgb(P.fg);
      ctx.fillRect(sx, by - chh, cw, chh);
      ctx.fillRect(sx - cw * 0.12, by - chh * 0.62, cw * 1.24, chh * 0.08);
      const c = NEON[(k + 2) % NEON.length];
      ctx.fillStyle = rgb(c, 0.5 + 0.3 * Math.sin(S.t * 5 + k));
      ctx.fillRect(sx + cw * 0.14, by - chh * 0.9, cw * 0.72, chh * 0.22);
    });
    // rain
    if (!S.reduced) {
      ctx.strokeStyle = 'rgba(200,210,255,0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 90; i++) {
        const x = (hash(i, 308) * S.w * 1.2 + S.t * 90) % (S.w * 1.2) - S.w * 0.1;
        const y = (hash(i, 309) * S.h + S.t * (520 + hash(i, 310) * 200)) % S.h;
        ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 14);
      }
      ctx.stroke();
    }
  };

  function neonShape(ctx, kind, cx, cy, w) {
    const s = w * 0.28;
    ctx.beginPath();
    if (kind === 0) ctx.rect(cx - s, cy - s * 0.5, s * 2, s);
    else if (kind === 1) ctx.arc(cx, cy, s * 0.6, 0, TAU);
    else if (kind === 2) { // heart
      ctx.moveTo(cx, cy + s * 0.55);
      ctx.bezierCurveTo(cx - s, cy - s * 0.1, cx - s * 0.5, cy - s * 0.9, cx, cy - s * 0.35);
      ctx.bezierCurveTo(cx + s * 0.5, cy - s * 0.9, cx + s, cy - s * 0.1, cx, cy + s * 0.55);
    } else { // play button
      ctx.moveTo(cx - s * 0.4, cy - s * 0.5); ctx.lineTo(cx + s * 0.55, cy); ctx.lineTo(cx - s * 0.4, cy + s * 0.5); ctx.closePath();
    }
    ctx.stroke();
  }

  DRAW.city = function (ctx, L, P) {
    const hz = L.horizon;
    // searchlights — the city looking at itself
    {
      for (let i = 0; i < 2; i++) {
        const bx = S.w * (0.25 + i * 0.45) - off(0.1) * 0.3;
        const ang = -Math.PI / 2 + Math.sin(S.t * 0.25 + i * 2.2) * 0.45;
        const len = S.h * 1.1;
        const ex = bx + Math.cos(ang) * len, ey = hz + Math.sin(ang) * len;
        const g = ctx.createLinearGradient(bx, hz, ex, ey);
        g.addColorStop(0, 'rgba(180,205,255,0.13)');
        g.addColorStop(1, 'rgba(180,205,255,0)');
        ctx.fillStyle = g;
        const sp = 0.05;
        ctx.beginPath();
        ctx.moveTo(bx, hz);
        ctx.lineTo(bx + Math.cos(ang - sp) * len, hz + Math.sin(ang - sp) * len);
        ctx.lineTo(bx + Math.cos(ang + sp) * len, hz + Math.sin(ang + sp) * len);
        ctx.closePath();
        ctx.fill();
      }
    }
    // far towers
    slots(0.07, 30, 401, (sx, k, r) => {
      const hgt = L.unit * (0.08 + Math.pow(r, 2) * 0.3);
      ctx.fillStyle = rgb(P.far);
      ctx.fillRect(sx, hz - hgt, 24, hgt + 4);
      if (r > 0.82 && Math.sin(S.t * 2 + k) > 0.3) {
        ctx.fillStyle = 'rgba(255,90,90,0.9)';
        ctx.fillRect(sx + 11, hz - hgt - 4, 2, 2);
      }
    });
    // mid towers with window grids
    const base = L.ground - L.unit * 0.015;
    slots(0.26, 112, 402, (sx, k, r) => {
      const w = 64 + hash(k, 403) * 40;
      const hgt = L.unit * (0.24 + r * 0.32);
      const top = base - hgt;
      ctx.fillStyle = rgb(P.mid);
      ctx.fillRect(sx, top, w, hgt + 10);
      // crown
      if (hash(k, 404) > 0.6) ctx.fillRect(sx + w * 0.3, top - L.unit * 0.03, w * 0.4, L.unit * 0.03 + 1);
      const cols = Math.floor(w / 11), rows = Math.floor(hgt / 13);
      const tick = Math.floor(S.t / 2.5);
      for (let c = 0; c < cols; c++) for (let j = 1; j < rows; j++) {
        const id = k * 997 + c * 31 + j;
        let on = hash(id, 405) > 0.66;
        if (hash(id + tick * 7, 406) > 0.985) on = !on;
        if (!on) continue;
        ctx.fillStyle = hash(id, 407) > 0.3 ? 'rgba(255,214,150,0.5)' : 'rgba(160,200,255,0.55)';
        ctx.fillRect(sx + 5 + c * 11, top + j * 13, 4, 6);
      }
    });
    // plaza
    fillRidge(ctx, 408, 1, base + L.unit * 0.01, L.unit * 0.006, 500, rgb(P.near), false, 16);
    // lamp posts and their pools of light
    slots(1, 260, 409, (sx, k, r) => {
      const by = base + L.unit * 0.008, hgt = L.unit * 0.11;
      ctx.strokeStyle = rgb(P.fg);
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(sx, by); ctx.lineTo(sx, by - hgt); ctx.lineTo(sx + 10, by - hgt); ctx.stroke();
      const g = ctx.createRadialGradient(sx + 10, by - hgt + 4, 0, sx + 10, by - hgt + 4, hgt * 0.9);
      g.addColorStop(0, 'rgba(255,220,160,0.32)');
      g.addColorStop(1, 'rgba(255,220,160,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - hgt, by - hgt * 2, hgt * 2.4, hgt * 2.2);
    });
    // hearts drifting up from the windows: the likes
    if (S.hearts.length < 14 && Math.random() < 0.05) {
      S.hearts.push({ x: Math.random() * S.w, y: base - Math.random() * L.unit * 0.3, v: 12 + Math.random() * 18, life: 0, s: 3 + Math.random() * 3 });
    }
    for (let i = S.hearts.length - 1; i >= 0; i--) {
      const h = S.hearts[i];
      h.life += 0.016; h.y -= h.v * 0.016;
      const a = Math.sin(Math.min(1, h.life / 3) * Math.PI) * 0.55;
      if (h.life > 3) { S.hearts.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(255,120,150,${a})`;
      heart(ctx, h.x + Math.sin(h.life * 2) * 4, h.y, h.s);
    }
  };

  function heart(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.6, y - s * 0.1, x - s * 0.7, y - s * 1.3, x, y - s * 0.4);
    ctx.bezierCurveTo(x + s * 0.7, y - s * 1.3, x + s * 1.6, y - s * 0.1, x, y + s * 0.9);
    ctx.fill();
  }

  DRAW.trail = function (ctx, L, P, sky) {
    const hz = L.horizon;
    // mountains lit from the east
    const mt = mix(P.far, sky.mid, 0.28);
    fillRidge(ctx, 501, 0.04, hz + L.unit * 0.01, L.unit * 0.2, 520, rgb(mt), true, 6);
    // snow light on the ridge when dawn comes
    if (P.dawn > 0.05) {
      ctx.save();
      ctx.globalAlpha = 0.3 * P.dawn;
      ctx.strokeStyle = 'rgba(255,214,180,1)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let sx = -10; sx <= S.w + 10; sx += 6) {
        const y = ridgeY(501, sx, 0.04, hz + L.unit * 0.01, L.unit * 0.2, 520, true);
        sx === -10 ? ctx.moveTo(sx, y) : ctx.lineTo(sx, y);
      }
      ctx.stroke();
      ctx.restore();
    }
    fogBand(ctx, hz + L.unit * 0.005, L.unit * 0.05, mix(P.hor, hex('#ffffff'), 0.2), 0.3, 0.04);
    const h1 = hz + L.unit * 0.04;
    fillRidge(ctx, 502, 0.18, h1, L.unit * 0.05, 320, rgb(P.far2));
    slots(0.18, 24, 503, (sx, k, r) => {
      if (r < 0.3) return;
      pine(ctx, sx, ridgeY(502, sx, 0.18, h1, L.unit * 0.05, 320) + 3, L.unit * (0.03 + r * 0.04), rgb(P.far2));
    });
    const h2 = hz + L.unit * 0.09;
    fillRidge(ctx, 504, 0.45, h2, L.unit * 0.04, 280, rgb(P.mid));
    slots(0.45, 46, 505, (sx, k, r) => {
      if (r < 0.45) return;
      pine(ctx, sx, ridgeY(504, sx, 0.45, h2, L.unit * 0.04, 280) + 4, L.unit * (0.05 + r * 0.06), rgb(P.mid));
    });
    fillRidge(ctx, 506, 1, L.ground, L.unit * 0.025, 400, rgb(P.near));
    // the path itself — a pale line along the ground
    ctx.strokeStyle = rgb(mix(P.near, P.hor, 0.18));
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let sx = -10; sx <= S.w + 10; sx += 10) {
      const y = ridgeY(506, sx, 1, L.ground, L.unit * 0.025, 400) + 6;
      sx === -10 ? ctx.moveTo(sx, y) : ctx.lineTo(sx, y);
    }
    ctx.stroke();
    grass(ctx, L, P, 1, 507, 1);
    birds(ctx, L, P);
  };

  DRAW.beach = function (ctx, L, P, sky) {
    const hz = L.horizon;
    const sun = sunPos(L);
    // sun disc and its warmth
    if (sun.alt > -0.2) {
      const glow = ctx.createRadialGradient(sun.x, sun.y, sun.r * 0.6, sun.x, sun.y, sun.r * 6);
      glow.addColorStop(0, 'rgba(255,220,160,0.55)');
      glow.addColorStop(1, 'rgba(255,190,130,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, S.w, hz);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, S.w, hz); ctx.clip();
      ctx.fillStyle = 'rgba(255,240,205,0.97)';
      ctx.beginPath(); ctx.arc(sun.x, sun.y, sun.r, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // headland on the left
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, S.w * 0.42, S.h); ctx.clip();
    ctx.fillStyle = rgb(P.far);
    ctx.beginPath();
    ctx.moveTo(-10, hz + 2);
    for (let sx = -10; sx <= S.w * 0.42; sx += 8) {
      const fall = smooth(clamp(1 - sx / (S.w * 0.42), 0, 1));
      ctx.lineTo(sx, hz + 2 - fall * L.unit * 0.11 * (0.7 + 0.3 * fbm(601, (sx + off(0.05)) / 160)));
    }
    ctx.lineTo(S.w * 0.42, hz + 2);
    ctx.fill();
    ctx.restore();
    // sea
    const sea = ctx.createLinearGradient(0, hz, 0, S.h);
    sea.addColorStop(0, rgb(mix(P.hor, sky.mid, 0.4)));
    sea.addColorStop(1, rgb(mix(sky.top, INK, 0.45)));
    ctx.fillStyle = sea;
    ctx.fillRect(0, hz, S.w, S.h - hz);
    // the light path on the water: moon by night, sun by dawn
    const moonA = clamp((430 - S.time) / 60, 0, 1);
    const pathX = sun.alt > -0.2 ? sun.x : S.w * (L.portrait ? 0.78 : 0.82);
    const pathC = sun.alt > -0.2 ? [255, 214, 160] : [220, 226, 255];
    const pathA = sun.alt > -0.2 ? 0.7 * clamp(sun.alt + 0.2, 0, 1) : 0.45 * moonA;
    if (pathA > 0.02) {
      for (let i = 0; i < 46; i++) {
        const y = hz + 3 + Math.pow(i / 46, 1.7) * (S.h - hz);
        const wob = Math.sin(S.t * 1.6 + i * 1.7) * (4 + i * 0.6);
        const w = (6 + i * 1.8) * (0.4 + 0.6 * hash(i + Math.floor(S.t * 3), 602));
        ctx.fillStyle = rgb(pathC, pathA * (1 - i / 60) * (0.5 + 0.5 * Math.sin(S.t * 2 + i)));
        ctx.fillRect(pathX - w / 2 + wob, y, w, 1.5 + i * 0.05);
      }
    }
    // swell lines
    ctx.strokeStyle = rgb(mix(P.hor, hex('#ffffff'), 0.4), 0.12);
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const y = hz + Math.pow((i + 1) / 10, 1.8) * (L.ground - hz);
      ctx.beginPath();
      for (let sx = -10; sx <= S.w + 10; sx += 14) {
        const yy = y + Math.sin((sx + off(0.3 + i * 0.08)) / (40 + i * 10) + S.t * (0.6 + i * 0.05)) * (1 + i * 0.4);
        sx === -10 ? ctx.moveTo(sx, yy) : ctx.lineTo(sx, yy);
      }
      ctx.stroke();
    }
    // wet sand, then the dry beach the wanderer stands on
    const sand = mix(mix(P.hor, hex('#6b5440'), 0.55), INK, 0.55 - P.dawn * 0.25);
    fillRidge(ctx, 603, 1, L.ground + L.unit * 0.004, L.unit * 0.02, 420, rgb(mix(sand, sky.mid, 0.25)), false, 10);
    fillRidge(ctx, 606, 1.15, L.ground + L.unit * 0.035, L.unit * 0.03, 360, rgb(mix(sand, INK, 0.35)), false, 10);
    // shoreline foam breathing in and out
    const tide = Math.sin(S.t * 0.55) * L.unit * 0.008;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let sx = -10; sx <= S.w + 10; sx += 10) {
      const y = ridgeY(603, sx, 1, L.ground, L.unit * 0.02, 420) - L.unit * 0.012 - tide + Math.sin(sx / 30 + S.t * 1.4) * 1.5;
      sx === -10 ? ctx.moveTo(sx, y) : ctx.lineTo(sx, y);
    }
    ctx.stroke();
    gulls(ctx, L);
  };

  function drawBeachFront(ctx, L, P) {
    // sand in front of the hero is drawn before the hero; dune grass after
    slots(1.25, 140, 604, (sx, k, r) => {
      if (r < 0.4) return;
      const by = S.h + 6;
      ctx.strokeStyle = rgb(P.fg);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let j = 0; j < 9; j++) {
        const a = -Math.PI / 2 + (j - 4) * 0.16 + Math.sin(S.t * 0.9 + j + k) * 0.05;
        const len = L.unit * (0.05 + hash(k * 9 + j, 605) * 0.06);
        ctx.moveTo(sx + j * 3, by);
        ctx.quadraticCurveTo(sx + j * 3 + Math.cos(a) * len * 0.3, by + Math.sin(a) * len * 0.6, sx + j * 3 + Math.cos(a) * len, by + Math.sin(a) * len);
      }
      ctx.stroke();
    });
  }

  // big near pines that pass in front while walking — never over the wanderer
  function drawTrailFront(ctx, L, P) {
    slots(1.7, 640, 508, (sx, k, r) => {
      if (r < 0.45) return;
      const away = clamp((Math.abs(sx - L.heroX) - L.unit * 0.12) / (L.unit * 0.25), 0, 1);
      if (away <= 0) return;
      ctx.globalAlpha = away;
      pine(ctx, sx, S.h + 30, L.unit * (0.42 + r * 0.2), rgb(P.fg));
    }, 300);
    ctx.globalAlpha = 1;
  }

  // ── props ───────────────────────────────────────────────────────────────────
  function cypress(ctx, x, by, h, color, k) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - h * 0.08, by);
    ctx.lineTo(x - h * 0.02, by - h * 0.55);
    ctx.lineTo(x + h * 0.02, by - h * 0.55);
    ctx.lineTo(x + h * 0.08, by);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(x + (hash(k * 4 + i, 220) - 0.5) * h * 0.2, by - h * (0.55 + i * 0.12), h * (0.13 - i * 0.02), h * 0.09, 0, 0, TAU);
      ctx.fill();
    }
  }

  function willow(ctx, x, by, h, color, k) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    // a leaning, gnarled trunk with a buttressed foot
    const lean = (hash(k, 222) - 0.5) * h * 0.18;
    ctx.beginPath();
    ctx.moveTo(x - h * 0.13, by + 2);
    ctx.quadraticCurveTo(x - h * 0.04, by - h * 0.12, x - h * 0.035 + lean * 0.5, by - h * 0.45);
    ctx.quadraticCurveTo(x - h * 0.03 + lean, by - h * 0.7, x - h * 0.02 + lean, by - h * 0.86);
    ctx.lineTo(x + h * 0.03 + lean, by - h * 0.86);
    ctx.quadraticCurveTo(x + h * 0.04 + lean, by - h * 0.6, x + h * 0.04 + lean * 0.5, by - h * 0.42);
    ctx.quadraticCurveTo(x + h * 0.05, by - h * 0.1, x + h * 0.15, by + 2);
    ctx.fill();
    // an irregular crown of overlapping clumps
    const cx = x + lean, cy = by - h * 0.86;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI - Math.PI;
      const rr = h * (0.1 + hash(k * 7 + i, 223) * 0.1);
      ctx.moveTo(cx + Math.cos(a) * h * 0.24 + rr, cy + Math.sin(a) * h * 0.1);
      ctx.ellipse(cx + Math.cos(a) * h * 0.24, cy + Math.sin(a) * h * 0.1, rr, rr * 0.7, 0, 0, TAU);
    }
    ctx.ellipse(cx, cy + h * 0.02, h * 0.3, h * 0.08, 0, 0, TAU);
    ctx.fill();
    // long hanging moss curtains, swaying
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let i = 0; i < 26; i++) {
      const mx = cx - h * 0.38 + (i / 25) * h * 0.76;
      const edge = 1 - Math.abs(i / 25 - 0.5) * 1.4;
      const len = h * (0.18 + hash(k * 26 + i, 221) * 0.32) * (0.5 + edge * 0.6);
      const sway = Math.sin(S.t * 0.7 + i * 0.5 + k) * 3.5;
      const top = cy + h * 0.04;
      ctx.moveTo(mx, top);
      ctx.quadraticCurveTo(mx + sway * 0.4, top + len * 0.55, mx + sway, top + len);
    }
    ctx.stroke();
  }

  function pine(ctx, x, by, h, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, by - h);
    for (let i = 0; i < 4; i++) {
      const y = by - h + (i + 1) * h * 0.22;
      const w = h * (0.12 + i * 0.07);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w * 0.45, y);
    }
    ctx.lineTo(x + h * 0.04, by);
    ctx.lineTo(x - h * 0.04, by);
    for (let i = 3; i >= 0; i--) {
      const y = by - h + (i + 1) * h * 0.22;
      const w = h * (0.12 + i * 0.07);
      ctx.lineTo(x - w * 0.45, y);
      ctx.lineTo(x - w, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  function grass(ctx, L, P, d, seed, density) {
    ctx.strokeStyle = rgb(P.near);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    slots(d, 7 / density, seed, (sx, k, r) => {
      const by = ridgeY(seed - 1, sx, d, L.ground, L.unit * 0.025, 400) + 2;
      const len = 4 + r * L.unit * 0.018;
      const sway = Math.sin(S.t * 1.4 + k * 0.7) * 1.5;
      ctx.moveTo(sx, by);
      ctx.quadraticCurveTo(sx + sway * 0.4, by - len * 0.6, sx + sway + (r - 0.5) * 4, by - len);
    }, 20);
    ctx.stroke();
  }

  function reeds(ctx, L, P, d, seed) {
    ctx.strokeStyle = rgb(P.near);
    ctx.fillStyle = rgb(P.near);
    ctx.lineWidth = 1.4;
    slots(d, 22, seed, (sx, k, r) => {
      if (r < 0.3) return;
      const by = ridgeY(208, sx, d, L.ground, L.unit * 0.02, 380) + 3;
      const len = L.unit * (0.03 + r * 0.06);
      const sway = Math.sin(S.t * 1.1 + k) * 3;
      ctx.beginPath();
      ctx.moveTo(sx, by);
      ctx.quadraticCurveTo(sx + sway * 0.3, by - len * 0.5, sx + sway, by - len);
      ctx.stroke();
      if (r > 0.7) {
        ctx.beginPath();
        ctx.ellipse(sx + sway, by - len + 4, 2, 6, 0, 0, TAU);
        ctx.fill();
      }
    });
  }

  function fogBand(ctx, y, hgt, color, alpha, drift) {
    const g = ctx.createLinearGradient(0, y - hgt, 0, y + hgt);
    g.addColorStop(0, rgb(color, 0));
    g.addColorStop(0.5, rgb(color, alpha * (0.85 + 0.15 * Math.sin(S.t * 0.3 + drift * 40))));
    g.addColorStop(1, rgb(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, y - hgt, S.w, hgt * 2);
  }

  function birds(ctx, L, P) {
    if (S.reduced) return;
    if (S.birds.length === 0 && Math.random() < 0.004) {
      const n = 4 + Math.floor(Math.random() * 4);
      const y = L.horizon * (0.3 + Math.random() * 0.4);
      for (let i = 0; i < n; i++) S.birds.push({ x: -40 - i * 18 - Math.random() * 12, y: y + (i % 2) * 10 + Math.random() * 8, ph: Math.random() * TAU, v: 38 + Math.random() * 6 });
    }
    ctx.strokeStyle = rgb(mix(P.mid, INK, 0.3));
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let i = S.birds.length - 1; i >= 0; i--) {
      const b = S.birds[i];
      b.x += b.v * 0.016; b.ph += 0.016 * 9;
      const f = Math.sin(b.ph) * 3.5;
      ctx.moveTo(b.x - 6, b.y - f);
      ctx.quadraticCurveTo(b.x - 3, b.y - 2, b.x, b.y);
      ctx.quadraticCurveTo(b.x + 3, b.y - 2, b.x + 6, b.y - f);
      if (b.x > S.w + 60) S.birds.splice(i, 1);
    }
    ctx.stroke();
  }

  function gulls(ctx, L) {
    if (S.reduced) return;
    if (S.gulls.length < 3 && Math.random() < 0.006) S.gulls.push({ x: S.w + 30, y: L.horizon * (0.35 + Math.random() * 0.4), ph: Math.random() * TAU, v: 20 + Math.random() * 14 });
    ctx.strokeStyle = 'rgba(30,30,40,0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = S.gulls.length - 1; i >= 0; i--) {
      const g = S.gulls[i];
      g.x -= g.v * 0.016; g.ph += 0.016 * 3;
      g.y += Math.sin(g.ph * 0.7) * 0.15;
      const f = Math.sin(g.ph) * 4;
      ctx.moveTo(g.x - 9, g.y - f);
      ctx.quadraticCurveTo(g.x - 4, g.y - 4, g.x, g.y);
      ctx.quadraticCurveTo(g.x + 4, g.y - 4, g.x + 9, g.y - f);
      if (g.x < -40) S.gulls.splice(i, 1);
    }
    ctx.stroke();
  }

  // ── the wanderer ────────────────────────────────────────────────────────────
  function groundAt(L, x) {
    const b = S.biome;
    if (b === 'swamp') return ridgeY(208, x, 1, L.ground, L.unit * 0.02, 380);
    if (b === 'trail') return ridgeY(506, x, 1, L.ground, L.unit * 0.025, 400);
    if (b === 'intro') return ridgeY(113, x, 1, L.ground, L.unit * 0.025, 400);
    if (b === 'beach') return ridgeY(603, x, 1, L.ground + L.unit * 0.004, L.unit * 0.02, 420) + 3;
    if (b === 'city') return ridgeY(408, x, 1, L.ground - L.unit * 0.015 + L.unit * 0.01, L.unit * 0.006, 500);
    return L.ground - L.unit * 0.02;
  }

  function lightMix() {
    const l = S.light;
    const wsum = l.focus + l.oneness + l.tranquility + 1;
    let c = [0, 0, 0];
    c = mix(c, METER_RGB.focus, l.focus / wsum);
    c = [c[0] + METER_RGB.oneness[0] * l.oneness / wsum, c[1] + METER_RGB.oneness[1] * l.oneness / wsum, c[2] + METER_RGB.oneness[2] * l.oneness / wsum];
    c = [c[0] + METER_RGB.tranquility[0] * l.tranquility / wsum, c[1] + METER_RGB.tranquility[1] * l.tranquility / wsum, c[2] + METER_RGB.tranquility[2] * l.tranquility / wsum];
    // warm the lantern toward candlelight, and pull toward amber with dopamine
    c = mix(c, hex('#ffd9a0'), 0.45);
    c = mix(c, METER_RGB.dopamine, clamp(l.dopamine / 100 - 0.35, 0, 0.6));
    return c;
  }

  function drawHero(ctx, L, P) {
    const x = L.heroX;
    const s = clamp(L.unit * 0.075, 34, 70);
    const gy = groundAt(L, x);
    const moving = S.speed > 0.05;
    const ph = S.phase;
    const bob = moving ? -Math.abs(Math.sin(ph)) * s * 0.035 * Math.min(1, S.speed) : Math.sin(S.t * 1.6) * s * 0.006;
    const swing = Math.sin(ph) * s * 0.17 * Math.min(1, S.speed);
    const color = rgb(mix(P.fg, INK, 0.5));

    // light first, so the figure is silhouetted against it
    const l = S.light;
    const inner = (l.focus + l.oneness + l.tranquility) / 300;
    const flick = 1 + (Math.sin(S.t * 13) * 0.04 + Math.sin(S.t * 7.3) * 0.05) * (0.4 + l.dopamine / 100);
    const handX = x + s * 0.24 + swing * 0.2;
    const handY = gy - s * 0.52 + bob;
    const phoneX = x + s * 0.12, phoneY = gy - s * 0.84 + bob;
    const lx = lerp(phoneX, handX, S.lamp), ly = lerp(phoneY, handY + s * 0.1, S.lamp);
    const lampC = mix(hex('#9d7bff'), lightMix(), S.lamp);
    const R = s * (1.1 + inner * 3.4 + S.pulse * 2 + Math.max(0, S.lean) * 0.8) * flick * lerp(0.7, 1, S.lamp);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, R);
    const pc = S.pulse > 0 ? mix(lampC, S.pulseColor, S.pulse * 0.7) : lampC;
    g.addColorStop(0, rgb(pc, 0.55));
    g.addColorStop(0.25, rgb(pc, 0.2));
    g.addColorStop(1, rgb(pc, 0));
    ctx.fillStyle = g;
    ctx.fillRect(lx - R, ly - R, R * 2, R * 2);
    // pool of light on the ground: a radial gradient squashed flat
    ctx.translate(lx, gy + 2);
    ctx.scale(1, 0.16);
    const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.75);
    pool.addColorStop(0, rgb(pc, 0.16 + inner * 0.16));
    pool.addColorStop(1, rgb(pc, 0));
    ctx.fillStyle = pool;
    ctx.fillRect(-R, -R, R * 2, R * 2);
    ctx.restore();

    // figure — walking east, pack on the back, staff in the far hand
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const hip = gy - s * 0.44 + bob;
    ctx.lineWidth = s * 0.085;
    const lift = (p) => Math.max(0, Math.sin(p)) * s * 0.06 * Math.min(1, S.speed);
    ctx.beginPath();
    ctx.moveTo(x - s * 0.02, hip);
    ctx.lineTo(x - s * 0.02 + swing, gy - lift(ph));
    ctx.moveTo(x + s * 0.02, hip);
    ctx.lineTo(x + s * 0.02 - swing, gy - lift(ph + Math.PI));
    ctx.stroke();
    // staff
    ctx.lineWidth = s * 0.03;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.1 - swing * 0.3, gy - s * 1.0 + bob);
    ctx.lineTo(x - s * 0.18 - swing * 0.5, gy);
    ctx.stroke();
    // cloak
    ctx.beginPath();
    ctx.moveTo(x - s * 0.09, gy - s * 0.83 + bob);
    ctx.quadraticCurveTo(x - s * 0.17, gy - s * 0.6 + bob, x - s * 0.19 - swing * 0.15, gy - s * 0.36 + bob);
    ctx.lineTo(x + s * 0.17 - swing * 0.1, gy - s * 0.38 + bob);
    ctx.quadraticCurveTo(x + s * 0.13, gy - s * 0.62 + bob, x + s * 0.09, gy - s * 0.83 + bob);
    ctx.closePath();
    ctx.fill();
    // pack
    roundRect(ctx, x - s * 0.27, gy - s * 0.82 + bob, s * 0.17, s * 0.3, s * 0.05);
    ctx.fill();
    // head and hood
    ctx.beginPath();
    ctx.arc(x + s * 0.025, gy - s * 0.93 + bob, s * 0.088, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.08, gy - s * 0.86 + bob);
    ctx.quadraticCurveTo(x - s * 0.06, gy - s * 1.06 + bob, x + s * 0.04, gy - s * 1.03 + bob);
    ctx.lineTo(x - s * 0.02, gy - s * 0.88 + bob);
    ctx.fill();
    // arm to the lantern (or the phone)
    ctx.lineWidth = s * 0.06;
    ctx.beginPath();
    ctx.moveTo(x + s * 0.06, gy - s * 0.78 + bob);
    ctx.lineTo(lerp(phoneX, handX, S.lamp), lerp(phoneY + s * 0.04, handY, S.lamp));
    ctx.stroke();
    if (S.lamp > 0.5) {
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(handX, handY); ctx.lineTo(handX + swing * 0.05, handY + s * 0.06); ctx.stroke();
      ctx.fillStyle = rgb(mix(lampC, hex('#ffffff'), 0.5), 0.95);
      roundRect(ctx, handX - s * 0.035 + swing * 0.05, handY + s * 0.06, s * 0.07, s * 0.09, s * 0.015);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(190,170,255,0.95)';
      ctx.fillRect(phoneX - s * 0.025, phoneY - s * 0.04, s * 0.05, s * 0.08);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ── drifting light motes ────────────────────────────────────────────────────
  function drawMotes(ctx, L, P) {
    const b = S.biome;
    const c = b === 'arcade' ? hex('#ff9be6') : b === 'city' ? hex('#c8dcff') : b === 'swamp' ? hex('#d7ffd0') : hex('#ffe6c0');
    const lift = b === 'arcade' ? -1 : 1;
    ctx.fillStyle = rgb(c);
    for (const m of S.motes) {
      const y = ((m.y * S.h - S.t * 6 * m.d * lift) % S.h + S.h) % S.h;
      const x = ((m.x * S.w - off(m.d) * 0.6 + Math.sin(S.t * 0.5 + m.ph) * 12) % S.w + S.w) % S.w;
      const a = (0.12 + 0.25 * m.s) * (0.5 + 0.5 * Math.sin(S.t * 1.2 + m.ph));
      ctx.globalAlpha = a;
      ctx.fillRect(x, y, 1 + m.d, 1 + m.d);
    }
    ctx.globalAlpha = 1;
  }

  // ── post: lean, boss, ghost, haze, vignette, grain ─────────────────────────
  function post(ctx, L, P, sky) {
    const W = S.w, H = S.h;
    // leaning toward a choice: warmth or a cold screen-light
    if (Math.abs(S.lean) > 0.02) {
      if (S.lean > 0) {
        const g = ctx.createRadialGradient(L.heroX, L.ground, 0, L.heroX, L.ground, W * 0.8);
        g.addColorStop(0, `rgba(255,214,160,${0.16 * S.lean})`);
        g.addColorStop(1, 'rgba(255,214,160,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      } else {
        ctx.fillStyle = `rgba(120,80,255,${0.1 * -S.lean})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
    // the boss presses in
    if (S.boss > 0.02) {
      const g = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.25, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
      const beat = 0.75 + 0.25 * Math.pow(Math.abs(Math.sin(S.t * 1.9)), 6);
      g.addColorStop(0, 'rgba(120,20,30,0)');
      g.addColorStop(1, `rgba(120,20,30,${0.42 * S.boss * beat})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    // ghost mode: desaturate, then slice and shift
    if (S.ghost > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = `rgba(128,128,128,${0.75 * S.ghost})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      if (!S.reduced && Math.random() < 0.35 * S.ghost) {
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const y = Math.random() * H, hh = 4 + Math.random() * 30, dx = (Math.random() - 0.5) * 24 * S.ghost;
          ctx.drawImage(S.canvas, 0, y * S.dpr, S.canvas.width, hh * S.dpr, dx, y, W, hh);
        }
      }
      ctx.fillStyle = `rgba(160,120,255,${0.05 * S.ghost})`;
      ctx.fillRect(0, 0, W, H);
    }
    // mist between worlds
    if (S.haze > 0.001) {
      ctx.fillStyle = rgb(mix(sky.mid, P.hor, 0.5), smooth(S.haze));
      ctx.fillRect(0, 0, W, H);
    }
    // a scene may dim the world (the candle room)
    if (S.dim > 0.01) {
      ctx.fillStyle = `rgba(2,2,6,${S.dim})`;
      ctx.fillRect(0, 0, W, H);
    }
    // (the vignette and film grain are a CSS layer over the canvas — see makeGrain)
  }

  window.World = { mount, set, walk, pulse, toMinutes };

  // Draw the night straight away — even before (or without) the game's scripts.
  function boot() {
    const c = document.getElementById('world');
    if (c && !S.canvas) mount(c);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
