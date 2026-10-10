// AudioEngine.js — every sound in the game, synthesised with the Web Audio API.
//
// No audio files. Each world is a soundscape (a slow musical pad plus its own
// texture: drips, neon hum, rain, wind, waves) that crossfades into the next.
// Interactions get small sounds of their own: a bell for presence, a blip for
// the pull, a buzz for the phone, a rising tone while you hold a choice.
//
//   AudioEngine.unlock()          call from a user gesture (autoplay policy)
//   AudioEngine.scape('swamp')    crossfade to a world
//   AudioEngine.sfx('bell')       one-shot sound
//   AudioEngine.hold()            → { set(p), end(done) } rising hold tone
//   AudioEngine.setEnabled(bool)  mute / unmute
(function () {
  'use strict';
  const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // midi → Hz

  // Each world: pad chord (midi), pad brightness, texture builder name
  const SCAPES = {
    title:  { chord: [50, 57, 64, 66, 73], cutoff: 900, vol: 0.5, texture: 'waves' },
    intro:  { chord: [38, 50, 53, 57, 60], cutoff: 520, vol: 0.45, texture: 'room' },
    swamp:  { chord: [35, 47, 54, 61, 62], cutoff: 600, vol: 0.5, texture: 'swamp' },
    arcade: { chord: [40, 52, 55, 59, 62], cutoff: 760, vol: 0.38, texture: 'arcade' },
    city:   { chord: [41, 48, 52, 57, 64], cutoff: 700, vol: 0.46, texture: 'city' },
    trail:  { chord: [43, 50, 57, 59, 62], cutoff: 1100, vol: 0.5, texture: 'trail' },
    beach:  { chord: [38, 45, 54, 57, 64, 69], cutoff: 1500, vol: 0.55, texture: 'waves' },
    candle: { chord: [45, 52, 57, 64], cutoff: 420, vol: 0.5, texture: null },
  };
  const BELLS = [62, 64, 66, 69, 71, 74, 76, 78, 81]; // D major pentatonic

  class Engine {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      this.current = null;
      this.key = null;
      const first = () => {
        this.unlock();
        ['pointerdown', 'keydown', 'touchstart'].forEach((e) => removeEventListener(e, first, true));
      };
      ['pointerdown', 'keydown', 'touchstart'].forEach((e) => addEventListener(e, first, true));
    }

    unlock() {
      if (!this.ctx) {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          this.ctx = new AC();
        } catch (e) {
          return;
        }
        const c = this.ctx;
        this.master = c.createGain();
        this.master.gain.value = this.enabled ? 0.55 : 0;
        const comp = c.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.ratio.value = 3;
        this.master.connect(comp);
        comp.connect(c.destination);
        this.music = c.createGain();
        this.music.gain.value = 0.8;
        this.music.connect(this.master);
        this.fx = c.createGain();
        this.fx.gain.value = 0.9;
        this.fx.connect(this.master);
        // a soft hall for everything
        this.verb = c.createConvolver();
        this.verb.buffer = this._impulse(3.2, 2.6);
        this.verbIn = c.createGain();
        this.verbIn.gain.value = 0.55;
        this.verbIn.connect(this.verb);
        this.verb.connect(this.master);
        this._noiseBuf = this._makeNoise();
        if (this.key) {
          const k = this.key;
          this.key = null;
          this.scape(k);
        }
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    }

    setEnabled(on) {
      this.enabled = !!on;
      if (this.ctx) this.master.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.25);
    }

    duck(on) {
      if (this.ctx) this.music.gain.setTargetAtTime(on ? 0.25 : 0.8, this.ctx.currentTime, 0.6);
    }

    // ── soundscapes ───────────────────────────────────────────────────────────
    scape(key) {
      if (this.key === key) return;
      this.key = key;
      if (!this.ctx) return; // remembered; built on unlock
      const c = this.ctx, now = c.currentTime;
      const old = this.current;
      if (old) {
        old.bus.gain.cancelScheduledValues(now);
        old.bus.gain.setValueAtTime(old.bus.gain.value, now);
        old.bus.gain.linearRampToValueAtTime(0, now + 2.4);
        old.alive = false;
        old.timers.forEach(clearTimeout);
        setTimeout(() => old.nodes.forEach((n) => { try { n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} }), 2600);
      }
      const def = SCAPES[key];
      if (!def) { this.current = null; return; }
      const s = { bus: c.createGain(), nodes: [], timers: [], alive: true, key };
      s.bus.gain.value = 0;
      s.bus.connect(this.music);
      const send = c.createGain();
      send.gain.value = 0.5;
      s.bus.connect(send);
      send.connect(this.verbIn);
      s.bus.gain.linearRampToValueAtTime(1, now + 3);
      this.current = s;
      this._pad(s, def);
      if (def.texture) this['_' + def.texture](s);
    }

    _pad(s, def) {
      const c = this.ctx;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = def.cutoff;
      lp.Q.value = 0.6;
      const g = c.createGain();
      g.gain.value = def.vol * 0.09;
      lp.connect(g);
      g.connect(s.bus);
      // the filter breathes slowly
      const lfo = c.createOscillator(), lfoG = c.createGain();
      lfo.frequency.value = 0.05;
      lfoG.gain.value = def.cutoff * 0.35;
      lfo.connect(lfoG);
      lfoG.connect(lp.frequency);
      lfo.start();
      s.nodes.push(lfo);
      def.chord.forEach((m, i) => {
        [-6, 6].forEach((det) => {
          const o = c.createOscillator();
          o.type = i === 0 ? 'sine' : 'triangle';
          o.frequency.value = NOTE(m);
          o.detune.value = det + (Math.random() - 0.5) * 3;
          const og = c.createGain();
          og.gain.value = i === 0 ? 0.9 : 0.55 / Math.sqrt(i);
          // each voice swells on its own clock
          const amp = c.createOscillator(), ampG = c.createGain();
          amp.frequency.value = 0.03 + Math.random() * 0.06;
          ampG.gain.value = og.gain.value * 0.45;
          amp.connect(ampG);
          ampG.connect(og.gain);
          amp.start();
          o.connect(og);
          og.connect(lp);
          o.start();
          s.nodes.push(o, amp);
        });
      });
    }

    _src(s, filterType, freq, q, vol, dest) {
      const c = this.ctx;
      const n = c.createBufferSource();
      n.buffer = this._noiseBuf;
      n.loop = true;
      n.loopStart = Math.random() * 2;
      const f = c.createBiquadFilter();
      f.type = filterType;
      f.frequency.value = freq;
      if (q) f.Q.value = q;
      const g = c.createGain();
      g.gain.value = vol;
      n.connect(f);
      f.connect(g);
      g.connect(dest || s.bus);
      n.start(0, Math.random() * 3);
      s.nodes.push(n);
      return { f, g };
    }

    _lfo(s, param, rate, depth) {
      const c = this.ctx;
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = rate;
      g.gain.value = depth;
      o.connect(g);
      g.connect(param);
      o.start();
      s.nodes.push(o);
    }

    _every(s, min, max, fn) {
      const tick = () => {
        if (!s.alive) return;
        try { fn(); } catch (e) {}
        s.timers.push(setTimeout(tick, min + Math.random() * (max - min)));
      };
      s.timers.push(setTimeout(tick, min * Math.random()));
    }

    _tone(freq, type, vol, dur, opts) {
      opts = opts || {};
      const c = this.ctx;
      const t = (opts.at || c.currentTime) + 0.005;
      const o = c.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + (opts.attack || 0.008));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(opts.dest || this.fx);
      if (opts.verb) {
        const sg = c.createGain();
        sg.gain.value = opts.verb;
        g.connect(sg);
        sg.connect(this.verbIn);
      }
      o.start(t);
      o.stop(t + dur + 0.05);
    }

    _room(s) {
      this._src(s, 'lowpass', 180, 0, 0.12);
      this._every(s, 950, 1050, () => this._tone(1900, 'square', 0.006, 0.025, { dest: s.bus }));
    }

    _swamp(s) {
      const bed = this._src(s, 'lowpass', 420, 0, 0.16);
      this._lfo(s, bed.g.gain, 0.08, 0.05);
      this._src(s, 'bandpass', 900, 1.2, 0.035);
      this._every(s, 1800, 6000, () => {
        const f = 1600 + Math.random() * 900;
        this._tone(f, 'sine', 0.03, 0.3, { dest: s.bus, to: f * 0.7 });
      });
      // a notification, somewhere out in the fog
      this._every(s, 6000, 15000, () => {
        const f = [1047, 1175, 1319][Math.floor(Math.random() * 3)];
        this._tone(f, 'sine', 0.018, 0.5, { dest: s.bus, verb: 0.6 });
        this._tone(f * 1.5, 'sine', 0.012, 0.4, { dest: s.bus, at: this.ctx.currentTime + 0.12, verb: 0.6 });
      });
    }

    _arcade(s) {
      const hum = this._src(s, 'bandpass', 120, 6, 0.08);
      this._lfo(s, hum.g.gain, 0.4, 0.02);
      this._src(s, 'bandpass', 950, 0.6, 0.05); // crowd
      // a restless arpeggio, just under the surface
      const seq = [64, 67, 71, 76, 74, 71, 67, 71];
      let i = 0;
      this._every(s, 180, 181, () => {
        const m = seq[i++ % seq.length] + (Math.floor(i / 16) % 2 ? 2 : 0);
        this._tone(NOTE(m), 'sawtooth', 0.012, 0.16, { dest: s.bus });
      });
      this._every(s, 700, 2200, () => this._tone(700 + Math.random() * 700, 'square', 0.012, 0.06, { dest: s.bus }));
    }

    _city(s) {
      const traffic = this._src(s, 'bandpass', 420, 0.4, 0.12);
      this._lfo(s, traffic.g.gain, 0.05, 0.04);
      const rain = this._src(s, 'highpass', 3500, 0, 0.035);
      this._lfo(s, rain.g.gain, 0.11, 0.012);
      this._every(s, 16000, 32000, () => {
        const c = this.ctx, t = c.currentTime;
        const o = c.createOscillator(), g = c.createGain();
        o.frequency.setValueAtTime(700, t);
        o.frequency.linearRampToValueAtTime(860, t + 1.2);
        o.frequency.linearRampToValueAtTime(700, t + 2.4);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.01, t + 0.5);
        g.gain.linearRampToValueAtTime(0, t + 2.5);
        o.connect(g); g.connect(s.bus);
        o.start(t); o.stop(t + 2.6);
      });
    }

    _trail(s) {
      const wind = this._src(s, 'bandpass', 1300, 0.5, 0.06);
      this._lfo(s, wind.g.gain, 0.07, 0.035);
      this._lfo(s, wind.f.frequency, 0.05, 500);
      this._every(s, 1800, 5200, () => {
        const root = [2093, 2349, 2637, 3136][Math.floor(Math.random() * 4)];
        const t = this.ctx.currentTime;
        const calls = Math.random() < 0.5 ? [[1, 0], [1.33, 0.09]] : [[1.25, 0], [1, 0.07], [1.5, 0.16]];
        calls.forEach(([r, d]) => this._tone(root * r, 'sine', 0.02, 0.14, { dest: s.bus, at: t + d, attack: 0.02, to: root * r * 1.06 }));
      });
    }

    _waves(s) {
      const a = this._src(s, 'lowpass', 650, 0, 0.2);
      this._lfo(s, a.g.gain, 0.12, 0.16);
      const b = this._src(s, 'lowpass', 380, 0, 0.12);
      this._lfo(s, b.g.gain, 0.085, 0.09);
      this._src(s, 'highpass', 5200, 0, 0.012);
      this._every(s, 5000, 12000, () => {
        const c = this.ctx, t = c.currentTime, dur = 0.6 + Math.random() * 0.4;
        const o = c.createOscillator(), g = c.createGain();
        o.frequency.setValueAtTime(750 + Math.random() * 250, t);
        o.frequency.linearRampToValueAtTime(1150, t + dur * 0.35);
        o.frequency.linearRampToValueAtTime(620, t + dur);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.014, t + 0.08);
        g.gain.linearRampToValueAtTime(0, t + dur);
        o.connect(g); g.connect(s.bus);
        o.start(t); o.stop(t + dur + 0.1);
      });
    }

    // ── one-shots ─────────────────────────────────────────────────────────────
    sfx(name, opt) {
      if (!this.ctx || !this.enabled) return;
      const c = this.ctx, t = c.currentTime;
      const bell = (m, vol, at, len) => {
        const f = NOTE(m);
        [[1, 1], [2.76, 0.35], [5.4, 0.12]].forEach(([r, v]) => this._tone(f * r, 'sine', vol * v, (len || 2.4) / r, { at: t + (at || 0), verb: 0.9 }));
      };
      switch (name) {
        case 'bell': {
          const i = typeof opt === 'number' ? opt : Math.floor(Math.random() * 5);
          bell(BELLS[i % BELLS.length], 0.07);
          bell(BELLS[(i + 2) % BELLS.length] + 12, 0.025, 0.09);
          break;
        }
        case 'blip':
          this._tone(880, 'square', 0.035, 0.08, { to: 1320 });
          this._tone(1320, 'square', 0.025, 0.08, { at: t + 0.07, to: 1760 });
          this._tone(1760, 'square', 0.018, 0.12, { at: t + 0.14, to: 990 });
          break;
        case 'item':
          [0, 2, 4, 7].forEach((k, i) => bell(BELLS[k] + 12, 0.05, i * 0.09, 2.6));
          break;
        case 'notify':
          this._tone(1319, 'sine', 0.05, 0.25, { verb: 0.3 });
          this._tone(1760, 'sine', 0.04, 0.35, { at: t + 0.11, verb: 0.3 });
          break;
        case 'buzz': {
          const o = c.createOscillator(), g = c.createGain(), am = c.createOscillator(), amg = c.createGain();
          o.type = 'square'; o.frequency.value = 150;
          am.frequency.value = 28; amg.gain.value = 0.02;
          g.gain.value = 0.02;
          am.connect(amg); amg.connect(g.gain);
          const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
          o.connect(lp); lp.connect(g); g.connect(this.fx);
          g.gain.setValueAtTime(0.02, t); g.gain.linearRampToValueAtTime(0, t + 0.32);
          o.start(t); am.start(t); o.stop(t + 0.34); am.stop(t + 0.34);
          break;
        }
        case 'tick':
          this._tone(2400, 'square', 0.012, 0.02);
          break;
        case 'toggle':
          this._tone(1200, 'sine', 0.04, 0.05, { to: 600 });
          break;
        case 'type':
          this._tone(3000 + Math.random() * 800, 'triangle', 0.006, 0.02);
          break;
        case 'whoosh': {
          const n = c.createBufferSource(); n.buffer = this._noiseBuf;
          const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
          f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2400, t + 0.9); f.frequency.exponentialRampToValueAtTime(500, t + 1.8);
          const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 0.8); g.gain.linearRampToValueAtTime(0, t + 1.9);
          n.connect(f); f.connect(g); g.connect(this.fx); g.connect(this.verbIn);
          n.start(t); n.stop(t + 2);
          break;
        }
        case 'chapter':
          this._tone(NOTE(38), 'sine', 0.12, 4, { attack: 1.2, verb: 0.8 });
          bell(74, 0.05, 0.9, 3.2);
          bell(81, 0.03, 1.3, 3.2);
          break;
        case 'shatter': {
          const n = c.createBufferSource(); n.buffer = this._noiseBuf;
          const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500;
          const g = c.createGain(); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
          n.connect(f); f.connect(g); g.connect(this.fx); g.connect(this.verbIn);
          n.start(t); n.stop(t + 1);
          for (let i = 0; i < 9; i++) this._tone(2200 + Math.random() * 3800, 'sine', 0.02, 0.3 + Math.random() * 0.6, { at: t + Math.random() * 0.4, verb: 0.6 });
          bell(62, 0.06, 0.35, 3.5);
          break;
        }
        case 'breathIn':
          this._tone(NOTE(57), 'sine', 0.05, 4.2, { attack: 3.6, verb: 0.9 });
          break;
        case 'breathOut':
          this._tone(NOTE(52), 'sine', 0.045, 6, { attack: 0.4, verb: 0.9 });
          break;
        case 'sunrise':
          [38, 50, 57, 62, 66, 69, 74].forEach((m, i) => this._tone(NOTE(m), i < 2 ? 'sine' : 'triangle', 0.05 / (1 + i * 0.3), 7, { at: t + i * 0.18, attack: 1.4, verb: 1 }));
          break;
        case 'heartbeat':
          this._tone(55, 'sine', 0.2, 0.18, { to: 40 });
          this._tone(52, 'sine', 0.14, 0.2, { at: t + 0.22, to: 38 });
          break;
      }
    }

    // a tone that climbs while a choice is held
    hold() {
      if (!this.ctx || !this.enabled) return { set() {}, end() {} };
      const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o2.type = 'triangle';
      o.frequency.value = NOTE(50); o2.frequency.value = NOTE(57);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.15);
      o.connect(g); o2.connect(g); g.connect(this.fx);
      const sg = c.createGain(); sg.gain.value = 0.6; g.connect(sg); sg.connect(this.verbIn);
      o.start(t); o2.start(t);
      let ended = false;
      return {
        set: (p) => {
          if (ended) return;
          const now = c.currentTime;
          o.frequency.setTargetAtTime(NOTE(50 + p * 12), now, 0.05);
          o2.frequency.setTargetAtTime(NOTE(57 + p * 12), now, 0.05);
        },
        end: (done) => {
          if (ended) return;
          ended = true;
          const now = c.currentTime;
          g.gain.cancelScheduledValues(now);
          g.gain.setValueAtTime(g.gain.value, now);
          g.gain.linearRampToValueAtTime(0, now + (done ? 0.6 : 0.2));
          o.stop(now + 0.7); o2.stop(now + 0.7);
        },
      };
    }

    // ── buffers ───────────────────────────────────────────────────────────────
    _makeNoise() {
      const c = this.ctx, len = c.sampleRate * 4;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
      return buf;
    }

    _impulse(seconds, decay) {
      const c = this.ctx, len = Math.floor(c.sampleRate * seconds);
      const buf = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return buf;
    }
  }

  window.AudioEngine = new Engine();
})();
