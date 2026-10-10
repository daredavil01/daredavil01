// game.js — The Wanderer's Digital Escape.
//
// React 18 + htm (tagged templates, so there is no build step and no Babel).
// The app is four views: the title, the night itself (scene after scene), the
// beach at sunrise with your results, and the "How it works" field notes.
// The backdrop is world.js (a canvas), the sound AudioEngine.js, the story
// game-scenes.js and the interactive objects vignettes.js.
(function () {
  'use strict';
  if (!window.React || !window.ReactDOM || !window.htm || !window.WDE) return;
  const { useState, useEffect, useRef, useCallback, useMemo } = React;
  const html = htm.bind(React.createElement);
  const { WORLDS, ITEMS, SCENES, STARTS, STEPS, ARCHETYPES, VIGNETTES, Candle } = window.WDE;
  const World = window.World;
  const Sound = window.AudioEngine;
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const PARAMS = new URLSearchParams(location.search);

  // ── constants ───────────────────────────────────────────────────────────────
  const INITIAL = { focus: 30, dopamine: 40, oneness: 25, tranquility: 20 };
  const METERS = [
    { key: 'focus', label: 'Focus', color: '#7dd3fc', hint: 'Your capacity for deep, sustained thought.' },
    { key: 'dopamine', label: 'Dopamine', color: '#fbbf6a', hint: 'The reward signal of the scroll. This one works in reverse — lower is freer.' },
    { key: 'oneness', label: 'Oneness', color: '#c4b5fd', hint: 'Your real-world connections and presence.' },
    { key: 'tranquility', label: 'Tranquility', color: '#86efac', hint: 'Inner stillness beyond the noise.' },
  ];
  const MC = Object.fromEntries(METERS.map((m) => [m.key, m]));
  const PACE = {
    calm: { word: 34, read: 52, pause: 700 },
    brisk: { word: 16, read: 20, pause: 260 },
    instant: { word: 0, read: 0, pause: 0 },
  };
  const NODE_POS = STARTS.map((id) => (SCENES[id].step / STEPS) * 100);
  const SAVE = 'wde.v2', PREFS = 'wde.prefs';
  const SECONDS_PER_SCENE = 24;

  // ── helpers ─────────────────────────────────────────────────────────────────
  const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
  const applyEffects = (m, e) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, clamp(v + ((e && e[k]) || 0))]));
  const valence = (e = {}) => (e.focus || 0) + (e.oneness || 0) + (e.tranquility || 0) - (e.dopamine || 0);
  const flourishing = (m) => Math.round((m.focus + m.oneness + m.tranquility + (100 - m.dopamine)) / 4);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const unquote = (s) => s.replace(/^[“"]|[”"]$/g, '');

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  function freshGame() {
    return { sceneId: 'intro', meters: { ...INITIAL }, items: [], seen: [], log: [], five: ['', '', '', '', ''], journal: '', commits: [] };
  }
  function loadGame() {
    const g = store.get(SAVE, null);
    if (g && SCENES[g.sceneId]) return { ...freshGame(), ...g };
    // a save from the first version of the game
    try {
      const id = localStorage.getItem('wde_scene');
      if (id && SCENES[id] && id !== 'intro') {
        return { ...freshGame(), sceneId: id, meters: JSON.parse(localStorage.getItem('wde_meters') || 'null') || { ...INITIAL },
          items: JSON.parse(localStorage.getItem('wde_inv') || '[]').filter((k) => ITEMS[k]), seen: JSON.parse(localStorage.getItem('wde_seen') || '[]') };
      }
    } catch (e) {}
    return null;
  }
  const hasProgress = (g) => !!g && (g.sceneId !== 'intro' || g.log.length > 0);

  function dimensions(m, overall) {
    const f = m.focus, o = m.oneness, t = m.tranquility, d = m.dopamine;
    return [
      { name: 'Physical Health', short: 'Body', score: Math.min(100, t + 15), how: 'Tranquility + 15' },
      { name: 'Psychological Wellbeing', short: 'Mind', score: Math.min(100, f + 8), how: 'Focus + 8' },
      { name: 'Focus & Attention', short: 'Attention', score: f, how: 'Focus' },
      { name: 'Social Connection', short: 'Connection', score: o, how: 'Oneness' },
      { name: 'Inner Tranquility', short: 'Stillness', score: t, how: 'Tranquility' },
      { name: 'Dopamine Freedom', short: 'Freedom', score: clamp(100 - d), how: '100 − Dopamine' },
      { name: 'Intentionality', short: 'Intent', score: Math.min(100, Math.round((f + t) / 2)), how: '(Focus + Tranquility) ÷ 2' },
      { name: 'Digital Flourishing', short: 'Flourishing', score: overall, how: 'The overall score' },
    ];
  }

  function nearestArchetype(m) {
    let best = ARCHETYPES[0], bd = Infinity;
    for (const a of ARCHETYPES) {
      const d = METERS.reduce((s, { key }) => s + (a.meters[key] - m[key]) ** 2, 0);
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  }

  function getTips(m) {
    const t = [];
    if (m.focus < 55) t.push({ id: 'focus', meter: 'focus', title: 'Rebuild your Focus', text: 'Replace 30 minutes of reels with a podcast or long-form article each day. Your brain will start remembering what it consumes.' });
    else t.push({ id: 'deeper', meter: 'focus', title: 'Go deeper', text: 'Your focus is strong. Now challenge it — pick one complex topic and read three long-form pieces on it this week.' });
    if (m.dopamine > 65) t.push({ id: 'detox', meter: 'dopamine', title: 'Try a 24-hour notification detox', text: 'Turn off every non-essential notification for one full day. Each ping costs an average of 23 minutes of deep focus.' });
    else t.push({ id: 'balance', meter: 'dopamine', title: 'Maintain your dopamine balance', text: "You've kept the dopamine arc in check. Protect it — audit your app usage weekly and delete what you haven't opened in a month." });
    if (m.oneness < 50) t.push({ id: 'five', meter: 'oneness', title: 'Invest in your five', text: 'Schedule a 2-hour phone-free conversation with someone in your inner circle this week. No agenda, no audience.' });
    else t.push({ id: 'sadagi', meter: 'oneness', title: 'Practise Sadagi', text: "You've found oneness. Deepen it — the next time you're with someone you love, leave the phone in another room entirely." });
    if (m.tranquility < 50) t.push({ id: 'morning', meter: 'tranquility', title: 'Claim the 5:30am hour', text: 'Try one morning without the phone. Run, read, write. See what the world looks like before the feeds wake up.' });
    else t.push({ id: 'stillness', meter: 'tranquility', title: 'Extend your stillness', text: 'You have found tranquility. Now try Sthitaprajnata in a difficult moment — observe the notification, feel the pull, and choose not to open it.' });
    return t;
  }

  // read aloud (Web Speech)
  const Voice = {
    ok: typeof window.speechSynthesis !== 'undefined',
    speak(text, onEnd) {
      if (!this.ok) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.92;
      const vs = speechSynthesis.getVoices();
      const v = vs.find((x) => /^en/.test(x.lang) && /Natural|Google UK|Daniel|Serena|Samantha/.test(x.name)) || vs.find((x) => /^en/.test(x.lang));
      if (v) u.voice = v;
      u.onend = u.onerror = () => onEnd && onEnd();
      speechSynthesis.speak(u);
    },
    stop() { if (this.ok) speechSynthesis.cancel(); },
  };
  const sceneSpeech = (s) => (s.boss ? `Boss: ${s.boss}. ` : '') + s.beats.map((b) => b.replace(/^⚡\s*/, '')).join(' ') +
    (s.dataStats ? ' ' + s.dataStats.map((d) => `${d.label}, ${d.value} percent.`).join(' ') : '');

  // ── icons ───────────────────────────────────────────────────────────────────
  const svg = (d, extra) => html`<svg viewBox="0 0 24 24" aria-hidden="true" className="ico">${extra}<path d=${d} /></svg>`;
  const I = {
    soundOn: svg('M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11'),
    soundOff: svg('M4 9.5h3.5L12 5.5v13l-4.5-4H4zM16 9.5l5 5M21 9.5l-5 5'),
    menu: svg('M4 8h16M4 16h10'),
    close: svg('M6 6l12 12M18 6L6 18'),
    listen: svg('M3 12h2M7 8v8M11 5v14M15 8v8M19 11v2'),
    arrow: svg('M5 12h14M13 6l6 6-6 6'),
    down: svg('M12 5v14M6 13l6 6 6-6'),
    back: svg('M19 12H5M11 6l-6 6 6 6'),
    undo: svg('M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-2'),
    download: svg('M12 4v11M7 10l5 5 5-5M5 20h14'),
    share: svg('M12 15V4M7 9l5-5 5 5M5 14v5h14v-5'),
    link: svg('M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'),
    restart: svg('M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5'),
    home: svg('M4 11l8-6.5 8 6.5M6 9.5V20h12V9.5'),
    book: svg('M5 4.5h12a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2zM5 18a2 2 0 0 1 2-2h12'),
    item: (k, cls) => html`<svg viewBox="0 0 24 24" aria-hidden="true" className=${'ico ico--item ' + (cls || '')}><path d=${ITEMS[k].path} /></svg>`,
  };

  // the little four-petal gauge of your meters
  function Gauge({ m, size = 34 }) {
    const c = 20, r = 15;
    const arc = (k, v) => {
      const a0 = (-90 + k * 90 + 8) * (Math.PI / 180);
      const a1 = a0 + (74 * clamp(v, 1, 100) / 100) * (Math.PI / 180);
      return `M${c + r * Math.cos(a0)} ${c + r * Math.sin(a0)} A${r} ${r} 0 0 1 ${c + r * Math.cos(a1)} ${c + r * Math.sin(a1)}`;
    };
    const glow = (m.focus + m.oneness + m.tranquility) / 300;
    return html`<svg className="gauge" viewBox="0 0 40 40" width=${size} height=${size} aria-hidden="true">
      ${METERS.map((x, k) => html`<path key=${x.key + 'b'} className="gauge__bg" d=${arc(k, 100)} />`)}
      ${METERS.map((x, k) => html`<path key=${x.key} className="gauge__arc" d=${arc(k, m[x.key])} style=${{ stroke: x.color }} />`)}
      <circle cx="20" cy="20" r=${3 + glow * 4} className="gauge__core" style=${{ opacity: 0.35 + glow * 0.65 }} />
    </svg>`;
  }

  function useInView(ref, threshold = 0.3) {
    const [v, setV] = useState(false);
    useEffect(() => {
      const el = ref.current;
      if (!el || !('IntersectionObserver' in window)) { setV(true); return; }
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); io.disconnect(); } }, { threshold });
      io.observe(el);
      return () => io.disconnect();
    }, []);
    return v;
  }

  function useTween(run, ms = 1600, delay = 0) {
    const [k, setK] = useState(REDUCED && run ? 1 : 0);
    useEffect(() => {
      if (!run) return;
      if (REDUCED) { setK(1); return; }
      let raf, t0 = performance.now() + delay;
      const loop = () => {
        const x = clamp((performance.now() - t0) / ms, 0, 1);
        setK(1 - Math.pow(1 - x, 3));
        if (x < 1) raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }, [run]);
    return k;
  }

  // ── TITLE ───────────────────────────────────────────────────────────────────
  function Title({ save, onBegin, onInfo, prefs, toggleSound }) {
    useEffect(() => {
      World.set({ mode: 'title', biome: 'beach', time: '04:35', boss: false, ghost: false, lean: 0, dim: 0, lamp: 'lantern', running: false, sleep: false,
        light: { focus: 62, dopamine: 25, oneness: 58, tranquility: 60 } });
      Sound.scape('title');
    }, []);
    const s = save && SCENES[save.sceneId];
    const w = s && WORLDS[s.world];
    return html`<main className="title" id="main">
      <button className="title__sound" onClick=${toggleSound} aria-label=${prefs.sound ? 'Mute sound' : 'Turn sound on'}>${prefs.sound ? I.soundOn : I.soundOff}<span>${prefs.sound ? 'Sound on' : 'Sound off'}</span></button>
      <div className="title__body">
        <p className="kicker title__kicker">A digital-wellbeing story · one night long</p>
        <h1 className="title__h1"><span>The Wanderer’s</span><em>Digital Escape</em></h1>
        <p className="title__q">“What lies beyond the horizon of your mundane life?”</p>
        <p className="title__lede">It is 22:47 and your phone is still glowing. Walk out of the feed — through four worlds built from it — and reach a quiet beach by sunrise. Every choice changes the light you carry.</p>
        <div className="title__ctas">
          <button className="btn btn--primary btn--big" onClick=${() => onBegin(false)} autoFocus=${!s}>Begin the journey ${I.arrow}</button>
          ${s ? html`<button className="btn btn--glass btn--big" onClick=${() => onBegin(true)} autoFocus>
            Continue <span className="btn__sub">${w.roman ? 'Chapter ' + w.roman + ' · ' : ''}${w.short} · ${s.time}</span></button>` : null}
        </div>
        <ul className="title__meta">
          <li>4 worlds</li><li>~12 minutes</li><li>${prefs.sound ? 'Best with sound' : 'Sound is off'}</li>
        </ul>
        <ul className="title__meters" aria-label="The four meters you carry">
          ${METERS.map((m) => html`<li key=${m.key} title=${m.hint}><i style=${{ background: m.color, boxShadow: `0 0 10px ${m.color}` }} />${m.label}</li>`)}
        </ul>
      </div>
      <footer className="title__foot">
        <button className="link" onClick=${onInfo}>How it works</button>
        <span aria-hidden="true">·</span>
        <span>A story by Sanket Tambare</span>
      </footer>
    </main>`;
  }

  // ── HUD ─────────────────────────────────────────────────────────────────────
  function HUD({ scene, game, ghost, prefs, onSound, onLight, onMenu, compact }) {
    const world = WORLDS[scene.world];
    const progress = scene.step / STEPS;
    return html`<header className=${'hud' + (compact ? ' hud--compact' : '')}>
      <div className="hud__where">
        <span className="hud__chapter">${world.roman ? world.roman + ' · ' : ''}${world.short}</span>
        <span className="hud__clock">${scene.time}</span>
        ${ghost ? html`<span className="hud__ghost" title="Dopamine above 75 — you are somewhere else">Elsewhere</span>` : null}
      </div>
      ${compact ? null : html`<div className="hud__path" role="progressbar" aria-label="Journey to the beach" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(progress * 100)}>
        <span className="hud__line"><i style=${{ width: progress * 100 + '%' }} /></span>
        ${WORLDS.map((w, i) => html`<span key=${i} className=${'hud__node' + (i < scene.world ? ' is-past' : i === scene.world ? ' is-here' : '') + (i === 5 ? ' is-beach' : '')}
          style=${{ left: NODE_POS[i] + '%' }} title=${w.name}><b>${i === 5 ? '☀' : w.roman || '·'}</b></span>`)}
      </div>`}
      <div className="hud__tools">
        <button className="hud__btn hud__btn--gauge" onClick=${onLight} aria-label="Your inner light: the four meters" title="Your inner light (I)">
          <${Gauge} m=${game.meters} /></button>
        <button className="hud__btn" onClick=${onSound} aria-label=${prefs.sound ? 'Mute sound' : 'Turn sound on'} title="Sound (M)">${prefs.sound ? I.soundOn : I.soundOff}</button>
        <button className="hud__btn" onClick=${onMenu} aria-label="Menu" title="Menu (Esc)">${I.menu}</button>
      </div>
    </header>`;
  }

  // ── CHAPTER CARD ────────────────────────────────────────────────────────────
  function ChapterCard({ n, onEnter }) {
    const w = WORLDS[n];
    const s = SCENES[STARTS[n]];
    const mins = Math.max(1, Math.round(((STEPS - s.step) * SECONDS_PER_SCENE) / 60));
    const done = useRef(false);
    const enter = () => { if (!done.current) { done.current = true; onEnter(); } };
    useEffect(() => {
      const t = setTimeout(enter, REDUCED ? 6000 : 8200);
      const k = (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); enter(); } };
      addEventListener('keydown', k);
      return () => { clearTimeout(t); removeEventListener('keydown', k); };
    }, []);
    return html`<div className="chapter" role="dialog" aria-modal="true" aria-label=${w.name} onClick=${enter}>
      <div className="chapter__inner">
        <div className="chapter__roman" aria-hidden="true">${w.roman}</div>
        <p className="kicker chapter__num">Chapter ${['', 'One', 'Two', 'Three', 'Four'][n]} of Four</p>
        <h2 className="chapter__title">${w.name}</h2>
        <p className="chapter__desc">${w.desc}</p>
        <p className="chapter__time">${s.time} · about ${mins} minute${mins === 1 ? '' : 's'} to dawn</p>
        <button className="chapter__enter" onClick=${(e) => { e.stopPropagation(); enter(); }}><span>Enter</span><i /></button>
      </div>
    </div>`;
  }

  // ── A BEAT OF NARRATION ─────────────────────────────────────────────────────
  function Beat({ text, instant }) {
    const kind = text.startsWith('⚡') ? 'status' : /^[“"]/.test(text) ? 'quote' : '';
    const clean = kind === 'status' ? text.replace(/^⚡\s*/, '') : text;
    const parts = clean.split(/(\s+)/);
    let n = 0;
    return html`<p className=${'beat' + (kind ? ' beat--' + kind : '') + (instant ? ' is-instant' : '')}>
      <span className="sr-only">${clean}</span>
      <span aria-hidden="true">${parts.map((w, i) => (/^\s+$/.test(w) ? ' ' : html`<span key=${i} className="w" style=${{ '--i': n++ }}>${w}</span>`))}</span>
    </p>`;
  }

  // ── CHOICES ─────────────────────────────────────────────────────────────────
  function lean(c) {
    const v = valence(c.effects);
    World.set({ lean: v > 0 ? 0.9 : -0.9 });
  }

  function Choice({ c, i, onPick, onHover, state }) {
    return html`<button className=${'choice ' + state} onClick=${() => onPick(i)}
      onMouseEnter=${() => { onHover(i); lean(c); }} onMouseLeave=${() => { onHover(-1); World.set({ lean: 0 }); }}
      onFocus=${() => { onHover(i); lean(c); }} onBlur=${() => { onHover(-1); World.set({ lean: 0 }); }}
      style=${{ '--d': i * 0.09 + 's' }}>
      <span className="choice__n" aria-hidden="true">${i + 1}</span>
      <span className="choice__text">${c.text}</span>
      <span className="choice__go" aria-hidden="true">${I.arrow}</span>
    </button>`;
  }

  function HoldChoice({ c, i, onDone, onProgress, onHover, register, state }) {
    const ms = c.holdMs || (REDUCED ? 900 : 1500);
    const [p, setP] = useState(0);
    const st = useRef({ holding: false, p: 0, raf: 0, last: 0, tone: null, done: false });
    const cb = useRef();
    cb.current = { onDone, onProgress };
    const loop = (now) => {
      const s = st.current;
      const dt = now - s.last;
      s.last = now;
      s.p = clamp(s.p + (s.holding ? dt / ms : -dt / 450), 0, 1);
      setP(s.p);
      cb.current.onProgress(i, s.p);
      if (s.tone) s.tone.set(s.p);
      if (s.p >= 1 && !s.done) {
        s.done = true;
        if (s.tone) { s.tone.end(true); s.tone = null; }
        s.raf = 0;
        cb.current.onDone(i);
        return;
      }
      s.raf = s.p > 0 || s.holding ? requestAnimationFrame(loop) : 0;
    };
    const press = () => {
      const s = st.current;
      if (s.done || s.holding) return;
      s.holding = true;
      if (!s.tone) s.tone = Sound.hold();
      if (!s.raf) { s.last = performance.now(); s.raf = requestAnimationFrame(loop); }
    };
    const release = () => {
      const s = st.current;
      s.holding = false;
      if (s.tone) { s.tone.end(false); s.tone = null; }
    };
    useEffect(() => {
      register(i, { press, release });
      return () => { cancelAnimationFrame(st.current.raf); release(); register(i, null); };
    }, []);
    const R = 9, C = 2 * Math.PI * R;
    return html`<button className=${'choice choice--hold ' + state + (p > 0 ? ' is-holding' : '')} style=${{ '--p': p, '--d': i * 0.09 + 's' }}
      onPointerDown=${(e) => { if (e.button === 0) { e.preventDefault(); press(); } }} onPointerUp=${release} onPointerLeave=${release} onPointerCancel=${release}
      onKeyDown=${(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(); } }}
      onKeyUp=${(e) => { if (e.key === ' ' || e.key === 'Enter') release(); }}
      onClick=${(e) => e.preventDefault()} onContextMenu=${(e) => e.preventDefault()}
      onMouseEnter=${() => { onHover(i); lean(c); }} onMouseLeave=${() => { onHover(-1); World.set({ lean: 0 }); }}
      onFocus=${() => { onHover(i); lean(c); }} onBlur=${() => { onHover(-1); World.set({ lean: 0 }); }}
      aria-label=${c.text + ' — press and hold to choose'}>
      <span className="choice__fill" aria-hidden="true" />
      <span className="choice__n" aria-hidden="true">${i + 1}</span>
      <span className="choice__text">${c.text}</span>
      <span className="choice__hold" aria-hidden="true">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r=${R} className="bg" /><circle cx="12" cy="12" r=${R} className="fg" style=${{ strokeDasharray: C, strokeDashoffset: C * (1 - p) }} /></svg>
        <span>${p >= 1 ? 'Yes' : 'Hold'}</span>
      </span>
    </button>`;
  }

  // ── A SCENE ─────────────────────────────────────────────────────────────────
  function SceneView({ scene, sceneId, game, setGame, prefs, onChoose, leaving }) {
    const beats = scene.beats;
    const instantPace = prefs.pace === 'instant' || REDUCED;
    const pace = PACE[prefs.pace] || PACE.calm;
    const [shown, setShown] = useState(instantPace ? beats.length : 0);
    const [skip, setSkip] = useState(instantPace);
    const [ready, setReady] = useState(false);
    const [mode, setMode] = useState(null);
    const [hold, setHold] = useState({ i: -1, p: 0 });
    const [hover, setHover] = useState(-1);
    const [playing, setPlaying] = useState(null);
    const [suggest, setSuggest] = useState(-1);
    const [nudge, setNudge] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const holds = useRef({});
    const root = useRef(null);
    const lastBeat = useRef(null);
    const choicesRef = useRef(null);
    const chosen = useRef(false);
    const V = scene.vignette && VIGNETTES[scene.vignette];

    // reveal the beats one after another
    useEffect(() => {
      if (shown === 0) { const t = setTimeout(() => setShown(1), 450); return () => clearTimeout(t); }
      if (shown >= beats.length) { const t = setTimeout(() => setReady(true), skip ? 120 : 520); return () => clearTimeout(t); }
      const words = beats[shown - 1].split(/\s+/).length;
      const t = setTimeout(() => setShown((s) => s + 1), words * pace.word + Math.min(3600, words * pace.read) + pace.pause);
      return () => clearTimeout(t);
    }, [shown, skip]);

    useEffect(() => {
      if (shown > 1 && lastBeat.current) lastBeat.current.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });
    }, [shown]);
    useEffect(() => {
      if (ready && choicesRef.current) setTimeout(() => choicesRef.current && choicesRef.current.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' }), 250);
    }, [ready]);

    const revealAll = () => { if (shown < beats.length) { setShown(beats.length); setSkip(true); } };

    // read aloud
    useEffect(() => {
      if (prefs.narrate) { const t = setTimeout(() => { setSpeaking(true); Voice.speak(sceneSpeech(scene), () => setSpeaking(false)); }, 500); return () => { clearTimeout(t); Voice.stop(); }; }
      return () => Voice.stop();
    }, []);
    const toggleSpeak = (e) => {
      e.stopPropagation();
      if (speaking) { Voice.stop(); setSpeaking(false); } else { setSpeaking(true); Voice.speak(sceneSpeech(scene), () => setSpeaking(false)); }
    };

    const commit = useCallback((i, override) => {
      if (chosen.current) return;
      chosen.current = true;
      Voice.stop();
      onChoose(scene.choices[i], i, override);
    }, [scene, onChoose]);

    const pick = useCallback((i, opts) => {
      const c = scene.choices[i];
      if (!c || chosen.current || playing) return;
      if (!ready && !(opts && opts.force)) { revealAll(); return; }
      if (c.special === 'timer60') { setMode('candle'); World.set({ dim: 0.55, lean: 0 }); Sound.scape('candle'); return; }
      // a first press on these invites you to write something
      if (i === 0 && !nudge && ((scene.vignette === 'five' && !(game.five || []).some((x) => x.trim())) || (scene.vignette === 'journal' && !(game.journal || '').trim()))) {
        setNudge(true);
        return;
      }
      World.set({ lean: 0 });
      if (c.play) {
        setPlaying({ i, kind: c.play });
        if (c.playMs) setTimeout(() => commit(i), c.playMs);
        return;
      }
      commit(i);
    }, [scene, ready, playing, nudge, game, commit]);

    const api = useMemo(() => ({ pick, commit, suggest: setSuggest, setPlaying }), [pick, commit]);

    // keys: 1–3 choose (hold the key for a hold-choice), Space/Enter reveal the text
    useEffect(() => {
      if (mode) return;
      const down = (e) => {
        if (e.target.closest && e.target.closest('input, textarea, [role="dialog"], .panel')) return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if ((e.key === ' ' || e.key === 'Enter') && !ready && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); revealAll(); return; }
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= scene.choices.length) {
          e.preventDefault();
          if (!ready) { revealAll(); return; }
          const c = scene.choices[n - 1];
          if (c.hold) { if (!e.repeat && holds.current[n - 1]) holds.current[n - 1].press(); } else pick(n - 1);
        }
      };
      const up = (e) => { const n = parseInt(e.key, 10); if (n >= 1 && holds.current[n - 1]) holds.current[n - 1].release(); };
      addEventListener('keydown', down);
      addEventListener('keyup', up);
      return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); };
    }, [ready, mode, pick, scene]);

    const register = useCallback((i, h) => { if (h) holds.current[i] = h; else delete holds.current[i]; }, []);
    const onProgress = useCallback((i, p) => setHold({ i, p }), []);

    if (mode === 'candle') {
      const c = scene.choices[0];
      return html`<section className=${'scene scene--candle' + (leaving ? ' is-leaving' : '')}>
        <${Candle} onComplete=${() => commit(0, { award: 'cushion' })} onSkip=${() => commit(0, { effects: { focus: 15, tranquility: 15 }, award: null })} />
      </section>`;
    }

    const world = WORLDS[scene.world];
    const stateOf = (i) => (playing ? (playing.i === i ? 'is-chosen' : 'is-dimmed') : suggest === i ? 'is-suggested' : '');
    return html`<section ref=${root} className=${'scene' + (leaving ? ' is-leaving' : '') + (scene.boss ? ' scene--boss' : '') + (V ? ' has-stage' : '') + (ready ? ' is-ready' : ' is-flowing')}
      style=${{ '--word': pace.word + 'ms' }} aria-labelledby="scene-kicker" data-scene=${sceneId}>
      <div className="scene__narr">
        <div className="scene__kicker" id="scene-kicker">
          ${scene.boss ? html`<span className="boss-tag"><i aria-hidden="true" />Boss · ${scene.boss}</span>`
            : html`<span>${world.roman ? 'Chapter ' + world.roman : 'Prologue'} <b>·</b> ${world.name}</span>`}
          ${Voice.ok ? html`<button className=${'listen' + (speaking ? ' is-on' : '')} onClick=${toggleSpeak} aria-pressed=${speaking}>${I.listen}<span>${speaking ? 'Stop' : 'Listen'}</span></button>` : null}
        </div>
        <div className="beats" onClick=${revealAll}>
          ${beats.slice(0, shown).map((b, k) => html`<div key=${k} className=${'beat-wrap' + (k === shown - 1 ? ' is-current' : '')} ref=${k === shown - 1 ? lastBeat : null}><${Beat} text=${b} instant=${skip} /></div>`)}
          ${!ready ? html`<button className="more" onClick=${(e) => { e.stopPropagation(); revealAll(); }} aria-label="Show the rest of the text"><i /><i /><i /></button>` : null}
        </div>
      </div>
      ${V ? html`<div className="scene__stage"><div className="stage__inner">
        <${V} scene=${scene} ready=${ready} hover=${hover} hold=${hold} playing=${playing} api=${api} game=${game} setGame=${setGame} nudge=${nudge} />
      </div></div>` : null}
      <div className="scene__choices" ref=${choicesRef}>
        ${ready ? html`<div className="choices" role="group" aria-label="What do you do?">
          ${scene.choices.map((c, i) => (c.hold
            ? html`<${HoldChoice} key=${i} c=${c} i=${i} state=${stateOf(i)} onDone=${(k) => pick(k, { force: true })} onProgress=${onProgress} onHover=${setHover} register=${register} />`
            : html`<${Choice} key=${i} c=${c} i=${i} state=${stateOf(i)} onPick=${pick} onHover=${setHover} />`))}
          <p className="choices__hint">${scene.choices.some((c) => c.hold) ? 'Some choices are acts — press and hold them.' : 'Choose — or press ' + scene.choices.map((_, i) => i + 1).join(' / ')}</p>
        </div>` : null}
      </div>
    </section>`;
  }

  // ── FLOATING CHANGES, FOUND ITEMS ───────────────────────────────────────────
  function Floats({ items }) {
    return html`<div className="floats" aria-live="polite">
      ${items.map((f) => html`<span key=${f.id} className="float" style=${{ '--c': f.color, animationDelay: f.delay + 's' }}>${f.text}</span>`)}
    </div>`;
  }

  function Found({ k, onDone }) {
    useEffect(() => { const t = setTimeout(onDone, 3600); return () => clearTimeout(t); }, [k]);
    const it = ITEMS[k];
    return html`<div className="found" role="status" onClick=${onDone}>
      <div className="found__icon">${I.item(k)}</div>
      <div><p className="kicker">Found for your satchel</p><p className="found__name">${it.name}</p><p className="found__desc">${it.desc}</p></div>
    </div>`;
  }

  // ── PANELS ──────────────────────────────────────────────────────────────────
  function Panel({ title, kicker, onClose, children, side = 'right' }) {
    const ref = useRef(null);
    useEffect(() => {
      const k = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
      addEventListener('keydown', k, true);
      const first = ref.current && ref.current.querySelector('button');
      if (first) first.focus();
      return () => removeEventListener('keydown', k, true);
    }, []);
    return html`<div className="panel-wrap" onClick=${onClose}>
      <aside className=${'panel panel--' + side} role="dialog" aria-modal="true" aria-label=${title} ref=${ref} onClick=${(e) => e.stopPropagation()}>
        <header className="panel__head">
          <div>${kicker ? html`<p className="kicker">${kicker}</p>` : null}<h2>${title}</h2></div>
          <button className="icon-btn" onClick=${onClose} aria-label="Close">${I.close}</button>
        </header>
        <div className="panel__body">${children}</div>
      </aside>
    </div>`;
  }

  function MeterRow({ m, value, start, big }) {
    return html`<div className=${'meter' + (big ? ' meter--big' : '')} style=${{ '--c': m.color }}>
      <div className="meter__head"><span className="meter__label"><i />${m.label}</span><b className="meter__val">${value}</b></div>
      <div className="meter__track"><i className="meter__fill" style=${{ width: value + '%' }} />${start !== undefined ? html`<i className="meter__start" style=${{ left: start + '%' }} title=${'You began at ' + start} />` : null}</div>
      <p className="meter__hint">${m.hint}</p>
    </div>`;
  }

  function Satchel({ items }) {
    return html`<ul className="satchel">
      ${Object.keys(ITEMS).map((k) => html`<li key=${k} className=${items.includes(k) ? 'is-found' : ''} title=${items.includes(k) ? ITEMS[k].name + ' — ' + ITEMS[k].desc : 'Still somewhere on the trail'}>
        ${I.item(k)}<span>${items.includes(k) ? ITEMS[k].name : '—'}</span>
      </li>`)}
    </ul>`;
  }

  function LightPanel({ game, scene, onClose }) {
    const m = game.meters;
    return html`<${Panel} title="Your inner light" kicker=${scene.time + ' · ' + WORLDS[scene.world].short} onClose=${onClose}>
      <div className="light-top"><${Gauge} m=${m} size=${88} /><div><p className="light-top__n">${flourishing(m)}</p><p className="kicker">Flourishing, right now</p></div></div>
      ${METERS.map((x) => html`<${MeterRow} key=${x.key} m=${x} value=${m[x.key]} start=${INITIAL[x.key]} />`)}
      ${m.dopamine > 75 ? html`<p className="note note--ghost">Your Dopamine is above 75: the world has gone grey and glitchy. That is Ghost Mode — what it feels like to be permanently elsewhere.</p>` : null}
      <h3 className="panel__h3">Your satchel</h3>
      <${Satchel} items=${game.items} />
    <//>`;
  }

  function MenuPanel({ game, prefs, setPrefs, onClose, onBack, onJump, onInfo, onRestart, onTitle }) {
    const [sure, setSure] = useState(false);
    useEffect(() => { if (!sure) return; const t = setTimeout(() => setSure(false), 3500); return () => clearTimeout(t); }, [sure]);
    const reached = Math.max(...game.seen, SCENES[game.sceneId].world, 0);
    const toggle = (k) => setPrefs((p) => ({ ...p, [k]: !p[k] }));
    return html`<${Panel} title="Paused" kicker="The night waits" onClose=${onClose} side="left">
      <button className="btn btn--primary btn--wide" onClick=${onClose}>Resume ${I.arrow}</button>
      <div className="menu-group">
        <label className="row-toggle"><span>Sound</span><button className=${'switch' + (prefs.sound ? ' is-on' : '')} role="switch" aria-checked=${prefs.sound} onClick=${() => toggle('sound')}><i /></button></label>
        ${Voice.ok ? html`<label className="row-toggle"><span>Read each scene aloud</span><button className=${'switch' + (prefs.narrate ? ' is-on' : '')} role="switch" aria-checked=${prefs.narrate} onClick=${() => toggle('narrate')}><i /></button></label>` : null}
        <div className="row-toggle"><span>Text pace</span>
          <div className="seg" role="radiogroup" aria-label="Text pace">
            ${['calm', 'brisk', 'instant'].map((p) => html`<button key=${p} role="radio" aria-checked=${prefs.pace === p} className=${prefs.pace === p ? 'is-on' : ''} onClick=${() => setPrefs((x) => ({ ...x, pace: p }))}>${p[0].toUpperCase() + p.slice(1)}</button>`)}
          </div>
        </div>
      </div>
      <h3 className="panel__h3">Chapters</h3>
      <ol className="chapters">
        ${WORLDS.slice(0, 5).map((w, i) => html`<li key=${i}><button disabled=${i > reached} className=${SCENES[game.sceneId].world === i ? 'is-here' : ''} onClick=${() => onJump(i)}>
          <span className="chapters__n">${w.roman || '·'}</span><span>${w.name}</span><span className="chapters__t">${SCENES[STARTS[i]].time}</span></button></li>`)}
      </ol>
      <div className="menu-group menu-group--links">
        <button className="menu-link" onClick=${onBack} disabled=${!game.log.length}>${I.undo}<span>Step back one choice</span></button>
        <button className="menu-link" onClick=${onInfo}>${I.book}<span>How it works</span></button>
        <button className="menu-link" onClick=${onTitle}>${I.back}<span>Leave to the title</span></button>
        <button className=${'menu-link menu-link--danger' + (sure ? ' is-sure' : '')} onClick=${() => (sure ? onRestart() : setSure(true))}>${I.restart}<span>${sure ? 'Sure? Click again to start over' : 'Start over'}</span></button>
        <a className="menu-link" href="../index.html#play/digital-escape">${I.home}<span>Back to Day Island</span></a>
      </div>
    <//>`;
  }

  // ── PLAY ────────────────────────────────────────────────────────────────────
  function Play({ game, setGame, prefs, setPrefs, onTitle, onInfo, onRestart }) {
    const scene = SCENES[game.sceneId];
    const world = WORLDS[scene.world];
    const [card, setCard] = useState(null);
    const [leaving, setLeaving] = useState(false);
    const [floats, setFloats] = useState([]);
    const [found, setFound] = useState(null);
    const [panel, setPanel] = useState(null);
    const busy = useRef(false);
    const ghost = game.meters.dopamine > 75;

    useEffect(() => {
      if (scene.worldIntro && !game.seen.includes(scene.world)) {
        setCard(scene.world);
        setGame((g) => ({ ...g, seen: [...g.seen, scene.world] }));
        Sound.sfx('chapter');
      }
      World.set({ mode: scene.end ? 'end' : 'game', biome: world.biome, time: scene.time, boss: !!scene.boss, lamp: game.sceneId === 'intro' ? 'phone' : 'lantern',
        running: !!scene.running, dim: 0, lean: 0, sleep: false });
      Sound.scape(world.biome);
      busy.current = false;
    }, [game.sceneId]);

    useEffect(() => { World.set({ light: game.meters, ghost }); }, [game.meters, ghost]);

    useEffect(() => {
      const k = (e) => {
        if (e.target.closest && e.target.closest('input, textarea')) return;
        if (e.key === 'Escape' && !panel && card === null) setPanel('menu');
        else if ((e.key === 'm' || e.key === 'M') && !e.metaKey && !e.ctrlKey) setPrefs((p) => ({ ...p, sound: !p.sound }));
        else if ((e.key === 'i' || e.key === 'I') && !e.metaKey && !e.ctrlKey && !panel) setPanel('light');
      };
      addEventListener('keydown', k);
      return () => removeEventListener('keydown', k);
    }, [panel, card]);

    const choose = useCallback((choice, idx, override) => {
      if (busy.current) return;
      busy.current = true;
      const effects = (override && override.effects) || choice.effects || {};
      const v = valence(effects);
      const before = game.meters;
      const after = applyEffects(before, effects);
      const award = override && 'award' in override ? override.award : choice.awards;
      const isNew = !!award && !game.items.includes(award);
      const next = SCENES[choice.next];
      const crossing = next.world !== scene.world;
      setFloats(Object.entries(effects).filter(([, x]) => x).map(([k, x], j) => ({ id: Date.now() + k, text: `${x > 0 ? '+' : '−'}${Math.abs(x)} ${MC[k].label}`, color: MC[k].color, delay: j * 0.12 })));
      setTimeout(() => setFloats([]), 2600);
      Sound.sfx(v > 0 ? 'bell' : 'blip', game.log.length);
      World.pulse(v > 0 ? '#ffe6b8' : '#b18cff');
      World.set({ light: after, lean: 0, lamp: 'lantern' });
      World.walk(crossing ? 3.6 : 2.3, crossing ? 1.3 : 1);
      if (crossing && !next.end) Sound.sfx('whoosh');
      setLeaving(true);
      setTimeout(() => {
        setGame((g) => ({
          ...g, sceneId: choice.next, meters: after,
          items: isNew ? [...g.items, award] : g.items,
          log: [...g.log, { id: g.sceneId, w: scene.world, i: idx, text: choice.text, v: v > 0 ? 1 : 0, before, award: isNew ? award : null }],
        }));
        setLeaving(false);
        if (isNew) { setFound(award); Sound.sfx('item'); }
      }, 760);
    }, [game, scene]);

    const back = () => {
      setPanel(null);
      setGame((g) => {
        const last = g.log[g.log.length - 1];
        if (!last) return g;
        return { ...g, sceneId: last.id, meters: last.before, items: last.award ? g.items.filter((k) => k !== last.award) : g.items, log: g.log.slice(0, -1) };
      });
    };
    const jump = (n) => { setPanel(null); setCard(null); setGame((g) => ({ ...g, sceneId: STARTS[n] })); };

    return html`<div className=${'play' + (ghost ? ' is-ghost' : '') + (scene.boss ? ' is-boss' : '') + (scene.end ? ' is-end' : '')} data-world=${world.biome} style=${{ '--accent': world.accent }}>
      <${HUD} scene=${scene} game=${game} ghost=${ghost} prefs=${prefs} compact=${!!scene.end}
        onSound=${() => setPrefs((p) => ({ ...p, sound: !p.sound }))} onLight=${() => setPanel('light')} onMenu=${() => setPanel('menu')} />
      ${card !== null ? html`<${ChapterCard} key=${'c' + card} n=${card} onEnter=${() => setCard(null)} />`
        : scene.end ? html`<${Ending} game=${game} setGame=${setGame} onRestart=${onRestart} onInfo=${onInfo} />`
        : html`<${SceneView} key=${game.sceneId} scene=${scene} sceneId=${game.sceneId} game=${game} setGame=${setGame} prefs=${prefs} onChoose=${choose} leaving=${leaving} />`}
      <${Floats} items=${floats} />
      ${found ? html`<${Found} k=${found} onDone=${() => setFound(null)} />` : null}
      ${panel === 'light' ? html`<${LightPanel} game=${game} scene=${scene} onClose=${() => setPanel(null)} />` : null}
      ${panel === 'menu' ? html`<${MenuPanel} game=${game} prefs=${prefs} setPrefs=${setPrefs} onClose=${() => setPanel(null)} onBack=${back} onJump=${jump}
        onInfo=${() => { setPanel(null); onInfo(); }} onRestart=${() => { setPanel(null); onRestart(); }} onTitle=${() => { setPanel(null); onTitle(); }} />` : null}
    </div>`;
  }

  // ── THE BEACH: RESULTS ──────────────────────────────────────────────────────
  function Radar({ dims, run }) {
    const k = useTween(run, 1800, 200);
    const N = dims.length, cx = 170, cy = 165, R = 112;
    const pt = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / N; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; };
    const [sel, setSel] = useState(-1);
    return html`<figure className="radar">
      <svg viewBox="0 0 340 330" role="img" aria-label=${'Eight dimensions: ' + dims.map((d) => d.name + ' ' + d.score).join(', ')}>
        ${[0.25, 0.5, 0.75, 1].map((r) => html`<polygon key=${r} className="radar__grid" points=${dims.map((_, i) => pt(i, r).join(',')).join(' ')} />`)}
        ${dims.map((_, i) => html`<line key=${i} className="radar__axis" x1=${cx} y1=${cy} x2=${pt(i, 1)[0]} y2=${pt(i, 1)[1]} />`)}
        <polygon className="radar__shape" points=${dims.map((d, i) => pt(i, (d.score / 100) * k).join(',')).join(' ')} />
        ${dims.map((d, i) => { const [x, y] = pt(i, (d.score / 100) * k); return html`<circle key=${'p' + i} className=${'radar__pt' + (sel === i ? ' is-sel' : '')} cx=${x} cy=${y} r=${sel === i ? 6 : 4}
          tabIndex="0" onMouseEnter=${() => setSel(i)} onMouseLeave=${() => setSel(-1)} onFocus=${() => setSel(i)} onBlur=${() => setSel(-1)}><title>${d.name}: ${d.score}</title></circle>`; })}
        ${dims.map((d, i) => { const [x, y] = pt(i, 1.2); return html`<text key=${'t' + i} className=${'radar__label' + (sel === i ? ' is-sel' : '')} x=${x} y=${y + 4} textAnchor=${Math.abs(x - cx) < 10 ? 'middle' : x > cx ? 'start' : 'end'}>${d.short}</text>`; })}
      </svg>
      <figcaption>${sel >= 0 ? html`<b>${dims[sel].name}</b> · ${dims[sel].score} <span>(${dims[sel].how})</span>` : 'Point at a corner to read it.'}</figcaption>
    </figure>`;
  }

  function PathMap({ log }) {
    const [sel, setSel] = useState(log.length ? log.length - 1 : null);
    const rows = [0, 1, 2, 3, 4].map((w) => ({ w, items: log.map((x, idx) => ({ ...x, idx })).filter((x) => x.w === w) })).filter((r) => r.items.length);
    return html`<div className="pathmap">
      ${rows.map((r) => html`<div className="pathmap__row" key=${r.w}>
        <span className="pathmap__label"><b>${WORLDS[r.w].roman || '·'}</b>${WORLDS[r.w].short}</span>
        <span className="pathmap__dots">${r.items.map((x) => html`<button key=${x.idx} className=${'pathmap__dot' + (x.v ? ' is-calm' : ' is-pull') + (sel === x.idx ? ' is-sel' : '')}
          onMouseEnter=${() => setSel(x.idx)} onFocus=${() => setSel(x.idx)} onClick=${() => setSel(x.idx)} aria-label=${x.text} />`)}</span>
      </div>`)}
      <p className="pathmap__detail">${sel !== null && log[sel] ? html`<span className=${log[sel].v ? 'calm' : 'pull'}>${log[sel].v ? 'Toward presence' : 'Toward the pull'}</span> “${unquote(log[sel].text)}”` : 'Point at a light to see the choice you made there.'}</p>
    </div>`;
  }

  function Section({ kicker, title, children, className }) {
    const ref = useRef(null);
    const seen = useInView(ref, 0.2);
    return html`<section ref=${ref} className=${'end-sec ' + (className || '') + (seen ? ' is-seen' : '')}>
      ${kicker ? html`<p className="kicker">${kicker}</p>` : null}
      ${title ? html`<h2 className="end-sec__title">${title}</h2>` : null}
      ${typeof children === 'function' ? children(seen) : children}
    </section>`;
  }

  function ScoreBlock({ score, arch, seen }) {
    const k = useTween(seen, 2200, 300);
    const C = 2 * Math.PI * 92;
    return html`<div className="score">
      <div className="score__ring">
        <svg viewBox="0 0 220 220" aria-hidden="true"><circle className="bg" cx="110" cy="110" r="92" /><circle className="fg" cx="110" cy="110" r="92" style=${{ strokeDasharray: C, strokeDashoffset: C * (1 - (score / 100) * k) }} /></svg>
        <div className="score__n"><b>${Math.round(score * k)}</b><span>/100</span></div>
      </div>
      <div className="score__text">
        <p className="kicker">Your Digital Flourishing Score</p>
        <p className="score__you">You walked out as</p>
        <h2 className="score__arch" style=${{ '--c': arch.color }}>${arch.name}</h2>
        <p className="score__desc">${arch.desc}</p>
        <p className="score__line">${arch.line}</p>
      </div>
    </div>`;
  }

  function Ending({ game, setGame, onRestart, onInfo }) {
    const m = game.meters;
    const score = flourishing(m), arch = nearestArchetype(m), dims = dimensions(m, score);
    const tips = useMemo(() => getTips(m), []);
    const presence = game.log.filter((x) => x.v).length;
    const five = (game.five || []).map((x) => x.trim()).filter(Boolean);
    const line = (game.journal || '').trim();
    const [scr, setScr] = useState(0);
    const [answer, setAnswer] = useState(false);
    const [copied, setCopied] = useState(false);
    const [busy, setBusy] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
      World.set({ mode: 'end', biome: 'beach', time: '06:41', boss: false, ghost: false, lean: 0, running: false, lamp: 'lantern' });
      Sound.scape('beach');
      const a = setTimeout(() => Sound.sfx('sunrise'), 700);
      const b = setTimeout(() => setAnswer(true), REDUCED ? 200 : 2200);
      return () => { clearTimeout(a); clearTimeout(b); };
    }, []);
    const commits = game.commits || [];
    const toggleCommit = (id) => setGame((g) => { const c = g.commits || []; return { ...g, commits: c.includes(id) ? c.filter((x) => x !== id) : [...c, id] }; });
    const data = { score, arch, m, dims, tips, items: game.items, presence, total: game.log.length, five, line, commits, log: game.log };
    const url = location.origin + location.pathname;
    const shareText = `I walked out of the feed and reached the beach by sunrise — Digital Flourishing Score ${score}/100 (${arch.name}). The Wanderer's Digital Escape:`;
    const share = async (where) => {
      if (where === 'native' && navigator.share) { try { await navigator.share({ title: "The Wanderer's Digital Escape", text: shareText, url }); } catch (e) {} return; }
      if (where === 'copy') {
        try { await navigator.clipboard.writeText(shareText + ' ' + url); setCopied(true); setTimeout(() => setCopied(false), 2200); } catch (e) {}
        return;
      }
      const u = {
        x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + url)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      }[where];
      if (u) window.open(u, '_blank', 'noopener,noreferrer,width=620,height=560');
    };
    return html`<div className="end" ref=${ref} onScroll=${(e) => setScr(Math.min(1, e.currentTarget.scrollTop / (innerHeight * 0.8)))}>
      <div className="end__scrim" style=${{ opacity: 0.06 + scr * 0.68 }} aria-hidden="true" />
      <section className="end__arrive">
        <p className="kicker">06:41 · The Beach</p>
        <h1 className="end__q">“What lies beyond the horizon of your mundane life?”</h1>
        <p className=${'end__a' + (answer ? ' is-on' : '')}>You just found out.</p>
        <button className=${'end__cue' + (answer ? ' is-on' : '')} onClick=${() => ref.current.scrollTo({ top: innerHeight * 0.9, behavior: REDUCED ? 'auto' : 'smooth' })}>See where you arrived ${I.down}</button>
      </section>

      <${Section} className="end-sec--score">${(seen) => html`<${ScoreBlock} score=${score} arch=${arch} seen=${seen} />`}<//>

      <${Section} kicker="From 22:47 to sunrise" title="The light you carried">
        <div className="journey-meters">
          ${METERS.map((x) => { const d = m[x.key] - INITIAL[x.key]; const good = x.key === 'dopamine' ? d < 0 : d > 0; return html`<div key=${x.key} className="jm" style=${{ '--c': x.color }}>
            <div className="jm__head"><span><i />${x.label}</span><span className="jm__nums">${INITIAL[x.key]} → <b>${m[x.key]}</b> <em className=${good ? 'good' : d ? 'bad' : ''}>${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d)}</em></span></div>
            <div className="jm__track"><i className="jm__fill" style=${{ width: m[x.key] + '%' }} /><i className="jm__start" style=${{ left: INITIAL[x.key] + '%' }} /></div>
          </div>`; })}
        </div>
        <p className="end-note">Score = (Focus + Oneness + Tranquility + (100 − Dopamine)) ÷ 4. Dopamine counts in reverse.</p>
      <//>

      <${Section} kicker="The NIRMAN framework" title="Eight dimensions of a flourishing mind">${(seen) => html`<${Radar} dims=${dims} run=${seen} />`}<//>

      <${Section} kicker=${`You chose presence ${presence} of ${game.log.length} times`} title="The path you walked">
        <${PathMap} log=${game.log} />
      <//>

      <${Section} kicker=${`${game.items.length} of 6 found`} title="What you carried out">
        <${Satchel} items=${game.items} />
        ${game.items.length < 6 ? html`<p className="end-note">${6 - game.items.length === 1 ? 'One thing is' : 6 - game.items.length + ' things are'} still on the trail. Another night, another path.</p>` : html`<p className="end-note">Every one of them. The trail has nothing left to teach you — only to remind you.</p>`}
      <//>

      ${five.length || line ? html`<${Section} kicker="Only on this device" title="What you wrote down">
        <div className="keepsakes">
          ${five.length ? html`<div className="keepsake"><p className="kicker">Your five</p><ul className="keepsake__five">${five.map((n, i) => html`<li key=${i}>${n}</li>`)}</ul><p className="end-note">Call one of them this week. No agenda.</p></div>` : null}
          ${line ? html`<div className="keepsake keepsake--paper"><p className="kicker">From the notebook · 06:03</p><p className="keepsake__line">${line}</p></div>` : null}
        </div>
      <//>` : null}

      <${Section} kicker="For tomorrow, and the day after" title="Your action plan">
        <ul className="plan">
          ${tips.map((t) => html`<li key=${t.id} className=${'plan__tip' + (commits.includes(t.id) ? ' is-on' : '')} style=${{ '--c': MC[t.meter].color }}>
            <div><p className="plan__title">${t.title}</p><p className="plan__text">${t.text}</p></div>
            <button className="plan__commit" onClick=${() => toggleCommit(t.id)} aria-pressed=${commits.includes(t.id)}>${commits.includes(t.id) ? '✓ I’ll try this' : 'I’ll try this'}</button>
          </li>`)}
        </ul>
      <//>

      <${Section} kicker="Keep it, pass it on" title="Carry it with you" className="end-sec--carry">
        <div className="carry">
          <button className="btn btn--primary" disabled=${busy} onClick=${async () => { setBusy(true); try { await downloadCard(data); } finally { setBusy(false); } }}>${I.download} Download your score card</button>
          <button className="btn btn--glass" onClick=${() => openReport(data)}>${I.book} Open your full report</button>
        </div>
        <div className="share">
          ${navigator.share ? html`<button className="chip" onClick=${() => share('native')}>${I.share} Share…</button>` : null}
          <button className="chip" onClick=${() => share('x')}>𝕏 Post</button>
          <button className="chip" onClick=${() => share('whatsapp')}>WhatsApp</button>
          <button className="chip" onClick=${() => share('linkedin')}>LinkedIn</button>
          <button className="chip" onClick=${() => share('copy')}>${I.link} ${copied ? 'Copied' : 'Copy link'}</button>
        </div>
        <div className="carry carry--quiet">
          <button className="btn btn--quiet" onClick=${onRestart}>${I.restart} Walk the night again</button>
          <button className="btn btn--quiet" onClick=${onInfo}>${I.book} How it works</button>
          <a className="btn btn--quiet" href="https://sankettambare.substack.com/t/digital-wellbeing" target="_blank" rel="noopener noreferrer">The essays behind it ↗</a>
        </div>
        <p className="end-sign">“Your attention is the costliest price you pay in the digital market. Spend it like it matters — because it does.”</p>
      <//>
    </div>`;
  }

  // ── score card (PNG) ────────────────────────────────────────────────────────
  async function downloadCard(d) {
    const W = 1080, H = 1350;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    try { await Promise.all(['400 200px "Instrument Serif"', 'italic 400 64px "Instrument Serif"', '500 22px "IBM Plex Mono"', 'italic 400 30px "Newsreader"'].map((f) => document.fonts.load(f))); } catch (e) {}
    const hz = 1180;
    const sky = x.createLinearGradient(0, 0, 0, hz);
    [[0, '#0a1230'], [0.55, '#1d2a52'], [0.78, '#4c4f7d'], [0.93, '#c98f86'], [1, '#f6c18f']].forEach(([o, col]) => sky.addColorStop(o, col));
    x.fillStyle = sky; x.fillRect(0, 0, W, hz);
    for (let i = 0; i < 160; i++) { x.globalAlpha = Math.random() * 0.7 * (1 - i / 200); x.fillStyle = '#fff'; x.fillRect(Math.random() * W, Math.random() * hz * 0.6, 1.6, 1.6); }
    x.globalAlpha = 1;
    const glow = x.createRadialGradient(W / 2, hz, 0, W / 2, hz, 520);
    glow.addColorStop(0, 'rgba(255,214,160,.65)'); glow.addColorStop(1, 'rgba(255,214,160,0)');
    x.fillStyle = glow; x.fillRect(0, hz - 520, W, 520);
    x.fillStyle = '#fff2d2'; x.beginPath(); x.arc(W / 2, hz + 30, 120, Math.PI, 0); x.fill();
    const sea = x.createLinearGradient(0, hz, 0, H);
    sea.addColorStop(0, '#5b5a7e'); sea.addColorStop(1, '#141a33');
    x.fillStyle = sea; x.fillRect(0, hz, W, H - hz);
    for (let i = 0; i < 26; i++) { const y = hz + 4 + i * 6.4, w = 30 + i * 9 * Math.random(); x.fillStyle = `rgba(255,220,170,${0.6 - i / 50})`; x.fillRect(W / 2 - w / 2 + (Math.random() - 0.5) * 20, y, w, 2); }
    const ink = '#fbf3e4';
    const text = (s, font, y, color, align, ls) => { x.font = font; x.fillStyle = color || ink; x.textAlign = align || 'center'; if ('letterSpacing' in x) x.letterSpacing = ls || '0px'; x.fillText(s, align === 'left' ? 150 : align === 'right' ? 930 : W / 2, y); };
    text("THE WANDERER'S DIGITAL ESCAPE", '500 22px "IBM Plex Mono", monospace', 120, 'rgba(251,243,228,.7)', 'center', '6px');
    text('22:47 → 06:41 · one night, four worlds', 'italic 400 30px "Newsreader", Georgia, serif', 168, 'rgba(251,243,228,.6)');
    text(String(d.score), '400 260px "Instrument Serif", Georgia, serif', 420, ink);
    text('DIGITAL FLOURISHING SCORE / 100', '500 22px "IBM Plex Mono", monospace', 480, 'rgba(251,243,228,.7)', 'center', '4px');
    text(d.arch.name, 'italic 400 72px "Instrument Serif", Georgia, serif', 590, '#ffdcae');
    METERS.forEach((mm, i) => {
      const y = 680 + i * 66;
      text(mm.label.toUpperCase(), '500 22px "IBM Plex Mono", monospace', y + 8, 'rgba(251,243,228,.8)', 'left', '3px');
      x.fillStyle = 'rgba(255,255,255,.14)'; x.fillRect(400, y - 6, 440, 8);
      x.fillStyle = mm.color; x.fillRect(400, y - 6, 440 * d.m[mm.key] / 100, 8);
      x.fillStyle = 'rgba(255,255,255,.8)'; x.fillRect(400 + 440 * INITIAL[mm.key] / 100 - 1, y - 12, 2, 20);
      text(String(d.m[mm.key]), '500 26px "IBM Plex Mono", monospace', y + 8, ink, 'right');
    });
    Object.keys(ITEMS).forEach((k, i) => {
      const p = new Path2D(ITEMS[k].path);
      x.save();
      x.translate(W / 2 - 3 * 92 + i * 92 + 16, 960);
      x.scale(2.5, 2.5);
      x.lineWidth = 1.3; x.lineCap = 'round'; x.lineJoin = 'round';
      x.strokeStyle = d.items.includes(k) ? ink : 'rgba(251,243,228,.2)';
      x.stroke(p);
      x.restore();
    });
    text(`Chose presence ${d.presence} of ${d.total} times · ${d.items.length} of 6 found`, 'italic 400 30px "Newsreader", Georgia, serif', 1080, 'rgba(251,243,228,.82)');
    text('daredavil01.github.io/daredavil01/digital-wellbeing', '500 20px "IBM Plex Mono", monospace', 1312, 'rgba(251,243,228,.7)', 'center', '1px');
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const a = document.createElement('a');
    a.download = `wanderer-score-${d.score}.png`;
    a.href = URL.createObjectURL(blob);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // ── the full report (printable HTML) ────────────────────────────────────────
  function openReport(d) {
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const interp = {
      focus: d.m.focus < 40 ? 'Needs care — spending attention on things that do not fill you' : d.m.focus < 70 ? 'Recovering — keep choosing depth over speed' : 'Strong — you are building something real',
      dopamine: d.m.dopamine > 70 ? 'High — the arcade still has a hold on you' : d.m.dopamine > 40 ? 'Balanced — a healthy relationship with stimulation' : 'Liberated — you have broken the dopamine loop',
      oneness: d.m.oneness < 40 ? 'Disconnected — the city has fragmented your connections' : d.m.oneness < 70 ? 'Rebuilding — your five are coming back into focus' : 'Connected — you know who your people are',
      tranquility: d.m.tranquility < 40 ? 'Turbulent — the noise of the digital world is still loud' : d.m.tranquility < 70 ? 'Settling — the trail is becoming familiar' : 'Serene — you have reached the beach',
    };
    const meters = METERS.map((x) => `<div class="m"><div class="k" style="color:${x.color === '#fbbf6a' ? '#b7791f' : '#3a3a6a'}">${x.label}</div><div class="v">${d.m[x.key]}<small> from ${INITIAL[x.key]}</small></div><div class="i">${interp[x.key]}</div></div>`).join('');
    const dims = d.dims.map((x) => `<div class="dr"><span>${x.name}</span><span class="bar"><i style="width:${x.score}%"></i></span><b>${x.score}</b></div>`).join('');
    const items = Object.keys(ITEMS).map((k) => `<li class="${d.items.includes(k) ? 'on' : ''}"><svg viewBox="0 0 24 24"><path d="${ITEMS[k].path}"/></svg><b>${ITEMS[k].name}</b><span>${d.items.includes(k) ? ITEMS[k].desc : 'Not found this time'}</span></li>`).join('');
    const path = d.log.map((x) => `<li class="${x.v ? 'calm' : 'pull'}"><span>${esc(WORLDS[x.w].short)}</span>${esc(unquote(x.text))}</li>`).join('');
    const tips = d.tips.map((t) => `<div class="tip ${d.commits.includes(t.id) ? 'on' : ''}"><b>${t.title}${d.commits.includes(t.id) ? ' · I’ll try this' : ''}</b><p>${t.text}</p></div>`).join('');
    const keep = (d.five.length ? `<h2>Your five</h2><p class="five">${d.five.map(esc).join(' · ')}</p>` : '') + (d.line ? `<h2>From the notebook</h2><p class="line">${esc(d.line)}</p>` : '');
    const doc = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your night — The Wanderer's Digital Escape</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,400&family=IBM+Plex+Mono:wght@500&family=Caveat:wght@500&display=swap">
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font:17px/1.6 Newsreader,Georgia,serif;color:#2b2620;background:#f4ecda;max-width:760px;margin:0 auto;padding:56px 28px 80px}
.k,h2,.kick{font:500 11px/1.4 'IBM Plex Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:#6a5d49}
h1{font:400 64px/1 'Instrument Serif',Georgia,serif;margin:10px 0 6px}h1 em{color:#c4642f}
h2{margin:44px 0 14px;padding-bottom:8px;border-bottom:1px solid rgba(43,38,32,.18)}
.hero{display:flex;gap:28px;align-items:center;margin:28px 0;padding:28px;border:1px solid rgba(43,38,32,.2);border-radius:14px;background:#efe4cc}
.n{font:400 120px/0.9 'Instrument Serif',serif;color:#c4642f}.arch{font:italic 400 34px/1.1 'Instrument Serif',serif}.desc{color:#5a4f3f;margin-top:6px}
.ms{display:grid;grid-template-columns:1fr 1fr;gap:12px}.m{border:1px solid rgba(43,38,32,.16);border-radius:10px;padding:14px 16px}.v{font:400 40px/1 'Instrument Serif',serif;margin:4px 0}.v small{font:13px Newsreader,serif;color:#6a5d49}.i{font-size:14px;color:#5a4f3f;font-style:italic}
.dr{display:grid;grid-template-columns:220px 1fr 40px;gap:12px;align-items:center;font-size:15px;margin:6px 0}.bar{height:6px;border-radius:3px;background:rgba(43,38,32,.12);overflow:hidden}.bar i{display:block;height:100%;background:#c4642f}.dr b{font:500 13px 'IBM Plex Mono',monospace;text-align:right}
ul{list-style:none}.items{display:grid;grid-template-columns:1fr 1fr;gap:10px}.items li{display:grid;grid-template-columns:30px 1fr;column-gap:10px;opacity:.38}.items li.on{opacity:1}.items svg{grid-row:span 2;width:28px;height:28px;fill:none;stroke:#2b2620;stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}.items span{font-size:14px;color:#5a4f3f}
.path li{display:grid;grid-template-columns:130px 1fr;gap:12px;padding:6px 0;border-bottom:1px dashed rgba(43,38,32,.14);font-size:15px}.path li span{font:500 11px/2 'IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:#6a5d49}.path li.calm{border-left:3px solid #c4642f;padding-left:10px}.path li.pull{border-left:3px solid rgba(43,38,32,.2);padding-left:10px;color:#6a5d49}
.tip{padding:14px 16px;border-left:3px solid rgba(196,100,47,.4);background:#efe4cc;border-radius:4px;margin-bottom:10px}.tip.on{border-left-color:#c4642f}.tip b{font:500 12px 'IBM Plex Mono',monospace;letter-spacing:.06em;text-transform:uppercase}.tip p{font-size:15px;color:#4a4033;margin-top:4px}
.five{font:500 30px/1.3 Caveat,cursive}.line{font:500 28px/1.35 Caveat,cursive;white-space:pre-wrap}
.quote{margin-top:56px;padding-top:24px;border-top:1px solid rgba(43,38,32,.18);font:italic 20px/1.5 'Instrument Serif',serif;text-align:center;color:#5a4f3f}
.print{position:fixed;top:16px;right:16px;font:500 12px 'IBM Plex Mono',monospace;letter-spacing:.08em;padding:10px 16px;border-radius:999px;border:1px solid #2b2620;background:#2b2620;color:#f4ecda;cursor:pointer}
@media print{.print{display:none}body{padding:24px}}@media(max-width:600px){.hero{flex-direction:column;text-align:center}.ms,.items{grid-template-columns:1fr}.dr{grid-template-columns:1fr 1fr 34px}}
</style></head><body>
<button class="print" onclick="print()">Print / Save as PDF</button>
<p class="kick">Journey report · ${date}</p>
<h1>The Wanderer's <em>Digital Escape</em></h1>
<p class="desc">22:47 → 06:41. You chose presence ${d.presence} of ${d.total} times and carried ${d.items.length} of 6 things out.</p>
<div class="hero"><div class="n">${d.score}</div><div><div class="k">Digital Flourishing Score / 100</div><div class="arch">${esc(d.arch.name)}</div><p class="desc">${esc(d.arch.desc)}</p></div></div>
<h2>Your four meters</h2><div class="ms">${meters}</div>
<h2>Eight dimensions (NIRMAN framework)</h2>${dims}
<h2>The path you walked</h2><ul class="path">${path}</ul>
<h2>What you carried</h2><ul class="items">${items}</ul>
${keep}
<h2>Your action plan</h2>${tips}
<p class="quote">“Your attention is the costliest price you pay in the digital market. Spend it like it matters — because it does.”</p>
</body></html>`;
    const blob = new Blob([doc], { type: 'text/html' });
    const href = URL.createObjectURL(blob);
    const w = window.open(href, '_blank');
    if (!w) {
      const a = document.createElement('a');
      a.href = href; a.download = 'wanderer-report.html';
      document.body.appendChild(a); a.click(); a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(href), 60000);
  }

  // ── HOW IT WORKS ────────────────────────────────────────────────────────────
  function Info({ onBack, onBegin }) {
    useEffect(() => { World.set({ sleep: true }); return () => World.set({ sleep: false }); }, []);
    const worlds = WORLDS.slice(1, 5);
    const DIMS = dimensions({ focus: 0, dopamine: 0, oneness: 0, tranquility: 0 }, 0);
    return html`<main className="info" id="main">
      <div className="info__inner">
        <nav className="info__nav"><button className="link" onClick=${onBack}>${I.back} Back</button></nav>
        <header className="info__head">
          <p className="kicker">Field notes</p>
          <h1>How it works</h1>
          <p className="info__lede">Everything behind <em>The Wanderer’s Digital Escape</em> — the meters, the score, the worlds, and the small acts the game asks of you.</p>
        </header>

        <section className="info__sec">
          <h2>The idea</h2>
          <p>A choose-your-own-path story through the attention economy. You are The Wanderer, a person whose phone is still glowing at 22:47. Walk out of the feed through four worlds — each a mirror of how social media reshapes the mind — and reach a quiet beach by sunrise.</p>
          <p>About 27 scenes, roughly twelve minutes. Every choice shifts four meters; the sky moves from midnight to dawn as you go, and the lantern you carry burns with whatever you have chosen.</p>
          <ul className="info__chips"><li>~27 scenes</li><li>~12 minutes</li><li>Keys 1–3 to choose</li><li>Esc for the menu</li><li>Synthesised soundscapes</li><li>Saves as you go</li></ul>
        </section>

        <section className="info__sec">
          <h2>The four meters</h2>
          <p>Nobody starts from a place of wellness. The meters begin partly empty — and one of them works in reverse.</p>
          <div className="info__meters">
            ${METERS.map((x) => html`<div key=${x.key} className="info-meter" style=${{ '--c': x.color }}><p><i />${x.label}<span>starts at ${INITIAL[x.key]}</span></p><p>${x.hint}</p></div>`)}
          </div>
          <p>Tap the little four-petal gauge in the corner at any time to see them, along with your satchel.</p>
        </section>

        <section className="info__sec">
          <h2>Acts, not just answers</h2>
          <p>Some choices are gestures. The game borrows an idea from games like <em>Florence</em>: the way you choose should feel like the thing you are choosing.</p>
          <dl className="info__acts">
            <dt>Hold</dt><dd>Weighty choices — setting the phone face down, breaking the streak, deleting the account — must be pressed and held. Let go and nothing happens.</dd>
            <dt>Sit</dt><dd>The candle room is a real sixty-second silence, breathing in for four and out for six. You can skip it, for a smaller reward.</dd>
            <dt>Switch off</dt><dd>The notification panel has real switches. Turn them off one by one and the pinging stops.</dd>
            <dt>Name</dt><dd>When asked for your five, you can type their names. On the trail, you can write a line in a notebook. Both stay in your browser’s local storage and appear only on your own results — nothing is sent anywhere.</dd>
            <dt>Climb</dt><dd>Drag the frog’s circle of sky open to see the whole world.</dd>
            <dt>Watch</dt><dd>The last notification can be tapped — or observed, untouched, until it passes. That is the whole skill.</dd>
          </dl>
        </section>

        <section className="info__sec">
          <h2>The score</h2>
          <p>At the beach, your four meters become one <strong>Digital Flourishing Score</strong> from 0 to 100.</p>
          <div className="info__formula"><p className="kicker">Flourishing score</p><p>( Focus + Oneness + Tranquility + (100 − Dopamine) ) ÷ 4</p></div>
          <p>Dopamine is <em>inverted</em>: a high Dopamine means you leaned into the scroll loop, and that lowers your flourishing. When it climbs above 75, the game enters <strong>Ghost Mode</strong> — the world drains of colour and glitches at the edges, which is what being permanently elsewhere feels like.</p>
          <p>Your report then breaks the score into eight dimensions:</p>
          <table className="info__dims"><tbody>
            ${DIMS.map((x) => html`<tr key=${x.name}><th>${x.name}</th><td>${x.how}</td></tr>`)}
          </tbody></table>
        </section>

        <section className="info__sec">
          <h2>Five kinds of wanderer</h2>
          <p>These are illustrative archetypes — not averages, but deliberate paths. At the end, you are matched to the one whose meters are closest to yours.</p>
          <div className="info__arch">
            ${ARCHETYPES.map((a) => html`<article key=${a.name} className="arch" style=${{ '--c': a.color }}>
              <header><h3>${a.name}</h3><b>${a.overall}<span>/100</span></b></header>
              <p>${a.desc}</p>
              <div className="arch__m">${METERS.map((x) => html`<span key=${x.key} style=${{ '--mc': x.color }}><i style=${{ width: a.meters[x.key] + '%' }} /><em>${x.label[0]} ${a.meters[x.key]}</em></span>`)}</div>
            </article>`)}
          </div>
        </section>

        <section className="info__sec">
          <h2>The four worlds</h2>
          <div className="info__worlds">
            ${worlds.map((w) => html`<article key=${w.n} className="iworld" style=${{ '--c': w.accent }}>
              <p className="iworld__n">${w.roman}</p><h3>${w.name}</h3><p className="iworld__d">${w.desc}</p>
              <p className="iworld__t">${SCENES[STARTS[w.n]].time}</p>
            </article>`)}
          </div>
        </section>

        <section className="info__sec">
          <h2>The satchel</h2>
          <p>Certain choices give you something to carry — a symbol of a real habit reclaimed from the noise. Six can be found in one night.</p>
          <ul className="info__items">${Object.keys(ITEMS).map((k) => html`<li key=${k}>${I.item(k)}<b>${ITEMS[k].name}</b><span>${ITEMS[k].desc}</span></li>`)}</ul>
        </section>

        <section className="info__sec">
          <h2>Data & ideas</h2>
          <p>The scenarios, the meters and the wellbeing framing come from Sanket Tambare’s ongoing writing on digital wellbeing — screen habits, dopamine loops, the attention economy, algorithmic influence and the practice of digital minimalism.</p>
          <a className="info__source" href="https://sankettambare.substack.com/t/digital-wellbeing" target="_blank" rel="noopener noreferrer"><span className="kicker">Primary source</span><b>Digital Wellbeing on Substack ↗</b><span>Essays and reflections on how we live with technology — and how we might live better.</span></a>
        </section>

        <section className="info__sec info__creator">
          <h2>About the creator</h2>
          <div className="creator"><span className="creator__av">ST</span><div><b>Sanket Tambare</b><span>Software Developer · Full-Stack</span></div></div>
          <p>I am a software developer specialised in full-stack development. Since college days I find myself inclined towards technology, society, psychology, blogging, designing, video editing, and digital well-being — in short, towards a variety of issues, technologies, topics, and interests.</p>
          <p>This has culminated in all-round curiosity across podcasts, development, writing, reading, and much more. All this exploration has helped me decide what I am good at, what I am not, what I like, what I don’t — and most importantly what I wish to do in my career and what I don’t want to do.</p>
          <p>And here’s what I wish to do: critically engage with new developments across technology, better myself every day, learn something about what’s happening around me, understand it, and enjoy this meaningful, purposeful journey.</p>
          <ul className="creator__links">
            <li><a href="https://linktr.ee/daredavil" target="_blank" rel="noopener noreferrer">Linktree ↗</a></li>
            <li><a href="https://www.linkedin.com/in/sankettambare/" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a></li>
            <li><a href="https://sankettambare.substack.com/" target="_blank" rel="noopener noreferrer">Substack ↗</a></li>
            <li><a href="mailto:sanket.tambare01@gmail.com">Get in touch →</a></li>
          </ul>
        </section>

        <footer className="info__foot">
          <button className="btn btn--ink" onClick=${onBegin}>Begin the journey ${I.arrow}</button>
          <button className="link" onClick=${onBack}>${I.back} Back</button>
          <p>The Wanderer’s Digital Escape · © 2026</p>
        </footer>
      </div>
    </main>`;
  }

  // ── APP ─────────────────────────────────────────────────────────────────────
  function App() {
    const debugScene = PARAMS.get('scene');
    const [view, setView] = useState(() => (location.hash === '#how-it-works' ? 'info' : debugScene && SCENES[debugScene] ? 'play' : 'title'));
    const [game, setGame] = useState(() => {
      if (debugScene && SCENES[debugScene]) return { ...freshGame(), sceneId: debugScene, seen: [0, 1, 2, 3, 4, 5] };
      return loadGame() || freshGame();
    });
    const [prefs, setPrefs] = useState(() => ({ sound: true, narrate: false, pace: PARAMS.get('pace') || 'calm', ...store.get(PREFS, {}), ...(PARAMS.get('pace') ? { pace: PARAMS.get('pace') } : {}) }));
    const [infoFrom, setInfoFrom] = useState('title');

    useEffect(() => { store.set(PREFS, prefs); Sound.setEnabled(prefs.sound); }, [prefs]);
    useEffect(() => { if (!debugScene) store.set(SAVE, game); }, [game]);
    useEffect(() => { document.body.className = 'view-' + view; }, [view]);
    useEffect(() => {
      const on = () => setView((v) => (location.hash === '#how-it-works' ? 'info' : v === 'info' ? infoFrom : v));
      addEventListener('hashchange', on);
      addEventListener('popstate', on);
      return () => { removeEventListener('hashchange', on); removeEventListener('popstate', on); };
    }, [infoFrom]);

    const begin = (cont) => {
      Sound.unlock();
      if (!cont || !hasProgress(game)) setGame(freshGame());
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
      setView('play');
    };
    const openInfo = () => { setInfoFrom(view === 'info' ? 'title' : view); history.pushState(null, '', '#how-it-works'); setView('info'); scrollTo(0, 0); };
    const closeInfo = () => { history.pushState(null, '', location.pathname + location.search); setView(infoFrom); };
    const restart = () => { setGame(freshGame()); setView('play'); };
    const toggleSound = () => { Sound.unlock(); setPrefs((p) => ({ ...p, sound: !p.sound })); };

    if (view === 'info') return html`<${Info} onBack=${closeInfo} onBegin=${() => { history.pushState(null, '', location.pathname + location.search); begin(hasProgress(game)); }} />`;
    if (view === 'play') return html`<${Play} game=${game} setGame=${setGame} prefs=${prefs} setPrefs=${setPrefs} onTitle=${() => setView('title')} onInfo=${openInfo} onRestart=${restart} />`;
    return html`<${Title} save=${hasProgress(game) ? game : null} onBegin=${begin} onInfo=${openInfo} prefs=${prefs} toggleSound=${toggleSound} />`;
  }

  ReactDOM.createRoot(document.getElementById('root')).render(html`<${App} />`);
})();
