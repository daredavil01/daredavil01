// Island mode: the page becomes panels floating over the 3D island, and the
// scroll position becomes the camera and the clock. Everything navigable is
// still a plain element id, so links, ⌘K, the keyboard and Back all work.
import * as THREE from 'three';
import { IslandView } from './scene.js';
import { STOPS, HOTSPOTS, NOTES } from './layout.js';
import { toCss, uiPalette } from './palette.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

function pickTier(DI) {
  const forced = DI.params.get('tier');
  if (forced) return forced;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(screen.width, screen.height) < 700;
  const mem = navigator.deviceMemory || 8;
  if ((coarse && small) || mem <= 2) return 'low';
  if (coarse || mem <= 4) return 'mid';
  return 'high';
}

export async function boot(DI) {
  const root = document.documentElement;
  const stage = document.getElementById('stage');
  const loader = stage.querySelector('.stage__loader');
  const pct = loader.querySelector('[data-progress]');
  loader.hidden = false;
  const setProgress = (p) => {
    loader.style.setProperty('--p', p.toFixed(3));
    pct.textContent = Math.round(p * 100);
  };

  const canvas = document.createElement('canvas');
  stage.prepend(canvas);
  let ctrl = null;
  const view = new IslandView(canvas, { tier: pickTier(DI), base: new URL('../', import.meta.url).href });
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    ctrl && ctrl.exit('The island lost its drawing context — here is the classic view.');
  });
  await view.build(setProgress);
  view.resize(innerWidth, innerHeight);
  view.setState(0, DI.ist().hour);
  if (view.renderer.compileAsync) await view.renderer.compileAsync(view.scene, view.camera);
  view.render(0);
  loader.hidden = true;
  root.classList.remove('mode-loading'); // the canvas fades in over the ink poster

  ctrl = new Island(DI, view, stage);
  DI.world = ctrl;
  ctrl.enter();
  return ctrl;
}

class Island {
  constructor(DI, view, stage) {
    this.DI = DI;
    this.view = view;
    this.stage = stage;
    this.active = false;
    this.pending = false;
    this.n = STOPS.length;
    this.cur = null;
    this.override = null; // { hour } set by "jump to now", cleared by the reader's next scroll
    this.frames = [];
    this.lastInput = performance.now();
    this.debug = DI.params.has('debug');
  }

  enter() {
    const DI = this.DI;
    const root = document.documentElement;
    root.classList.remove('mode-classic');
    root.classList.add('mode-island');
    this.active = true;
    DI.mode = 'island';
    const label = document.querySelector('[data-mode-label]');
    if (label) label.textContent = 'Classic view';
    // the spacers between panels (where the camera flies) were laid out by boot-world.js
    this.transits = DI.transits || [];
    document.querySelector('.daybar__track').hidden = false;
    DI.notes && DI.notes.updateCount();
    this.buildPins();
    this.bindInput();
    this.measure();
    const ro = new ResizeObserver(() => this.measure());
    ro.observe(document.querySelector('main'));
    document.fonts && document.fonts.ready.then(() => this.measure());
    let lastW = innerWidth, lastH = innerHeight;
    addEventListener('resize', () => {
      if (innerWidth !== lastW || Math.abs(innerHeight - lastH) > 120) {
        lastW = innerWidth;
        lastH = innerHeight;
        this.view.resize(innerWidth, innerHeight);
        this.measure();
      }
    });
    if (DI.initialTarget) DI.go(DI.initialTarget, { push: false, instant: true, keep: true });
    const s = this.stateAt(scrollY);
    this.cur = { u: s.u, hour: s.hour };
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    if (this.debug) {
      this.hud = document.createElement('div');
      this.hud.className = 'debug-hud';
      document.body.appendChild(this.hud);
    }
    window.__island = { view: this.view, ready: true, contract: this.contract() };
  }

  exit(message) {
    this.active = false;
    const root = document.documentElement;
    root.classList.remove('mode-island', 'mode-loading');
    root.classList.add('mode-classic');
    (this.transits || []).forEach((t) => t.remove());
    this.transits = [];
    this.stage.querySelector('.stage__labels').innerHTML = '';
    document.querySelector('.daybar__track').hidden = true;
    this.DI.mode = 'classic';
    if (message) document.getElementById('announcer').textContent = message;
  }

  // ------------------------------------------------------------ layout --
  measure() {
    const y = scrollY;
    this.vh = innerHeight;
    this.mh = document.querySelector('.masthead').offsetHeight;
    this.keys = this.DI.stops.map((s, i) => {
      const r = s.el.getBoundingClientRect();
      const stop = STOPS[i] || STOPS[STOPS.length - 1];
      return { id: s.id, top: r.top + y, bottom: r.bottom + y, in: stop.hour, out: stop.out ?? stop.hour };
    });
    this.desktop = innerWidth > 760;
    // the reading line: on phones the panels are bottom sheets, so the camera
    // parks while the sheet's top sits low and the island shows above it
    this.focusFrac = this.desktop ? 0.5 : 0.66;
  }

  hoursFor(k) {
    const live = this.DI.ist().hour;
    const key = this.keys[k];
    if (key.id === 'island') return [live, live];
    if (key.id === 'map') {
      const h = live + 24 < 25 ? 25 : live + 24;
      return [h, h];
    }
    return [key.in, key.out];
  }

  /** Scroll position → rail position u and scene hour. */
  stateAt(y) {
    const focus = y + this.vh * this.focusFrac;
    const K = this.keys;
    for (let k = 0; k < K.length; k++) {
      const [hin, hout] = this.hoursFor(k);
      if (focus <= K[k].bottom || k === K.length - 1) {
        const t = clamp((focus - K[k].top) / Math.max(1, K[k].bottom - K[k].top), 0, 1);
        return { u: k, hour: lerp(hin, hout, t), stop: k };
      }
      const next = K[k + 1];
      if (focus < next.top) {
        const f = smooth(clamp((focus - K[k].bottom) / Math.max(1, next.top - K[k].bottom), 0, 1));
        const [nin] = this.hoursFor(k + 1);
        return { u: k + f, hour: lerp(hout, nin, f), stop: f < 0.5 ? k : k + 1 };
      }
    }
    return { u: 0, hour: 12, stop: 0 };
  }

  /** The scroll position that parks the camera on a target. */
  scrollFor(target) {
    const el = document.getElementById(target);
    if (!el) return null;
    const section = el.classList.contains('stop') ? el : el.closest('.stop');
    const k = this.DI.stops.findIndex((s) => s.el === section);
    const key = this.keys[k];
    const vh = this.vh;
    const ff = this.focusFrac;
    let y;
    if (el === section) y = this.desktop ? key.top - this.mh - 20 : key.top - vh * 0.6;
    else y = el.getBoundingClientRect().top + scrollY - vh * (this.desktop ? 0.32 : 0.5);
    // keep the reading line inside this stop's dwell, so the camera stays put
    y = clamp(y, key.top - vh * ff + 8, Math.max(key.top - vh * ff + 8, key.bottom - vh * ff - 8));
    if (k === 0) y = Math.min(y, 0);
    return y;
  }

  flyTo(target, opts = {}) {
    const y = this.scrollFor(target);
    if (y == null) return;
    this.override = opts.hour != null ? { hour: opts.hour, t: 0 } : null;
    this.cancelFlight();
    const from = scrollY;
    const dist = Math.abs(y - from);
    if (opts.instant || dist < 4 || this.DI.reducedMotion) {
      window.scrollTo(0, y);
      const s = this.stateAt(y);
      this.cur = { u: s.u, hour: this.override ? this.override.hour : s.hour };
      return;
    }
    const dur = clamp(550 + (dist / this.vh) * 140, 650, 1700);
    const t0 = performance.now();
    document.documentElement.classList.add('is-flying');
    this.flying = true;
    const step = (now) => {
      if (!this.flying) return;
      const t = clamp((now - t0) / dur, 0, 1);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      window.scrollTo(0, from + (y - from) * e);
      if (t < 1) this.flight = requestAnimationFrame(step);
      else this.cancelFlight();
    };
    this.flight = requestAnimationFrame(step);
  }

  cancelFlight() {
    this.flying = false;
    cancelAnimationFrame(this.flight);
    document.documentElement.classList.remove('is-flying');
  }

  bindInput() {
    const stopFlight = () => {
      this.lastInput = performance.now();
      if (this.flying) this.cancelFlight();
      if (this.override) this.override.release = true;
    };
    addEventListener('wheel', stopFlight, { passive: true });
    addEventListener('touchstart', stopFlight, { passive: true });
    addEventListener('keydown', (e) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(e.key)) stopFlight();
    });
    addEventListener('pointermove', () => (this.lastInput = performance.now()), { passive: true });
    addEventListener('scroll', () => (this.lastInput = performance.now()), { passive: true });
    // the scrubber: drag through the day
    const range = document.getElementById('scrubber');
    range.max = String(this.n - 1);
    range.addEventListener('input', () => {
      this.scrubbing = true;
      this.override = null;
      const u = +range.value;
      const k = Math.min(this.n - 2, Math.floor(u));
      const f = u - k;
      const K = this.keys;
      const y = f < 0.02 ? this.scrollFor(K[k].id) : f > 0.98 ? this.scrollFor(K[k + 1].id) : lerp(K[k].bottom, K[k + 1].top, f) - this.vh * this.focusFrac;
      window.scrollTo(0, y);
    });
    range.addEventListener('change', () => (this.scrubbing = false));
    // click on the island: the nearest place within reach
    this.view.canvas.addEventListener('click', (e) => {
      let best = null, bestD = 70;
      for (const pin of this.pins) {
        if (!pin.xy) continue;
        const d = Math.hypot(pin.xy[0] - e.clientX, pin.xy[1] - e.clientY);
        if (d < bestD) { best = pin; bestD = d; }
      }
      if (best) this.DI.go(best.id);
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.last = performance.now();
        requestAnimationFrame(this.loop);
      }
    });
  }

  // -------------------------------------------------------------- pins --
  buildPins() {
    const layer = this.stage.querySelector('.stage__labels');
    layer.innerHTML = '';
    this.pins = [];
    for (const s of STOPS) {
      const spot = HOTSPOTS[s.id];
      if (!spot) continue;
      const a = document.createElement('a');
      a.className = 'pin';
      a.href = '#' + s.id;
      a.tabIndex = -1;
      const stop = this.DI.stop(s.id);
      a.innerHTML = `<small>${stop ? stop.time : ''}</small>${s.label}`;
      layer.appendChild(a);
      this.pins.push({ id: s.id, el: a, pos: new THREE.Vector3(spot[0], spot[1] + spot[3] * 0.55, spot[2]) });
    }
    this.notePins = new Map();
    for (const note of this.DI.notes ? this.DI.notes.list : []) {
      const at = NOTES[note.id];
      if (!at) continue;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'note-pin' + (this.DI.notes.isFound(note.id) ? ' is-found' : '');
      b.textContent = '✎';
      b.setAttribute('aria-label', 'A field note');
      b.tabIndex = -1;
      b.hidden = true;
      const text = document.createElement('div');
      text.className = 'note-text';
      text.textContent = note.text;
      text.hidden = true;
      b.addEventListener('click', () => {
        text.hidden = !text.hidden;
        this.DI.notes.find(note.id);
        b.classList.add('is-found');
      });
      layer.append(b, text);
      this.notePins.set(note.id, { note, el: b, text, pos: new THREE.Vector3(...at) });
    }
  }

  updatePins(stopIdx) {
    const [w, h] = this.view.size;
    const current = this.keys[stopIdx] && this.keys[stopIdx].id;
    const cam = this.view.camera.position;
    for (const pin of this.pins) {
      const p = this.view.project(pin.pos);
      pin.xy = null;
      if (!p || p[0] < -40 || p[0] > w + 40 || p[1] < 60 || p[1] > h + 40) {
        pin.el.style.opacity = '0';
        continue;
      }
      pin.xy = p;
      const d = cam.distanceTo(pin.pos);
      const near = pin.id === current;
      const o = near ? 1 : clamp(1.25 - d / 38, 0.25, 0.85);
      pin.el.style.opacity = o.toFixed(2);
      pin.el.style.transform = `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px) translate(-50%, -100%)`;
      pin.el.classList.toggle('is-current', near);
    }
    const visible = new Set(this.DI.notes ? this.DI.notes.visible(this.cur.hour).map((n) => n.id) : []);
    for (const [id, np] of this.notePins) {
      const on = visible.has(id);
      const p = on ? this.view.project(np.pos) : null;
      const show = p && p[0] > 0 && p[0] < w && p[1] > 70 && p[1] < h;
      np.el.hidden = !show;
      if (!show) {
        np.text.hidden = true;
        continue;
      }
      np.el.style.left = p[0].toFixed(1) + 'px';
      np.el.style.top = p[1].toFixed(1) + 'px';
      np.text.style.left = p[0].toFixed(1) + 'px';
      np.text.style.top = p[1].toFixed(1) + 'px';
    }
  }

  // -------------------------------------------------------------- frame --
  offsetFor(u) {
    // panels cover part of the screen: shift the subject into the clear part
    const w = innerWidth, h = innerHeight;
    const at = (k) => {
      const id = STOPS[k].id;
      if (!this.desktop) return id === 'map' ? [0, 0] : [0, h * 0.2];
      if (id === 'map') return [0, 0];
      if (id === 'island') return [-(Math.min(600, w * 0.48) + w * 0.032) * 0.45, 0];
      return [(Math.min(500, w * 0.4) + w * 0.032) * 0.5, 0];
    };
    const k = Math.min(this.n - 2, Math.floor(u));
    const f = smooth(clamp(u - k, 0, 1));
    const a = at(k), b = at(k + 1);
    return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
  }

  loop(now) {
    if (!this.active) return;
    if (document.hidden) return;
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, (now - this.last) / 1000);
    // idle: 30 fps after 4 s without input, ~10 fps after 20 s (boats and the
    // beam keep moving, the battery keeps its charge)
    const quiet = now - this.lastInput;
    const idle = quiet > 4000;
    const every = quiet > 20000 ? 6 : idle ? 2 : 1;
    this.tick = (this.tick || 0) + 1;
    if (this.tick % every) return;
    this.last = now;
    const s = this.stateAt(scrollY);
    const k = 1 - Math.exp(-dt * (this.flying ? 12 : 7));
    this.cur.u += (s.u - this.cur.u) * k;
    let targetHour = s.hour;
    if (this.override) {
      if (this.override.release) {
        this.override.t = Math.min(1, this.override.t + dt * 1.5);
        targetHour = lerp(this.override.hour, s.hour, this.override.t);
        if (this.override.t >= 1) this.override = null;
      } else targetHour = this.override.hour;
    }
    // forced light/dark theme pins the whole scene to noon / midnight
    var forced = document.documentElement.dataset.theme;
    if (forced === 'light') targetHour = 12;
    else if (forced === 'dark') targetHour = 0;
    this.cur.hour += (targetHour - this.cur.hour) * k;
    const [ox, oy] = this.offsetFor(this.cur.u);
    this.view.setViewOffset(ox, oy);
    this.view.setState(this.cur.u, this.cur.hour);
    this.view.render(this.DI.reducedMotion ? 0 : dt);
    this.updatePins(s.stop);
    this.updateChrome(s);
    this.govern(dt);
  }

  updateChrome(s) {
    const DI = this.DI;
    const stop = this.keys[s.stop];
    if (stop && stop.id !== DI.currentStop) {
      DI.setCurrentStop(stop.id);
      clearTimeout(this.hashTimer);
      if (!this.flying)
        this.hashTimer = setTimeout(() => {
          const hash = location.hash.slice(1);
          if (hash.split('/')[0] !== stop.id) history.replaceState(history.state, '', '#' + stop.id);
        }, 400);
    }
    const range = document.getElementById('scrubber');
    if (!this.scrubbing) range.value = this.cur.u.toFixed(3);
    const hl = DI.fmtHour(this.cur.hour);
    if (hl !== this.lastHourLabel) {
      this.lastHourLabel = hl;
      range.setAttribute('aria-valuetext', `${hl}, ${stop ? DI.stop(stop.id).name : ''}`);
    }
    // palette → CSS, so the panels follow the sun
    if (Math.abs((this.cssHour ?? -9) - this.cur.hour) > 0.03) {
      this.cssHour = this.cur.hour;
      const p = uiPalette(this.view.palette);
      const r = document.documentElement.style;
      r.setProperty('--paper', toCss(p.paper));
      r.setProperty('--paper-2', toCss(p.paper2));
      r.setProperty('--ink', toCss(p.ink));
      r.setProperty('--rust', toCss(p.accent));
      r.setProperty('--green', p.dark ? '#8fcf98' : '#3d7d44');
      document.documentElement.dataset.sky = p.dark ? 'night' : 'day';
      const meta = document.querySelector('meta[name=theme-color]');
      if (meta) meta.setAttribute('content', toCss(p.paper));
    }
    // where "now" sits on the day bar
    const live = DI.ist().hour;
    if (this.nowHour !== Math.round(live * 20)) {
      this.nowHour = Math.round(live * 20);
      document.querySelector('.daybar__track').style.setProperty('--now', (this.uForHour(live) / (this.n - 1)).toFixed(4));
    }
  }

  uForHour(live) {
    const hs = STOPS.map((s) => s.hour);
    const h = live < 5.5 ? live + 24 : live; // the small hours belong to the night stop
    for (let k = 1; k < hs.length - 1; k++) {
      const a = hs[k], b = hs[k + 1] ?? 25;
      if (b == null) break;
      if (h >= a && h < b) return k + (h - a) / (b - a);
    }
    return h >= 24.5 ? 8 : 1;
  }

  govern(dt) {
    this.frames.push(dt);
    if (this.frames.length < 90) return;
    const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
    this.frames.length = 0;
    const idle = performance.now() - this.lastInput > 4000;
    if (!idle && avg > 0.026) {
      const next = { high: 'mid', mid: 'low' }[this.view.tier];
      if (next) this.view.setTier(next);
    }
    if (this.hud) {
      const i = this.view.info();
      this.hud.textContent = `tier ${i.tier} · ${(1 / avg).toFixed(0)} fps\ncalls ${i.calls} · tris ${(i.triangles / 1000).toFixed(0)}k\nu ${this.cur.u.toFixed(2)} · ${this.DI.fmtHour(this.cur.hour)}\nterrain ${i.terrainMs}ms · build ${i.buildMs}ms`;
    }
  }

  contract() {
    return {
      stops: STOPS.map((s) => s.id),
      hotspots: Object.keys(HOTSPOTS),
      notes: Object.keys(NOTES),
      pageStops: this.DI.stops.map((s) => s.id),
      pageNotes: this.DI.notes ? this.DI.notes.list.map((n) => n.id) : [],
    };
  }
}
