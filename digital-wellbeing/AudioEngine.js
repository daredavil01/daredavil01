// AudioEngine.js — Web Audio API ambient soundscapes
(function () {
  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.nodes = [];
      this.muted = false;
      this.currentBg = null;
      this._timers = [];

      // Auto-start on first user gesture (browser autoplay policy)
      const start = () => {
        if (!this.ctx) {
          this.init();
          this.play(this.currentBg || "intro");
        }
        ["click", "keydown", "touchstart"].forEach((ev) =>
          document.removeEventListener(ev, start),
        );
      };
      ["click", "keydown", "touchstart"].forEach((ev) =>
        document.addEventListener(ev, start, { once: true }),
      );
    }

    init() {
      if (this.ctx) return;
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.3;
        this.master.connect(this.ctx.destination);
      } catch (e) {
        console.warn("AudioEngine: no Web Audio support");
      }
    }

    play(bg) {
      if (!this.ctx) this.init();
      if (!this.ctx || this.currentBg === bg) return;
      this._fadeStop(() => {
        this.currentBg = bg;
        const fn = {
          intro: () => this._intro(),
          swamp: () => this._swamp(),
          arcade: () => this._arcade(),
          city: () => this._city(),
          trail: () => this._trail(),
          beach: () => this._beach(),
        }[bg];
        if (fn) fn();
      });
    }

    toggle() {
      this.muted = !this.muted;
      if (this.master) {
        this.master.gain.setTargetAtTime(
          this.muted ? 0 : 0.3,
          this.ctx.currentTime,
          0.3,
        );
      }
      return this.muted;
    }

    // ── internals ──────────────────────────────────────────────────────────────
    _clearTimers() {
      this._timers.forEach((t) => clearTimeout(t));
      this._timers = [];
    }

    _fadeStop(cb) {
      this._clearTimers();
      if (!this.ctx || this.nodes.length === 0) {
        this.nodes = [];
        if (cb) cb();
        return;
      }
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(1, this.ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.7);
      this.nodes.forEach((n) => {
        try {
          if (n._gainNode) {
            n._gainNode.connect(g);
            g.connect(this.master);
          }
        } catch (e) {}
      });
      const t = setTimeout(() => {
        this.nodes.forEach((n) => {
          try {
            n.stop ? n.stop() : null;
          } catch (e) {}
        });
        this.nodes = [];
        if (cb) cb();
      }, 750);
      this._timers.push(t);
    }

    _noise(color = "pink") {
      const sr = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, sr * 4, sr);
      const d = buf.getChannelData(0);
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0;
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1;
        if (color === "pink") {
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856;
          b4 = 0.55 * b4 + w * 0.5329522;
          b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        } else {
          d[i] = w * 0.5;
        }
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      return src;
    }

    _osc(freq, type = "sine") {
      const o = this.ctx.createOscillator();
      o.frequency.value = freq;
      o.type = type;
      return o;
    }

    _chain(src, ...processors) {
      let node = src;
      for (const p of processors) {
        node.connect(p);
        node = p;
      }
      node.connect(this.master);
      if (src.start) src.start();
      this.nodes.push(src);
    }

    _gain(val) {
      const g = this.ctx.createGain();
      g.gain.value = val;
      return g;
    }

    _filter(type, freq, q) {
      const f = this.ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      if (q !== undefined) f.Q.value = q;
      return f;
    }

    // Modulate a gain node with an LFO (returns lfo osc for tracking)
    _lfoMod(targetGain, rate, depth, baseVal) {
      const lfo = this._osc(rate, "sine");
      const lfoG = this._gain(depth);
      targetGain.gain.value = baseVal;
      lfo.connect(lfoG);
      lfoG.connect(targetGain.gain);
      if (lfo.start) lfo.start();
      this.nodes.push(lfo);
      return lfo;
    }

    // One-shot tone burst
    _burst(freq, type, vol, dur, startTime) {
      if (!this.ctx) return;
      const t = startTime || this.ctx.currentTime;
      const o = this._osc(freq, type);
      const g = this._gain(0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + dur + 0.05);
      this.nodes.push(o);
    }

    // ── INTRO — dimly lit room, heartbeat clock ───────────────────────────────
    _intro() {
      // Room hum
      this._chain(
        this._noise("pink"),
        this._filter("lowpass", 160),
        this._gain(0.1),
      );
      // Sub bass drone
      const sub = this._osc(55, "sine");
      this._chain(sub, this._gain(0.045));
      // Slow breathing LFO
      const breathG = this._gain(0.08);
      this._lfoMod(breathG, 0.18, 0.05, 0.08);
      this._chain(this._noise("pink"), this._filter("lowpass", 300), breathG);
      // Clock tick
      this._scheduleTick();
    }

    _scheduleTick() {
      if (!this.ctx || this.currentBg !== "intro") return;
      this._burst(1200, "square", 0.015, 0.03);
      const t = setTimeout(
        () => this._scheduleTick(),
        960 + Math.random() * 80,
      );
      this._timers.push(t);
    }

    // ── SWAMP — Echo Chamber: forest, drips, distant notification pings ───────
    _swamp() {
      // Forest bed (low-pass pink noise)
      this._chain(
        this._noise("pink"),
        this._filter("lowpass", 400),
        this._gain(0.2),
      );
      // Sub drone with slow tremolo
      const subG = this._gain(0.06);
      this._lfoMod(subG, 0.22, 0.03, 0.06);
      const sub = this._osc(68, "triangle");
      sub.connect(subG);
      subG.connect(this.master);
      if (sub.start) sub.start();
      this.nodes.push(sub);
      // Mid-range rustle
      this._chain(
        this._noise("pink"),
        this._filter("bandpass", 700, 1.5),
        this._gain(0.07),
      );
      // Water drips
      this._scheduleDrip();
      // Distant notification ping (echo chamber metaphor)
      this._schedulePing();
    }

    _scheduleDrip() {
      if (!this.ctx || this.currentBg !== "swamp") return;
      const t = this.ctx.currentTime;
      const freq = 1800 + Math.random() * 600;
      // Short pluck: attack + fast decay
      const o = this._osc(freq, "sine");
      const o2 = this._osc(freq * 2.01, "sine");
      const g = this._gain(0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.022, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      [o, o2].forEach((x) => {
        x.connect(g);
        x.start(t);
        x.stop(t + 0.4);
        this.nodes.push(x);
      });
      g.connect(this.master);
      const delay = 2000 + Math.random() * 5000;
      this._timers.push(setTimeout(() => this._scheduleDrip(), delay));
    }

    _schedulePing() {
      if (!this.ctx || this.currentBg !== "swamp") return;
      const t = this.ctx.currentTime;
      const freqs = [880, 1047, 1175, 1319];
      const f = freqs[Math.floor(Math.random() * freqs.length)];
      this._burst(f, "sine", 0.012, 0.5, t);
      const delay = 5000 + Math.random() * 12000;
      this._timers.push(setTimeout(() => this._schedulePing(), delay));
    }

    // ── ARCADE — Dopamine loops: neon buzz, coins, crowd murmur ──────────────
    _arcade() {
      // High-energy bandpass noise
      this._chain(
        this._noise(),
        this._filter("bandpass", 1400, 3),
        this._gain(0.06),
      );
      // Square drones (neon hum)
      const sq1 = this._osc(110, "square");
      this._chain(sq1, this._filter("lowpass", 400), this._gain(0.025));
      const sq2 = this._osc(220, "square");
      this._chain(sq2, this._filter("lowpass", 500), this._gain(0.018));
      const sq3 = this._osc(330, "square");
      this._chain(sq3, this._filter("lowpass", 300), this._gain(0.012));
      // Crowd murmur (bandpass-filtered noise swelling slowly)
      const crowdG = this._gain(0.09);
      this._lfoMod(crowdG, 0.07, 0.04, 0.09);
      this._chain(
        this._noise("pink"),
        this._filter("bandpass", 900, 0.5),
        crowdG,
      );
      // Coin blips + score sounds
      this._scheduleBlips();
      this._scheduleScore();
    }

    _scheduleBlips() {
      if (!this.ctx || this.currentBg !== "arcade") return;
      const t = this.ctx.currentTime;
      const freq = 660 + Math.random() * 660;
      this._burst(freq, "square", 0.035, 0.07, t);
      const delay = 600 + Math.random() * 1800;
      this._timers.push(setTimeout(() => this._scheduleBlips(), delay));
    }

    _scheduleScore() {
      if (!this.ctx || this.currentBg !== "arcade") return;
      const t = this.ctx.currentTime;
      // Ascending arpeggio: 3 quick notes
      const notes = [523, 659, 784];
      notes.forEach((f, i) =>
        this._burst(f, "square", 0.025, 0.12, t + i * 0.1),
      );
      const delay = 8000 + Math.random() * 14000;
      this._timers.push(setTimeout(() => this._scheduleScore(), delay));
    }

    // ── CITY — Validation City: traffic, AC hum, distant sirens, rain ─────────
    _city() {
      // Traffic rumble
      this._chain(
        this._noise("pink"),
        this._filter("bandpass", 500, 0.35),
        this._gain(0.16),
      );
      const rumble = this._osc(95, "triangle");
      this._chain(rumble, this._gain(0.045));
      // AC unit drone with slow swell
      const acG = this._gain(0.1);
      this._lfoMod(acG, 0.04, 0.04, 0.1);
      this._chain(this._noise("pink"), this._filter("lowpass", 350), acG);
      // Rain on glass (high filtered noise, quiet)
      const rainG = this._gain(0.06);
      this._lfoMod(rainG, 0.12, 0.02, 0.06);
      this._chain(
        this._noise(),
        this._filter("highpass", 3000),
        this._filter("lowpass", 8000),
        rainG,
      );
      // Distant siren
      this._scheduleSiren();
    }

    _scheduleSiren() {
      if (!this.ctx || this.currentBg !== "city") return;
      const t = this.ctx.currentTime;
      const dur = 2.5;
      const o = this._osc(740, "sine");
      const g = this._gain(0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.018, t + 0.4);
      g.gain.linearRampToValueAtTime(0, t + dur);
      o.frequency.setValueAtTime(740, t);
      o.frequency.linearRampToValueAtTime(880, t + dur / 2);
      o.frequency.linearRampToValueAtTime(740, t + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + dur + 0.1);
      this.nodes.push(o);
      const delay = 18000 + Math.random() * 30000;
      this._timers.push(setTimeout(() => this._scheduleSiren(), delay));
    }

    // ── TRAIL — Nomad's Trail: wind, melodic birds, footsteps ─────────────────
    _trail() {
      // Wind (high-pass pink noise)
      this._chain(
        this._noise("pink"),
        this._filter("highpass", 700),
        this._filter("lowpass", 4000),
        this._gain(0.09),
      );
      // Wind swell LFO
      const windG = this._gain(0.07);
      this._lfoMod(windG, 0.07, 0.04, 0.07);
      this._chain(
        this._noise("pink"),
        this._filter("bandpass", 1600, 0.7),
        windG,
      );
      // Sub rustle
      this._chain(
        this._noise("pink"),
        this._filter("lowpass", 200),
        this._gain(0.05),
      );
      // Birds
      this._scheduleBirds();
      // Footsteps
      this._scheduleFootstep();
    }

    _scheduleBirds() {
      if (!this.ctx || this.currentBg !== "trail") return;
      const t = this.ctx.currentTime;
      // Musical bird phrases: pick a root note and do a 2-note call
      const roots = [2093, 2349, 2637, 2794, 3136];
      const root = roots[Math.floor(Math.random() * roots.length)];
      const calls = [
        [
          [root, 0.04],
          [root * 1.33, 0.08],
        ],
        [
          [root * 1.25, 0.03],
          [root, 0.06],
          [root * 1.5, 0.12],
        ],
        [
          [root, 0.04],
          [root * 0.75, 0.1],
        ],
      ];
      const call = calls[Math.floor(Math.random() * calls.length)];
      call.forEach(([f, delay]) => {
        const o = this._osc(f, "sine");
        const g = this._gain(0);
        const at = t + delay;
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(0.022, at + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
        o.connect(g);
        g.connect(this.master);
        o.start(at);
        o.stop(at + 0.22);
        this.nodes.push(o);
      });
      const delay = 2000 + Math.random() * 5000;
      this._timers.push(setTimeout(() => this._scheduleBirds(), delay));
    }

    _scheduleFootstep() {
      if (!this.ctx || this.currentBg !== "trail") return;
      const t = this.ctx.currentTime;
      // Soft thud: short burst of low-frequency noise
      const buf = this.ctx.createBuffer(
        1,
        this.ctx.sampleRate * 0.08,
        this.ctx.sampleRate,
      );
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++)
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.3));
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const lp = this._filter("lowpass", 300);
      const g = this._gain(0.08);
      src.connect(lp);
      lp.connect(g);
      g.connect(this.master);
      src.start(t);
      this.nodes.push(src);
      // Two steps, then a pause
      const delay = 500 + Math.random() * 200;
      this._timers.push(
        setTimeout(
          () => {
            if (this.currentBg !== "trail") return;
            this._scheduleFootstep();
          },
          delay * (Math.random() < 0.3 ? 8 : 1),
        ),
      );
    }

    // ── BEACH — Win screen: ocean waves, seagulls, warm shimmer ───────────────
    _beach() {
      // Wave swell (LFO-modulated pink noise)
      const noise = this._noise("pink");
      const lp = this._filter("lowpass", 600);
      const waveG = this._gain(0.25);
      this._lfoMod(waveG, 0.13, 0.2, 0.25);
      noise.connect(lp);
      lp.connect(waveG);
      waveG.connect(this.master);
      if (noise.start) noise.start();
      this.nodes.push(noise);
      // Second wave layer (offset phase)
      const noise2 = this._noise("pink");
      const lp2 = this._filter("lowpass", 400);
      const wave2G = this._gain(0.14);
      this._lfoMod(wave2G, 0.09, 0.1, 0.14);
      noise2.connect(lp2);
      lp2.connect(wave2G);
      wave2G.connect(this.master);
      if (noise2.start) noise2.start();
      this.nodes.push(noise2);
      // High shimmer (ocean sparkle)
      this._chain(
        this._noise(),
        this._filter("highpass", 5000),
        this._gain(0.018),
      );
      // Warm low hum (sand resonance)
      const hum = this._osc(80, "sine");
      this._chain(hum, this._gain(0.025));
      // Seagull calls
      this._scheduleSeagull();
    }

    _scheduleSeagull() {
      if (!this.ctx || this.currentBg !== "beach") return;
      const t = this.ctx.currentTime;
      // Seagull: rising then falling pitch glide
      const o = this._osc(900, "sine");
      const g = this._gain(0);
      const dur = 0.6 + Math.random() * 0.4;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.025, t + 0.08);
      g.gain.linearRampToValueAtTime(0.018, t + dur * 0.5);
      g.gain.linearRampToValueAtTime(0, t + dur);
      o.frequency.setValueAtTime(700 + Math.random() * 300, t);
      o.frequency.linearRampToValueAtTime(
        1100 + Math.random() * 200,
        t + dur * 0.35,
      );
      o.frequency.linearRampToValueAtTime(600 + Math.random() * 100, t + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + dur + 0.1);
      this.nodes.push(o);
      // Occasionally a second gull overlaps
      if (Math.random() < 0.35) {
        const t2 = t + 0.3 + Math.random() * 0.4;
        const o2 = this._osc(800, "sine");
        const g2 = this._gain(0);
        const d2 = 0.5 + Math.random() * 0.3;
        g2.gain.setValueAtTime(0, t2);
        g2.gain.linearRampToValueAtTime(0.018, t2 + 0.07);
        g2.gain.linearRampToValueAtTime(0, t2 + d2);
        o2.frequency.setValueAtTime(850, t2);
        o2.frequency.linearRampToValueAtTime(650, t2 + d2);
        o2.connect(g2);
        g2.connect(this.master);
        o2.start(t2);
        o2.stop(t2 + d2 + 0.1);
        this.nodes.push(o2);
      }
      const delay = 4000 + Math.random() * 10000;
      this._timers.push(setTimeout(() => this._scheduleSeagull(), delay));
    }
  }

  window.AudioEngine = new AudioEngine();
})();
