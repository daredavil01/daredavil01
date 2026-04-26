// AudioEngine.js — Web Audio API ambient soundscapes
(function () {
  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.nodes = [];
      this.muted = false;
      this.currentBg = null;
    }

    init() {
      if (this.ctx) return;
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.28;
        this.master.connect(this.ctx.destination);
      } catch (e) { console.warn('AudioEngine: no Web Audio support'); }
    }

    play(bg) {
      if (!this.ctx) this.init();
      if (!this.ctx || this.currentBg === bg) return;
      this._fadeStop(() => {
        this.currentBg = bg;
        const fn = {
          intro:  () => this._intro(),
          swamp:  () => this._swamp(),
          arcade: () => this._arcade(),
          city:   () => this._city(),
          trail:  () => this._trail(),
          beach:  () => this._beach(),
        }[bg];
        if (fn) fn();
      });
    }

    toggle() {
      this.muted = !this.muted;
      if (this.master) {
        this.master.gain.setTargetAtTime(this.muted ? 0 : 0.28, this.ctx.currentTime, 0.3);
      }
      return this.muted;
    }

    // ── internals ──────────────────────────────────────────────────────────────
    _fadeStop(cb) {
      if (!this.ctx || this.nodes.length === 0) { this.nodes = []; if (cb) cb(); return; }
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(1, this.ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.6);
      this.nodes.forEach(n => {
        try {
          if (n._gainNode) { n._gainNode.connect(g); g.connect(this.master); }
        } catch (e) {}
      });
      setTimeout(() => {
        this.nodes.forEach(n => { try { n.stop ? n.stop() : null; } catch (e) {} });
        this.nodes = [];
        if (cb) cb();
      }, 650);
    }

    _noise(color = 'pink') {
      const sr = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, sr * 3, sr);
      const d = buf.getChannelData(0);
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1;
        if (color === 'pink') {
          b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
          b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
          b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
          d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6=w*0.115926;
        } else { d[i] = w; }
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      return src;
    }

    _osc(freq, type = 'sine') {
      const o = this.ctx.createOscillator();
      o.frequency.value = freq; o.type = type; return o;
    }

    _chain(src, ...processors) {
      let node = src;
      for (const p of processors) { node.connect(p); node = p; }
      node.connect(this.master);
      if (src.start) src.start();
      this.nodes.push(src);
    }

    _gain(val) {
      const g = this.ctx.createGain(); g.gain.value = val; return g;
    }

    _filter(type, freq, q) {
      const f = this.ctx.createBiquadFilter();
      f.type = type; f.frequency.value = freq;
      if (q !== undefined) f.Q.value = q;
      return f;
    }

    // ── INTRO — quiet room hum ────────────────────────────────────────────────
    _intro() {
      this._chain(this._noise('pink'), this._filter('lowpass', 180), this._gain(0.12));
      const o = this._osc(55, 'sine'); this._chain(o, this._gain(0.05));
    }

    // ── SWAMP — deep forest, dripping ────────────────────────────────────────
    _swamp() {
      // Low-pass pink noise (forest bed)
      this._chain(this._noise('pink'), this._filter('lowpass', 350), this._gain(0.18));
      // Sub drone
      const d = this._osc(75, 'triangle'); this._chain(d, this._gain(0.055));
      // Slow LFO tremolo
      const lfo = this._osc(0.25, 'sine');
      const lfoG = this._gain(0.06);
      lfo.connect(lfoG);
      const trem = this._gain(0.15);
      lfoG.connect(trem.gain);
      this._chain(this._noise('pink'), this._filter('bandpass', 600, 2), trem);
      if (lfo.start) lfo.start(); this.nodes.push(lfo);
    }

    // ── ARCADE — neon buzz, coin bleeps ──────────────────────────────────────
    _arcade() {
      // Bandpass buzz
      this._chain(this._noise(), this._filter('bandpass', 1200, 4), this._gain(0.07));
      // Square drones
      const sq1 = this._osc(220, 'square'); this._chain(sq1, this._filter('lowpass', 500), this._gain(0.03));
      const sq2 = this._osc(440, 'square'); this._chain(sq2, this._filter('lowpass', 300), this._gain(0.018));
      // Periodic blip
      this._scheduleBlips();
    }

    _scheduleBlips() {
      if (!this.ctx || this.currentBg !== 'arcade') return;
      const t = this.ctx.currentTime;
      const o = this._osc(880 + Math.random()*440, 'square');
      const g = this._gain(0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.04, t + 0.01);
      g.gain.linearRampToValueAtTime(0, t + 0.08);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.1);
      this.nodes.push(o);
      const delay = 0.8 + Math.random() * 2.2;
      this._blipTimeout = setTimeout(() => this._scheduleBlips(), delay * 1000);
    }

    // ── CITY — traffic hum, distant sirens ───────────────────────────────────
    _city() {
      this._chain(this._noise('pink'), this._filter('bandpass', 600, 0.4), this._gain(0.14));
      const rumble = this._osc(100, 'triangle'); this._chain(rumble, this._gain(0.04));
      // Slow swell
      const swell = this._osc(0.05, 'sine');
      const swG = this._gain(0.04);
      swell.connect(swG);
      const bed = this._gain(0.12);
      swG.connect(bed.gain);
      this._chain(this._noise('pink'), this._filter('lowpass', 400), bed);
      if (swell.start) swell.start(); this.nodes.push(swell);
    }

    // ── TRAIL — wind, birds ───────────────────────────────────────────────────
    _trail() {
      // Wind layer
      this._chain(this._noise('pink'), this._filter('highpass', 800), this._filter('lowpass', 3500), this._gain(0.08));
      // Slow wind swell LFO
      const wlfo = this._osc(0.08, 'sine');
      const wg = this._gain(0.05);
      wlfo.connect(wg);
      const wind2 = this._gain(0.06);
      wg.connect(wind2.gain);
      this._chain(this._noise('pink'), this._filter('bandpass', 1400, 0.8), wind2);
      if (wlfo.start) wlfo.start(); this.nodes.push(wlfo);
      // Bird chirps
      this._scheduleBirds();
    }

    _scheduleBirds() {
      if (!this.ctx || this.currentBg !== 'trail') return;
      const t = this.ctx.currentTime;
      const freqs = [2400, 3200, 2800, 3600, 2200];
      const f = freqs[Math.floor(Math.random() * freqs.length)];
      const o = this._osc(f, 'sine');
      const o2 = this._osc(f * 1.25, 'sine');
      const g = this._gain(0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.018, t + 0.04);
      g.gain.linearRampToValueAtTime(0.012, t + 0.12);
      g.gain.linearRampToValueAtTime(0, t + 0.22);
      [o, o2].forEach(x => { x.connect(g); x.start(t); x.stop(t + 0.25); this.nodes.push(x); });
      g.connect(this.master);
      const delay = 1.5 + Math.random() * 4;
      this._birdTimeout = setTimeout(() => this._scheduleBirds(), delay * 1000);
    }

    // ── BEACH — waves, seabirds ───────────────────────────────────────────────
    _beach() {
      // Wave noise — slow LFO on volume
      const noise = this._noise('pink');
      const lp = this._filter('lowpass', 500);
      const waveG = this._gain(0.22);
      const lfo = this._osc(0.14, 'sine');
      const lfoG = this._gain(0.18);
      lfo.connect(lfoG); lfoG.connect(waveG.gain);
      noise.connect(lp); lp.connect(waveG); waveG.connect(this.master);
      if (noise.start) noise.start(); this.nodes.push(noise);
      if (lfo.start) lfo.start(); this.nodes.push(lfo);
      // High shimmer
      this._chain(this._noise(), this._filter('highpass', 4000), this._gain(0.025));
    }
  }

  window.AudioEngine = new AudioEngine();
})();
