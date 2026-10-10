// vignettes.js — the small interactive objects each scene is about.
//
// A vignette sits beside the narration and mirrors the choice in front of
// you: the phone you can set face down, the streak that cracks while you hold,
// the toggles you switch off one by one, the well you climb out of. The
// gesture is the meaning; the buttons below always work as well.
//
// Every vignette receives:
//   scene, ready       the scene and whether its choices are showing
//   hover              index of the choice being pointed at (-1 if none)
//   hold {i, p}        a hold-choice in progress (p: 0..1)
//   playing {i, kind}  the chosen option, playing out before the next scene
//   api                pick(i, {force}), commit(i, override), suggest(i), setPlaying(p)
//   game, setGame      for the few that remember something (five names, a line)
//   nudge              set when a choice asks the vignette to invite input
(function () {
  'use strict';
  if (!window.React || !window.htm || !window.WDE) return;
  const { useState, useEffect, useRef, useMemo } = React;
  const html = htm.bind(React.createElement);
  const Sound = window.AudioEngine;
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function useTicker(ms, on = true) {
    const [n, setN] = useState(0);
    useEffect(() => {
      if (!on) return;
      const t = setInterval(() => setN((x) => x + 1), ms);
      return () => clearInterval(t);
    }, [ms, on]);
    return n;
  }

  function useLater(ms) {
    const [on, setOn] = useState(false);
    useEffect(() => {
      const t = setTimeout(() => setOn(true), ms);
      return () => clearTimeout(t);
    }, [ms]);
    return on;
  }

  // shards that burst out when something breaks
  function Shards({ n = 18, tint = '255,255,255' }) {
    const shards = useMemo(() => Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const d = 120 + Math.random() * 180;
      return {
        '--dx': Math.cos(a) * d + 'px', '--dy': Math.sin(a) * d + 60 + 'px',
        '--rot': (Math.random() - 0.5) * 540 + 'deg', '--s': 0.5 + Math.random() * 0.9,
        '--delay': Math.random() * 0.08 + 's',
        clipPath: `polygon(${50 + (Math.random() - 0.5) * 60}% 0, 100% ${30 + Math.random() * 50}%, ${Math.random() * 40}% 100%)`,
      };
    }), [n]);
    return html`<div className="shards" aria-hidden="true">
      ${shards.map((s, i) => html`<span key=${i} style=${{ ...s, background: `linear-gradient(135deg, rgba(${tint},.75), rgba(${tint},.12))` }} />`)}
    </div>`;
  }

  // cracks that grow with a hold's progress
  function Cracks({ p }) {
    const paths = [
      'M50 50 L38 22 L41 8', 'M50 50 L74 30 L90 26', 'M50 50 L80 62 L96 70', 'M50 50 L58 82 L54 98',
      'M50 50 L24 68 L10 74', 'M50 50 L18 40 L4 36', 'M38 22 L30 18', 'M74 30 L78 16', 'M80 62 L86 82', 'M24 68 L22 86',
    ];
    return html`<svg className="cracks" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      ${paths.map((d, i) => {
        const local = clamp(p * 1.6 - (i >= 6 ? 0.5 : 0) - (i % 6) * 0.05, 0, 1);
        return html`<path key=${i} d=${d} pathLength="1" style=${{ strokeDashoffset: 1 - local }} />`;
      })}
    </svg>`;
  }

  // ── PROLOGUE: the phone on the nightstand ──────────────────────────────────
  const NOTIFS = [
    { app: 'Feed', c: '#ff6b9a', msg: '12 new posts from people you follow' },
    { app: 'Reels', c: '#c084fc', msg: 'Your feed just refreshed. Tap to watch.' },
    { app: 'Group chat', c: '#4ade80', msg: '34 unread messages' },
    { app: 'Breaking', c: '#f87171', msg: 'You won’t believe what happened next…' },
    { app: 'Streaks', c: '#fbbf24', msg: 'Don’t lose your 847-day streak' },
    { app: 'Shop', c: '#60a5fa', msg: 'Last chance — it’s almost gone' },
  ];

  function Phone({ hover, hold, playing }) {
    const [n, setN] = useState(0);
    useEffect(() => {
      if (n >= NOTIFS.length || playing) return;
      const t = setTimeout(() => {
        setN(n + 1);
        Sound.sfx(n % 2 ? 'buzz' : 'notify');
      }, n === 0 ? 1200 : 1500 + Math.random() * 700);
      return () => clearTimeout(t);
    }, [n, playing]);
    const flip = playing && playing.i === 1 ? 1 : hold.i === 1 ? hold.p : hover === 1 ? 0.06 : 0;
    const lit = (playing && playing.i === 0) || hover === 0;
    return html`<div className=${'v-phone' + (lit ? ' is-lit' : '') + (flip >= 1 ? ' is-down' : '')} style=${{ '--flip': flip }}>
      <div className="phone">
        <div className="phone__face">
          <div className="phone__time">22:47</div>
          <div className="phone__date">Screen time today · <b>7h 03m</b></div>
          <ol className="phone__list">
            ${NOTIFS.slice(0, n).reverse().map((x) => html`<li key=${x.app} className="notif">
              <span className="notif__dot" style=${{ background: x.c }} />
              <span className="notif__body"><b>${x.app}</b><span>${x.msg}</span></span>
            </li>`)}
          </ol>
          <span className="phone__badge">${41 + n}</span>
        </div>
        <div className="phone__back"><span className="phone__lens" /><span className="phone__lens" /></div>
      </div>
      <p className="v-caption">${flip >= 1 ? 'Face down. The room goes quiet.' : hold.i === 1 ? 'Keep holding…' : 'Hold the second choice to set it face down.'}</p>
    </div>`;
  }

  // ── W1: a clip or a conversation ────────────────────────────────────────────
  function Tapes({ hover, playing }) {
    const pick = playing ? playing.i : hover;
    const clip = useMemo(() => Array.from({ length: 14 }, () => 20 + Math.random() * 80), []);
    const talk = useMemo(() => Array.from({ length: 64 }, (_, i) => 30 + Math.sin(i / 4) * 18 + Math.sin(i / 1.7) * 9 + Math.random() * 8), []);
    return html`<div className="v-tapes">
      <div className=${'tape tape--clip' + (pick === 0 ? ' is-on' : '') + (pick === 1 ? ' is-off' : '')}>
        <div className="tape__wave">${clip.map((h, i) => html`<i key=${i} style=${{ height: h + '%', animationDelay: i * 0.05 + 's' }} />`)}</div>
        <div className="tape__meta"><b>0:15</b><span>clip · autoplay next</span></div>
      </div>
      <div className=${'tape tape--talk' + (pick === 1 ? ' is-on' : '') + (pick === 0 ? ' is-off' : '')}>
        <div className="tape__wave">${talk.map((h, i) => html`<i key=${i} style=${{ height: h + '%', animationDelay: i * 0.08 + 's' }} />`)}</div>
        <div className="tape__meta"><b>1:32:00</b><span>conversation · two thinkers</span></div>
      </div>
    </div>`;
  }

  // ── W1: your algorithm profile ──────────────────────────────────────────────
  function DataMirror({ scene, hover, playing }) {
    const on = useLater(250);
    const stats = scene.dataStats || [];
    const look = playing ? playing.i : hover;
    return html`<div className=${'v-data' + (look === 0 ? ' is-away' : '') + (look === 1 ? ' is-stare' : '')}>
      <div className="v-data__scan" />
      <p className="v-kicker">Your algorithm profile — downloaded</p>
      ${stats.map((s, i) => html`<div className="v-data__row" key=${s.label}>
        <span className="v-data__label">${s.label}</span>
        <span className="v-data__bar"><i style=${{ width: on ? s.value * 2.6 + '%' : 0, transitionDelay: 0.2 + i * 0.18 + 's' }} /></span>
        <span className="v-data__val">${s.value}%</span>
      </div>`)}
      <p className="v-data__q">${scene.dataQuestion}</p>
    </div>`;
  }

  // ── W1: the clearing with no signal ─────────────────────────────────────────
  function NoSignal({ hover }) {
    const t = useTicker(900);
    const bars = Math.max(0, 4 - t);
    return html`<div className=${'v-signal' + (hover === 0 ? ' is-reach' : '')}>
      <div className="v-signal__bars">${[0, 1, 2, 3].map((i) => html`<i key=${i} className=${i < bars ? 'on' : ''} style=${{ height: 8 + i * 7 + 'px' }} />`)}</div>
      <p className="v-signal__text">${bars > 0 ? 'Searching…' : 'No signal.'}</p>
      <div className=${'v-breath' + (bars === 0 ? ' is-on' : '')}><span /></div>
      <p className="v-caption">${bars === 0 ? 'Just you. Breathe with the circle.' : ''}</p>
    </div>`;
  }

  // ── W1 boss: the Algorithm Mirror ───────────────────────────────────────────
  function Mirror({ hold, playing }) {
    const p = playing && playing.i === 0 ? 1 : hold.i === 0 ? hold.p : 0;
    const broken = playing && playing.i === 0;
    const tiles = useMemo(() => Array.from({ length: 48 }, (_, i) => ({ d: Math.random() * 4, o: 0.25 + Math.random() * 0.6, h: [330, 200, 280, 20, 160][i % 5] })), []);
    useEffect(() => { if (broken) Sound.sfx('shatter'); }, [broken]);
    return html`<div className=${'v-boss v-mirror' + (broken ? ' is-broken' : '')} style=${{ '--p': p }}>
      <div className="v-mirror__frame">
        <div className="v-mirror__glass">
          <div className="v-mirror__tiles">${tiles.map((t, i) => html`<i key=${i} style=${{ animationDelay: t.d + 's', opacity: t.o, background: `hsl(${t.h} 70% 60% / .55)` }} />`)}</div>
          <svg className="v-mirror__face" viewBox="0 0 100 120" aria-hidden="true">
            <path d="M50 14c-17 0-28 13-28 32 0 22 13 44 28 44s28-22 28-44C78 27 67 14 50 14z" />
            <path d="M14 120c4-18 18-26 36-26s32 8 36 26" />
            <circle className="eye" cx="40" cy="50" r="3.4" /><circle className="eye" cx="60" cy="50" r="3.4" />
          </svg>
          <${Cracks} p=${p} />
        </div>
      </div>
      ${broken ? html`<${Shards} n=${22} tint="200,230,255" />` : null}
      <p className="v-caption">${broken ? 'Something real, at last.' : p > 0 ? 'The reflection cracks…' : 'It wears your face. Hold to break it.'}</p>
    </div>`;
  }

  // ── W2: the reels ───────────────────────────────────────────────────────────
  const REELS = [
    ['😂', 'He did WHAT', '#ff5f8f'], ['😢', 'This one broke me', '#6c8cff'], ['😱', 'Wait for it…', '#ff9f43'],
    ['😡', 'Unbelievable take', '#ff4d4d'], ['🥰', 'Too cute to scroll past', '#ff8ad8'], ['🤯', 'Mind = blown', '#a66bff'],
    ['😴', '3am thoughts', '#3fc1c9'], ['🔥', 'Everyone is talking about this', '#ffb020'],
  ];

  function Reels({ hover, playing }) {
    const [i, setI] = useState(0);
    const dropped = playing && playing.i === 1;
    const fast = hover === 0 || (playing && playing.i === 0);
    useEffect(() => {
      if (dropped) return;
      const t = setTimeout(() => setI((x) => x + 1), fast ? 650 : 1500);
      return () => clearTimeout(t);
    }, [i, fast, dropped]);
    const flick = (e) => { e.preventDefault(); setI((x) => x + 1); };
    const drag = useRef(null);
    return html`<div className=${'v-reels' + (dropped ? ' is-dropped' : '') + (hover === 1 ? ' is-lower' : '')}>
      <div className="phone phone--reels" onWheel=${(e) => { if (Math.abs(e.deltaY) > 8) setI((x) => x + 1); }}
        onPointerDown=${(e) => (drag.current = e.clientY)} onPointerUp=${(e) => { if (drag.current !== null && Math.abs(e.clientY - drag.current) > 20) setI((x) => x + 1); drag.current = null; }}
        title="Swipe — there is always one more">
        <div className="reels__track" style=${{ transform: `translateY(${-((i % REELS.length) * 100)}%)` }}>
          ${REELS.map(([e, t, c], k) => html`<div key=${k} className="reel" style=${{ '--c': c }}>
            <span className="reel__emoji">${e}</span><span className="reel__cap">${t}</span>
          </div>`)}
        </div>
        <div className="reels__hud"><span>♥ ${(12 + i * 7) % 99}k</span><span>↻</span></div>
      </div>
      <div className="v-reels__count"><span>Watched <b>${i + 1}</b></span><span>Remembered <b>0</b></span></div>
      <button className="v-ghostbtn" onClick=${flick}>Swipe ↑</button>
    </div>`;
  }

  // ── W2: AI slop ─────────────────────────────────────────────────────────────
  function Slop({ hover, playing }) {
    const t = useTicker(1100);
    const n = Math.min(24, 4 + t * 3);
    const past = hover === 1 || (playing && playing.i === 1);
    const friend = 5;
    return html`<div className=${'v-slop' + (past ? ' is-past' : '') + (hover === 0 ? ' is-near' : '')}>
      <div className="v-slop__grid">
        ${Array.from({ length: n }, (_, i) => html`<div key=${i} className=${'face' + (i === friend ? ' face--friend' : '')} style=${{ '--h': (i * 47) % 360, animationDelay: (i % 7) * 0.13 + 's' }}>
          <svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="18" r="11" /><circle className="e" cx="16" cy="17" r="1.4" /><circle className="e" cx="24" cy="17" r="1.4" /><path className="m" d=${i % 3 ? 'M15 23q5 4 10 0' : 'M15 24q5-3 10 0'} /><path d="M7 40c1-8 6-11 13-11s12 3 13 11" /></svg>
          ${i === friend ? html`<span className="face__tag">a friend?</span>` : null}
        </div>`)}
      </div>
      <p className="v-caption">${n} generated · 0 real</p>
    </div>`;
  }

  // ── W2: 2:14am ──────────────────────────────────────────────────────────────
  function Clock({ hover, playing }) {
    const t = useTicker(4000);
    const min = 14 + t;
    const off = hover === 1 || (playing && playing.i === 1);
    return html`<div className=${'v-clock' + (off ? ' is-off' : '')}>
      <div className="v-clock__face"><span>2</span><span className="colon">:</span><span>${String(min).padStart(2, '0')}</span><small>AM</small></div>
      <p className="v-clock__sub">${off ? '☾ Do not disturb · until 7:00' : 'Battery 6% · still scrolling'}</p>
    </div>`;
  }

  // ── W2: the small door ──────────────────────────────────────────────────────
  function Door({ hover }) {
    return html`<div className=${'v-door' + (hover === 0 ? ' is-open' : '') + (hover === 1 ? ' is-shut' : '')}>
      <div className="v-door__wall" />
      <div className="v-door__frame"><div className="v-door__light"><span className="v-door__flame" /></div><div className="v-door__leaf" /></div>
      <p className="v-caption">Small. Easy to miss.</p>
    </div>`;
  }

  // ── W2: the candle room (60 seconds) ────────────────────────────────────────
  function Candle({ onComplete, onSkip }) {
    const [state, setState] = useState('ready'); // ready | sitting | done
    const [left, setLeft] = useState(60);
    const [breath, setBreath] = useState('in');
    const [wander, setWander] = useState(0);
    const startAt = useRef(0);
    useEffect(() => () => Sound.duck(false), []);
    useEffect(() => {
      if (state !== 'sitting') return;
      startAt.current = performance.now();
      let raf;
      const loop = () => {
        const s = (performance.now() - startAt.current) / 1000;
        setLeft(Math.max(0, 60 - Math.floor(s)));
        const cyc = s % 10;
        setBreath(cyc < 4 ? 'in' : 'out');
        if (s >= 60) { setState('done'); Sound.sfx('item'); return; }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }, [state]);
    // a soft tone at the turn of each breath
    useEffect(() => { if (state === 'sitting') Sound.sfx(breath === 'in' ? 'breathIn' : 'breathOut'); }, [breath, state]);
    // the mind wanders: any input makes the flame waver
    useEffect(() => {
      if (state !== 'sitting') return;
      let last = 0;
      const on = () => { const now = performance.now(); if (now - last > 1500) { last = now; setWander((w) => w + 1); } };
      ['pointermove', 'keydown', 'wheel', 'touchstart'].forEach((e) => addEventListener(e, on, { passive: true }));
      return () => ['pointermove', 'keydown', 'wheel', 'touchstart'].forEach((e) => removeEventListener(e, on));
    }, [state]);
    const [waver, setWaver] = useState(false);
    useEffect(() => { if (!wander) return; setWaver(true); const t = setTimeout(() => setWaver(false), 2600); return () => clearTimeout(t); }, [wander]);

    const C = 2 * Math.PI * 46;
    return html`<div className=${'candle-room is-' + state + (waver ? ' is-waver' : '')} role="group" aria-label="Sixty seconds of silence">
      <div className="candle-room__ring">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className="bg" cx="50" cy="50" r="46" />
          <circle className="fg" cx="50" cy="50" r="46" style=${{ strokeDasharray: C, strokeDashoffset: C * (left / 60) }} />
        </svg>
        <div className=${'candle-room__breath is-' + breath} />
        <div className="candle">
          <span className="candle__glow" /><span className="candle__flame" /><span className="candle__wick" /><span className="candle__body" />
        </div>
      </div>
      ${state === 'ready' ? html`<div className="candle-room__text">
          <h2>The candle room</h2>
          <p>Sixty seconds. No screen, no task. Breathe with the light — in for four, out for six. If your mind wanders, that is the practice: come back.</p>
          <div className="candle-room__actions">
            <button className="btn btn--primary" onClick=${() => { setState('sitting'); Sound.duck(true); }} autoFocus>Begin the silence</button>
            <button className="btn btn--quiet" onClick=${() => { Sound.duck(false); onSkip(); }}>Skip (partial bonus)</button>
          </div>
        </div>`
      : state === 'sitting' ? html`<div className="candle-room__text candle-room__text--sitting" aria-live="polite">
          <p className="candle-room__cue">${breath === 'in' ? 'Breathe in' : 'Breathe out'}</p>
          <p className="candle-room__left">${left}</p>
          <p className="candle-room__wander">${waver ? 'The mind wandered. That is the practice — come back.' : 'Nothing to do. Nothing to check.'}</p>
        </div>`
      : html`<div className="candle-room__text">
          <h2>You did it.</h2>
          <p>Sixty seconds of real presence. Your Focus and Tranquility surge — and you carry the stillness with you.</p>
          <div className="candle-room__actions"><button className="btn btn--primary" autoFocus onClick=${() => { Sound.duck(false); onComplete(); }}>Continue</button></div>
        </div>`}
    </div>`;
  }

  // ── W2: notification settings ───────────────────────────────────────────────
  const APPS = ['Feed', 'Reels', 'Group chats', 'Shopping', 'Breaking news', 'Games', 'Streaks'];

  function Toggles({ playing, api, ready }) {
    const [on, setOn] = useState(() => APPS.map(() => true));
    const [ping, setPing] = useState(-1);
    const allOff = on.every((x) => !x);
    const flipping = playing && playing.i === 1;
    // pings keep coming from whatever is still on
    useEffect(() => {
      if (allOff) return;
      const t = setInterval(() => {
        const live = on.map((x, i) => (x ? i : -1)).filter((i) => i >= 0);
        if (!live.length) return;
        const k = live[Math.floor(Math.random() * live.length)];
        setPing(k);
        Sound.sfx('tick');
        setTimeout(() => setPing(-1), 500);
      }, 1300);
      return () => clearInterval(t);
    }, [on, allOff]);
    // choosing "turn them all off" flips them one by one
    useEffect(() => {
      if (!flipping) return;
      on.forEach((x, i) => { if (x) setTimeout(() => { setOn((o) => o.map((v, j) => (j === i ? false : v))); Sound.sfx('toggle'); }, 90 * i); });
    }, [flipping]);
    useEffect(() => { if (allOff && !playing) api.suggest(1); }, [allOff]);
    const flip = (i) => { setOn((o) => o.map((v, j) => (j === i ? !v : v))); Sound.sfx('toggle'); };
    const master = () => { const to = !allOff ? false : true; setOn(APPS.map(() => to)); Sound.sfx('toggle'); };
    const count = on.filter(Boolean).length;
    return html`<div className=${'v-toggles' + (allOff ? ' is-quiet' : '')}>
      <div className="v-toggles__head">
        <div><p className="v-kicker">Settings · Notifications</p><p className="v-toggles__count">${allOff ? 'Quiet.' : `${count === APPS.length ? 287 : 280 + count} apps can interrupt you`}</p></div>
        <button className=${'switch' + (!allOff ? ' is-on' : '')} role="switch" aria-checked=${!allOff} aria-label="Allow notifications" onClick=${master}><i /></button>
      </div>
      <ul>
        ${APPS.map((a, i) => html`<li key=${a} className=${ping === i ? 'is-ping' : ''}>
          <span>${a}</span>
          <button className=${'switch' + (on[i] ? ' is-on' : '')} role="switch" aria-checked=${on[i]} aria-label=${a} onClick=${() => flip(i)}><i /></button>
        </li>`)}
        <li className="more"><span>+ 280 more</span></li>
      </ul>
      <p className="v-caption">${allOff ? 'Twenty-three minutes of focus, every time, given back.' : 'Flip them off yourself — or choose below.'}</p>
    </div>`;
  }

  // ── W2 boss: the Streak Counter ─────────────────────────────────────────────
  function Streak({ hold, playing }) {
    const p = playing && playing.i === 0 ? 1 : hold.i === 0 ? hold.p : 0;
    const broken = playing && playing.i === 0;
    const kept = playing && playing.i === 1;
    useEffect(() => { if (broken) Sound.sfx('shatter'); }, [broken]);
    const beat = useTicker(1600, !broken);
    useEffect(() => { if (!broken && beat) Sound.sfx('heartbeat'); }, [beat]);
    return html`<div className=${'v-boss v-streak' + (broken ? ' is-broken' : '') + (kept ? ' is-kept' : '')} style=${{ '--p': p }}>
      <div className="v-streak__flame" aria-hidden="true"><span /><span /><span /></div>
      <div className="v-streak__num"><span>${kept ? 848 : 847}</span><${Cracks} p=${p} /></div>
      <p className="v-streak__days">day streak</p>
      <div className="v-streak__friends" aria-hidden="true">${[0, 1, 2, 3, 4].map((i) => html`<i key=${i} style=${{ '--h': i * 60 + 200 }} />`)}<span>are watching</span></div>
      ${broken ? html`<${Shards} n=${20} tint="255,190,90" />` : null}
      <p className="v-caption">${broken ? 'The number is gone. You are still here.' : p > 0 ? 'Let it go…' : 'Hold the first choice to break it.'}</p>
    </div>`;
  }

  // ── W3: likes ───────────────────────────────────────────────────────────────
  function Likes({ hover, playing }) {
    const steps = [3, 7, 12, 19, 26, 31, 33, 34];
    const t = useTicker(1300);
    const n = steps[Math.min(t, steps.length - 1)];
    const closed = hover === 1 || (playing && playing.i === 1);
    useEffect(() => { if (!closed && t > 0 && t < steps.length) Sound.sfx('notify'); }, [t]);
    return html`<div className=${'v-likes' + (closed ? ' is-closed' : '')}>
      <div className="post">
        <div className="post__head"><span className="post__av" /><b>you</b><span>· just now</span></div>
        <div className="post__img"><span className="post__sun" /></div>
        <div className="post__foot"><span className="post__heart" key=${n}>♥</span><b>${n} likes</b><span className="post__wait">${t > 4 ? 'refresh… refresh…' : ''}</span></div>
      </div>
    </div>`;
  }

  // ── W3: the lighthouse ──────────────────────────────────────────────────────
  function Lighthouse({ hover, playing }) {
    const take = hover === 0 || (playing && playing.i === 0);
    return html`<div className=${'v-light' + (take ? ' is-take' : '') + (hover === 1 ? ' is-leave' : '')}>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <defs><linearGradient id="beam" x1="0.45" x2="1"><stop offset="0" stopColor="#fff3cf" stopOpacity=".85" /><stop offset="1" stopColor="#fff3cf" stopOpacity="0" /></linearGradient></defs>
        <g className="beam"><path d="M100 52 L220 26 L220 78 Z" fill="url(#beam)" /></g>
        <path className="tower" d="M88 60h24l8 120H80z" />
        <path className="tower-band" d="M86 92h28l1.5 14h-31zM83 130h34l1.5 14h-37z" />
        <rect className="lamp" x="90" y="44" width="20" height="16" rx="2" />
        <path className="tower" d="M86 44h28l-4-8h-20z" />
        <path className="ground" d="M40 180h120" />
      </svg>
      <div className="v-light__compass">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${window.WDE.ITEMS.compass.path} /></svg>
      </div>
      <p className="v-caption">${take ? 'True North — for whatever comes next.' : 'It does not post. It beams.'}</p>
    </div>`;
  }

  // ── W3: your five (Dunbar) ──────────────────────────────────────────────────
  function Five({ game, setGame, hover, nudge, playing }) {
    const names = game.five || ['', '', '', '', ''];
    const first = useRef(null);
    useEffect(() => { if (nudge && first.current) first.current.focus(); }, [nudge]);
    const set = (i, v) => { setGame((g) => { const f = (g.five || ['', '', '', '', '']).slice(); f[i] = v.slice(0, 24); return { ...g, five: f }; }); Sound.sfx('type'); };
    const filled = names.filter((x) => x.trim()).length;
    const crowd = hover === 1 || (playing && playing.i === 1);
    const rings = [[150, 92, 60], [50, 70, 32], [15, 48, 15]];
    return html`<div className=${'v-five' + (crowd ? ' is-crowd' : '')}>
      <svg className="v-five__rings" viewBox="0 0 200 200" aria-hidden="true">
        ${rings.map(([n, r, dots]) => html`<g key=${n}>
          <circle className="ring" cx="100" cy="100" r=${r} />
          ${Array.from({ length: dots }, (_, i) => { const a = (i / dots) * Math.PI * 2; return html`<circle key=${i} className="dot" cx=${100 + Math.cos(a) * r} cy=${100 + Math.sin(a) * r} r="1.4" />`; })}
          <text x="100" y=${100 - r - 3}>${n}</text>
        </g>`)}
        <circle className="ring ring--five" cx="100" cy="100" r="26" />
        ${names.map((nm, i) => { const a = -Math.PI / 2 + (i / 5) * Math.PI * 2; const on = !!nm.trim(); return html`<circle key=${'s' + i} className=${'seat' + (on ? ' is-on' : '')} cx=${100 + Math.cos(a) * 26} cy=${100 + Math.sin(a) * 26} r=${on ? 6 : 4} />`; })}
        <circle className="you" cx="100" cy="100" r="5" />
      </svg>
      <div className=${'v-five__names' + (nudge ? ' is-nudged' : '')}>
        ${names.map((nm, i) => html`<input key=${i} ref=${i === 0 ? first : null} value=${nm} placeholder=${['First name', 'Second', 'Third', 'Fourth', 'Fifth'][i]} aria-label=${'Person ' + (i + 1) + ' of your five'} onChange=${(e) => set(i, e.target.value)} maxLength="24" autoComplete="off" spellCheck="false" />`)}
      </div>
      <p className="v-caption">${nudge && !filled ? 'Type them — they stay on this device, nowhere else.' : filled ? `${filled} of 5 · these are your people` : '5 · 15 · 50 · 150 — Dunbar’s circles of closeness'}</p>
    </div>`;
  }

  // ── W3: the account deletion screen ─────────────────────────────────────────
  function Profile({ hold, playing }) {
    const deleting = playing && playing.i === 0;
    const p = deleting ? 1 : hold.i === 0 ? hold.p : 0;
    const [k, setK] = useState(0);
    useEffect(() => {
      if (!deleting) return;
      Sound.sfx('shatter');
      let raf, t0 = performance.now();
      const loop = () => { const x = Math.min(1, (performance.now() - t0) / 1600); setK(x); if (x < 1) raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }, [deleting]);
    const fmt = (n) => Math.round(n).toLocaleString('en-US');
    const tiles = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ h: (i * 41 + 10) % 360, d: Math.random() * 0.6 })), []);
    return html`<div className=${'v-profile' + (deleting ? ' is-deleting' : '')} style=${{ '--p': p }}>
      <div className="v-profile__card">
        <div className="v-profile__top">
          <span className="v-profile__av" />
          <div className="v-profile__stats">
            <span><b>${fmt(847 * (1 - k))}</b>posts</span><span><b>${fmt(2341 * (1 - k))}</b>followers</span><span><b>${deleting ? 0 : 4}</b>years</span>
          </div>
        </div>
        <p className="v-profile__name">@you</p>
        <div className="v-profile__grid">${tiles.map((t, i) => html`<i key=${i} style=${{ '--h': t.h, '--d': t.d + 's' }} />`)}</div>
        <div className="v-profile__warn">${deleting ? (k < 1 ? 'Memories dissolving…' : 'The weight lifts.') : p > 0 ? 'This cannot be undone. Keep holding.' : 'Delete account?'}</div>
      </div>
    </div>`;
  }

  // ── W3 boss: the Mirror Wall ────────────────────────────────────────────────
  function Wall({ hold, playing }) {
    const p = playing && playing.i === 0 ? 1 : hold.i === 0 ? hold.p : 0;
    const broken = playing && playing.i === 0;
    useEffect(() => { if (broken) Sound.sfx('shatter'); }, [broken]);
    const tiles = useMemo(() => Array.from({ length: 20 }, (_, i) => ({ h: (i * 53) % 360, d: Math.random() * 3 })), []);
    return html`<div className=${'v-boss v-wall' + (broken ? ' is-broken' : '')} style=${{ '--p': p }}>
      <div className="v-wall__screen">
        <div className="v-wall__grid">${tiles.map((t, i) => html`<i key=${i} style=${{ '--h': t.h, animationDelay: t.d + 's' }} />`)}</div>
        <div className="v-wall__over"><b>@you</b><span>2,341 followers · 847 posts</span><em>“This IS you.”</em></div>
        <${Cracks} p=${p} />
      </div>
      ${broken ? html`<${Shards} n=${24} tint="190,215,255" />` : null}
      <p className="v-caption">${broken ? 'You are the one who chose to leave.' : p > 0 ? 'The wall gives…' : 'Hold the first choice to answer it.'}</p>
    </div>`;
  }

  // ── W4: 5:29am ──────────────────────────────────────────────────────────────
  function Alarm({ hover, playing }) {
    const rang = useLater(3200);
    useEffect(() => { if (rang) Sound.sfx('bell', 0); }, [rang]);
    const phone = hover === 1 || (playing && playing.i === 1);
    return html`<div className=${'v-alarm' + (phone ? ' is-phone' : '') + (hover === 0 ? ' is-brew' : '')}>
      <div className="v-alarm__clock"><span>5</span><span className="colon">:</span><span className=${rang ? 'flip' : ''}>${rang ? '30' : '29'}</span></div>
      <div className="v-alarm__cup" aria-hidden="true">
        <span className="steam" /><span className="steam" /><span className="steam" />
        <svg viewBox="0 0 24 24"><path d=${window.WDE.ITEMS.coffee.path} /></svg>
      </div>
      <p className="v-caption">${phone ? 'The glow of the screen reaches the kitchen.' : rang ? 'The hour is yours.' : 'The kettle ticks. The city sleeps.'}</p>
    </div>`;
  }

  // ── W4: the run ─────────────────────────────────────────────────────────────
  function Run({ hover, playing }) {
    const stop = hover === 1 || (playing && playing.i === 1);
    const words = ['breathe in', 'step', 'step', 'breathe out', 'step', 'step'];
    const t = useTicker(700, !stop);
    return html`<div className=${'v-run' + (stop ? ' is-stop' : '')}>
      <svg viewBox="0 0 300 90" aria-hidden="true">
        <path className="route" d="M0 70 C40 66 50 40 90 44 S150 72 190 58 S250 20 300 30" />
        <circle className="runner" r="5"><animateMotion dur="9s" repeatCount="indefinite" path="M0 70 C40 66 50 40 90 44 S150 72 190 58 S250 20 300 30" /></circle>
      </svg>
      <p className="v-run__word" key=${t}>${stop ? 'pause' : words[t % words.length]}</p>
      <p className="v-caption">${stop ? 'The phone is warm in your hand again.' : 'No metrics. No audience. Just the breath.'}</p>
    </div>`;
  }

  // ── W4: the notebook ────────────────────────────────────────────────────────
  function Journal({ game, setGame, nudge, playing }) {
    const ref = useRef(null);
    useEffect(() => { if (nudge && ref.current) ref.current.focus(); }, [nudge]);
    const closed = playing && playing.i === 1;
    return html`<div className=${'v-journal' + (closed ? ' is-closed' : '')}>
      <div className="notebook">
        <p className="notebook__date">06:03 · the trail</p>
        <textarea ref=${ref} value=${game.journal || ''} maxLength="280" rows="5"
          placeholder="Where have you been tonight?" aria-label="Write a line in the notebook"
          onChange=${(e) => { const v = e.target.value; setGame((g) => ({ ...g, journal: v })); Sound.sfx('type'); }} />
      </div>
      <p className="v-caption">${nudge && !(game.journal || '').trim() ? 'Even one line. It stays on this device.' : 'Paper and ink. Write a line if you like — it comes with you to the end.'}</p>
    </div>`;
  }

  // ── W4: the frog in the well ────────────────────────────────────────────────
  function Well({ playing, api, ready }) {
    const [p, setP] = useState(0);
    const target = useRef(0);
    const done = useRef(false);
    // animate toward a target when a choice plays
    useEffect(() => {
      if (!playing) return;
      target.current = playing.i === 0 ? 1 : 0;
      let raf;
      const loop = () => {
        setP((x) => { const n = x + (target.current - x) * 0.08; return Math.abs(n - target.current) < 0.002 ? target.current : n; });
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }, [playing]);
    const drag = useRef(null);
    const pRef = useRef(0);
    pRef.current = p;
    const move = (dp) => {
      if (playing || done.current) return;
      const n = clamp(pRef.current + dp, 0, 1);
      pRef.current = n;
      setP(n);
      if (n >= 0.98) { done.current = true; setTimeout(() => api.pick(0, { force: true }), 300); }
    };
    const r = 30 + p * 190;
    return html`<div className="v-well">
      <div className="v-well__view" tabIndex="0" role="slider" aria-label="Climb out of the well" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(p * 100)}
        onWheel=${(e) => move(-e.deltaY / 900)}
        onPointerDown=${(e) => { drag.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove=${(e) => { if (drag.current === null) return; move((drag.current - e.clientY) / 260); drag.current = e.clientY; }}
        onPointerUp=${() => (drag.current = null)}
        onKeyDown=${(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); move(0.1); } if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); move(-0.1); } }}>
        <svg viewBox="0 0 300 300" aria-hidden="true">
          <defs>
            <clipPath id="well-hole"><circle cx="150" cy=${110 - p * 40} r=${r} /></clipPath>
            <linearGradient id="well-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fa8d6" /><stop offset=".55" stopColor="#f2b88a" /><stop offset="1" stopColor="#ffe3b5" /></linearGradient>
          </defs>
          <rect width="300" height="300" className="v-well__wall" />
          ${Array.from({ length: 7 }, (_, i) => html`<path key=${i} className="v-well__stone" d=${`M0 ${40 + i * 40} H300`} />`)}
          <g clipPath="url(#well-hole)">
            <rect width="300" height="300" fill="url(#well-sky)" />
            <circle cx="210" cy=${150 - p * 20} r="16" fill="#fff4d6" />
            <path d="M0 200 L40 160 L80 185 L130 130 L180 175 L230 140 L300 180 V300 H0Z" fill="#3c4a6b" opacity=${0.4 + p * 0.5} />
            <path d="M0 230 Q80 200 150 220 T300 210 V300 H0Z" fill="#2a3550" opacity=${p} />
            <path d="M60 90 q6 -5 12 0 q6 -5 12 0 M180 70 q5 -4 10 0 q5 -4 10 0" className="v-well__birds" opacity=${p} />
          </g>
          <circle cx="150" cy=${110 - p * 40} r=${r} className="v-well__rim" />
          <g className="v-well__frog" style=${{ transform: `translate(150px, ${250 + p * 30}px) scale(${1 - p * 0.45})` }}>
            <ellipse cx="0" cy="0" rx="22" ry="14" /><circle cx="-9" cy="-12" r="6" /><circle cx="9" cy="-12" r="6" />
            <circle className="pupil" cx="-9" cy="-13" r="2.2" /><circle className="pupil" cx="9" cy="-13" r="2.2" />
          </g>
        </svg>
      </div>
      <p className="v-caption">${p >= 0.95 ? 'The world is enormous. Beautiful. It was always here.' : p > 0.05 ? 'Keep climbing…' : 'The frog’s whole world: a circle of sky. Drag up to climb out.'}</p>
    </div>`;
  }

  // ── W4 boss: the last notification ──────────────────────────────────────────
  function LastPing({ playing, api, ready }) {
    const observing = playing && playing.i === 0;
    const opened = playing && playing.i === 1;
    const [p, setP] = useState(0);
    const [gone, setGone] = useState(false);
    const buzz = useTicker(2600, !observing && !opened);
    useEffect(() => { if (buzz) Sound.sfx('buzz'); }, [buzz]);
    useEffect(() => {
      if (!observing) return;
      let raf, t0 = performance.now();
      const loop = () => {
        const x = Math.min(1, (performance.now() - t0) / 5000);
        setP(x);
        if (x >= 1) { setGone(true); Sound.sfx('bell', 4); setTimeout(() => api.commit(0), 1100); return; }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }, [observing]);
    const tap = () => {
      if (gone || opened) return;
      api.setPlaying({ i: 1, kind: 'open' });
      setTimeout(() => api.commit(1), 800);
    };
    const C = 2 * Math.PI * 30;
    return html`<div className=${'v-ping' + (observing ? ' is-observing' : '') + (gone ? ' is-gone' : '') + (opened ? ' is-opened' : '')}>
      <div className="v-ping__wrap">
        <button className=${'v-ping__card' + (buzz % 2 ? ' is-buzz' : '')} onClick=${tap} aria-label="Open the notification">
          <span className="v-ping__app"><i />Feed · now</span>
          <b>You have been gone too long.</b>
          <span>Everyone else is still connected. You are missing everything.</span>
        </button>
        ${observing && !gone ? html`<svg className="v-ping__ring" viewBox="0 0 70 70" aria-hidden="true"><circle cx="35" cy="35" r="30" style=${{ strokeDasharray: C, strokeDashoffset: C * (1 - p) }} /></svg>` : null}
      </div>
      <p className="v-caption" aria-live="polite">${gone ? 'It passed. You are still here.' : observing ? 'Observe it. Do not touch. Let it pass…' : opened ? 'Just one more…' : 'Tapping it is a choice. So is watching it pass.'}</p>
    </div>`;
  }

  window.WDE.VIGNETTES = {
    phone: Phone, tapes: Tapes, dataMirror: DataMirror, noSignal: NoSignal, mirror: Mirror,
    reels: Reels, slop: Slop, clock: Clock, door: Door, toggles: Toggles, streak: Streak,
    likes: Likes, lighthouse: Lighthouse, five: Five, profile: Profile, wall: Wall,
    alarm: Alarm, run: Run, journal: Journal, well: Well, lastPing: LastPing,
  };
  window.WDE.Candle = Candle;
})();
