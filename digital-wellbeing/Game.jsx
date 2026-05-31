// Game.jsx — The Wanderer's Digital Escape
const { useState, useEffect, useRef, useCallback } = React;

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const INITIAL_METERS = { focus: 30, dopamine: 40, oneness: 25, tranquility: 20 };
const METER_CONFIG = {
  focus:       { label: 'Focus',       color: '#22d3ee' },
  dopamine:    { label: 'Dopamine',    color: '#fb923c' },
  oneness:     { label: 'Oneness',     color: '#a78bfa' },
  tranquility: { label: 'Tranquility', color: '#4ade80' },
};
const ITEMS = {
  book:    { emoji: '📚', name: 'Long-form Mind',  desc: 'You chose depth over speed.' },
  journal: { emoji: '📔', name: 'Inner Voice',     desc: 'You sat with your own thoughts.' },
  cushion: { emoji: '🧘', name: 'Still Point',     desc: '60 seconds of real presence.' },
  compass: { emoji: '🧭', name: 'True North',      desc: 'The lighthouse keeper\'s gift.' },
  coffee:  { emoji: '☕', name: '5:30am Hour',     desc: 'The morning before the world.' },
  shoes:   { emoji: '👟', name: 'The Run',          desc: 'An hour without the phone.' },
};
const WORLD_LABELS = ['', 'Echo Chamber', 'Dopamine Arcade', 'Validation City', "Nomad's Trail", 'The Beach'];
const CURIOSITY_WORDS = ['read', 'podcast', 'book', 'journal', 'write', 'learn', 'meditat', 'article', 'long-form'];
const WORLD_STARTS = { 0: 'intro', 1: 'w1_enter', 2: 'w2_enter', 3: 'w3_enter', 4: 'w4_enter', 5: 'win' };
const BG_COLORS = {
  intro:  'radial-gradient(ellipse at 50% 65%, #1a0f2e 0%, #06030f 70%)',
  swamp:  'linear-gradient(180deg, #061208 0%, #0c1e0d 45%, #061008 100%)',
  arcade: 'linear-gradient(180deg, #0d0015 0%, #130020 55%, #0a001a 100%)',
  city:   'linear-gradient(180deg, #030308 0%, #06060f 50%, #0a0a18 100%)',
  trail:  'linear-gradient(180deg, #020803 0%, #0a1804 50%, #162008 100%)',
  beach:  'linear-gradient(180deg, #2a5fa8 0%, #e07b39 22%, #f5c06a 48%, #fffbe8 72%, #eaf6fd 100%)',
};
const BG_COLORS_LIGHT = {
  intro:  'radial-gradient(ellipse at 50% 65%, #dcd4f0 0%, #f4f0ff 70%)',
  swamp:  'linear-gradient(180deg, #d4edcc 0%, #e8f6e4 45%, #cce8c8 100%)',
  arcade: 'linear-gradient(180deg, #f2d8ff 0%, #fde8ff 55%, #f4d4ff 100%)',
  city:   'linear-gradient(180deg, #eaeff6 0%, #f4f8fc 50%, #eaeef6 100%)',
  trail:  'linear-gradient(180deg, #d8edcc 0%, #e8f8d4 50%, #d0e8c4 100%)',
  beach:  'linear-gradient(180deg, #2a5fa8 0%, #e07b39 22%, #f5c06a 48%, #fffbe8 72%, #eaf6fd 100%)',
};

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
function applyEffects(meters, effects) {
  if (!effects) return meters;
  return Object.fromEntries(
    Object.entries(meters).map(([k, v]) => [k, clamp(v + (effects[k] || 0))])
  );
}

// ── BACKGROUND ────────────────────────────────────────────────────────────────
function Background({ bg, ghostMode, theme }) {
  const colors = theme === 'light' ? BG_COLORS_LIGHT : BG_COLORS;
  return (
    <div
      className={`scene-bg scene-bg--${bg}${ghostMode ? ' ghost-mode' : ''}`}
      style={{ background: colors[bg] || colors.intro }}
    />
  );
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function HUD({ meters, world, ghostMode, inventory, muted, onToggleMute, curiosityXP, onOpenSettings, theme, onToggleTheme }) {
  return (
    <div className="hud">
      <div className="hud-top">
        <span className="hud-world-label">{world > 0 ? WORLD_LABELS[world] : 'The Wanderer\'s Journey'}</span>
        <div className="hud-top-right">
          {ghostMode && <span className="ghost-warning">👻 Elsewhere…</span>}
          {curiosityXP > 0 && <span className="hud-xp">⚡ {curiosityXP} XP</span>}
          <button className="hud-mute" onClick={onToggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="hud-mute" onClick={onOpenSettings} title="Settings">⚙️</button>
          <button className="hud-mute" onClick={onToggleMute} title={muted ? 'Unmute' : 'Mute'}>
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>
      <div className="hud-meters">
        {Object.entries(METER_CONFIG).map(([key, cfg]) => (
          <div key={key} className="meter">
            <div className="meter-header">
              <span className="meter-label">{cfg.label}</span>
              <span className="meter-value" style={{ color: cfg.color }}>{meters[key]}</span>
            </div>
            <div className="meter-track">
              <div className="meter-fill" style={{ width: `${meters[key]}%`, background: cfg.color, boxShadow: `0 0 6px ${cfg.color}60` }} />
            </div>
          </div>
        ))}
      </div>
      {world > 0 && (
        <div className="hud-progress-wrap">
          <div className="hud-progress-fill" style={{ width: `${Math.min(100, ((world - 1) / 4) * 100)}%` }} />
        </div>
      )}
      {inventory.size > 0 && (
        <div className="hud-inventory">
          {[...inventory].map(key => (
            <span key={key} className="inv-item" title={`${ITEMS[key]?.name}: ${ITEMS[key]?.desc}`}>
              {ITEMS[key]?.emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── WORLD INTRO ───────────────────────────────────────────────────────────────
function WorldIntroCard({ scene, onContinue }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), 40); return () => clearTimeout(t); }, []);
  return (
    <div className={`world-intro${vis ? ' world-intro--visible' : ''}`}>
      <div className="world-intro-number">{scene.worldName}</div>
      <div className="world-intro-title">{scene.worldSubtitle}</div>
      <div className="world-intro-desc">{scene.worldDesc}</div>
      <button className="world-intro-btn" onClick={onContinue}>Enter →</button>
    </div>
  );
}

// ── BOSS TAG ──────────────────────────────────────────────────────────────────
function BossTag({ name }) {
  return (
    <div className="boss-tag">
      <span>⚔️</span>
      <span>BOSS: {name}</span>
    </div>
  );
}

// ── DATA REVEAL ───────────────────────────────────────────────────────────────
function DataReveal({ stats, question }) {
  return (
    <div className="data-reveal">
      <div className="data-reveal-title">Your Algorithm Profile — Downloaded</div>
      {stats.map((s, i) => (
        <div key={i} className="data-stat">
          <span className="data-stat-label">{s.label}</span>
          <div className="data-stat-bar">
            <div className="data-stat-fill" style={{ width: `${s.value}%`, animationDelay: `${i * 0.15}s` }} />
          </div>
          <span className="data-stat-val">{s.value}%</span>
        </div>
      ))}
      {question && <div className="data-reveal-question">{question}</div>}
    </div>
  );
}

// ── TIMER 60 ──────────────────────────────────────────────────────────────────
function Timer60({ onComplete, onSkip }) {
  const [secs, setSecs] = useState(60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const CIRC = 2 * Math.PI * 45;

  useEffect(() => {
    if (!running || secs <= 0) { if (running && secs <= 0) setDone(true); return; }
    const t = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [running, secs]);

  if (done) return (
    <div className="special-panel">
      <div className="timer-complete-text">✓ You did it.</div>
      <div className="timer-complete-sub">60 seconds of real presence.<br />Your Focus and Tranquility surge.</div>
      <button className="choice-btn choice-btn--primary" onClick={onComplete}>Continue →</button>
    </div>
  );

  const progress = CIRC * ((60 - secs) / 60);
  return (
    <div className="special-panel">
      <div className="timer-room">
        <div className="timer-candle">🕯️</div>
        <div className="timer-svg-wrap">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" className="timer-ring-bg" />
            <circle cx="50" cy="50" r="45" className="timer-ring-fill"
              strokeDasharray={`${progress} ${CIRC}`} strokeDashoffset="0" />
          </svg>
          <div className="timer-seconds">{secs}</div>
        </div>
        <div className="timer-instruction">
          {!running ? 'Find stillness. Do nothing.' : 'Just breathe. No interaction needed.'}
        </div>
      </div>
      {!running && (
        <div className="timer-actions">
          <button className="choice-btn choice-btn--primary" onClick={() => setRunning(true)}>Begin Silence</button>
          <button className="choice-btn" onClick={onSkip}>Skip (partial bonus)</button>
        </div>
      )}
    </div>
  );
}

// ── DELETE INSTAGRAM ──────────────────────────────────────────────────────────
function DeleteInstagramModal({ onDelete, onKeep, onBack }) {
  const [step, setStep] = useState(0); // 0=confirm, 1=second confirm, 2=dissolving

  const handleDelete = () => {
    if (step === 0) { setStep(1); return; }
    setStep(2);
    setTimeout(onDelete, 2200);
  };

  if (step === 2) return (
    <div className="special-panel delete-panel">
      <div className="delete-dissolve">
        <div>Memories dissolving…</div>
        <div>847 posts, gone.</div>
        <div>2,341 followers, gone.</div>
        <div style={{ color: '#4ade80', marginTop: 8 }}>The weight lifts.</div>
      </div>
    </div>
  );

  return (
    <div className="special-panel delete-panel">
      <div className="delete-icon">📱</div>
      <div className="delete-title">instagram</div>
      <div className="delete-stats">
        <span>847 posts</span>
        <span>2,341 followers</span>
        <span>4 years</span>
      </div>
      {step === 1 && <div className="delete-warning">This cannot be undone.</div>}
      <div className="choices" style={{ width: '100%' }}>
        <button className="choice-btn choice-btn--danger" onClick={handleDelete}>
          {step === 0 ? '🗑️  Delete Account' : 'Yes. Delete everything.'}
        </button>
        {step === 0 ? (
          <>
            <button className="choice-btn" onClick={onKeep}>Keep it, use it less</button>
            <button className="choice-btn" onClick={onBack}>Step back. Not ready.</button>
          </>
        ) : (
          <button className="choice-btn" onClick={() => setStep(0)}>Actually, wait.</button>
        )}
      </div>
    </div>
  );
}

// ── FROG ZOOM OUT ─────────────────────────────────────────────────────────────
function FrogZoomOut({ onClimb, onStay }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <div className="special-panel frog-panel">
      {!zoomed ? (
        <div className="frog-well">
          <div className="frog-circle">
            <div className="frog-sky">☀️</div>
            <div className="frog-emoji">🐸</div>
          </div>
          <div className="frog-caption">The frog's entire world: a circle of sky.</div>
          <button className="choice-btn choice-btn--primary" onClick={() => setZoomed(true)}>
            Zoom out. See what's beyond.
          </button>
        </div>
      ) : (
        <div className="frog-landscape">
          <div className="frog-horizon">🌄</div>
          <div className="frog-caption" style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
            The world is enormous. Beautiful. It was always here.
          </div>
          <div className="choices" style={{ width: '100%', marginTop: 8 }}>
            <button className="choice-btn choice-btn--primary" onClick={onClimb}>
              Climb out. Keep walking.
            </button>
            <button className="choice-btn" onClick={onStay}>
              The well felt safe.
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SCORE CARD DOWNLOAD ───────────────────────────────────────────────────────
function downloadScoreCard(meters, dims, overall, inventory) {
  const W = 820, H = 560;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#07090f'); bg.addColorStop(0.65, '#0a0f1e'); bg.addColorStop(1, '#080f0a');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Top accent bar
  const topBar = ctx.createLinearGradient(0,0,W,0);
  topBar.addColorStop(0,'#22d3ee'); topBar.addColorStop(0.5,'#a78bfa'); topBar.addColorStop(1,'#4ade80');
  ctx.fillStyle = topBar; ctx.fillRect(0, 0, W, 3);

  // Title
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.font = '11px monospace'; ctx.textAlign = 'center';
  ctx.fillText("THE WANDERER'S DIGITAL ESCAPE", W/2, 38);

  // Score circle
  ctx.beginPath(); ctx.arc(W/2, 130, 68, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(74,222,128,0.05)'; ctx.fill();
  ctx.strokeStyle = 'rgba(74,222,128,0.22)'; ctx.lineWidth = 1.5; ctx.stroke();

  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 62px monospace'; ctx.textAlign = 'center';
  ctx.fillText(overall, W/2, 152);

  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.font = '10px monospace';
  ctx.fillText('FLOURISHING SCORE / 100', W/2, 200);

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, 218); ctx.lineTo(W-80, 218); ctx.stroke();

  // Dimensions
  const barX = 300, barW = 350;
  dims.forEach((d, i) => {
    const y = 244 + i * 32;
    ctx.fillStyle = 'rgba(255,255,255,0.42)'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
    ctx.fillText(d.name.toUpperCase(), 80, y);
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(barX, y-10, barW, 4);
    const gr = ctx.createLinearGradient(barX, 0, barX+barW, 0);
    gr.addColorStop(0, 'rgba(16,110,50,0.85)'); gr.addColorStop(1, 'rgba(74,222,128,0.92)');
    ctx.fillStyle = gr; ctx.fillRect(barX, y-10, barW * d.score/100, 4);
    ctx.fillStyle = 'rgba(74,222,128,0.65)'; ctx.font = '9px monospace'; ctx.textAlign = 'right';
    ctx.fillText(d.score, barX+barW+36, y);
  });

  // Inventory
  if (inventory && inventory.size > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
    ctx.fillText('COLLECTED', 80, H - 58);
    let ix = 80;
    [...inventory].forEach(key => {
      ctx.font = '18px serif'; ctx.fillText(ITEMS[key]?.emoji || '', ix, H - 36);
      ix += 28;
    });
  }

  // Quote
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = 'italic 12px Georgia, serif'; ctx.textAlign = 'center';
  ctx.fillText('"What lies beyond the horizon of your mundane life?"', W/2, H - 18);

  const link = document.createElement('a');
  link.download = 'wanderer-flourishing-score.png';
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

// ── TIPS ENGINE ───────────────────────────────────────────────────────────────
function getTips(meters) {
  const tips = [];
  if (meters.focus < 55) tips.push({ icon: '📚', title: 'Rebuild your Focus', text: 'Replace 30 minutes of reels with a podcast or long-form article each day. Your brain will start remembering what it consumes.' });
  if (meters.focus >= 55) tips.push({ icon: '🔭', title: 'Go deeper', text: 'Your focus is strong. Now challenge it — pick one complex topic and read three long-form pieces on it this week.' });
  if (meters.dopamine > 65) tips.push({ icon: '📵', title: 'Try a 24-hour notification detox', text: 'Turn off every non-essential notification for one full day. Each ping costs an average of 23 minutes of deep focus.' });
  if (meters.dopamine <= 65) tips.push({ icon: '⚖️', title: 'Maintain your dopamine balance', text: "You've kept the dopamine arc in check. Protect it — audit your app usage weekly and delete what you haven't opened in a month." });
  if (meters.oneness < 50) tips.push({ icon: '🤝', title: 'Invest in your five', text: 'Schedule a 2-hour phone-free conversation with someone in your inner circle this week. No agenda, no audience.' });
  if (meters.oneness >= 50) tips.push({ icon: '🌊', title: 'Practise Sadagi', text: "You've found oneness. Deepen it — the next time you're with someone you love, leave the phone in another room entirely." });
  if (meters.tranquility < 50) tips.push({ icon: '🌅', title: 'Claim the 5:30am hour', text: 'Try one morning without the phone. Run, read, write. See what the world looks like before the feeds wake up.' });
  if (meters.tranquility >= 50) tips.push({ icon: '🧘', title: 'Extend your stillness', text: 'You have found tranquility. Now try Sthitaprajnata in a difficult moment — observe the notification, feel the pull, and choose not to open it.' });
  tips.push({ icon: '✍️', title: 'Write for 20 minutes', text: 'Not a notes app — paper. Writing by hand forces an honesty the scroll cannot reach. Even once a week changes things.' });
  tips.push({ icon: '🏃', title: 'Run without the phone', text: "One hour. No music, no podcasts. Just your breathing and the city falling away. This is the practice that changes everything." });
  return tips.slice(0, 4);
}

// ── DETAILED REPORT ───────────────────────────────────────────────────────────
function generateReport(meters, dims, overall, inventory, tips) {
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const meterInterpret = {
    focus:       meters.focus < 40 ? 'Needs care — spending attention on things that do not fill you' : meters.focus < 70 ? 'Recovering — keep choosing depth over speed' : 'Strong — you are building something real',
    dopamine:    meters.dopamine > 70 ? 'High — the arcade still has a hold on you' : meters.dopamine > 40 ? 'Balanced — a healthy relationship with stimulation' : 'Liberated — you have broken the dopamine loop',
    oneness:     meters.oneness < 40 ? 'Disconnected — the city has fragmented your connections' : meters.oneness < 70 ? 'Rebuilding — your five are coming back into focus' : 'Connected — you know who your people are',
    tranquility: meters.tranquility < 40 ? 'Turbulent — the noise of the digital world is still loud' : meters.tranquility < 70 ? 'Settling — the trail is becoming familiar' : 'Serene — you have reached the beach',
  };
  const invRows = inventory && inventory.size > 0
    ? [...inventory].map(k => `<tr><td>${ITEMS[k]?.emoji}</td><td><strong>${ITEMS[k]?.name}</strong></td><td>${ITEMS[k]?.desc}</td></tr>`).join('')
    : '<tr><td colspan="3" style="opacity:0.4;font-style:italic">No items collected this run</td></tr>';
  const tipRows = tips.map(t => `<div class="tip"><div class="tip-icon">${t.icon}</div><div><strong>${t.title}</strong><p>${t.text}</p></div></div>`).join('');
  const dimRows = dims.map(d => `<div class="dim-row"><div class="dim-label">${d.name}</div><div class="dim-bar"><div class="dim-fill" style="width:${d.score}%"></div></div><div class="dim-val">${d.score}</div></div>`).join('');

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>Your Wanderer's Journey Report — ${date}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,serif;max-width:720px;margin:0 auto;padding:48px 28px;color:#1a2010;background:#fafdf7;line-height:1.7}
  h1{font-family:monospace;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:rgba(10,40,20,.45);margin-bottom:6px}
  h2{font-family:monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(10,40,20,.4);margin:36px 0 14px;padding-bottom:6px;border-bottom:1px solid rgba(0,0,0,.07)}
  .hero{text-align:center;padding:36px 0 28px;border-top:3px solid rgba(74,197,94,.5);border-bottom:1px solid rgba(0,0,0,.07);margin-bottom:32px}
  .score-num{font-family:monospace;font-size:88px;font-weight:700;color:#166534;line-height:1}
  .score-sub{font-family:monospace;font-size:11px;letter-spacing:.15em;color:rgba(10,40,20,.4);margin-top:6px}
  .score-label{font-size:17px;color:rgba(10,40,20,.55);margin-top:10px;font-style:italic}
  .meters{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:8px}
  .meter-card{background:rgba(0,0,0,.03);border:1px solid rgba(0,0,0,.07);border-radius:4px;padding:14px 16px}
  .meter-name{font-family:monospace;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:rgba(10,40,20,.45);margin-bottom:4px}
  .meter-score{font-family:monospace;font-size:26px;font-weight:700;color:#166534}
  .meter-interp{font-size:12px;color:rgba(10,40,20,.55);margin-top:4px;font-style:italic}
  .dim-row{display:flex;align-items:center;gap:10px;margin-bottom:10px}
  .dim-label{font-size:12px;color:rgba(10,40,20,.6);width:44%;flex-shrink:0}
  .dim-bar{flex:1;height:5px;background:rgba(0,0,0,.07);border-radius:3px;overflow:hidden}
  .dim-fill{height:100%;background:linear-gradient(90deg,rgba(16,110,50,.7),rgba(74,197,94,.9));border-radius:3px}
  .dim-val{font-family:monospace;font-size:11px;color:rgba(10,40,20,.5);width:28px;text-align:right}
  .inv-table{width:100%;border-collapse:collapse;font-size:13px}
  .inv-table td{padding:8px 12px;border-bottom:1px solid rgba(0,0,0,.05)}
  .inv-table td:first-child{font-size:18px;width:32px}
  .tip{display:flex;gap:14px;margin-bottom:18px;padding:14px 16px;background:rgba(74,197,94,.05);border-left:3px solid rgba(74,197,94,.35);border-radius:2px}
  .tip-icon{font-size:22px;flex-shrink:0;margin-top:2px}
  .tip strong{font-family:monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(10,40,20,.65)}
  .tip p{font-size:13px;color:rgba(10,40,20,.6);margin-top:4px}
  .quote{text-align:center;font-style:italic;color:rgba(10,40,20,.4);font-size:15px;margin-top:48px;padding-top:24px;border-top:1px solid rgba(0,0,0,.07)}
  .print-btn{display:block;margin:0 auto 32px;padding:10px 28px;background:#166534;color:#fff;border:none;border-radius:3px;font-family:monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer}
  @media print{.print-btn{display:none}}
</style>
</head><body>
<button class="print-btn" onclick="window.print()">🖨  Print / Save as PDF</button>
<h1>The Wanderer's Digital Escape</h1>
<p style="font-size:12px;color:rgba(10,40,20,.4);margin-bottom:24px;font-family:monospace">Journey Report · ${date}</p>
<div class="hero">
  <div class="score-num">${overall}</div>
  <div class="score-sub">FLOURISHING SCORE / 100</div>
  <div class="score-label">"What lies beyond the horizon of your mundane life? You just found out."</div>
</div>
<h2>Your Four Meters</h2>
<div class="meters">
  <div class="meter-card"><div class="meter-name">🔋 Focus</div><div class="meter-score">${meters.focus}</div><div class="meter-interp">${meterInterpret.focus}</div></div>
  <div class="meter-card"><div class="meter-name">⚡ Dopamine</div><div class="meter-score">${meters.dopamine}</div><div class="meter-interp">${meterInterpret.dopamine}</div></div>
  <div class="meter-card"><div class="meter-name">🌊 Oneness</div><div class="meter-score">${meters.oneness}</div><div class="meter-interp">${meterInterpret.oneness}</div></div>
  <div class="meter-card"><div class="meter-name">🕊️ Tranquility</div><div class="meter-score">${meters.tranquility}</div><div class="meter-interp">${meterInterpret.tranquility}</div></div>
</div>
<h2>Flourishing Dimensions (NIRMAN Framework)</h2>
${dimRows}
<h2>Items Collected</h2>
<table class="inv-table">${invRows}</table>
<h2>Your Personalised Action Plan</h2>
${tipRows}
<div class="quote">"Your attention is the costliest price you pay in the digital market.<br>Spend it like it matters — because it does."</div>
</body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}

// ── SOCIAL SHARE ──────────────────────────────────────────────────────────────
function shareOnPlatform(platform, overall) {
  const text = `I just completed The Wanderer's Digital Escape and scored ${overall}/100 on my Digital Flourishing Score! 🏖️ Can you beat it?`;
  const url = window.location.href;
  const urls = {
    twitter:   `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    whatsapp:  `https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`,
    linkedin:  `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    copy:      null,
  };
  if (platform === 'copy') {
    navigator.clipboard.writeText(text + '\n' + url).catch(() => {});
    return true; // signal copied
  }
  if (urls[platform]) window.open(urls[platform], '_blank', 'noopener,noreferrer,width=600,height=500');
  return false;
}

// ── INFO PAGE ─────────────────────────────────────────────────────────────────
function InfoPage({ onBack, theme, onToggleTheme }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), 60); return () => clearTimeout(t); }, []);

  const METERS_INFO = [
    { key: 'focus',       color: '#22d3ee', label: 'Focus',       start: 30, desc: 'Your capacity for deep, sustained thought. High-quality attention is the scarcest resource in the digital age.' },
    { key: 'dopamine',    color: '#fb923c', label: 'Dopamine',    start: 40, desc: "The brain's reward signal. This meter works in reverse — the higher it climbs, the more trapped you are in the scroll loop." },
    { key: 'oneness',     color: '#a78bfa', label: 'Oneness',     start: 25, desc: 'Your real-world connections and presence. Social media can mimic belonging while eroding the real thing.' },
    { key: 'tranquility', color: '#4ade80', label: 'Tranquility', start: 20, desc: 'Inner stillness beyond the noise. The quiet that remains when you stop reaching for the phone.' },
  ];

  const WORLDS_INFO = [
    { num: '01', name: 'Echo Chamber Swamp', bg: 'swamp',   desc: 'Algorithm bubbles that close the world in. The feed only shows you what keeps you scrolling — and slowly, that becomes all you see.' },
    { num: '02', name: 'Dopamine Arcade',    bg: 'arcade',  desc: 'Every scroll is engineered to reward. Infinite reels, variable rewards, and the pull of one more video — all designed by teams of engineers.' },
    { num: '03', name: 'Validation City',    bg: 'city',    desc: 'Built on likes, followers, and comparison. The city runs on external approval, and the currency is never enough.' },
    { num: '04', name: "Nomad's Trail",      bg: 'trail',   desc: 'The long walk back to yourself. Away from the feeds, you rediscover boredom, depth, and the texture of unmediated experience.' },
  ];

  const ITEMS_INFO = [
    { emoji: '📚', name: 'Long-form Mind',  desc: 'You chose depth over speed.' },
    { emoji: '📔', name: 'Inner Voice',     desc: 'You listened to yourself.' },
    { emoji: '🧘', name: 'Still Point',     desc: 'You found silence.' },
    { emoji: '🧭', name: 'True North',      desc: 'You chose direction.' },
    { emoji: '☕', name: '5:30am Hour',     desc: 'You claimed the morning.' },
    { emoji: '👟', name: 'The Run',         desc: 'You moved your body.' },
  ];

  const DIMENSIONS = [
    'Physical Health', 'Psychological Wellbeing', 'Focus & Attention',
    'Social Connection', 'Inner Tranquility', 'Dopamine Freedom',
    'Intentionality', 'Digital Flourishing',
  ];

  return (
    <div className={`info-page${vis ? ' info-page--vis' : ''}`}>
      <div className="info-inner">

        <div className="info-header">
          <button className="info-back-btn" onClick={onBack}>← Back</button>
          <div className="info-header-text">
            <h1 className="info-title">How It Works</h1>
            <p className="info-subtitle">Everything behind The Wanderer's Digital Escape</p>
          </div>
          <button className="home-theme-btn info-theme-btn" onClick={onToggleTheme}
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        {/* ── GAMEPLAY ── */}
        <section className="info-section">
          <h2 className="info-section-title">Gameplay</h2>
          <p className="info-body">
            The Wanderer's Digital Escape is a text-based narrative game — a choose-your-own-adventure through the attention economy. You play as The Wanderer, a person navigating four digital worlds, each a mirror of how social media reshapes the mind.
          </p>
          <p className="info-body">
            At every scene you make a choice. Each choice shifts your four wellbeing meters. There are roughly 40 scenes across the four worlds, taking about 15 minutes to complete. When you reach the beach, you receive your Digital Flourishing Score.
          </p>
          <div className="info-feature-row">
            <div className="info-feature-chip">~40 scenes</div>
            <div className="info-feature-chip">~15 minutes</div>
            <div className="info-feature-chip">Keys 1–9 for shortcuts</div>
            <div className="info-feature-chip">Ambient soundscapes</div>
            <div className="info-feature-chip">Collectible items</div>
          </div>
        </section>

        {/* ── THE FOUR METERS ── */}
        <section className="info-section">
          <h2 className="info-section-title">The Four Meters</h2>
          <p className="info-body">
            Your inner life is tracked across four dimensions. Each starts at a different value — you are not beginning from a place of wellness.
          </p>
          <div className="info-meter-grid">
            {METERS_INFO.map(m => (
              <div key={m.key} className="info-meter-card" style={{ borderColor: m.color }}>
                <div className="info-meter-card-header">
                  <span className="info-meter-dot" style={{ background: m.color, boxShadow: `0 0 8px ${m.color}` }} />
                  <span className="info-meter-label" style={{ color: m.color }}>{m.label}</span>
                  <span className="info-meter-start">starts at {m.start}</span>
                </div>
                <p className="info-meter-desc">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── SCORING ── */}
        <section className="info-section">
          <h2 className="info-section-title">Scoring Mechanism</h2>
          <p className="info-body">
            At the end of the game, your four meter values are combined into a single <strong>Digital Flourishing Score</strong> from 0 to 100.
          </p>
          <div className="info-formula-block">
            <div className="info-formula-label">Flourishing Score</div>
            <div className="info-formula">
              ( Focus + Oneness + Tranquility + (100 − Dopamine) ) ÷ 4
            </div>
          </div>
          <p className="info-body">
            Dopamine is <em>inverted</em> in the formula. A high Dopamine score means you leaned into the scroll loop — and that actively lowers your flourishing. The other three meters reward you directly for building them up.
          </p>
          <p className="info-body">
            <strong>Ghost Mode</strong> activates when Dopamine exceeds 75. The game world shifts visually, signalling that you are deep inside the scroll trap.
          </p>
          <p className="info-body info-body--small">
            Your final report breaks the score into eight dimensions:
          </p>
          <div className="info-dimensions-row">
            {DIMENSIONS.map(d => (
              <div key={d} className="info-dimension-chip">{d}</div>
            ))}
          </div>
        </section>

        {/* ── SIMULATED RESULTS ── */}
        <section className="info-section">
          <h2 className="info-section-title">Simulated Results</h2>
          <p className="info-body">
            These are illustrative player paths — not averages, but deliberate archetypes. Each shows how a consistent pattern of choices compounds into a final score.
          </p>
          <div className="info-scenario-grid">
            {[
              {
                name: 'The Mindless Scroller',
                desc: 'Always chose distraction. Never resisted a scroll. Each world pulled deeper into the loop.',
                accentColor: '#ef4444',
                meters: { focus: 18, dopamine: 88, oneness: 22, tranquility: 15 },
                overall: 17,
                dims: [
                  { name: 'Physical Health',         score: 30 },
                  { name: 'Psychological Wellbeing', score: 26 },
                  { name: 'Focus & Attention',       score: 18 },
                  { name: 'Social Connection',       score: 22 },
                  { name: 'Inner Tranquility',       score: 15 },
                  { name: 'Dopamine Freedom',        score: 12 },
                  { name: 'Intentionality',          score: 17 },
                  { name: 'Digital Flourishing',     score: 17 },
                ],
              },
              {
                name: 'The Social Butterfly',
                desc: 'Prioritised connection at the cost of depth. Strong online bonds, but restless and dopamine-chased.',
                accentColor: '#fb923c',
                meters: { focus: 42, dopamine: 65, oneness: 68, tranquility: 35 },
                overall: 45,
                dims: [
                  { name: 'Physical Health',         score: 50 },
                  { name: 'Psychological Wellbeing', score: 50 },
                  { name: 'Focus & Attention',       score: 42 },
                  { name: 'Social Connection',       score: 68 },
                  { name: 'Inner Tranquility',       score: 35 },
                  { name: 'Dopamine Freedom',        score: 35 },
                  { name: 'Intentionality',          score: 39 },
                  { name: 'Digital Flourishing',     score: 45 },
                ],
              },
              {
                name: 'The Balanced Explorer',
                desc: 'Sometimes scrolled, sometimes stepped back. No obsession in either direction. A middle path.',
                accentColor: '#facc15',
                meters: { focus: 58, dopamine: 45, oneness: 55, tranquility: 60 },
                overall: 57,
                dims: [
                  { name: 'Physical Health',         score: 75 },
                  { name: 'Psychological Wellbeing', score: 66 },
                  { name: 'Focus & Attention',       score: 58 },
                  { name: 'Social Connection',       score: 55 },
                  { name: 'Inner Tranquility',       score: 60 },
                  { name: 'Dopamine Freedom',        score: 55 },
                  { name: 'Intentionality',          score: 59 },
                  { name: 'Digital Flourishing',     score: 57 },
                ],
              },
              {
                name: 'The Mindful Achiever',
                desc: 'Chose depth and presence consistently. Picked the book, the run, the conversation over the feed.',
                accentColor: '#4ade80',
                meters: { focus: 78, dopamine: 28, oneness: 72, tranquility: 80 },
                overall: 76,
                dims: [
                  { name: 'Physical Health',         score: 95 },
                  { name: 'Psychological Wellbeing', score: 86 },
                  { name: 'Focus & Attention',       score: 78 },
                  { name: 'Social Connection',       score: 72 },
                  { name: 'Inner Tranquility',       score: 80 },
                  { name: 'Dopamine Freedom',        score: 72 },
                  { name: 'Intentionality',          score: 79 },
                  { name: 'Digital Flourishing',     score: 76 },
                ],
              },
              {
                name: 'The Digital Ascetic',
                desc: "Refused every digital pull. Collected every item. Walked the Nomad's Trail without looking back.",
                accentColor: '#22d3ee',
                meters: { focus: 92, dopamine: 12, oneness: 65, tranquility: 88 },
                overall: 83,
                dims: [
                  { name: 'Physical Health',         score: 100 },
                  { name: 'Psychological Wellbeing', score: 100 },
                  { name: 'Focus & Attention',       score: 92 },
                  { name: 'Social Connection',       score: 65 },
                  { name: 'Inner Tranquility',       score: 88 },
                  { name: 'Dopamine Freedom',        score: 88 },
                  { name: 'Intentionality',          score: 90 },
                  { name: 'Digital Flourishing',     score: 83 },
                ],
              },
            ].map(s => (
              <div key={s.name} className="info-scenario-card" style={{ borderTopColor: s.accentColor }}>
                <div className="info-scenario-head">
                  <div className="info-scenario-name">{s.name}</div>
                  <div className="info-scenario-score" style={{ color: s.accentColor }}>
                    {s.overall}<span className="info-scenario-score-denom">/100</span>
                  </div>
                </div>
                <p className="info-scenario-desc">{s.desc}</p>
                <div className="info-scenario-meter-row">
                  {[
                    { key: 'focus',       label: 'F', color: '#22d3ee', value: s.meters.focus },
                    { key: 'dopamine',    label: 'D', color: '#fb923c', value: s.meters.dopamine },
                    { key: 'oneness',     label: 'O', color: '#a78bfa', value: s.meters.oneness },
                    { key: 'tranquility', label: 'T', color: '#4ade80', value: s.meters.tranquility },
                  ].map(m => (
                    <div key={m.key} className="info-scenario-pill" title={`${m.key}: ${m.value}`}>
                      <span className="info-scenario-pill-dot" style={{ background: m.color }} />
                      <span className="info-scenario-pill-label">{m.label}</span>
                      <span className="info-scenario-pill-val" style={{ color: m.color }}>{m.value}</span>
                    </div>
                  ))}
                </div>
                <div className="info-scenario-bar-wrap">
                  <div className="info-scenario-bar" style={{ width: `${s.overall}%`, background: s.accentColor }} />
                </div>
                <div className="info-scenario-dim-grid">
                  {s.dims.map(d => (
                    <div key={d.name} className="info-scenario-dim-row">
                      <span className="info-scenario-dim-name">{d.name}</span>
                      <div className="info-scenario-dim-track">
                        <div className="info-scenario-dim-fill" style={{ width: `${d.score}%`, background: s.accentColor }} />
                      </div>
                      <span className="info-scenario-dim-val">{d.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── THE FOUR WORLDS ── */}
        <section className="info-section">
          <h2 className="info-section-title">The Four Worlds</h2>
          <div className="info-world-grid">
            {WORLDS_INFO.map(w => (
              <div key={w.num} className={`info-world-card info-world-card--${w.bg}`}>
                <div className="info-world-num">{w.num}</div>
                <div className="info-world-name">{w.name}</div>
                <p className="info-world-desc">{w.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── COLLECTIBLES ── */}
        <section className="info-section">
          <h2 className="info-section-title">Collectible Items</h2>
          <p className="info-body">
            Certain choices award you a collectible item — a symbol of a real habit or practice reclaimed from the noise. Six items can be earned across the journey.
          </p>
          <div className="info-items-row">
            {ITEMS_INFO.map(item => (
              <div key={item.name} className="info-item-chip" title={item.desc}>
                <span className="info-item-emoji">{item.emoji}</span>
                <span className="info-item-name">{item.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── DATA SOURCE ── */}
        <section className="info-section">
          <h2 className="info-section-title">Data &amp; Ideas</h2>
          <p className="info-body">
            The game's scenarios, meter mechanics, and wellbeing framing are drawn from Sanket Tambare's ongoing writing on digital wellbeing. The articles explore screen habits, dopamine loops, the attention economy, algorithmic influence, and the practice of digital minimalism.
          </p>
          <div className="info-source-box">
            <div className="info-source-label">Primary Source</div>
            <a
              className="info-source-link"
              href="https://sankettambare.substack.com/t/digital-wellbeing"
              target="_blank"
              rel="noopener noreferrer"
            >
              Digital Wellbeing on Substack ↗
            </a>
            <p className="info-source-desc">
              A collection of essays and reflections on how we live with technology — and how we might live better.
            </p>
          </div>
        </section>

        <div className="info-footer">
          <button className="info-back-btn" onClick={onBack}>← Back to Home</button>
          <div className="info-footer-note">The Wanderer's Digital Escape © 2026</div>
        </div>

      </div>
    </div>
  );
}

// ── HOME SCREEN ───────────────────────────────────────────────────────────────
function HomePage({ onStart, hasSave, onInfo, theme, onToggleTheme }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), 60); return () => clearTimeout(t); }, []);

  const WORLDS = [
    { num: '01', name: 'Echo Chamber',    desc: 'Infinite feeds that close the world in' },
    { num: '02', name: 'Dopamine Arcade', desc: 'Every scroll is engineered to reward' },
    { num: '03', name: 'Validation City', desc: 'Built on likes, followers, and comparison' },
    { num: '04', name: "Nomad's Trail",   desc: 'The long walk back to yourself' },
  ];
  const METER_HINTS = {
    focus:       'Your capacity for deep, sustained thought',
    dopamine:    "The brain's reward signal — keep it balanced",
    oneness:     'Your real-world connections and presence',
    tranquility: 'Inner stillness beyond the noise',
  };

  return (
    <div className={`home-screen${vis ? ' home-screen--vis' : ''}`}>
      <button className="home-theme-btn" onClick={onToggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <div className="home-glow" />
      <div className="home-inner">

        <header className="home-header">
          <div className="home-eyebrow">A Digital Wellbeing Experience</div>
          <h1 className="home-title">The Wanderer's<br />Digital Escape</h1>
          <p className="home-tagline">"What lies beyond the horizon of your mundane life?"</p>
        </header>

        <section className="home-about">
          <p className="home-about-text">
            You are a wanderer lost in the attention economy. Navigate four worlds — each one a mirror of how social media reshapes the mind. Every choice shifts four meters that measure the health of your inner life.
          </p>
        </section>

        <div className="home-columns">
          <section className="home-section">
            <div className="home-section-label">Four Meters to Balance</div>
            <div className="home-meter-list">
              {Object.entries(METER_CONFIG).map(([key, cfg]) => (
                <div key={key} className="home-meter-row">
                  <div className="home-meter-pip" style={{ background: cfg.color, boxShadow: `0 0 7px ${cfg.color}` }} />
                  <div>
                    <div className="home-meter-name" style={{ color: cfg.color }}>{cfg.label}</div>
                    <div className="home-meter-hint">{METER_HINTS[key]}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="home-section">
            <div className="home-section-label">Four Worlds to Traverse</div>
            <div className="home-world-list">
              {WORLDS.map(w => (
                <div key={w.num} className="home-world-row">
                  <span className="home-world-num">{w.num}</span>
                  <div className="home-world-info">
                    <span className="home-world-name">{w.name}</span>
                    <span className="home-world-desc">{w.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="home-ctas">
          <button className="home-btn-primary" onClick={() => onStart(false)}>Begin Journey →</button>
          {hasSave && (
            <button className="home-btn-secondary" onClick={() => onStart(true)}>↩ Continue Journey</button>
          )}
          <button className="home-btn-info" onClick={onInfo}>How It Works ↗</button>
        </div>

        <div className="home-hints">
          Press <kbd className="home-kbd">1</kbd>–<kbd className="home-kbd">9</kbd> for choice shortcuts · Ambient soundscapes · ~15 min
        </div>

        <section className="home-creator">
          <div className="home-creator-divider" />
          <div className="home-section-label" style={{ textAlign: 'center', marginBottom: 20 }}>About the Creator</div>
          <div className="home-creator-card">
            <div className="home-creator-avatar">ST</div>
            <div className="home-creator-meta">
              <div className="home-creator-name">Sanket Tambare</div>
              <div className="home-creator-role">Software Developer · Full-Stack</div>
            </div>
          </div>
          <div className="home-creator-bio">
            <p>
              I am a software developer specialised in full-stack development. Since college days I find myself inclined towards technology, society, psychology, blogging, designing, video editing, and digital well-being — in short, towards a variety of issues, technologies, topics, and interests.
            </p>
            <p>
              This has culminated in all-round curiosity across podcasts, development, writing, reading, and much more. All this exploration has helped me decide what I am good at, what I am not, what I like, what I don't — and most importantly what I wish to do in my career and what I don't want to do.
            </p>
            <p>
              And here's what I wish to do: critically engage with new developments across technology, better myself every day, learn something about what's happening around me, understand it, and enjoy this meaningful, purposeful journey.
            </p>
          </div>
          <div className="home-creator-links">
            <a className="home-creator-link" href="https://linktr.ee/daredavil" target="_blank" rel="noopener noreferrer">
              <span className="home-creator-link-icon">🌿</span> Linktree
            </a>
            <a className="home-creator-link" href="https://www.linkedin.com/in/sankettambare/" target="_blank" rel="noopener noreferrer">
              <span className="home-creator-link-icon">in</span> LinkedIn
            </a>
            <a className="home-creator-link" href="https://sankettambare.substack.com/" target="_blank" rel="noopener noreferrer">
              <span className="home-creator-link-icon">✦</span> Substack
            </a>
            <a className="home-creator-cta" href="mailto:sanket.tambare01@gmail.com">
              Get in touch →
            </a>
          </div>
        </section>

        <div className="home-footer-bar">
          Built with care · The Wanderer's Digital Escape © 2026
        </div>
      </div>
    </div>
  );
}

// ── WIN SCREEN ────────────────────────────────────────────────────────────────
function WinScreen({ meters, inventory }) {
  const [vis, setVis] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), 200); return () => clearTimeout(t); }, []);

  const f = meters.focus, o = meters.oneness, tr = meters.tranquility, d = meters.dopamine;
  const overall = Math.round((f + o + tr + (100 - d)) / 4);
  const tips = getTips(meters);

  const dims = [
    { name: 'Physical Health',         score: Math.min(100, tr + 15) },
    { name: 'Psychological Wellbeing', score: Math.min(100, f + 8) },
    { name: 'Focus & Attention',       score: f },
    { name: 'Social Connection',       score: o },
    { name: 'Inner Tranquility',       score: tr },
    { name: 'Dopamine Freedom',        score: clamp(100 - d) },
    { name: 'Intentionality',          score: Math.min(100, Math.round((f + tr) / 2)) },
    { name: 'Digital Flourishing',     score: overall },
  ];

  const handleCopy = () => {
    const did = shareOnPlatform('copy', overall);
    if (did) { setCopied(true); setTimeout(() => setCopied(false), 2200); }
  };

  return (
    <div className={`win-screen${vis ? ' win-screen--visible' : ''}`}>
      <div className="win-beach">
        <span className="win-sun">☀️</span>
        <div className="win-waves">~ ~ ~ ~ ~ ~</div>
      </div>
      <div className="win-text">
        <div className="win-quote">"What lies beyond the horizon of your mundane life?"</div>
        <div className="win-answer">You just found out.</div>
      </div>
      <div className="win-score-title">Your Flourishing Score</div>
      <div className="win-score-overall">{overall}<span style={{ fontSize: 22, opacity: 0.5 }}>/100</span></div>

      <div className="win-dimensions">
        {dims.map((d, i) => (
          <div key={d.name} className="win-dim">
            <div className="win-dim-name">{d.name}</div>
            <div className="win-dim-bar"><div className="win-dim-fill" style={{ width: `${d.score}%`, animationDelay: `${i * 0.1}s` }} /></div>
            <div className="win-dim-score">{d.score}</div>
          </div>
        ))}
      </div>

      {inventory && inventory.size > 0 && (
        <div className="win-inventory">
          <div className="win-inv-title">Items Collected</div>
          <div className="win-inv-items">
            {[...inventory].map(key => (
              <div key={key} className="win-inv-item">
                <span className="win-inv-emoji">{ITEMS[key]?.emoji}</span>
                <span className="win-inv-name">{ITEMS[key]?.name}</span>
                <span className="win-inv-desc">{ITEMS[key]?.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TIPS ── */}
      <div className="win-tips">
        <div className="win-section-title">Your Action Plan</div>
        <div className="win-tips-grid">
          {tips.map((t, i) => (
            <div key={i} className="win-tip">
              <div className="win-tip-icon">{t.icon}</div>
              <div className="win-tip-body">
                <div className="win-tip-title">{t.title}</div>
                <div className="win-tip-text">{t.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SHARE ── */}
      <div className="win-share">
        <div className="win-section-title">Share & Invite Friends</div>
        <div className="win-share-text">
          I scored <strong>{overall}/100</strong> on my Digital Flourishing Score in The Wanderer's Digital Escape 🏖️
        </div>
        <div className="win-share-btns">
          <button className="share-btn share-btn--twitter" onClick={() => shareOnPlatform('twitter', overall)}>𝕏 Twitter</button>
          <button className="share-btn share-btn--whatsapp" onClick={() => shareOnPlatform('whatsapp', overall)}>💬 WhatsApp</button>
          <button className="share-btn share-btn--linkedin" onClick={() => shareOnPlatform('linkedin', overall)}>in LinkedIn</button>
          <button className="share-btn share-btn--copy" onClick={handleCopy}>{copied ? '✓ Copied!' : '🔗 Copy Link'}</button>
        </div>
      </div>

      {/* ── ACTIONS ── */}
      <div className="win-actions">
        <button className="choice-btn choice-btn--primary" onClick={() => generateReport(meters, dims, overall, inventory, tips)}>
          📄  Download Detailed Report
        </button>
        <button className="choice-btn" onClick={() => downloadScoreCard(meters, dims, overall, inventory)}>
          📥  Download Score Card
        </button>
        <button className="choice-btn" onClick={() => {
          const t = localStorage.getItem('wde_theme');
          localStorage.clear();
          if (t) localStorage.setItem('wde_theme', t);
          window.location.reload();
        }}>
          Begin Again
        </button>
      </div>
    </div>
  );
}

// ── SCENE VIEW ────────────────────────────────────────────────────────────────
function SceneView({ scene, onChoice, onAward }) {
  const [vis, setVis] = useState(false);
  const [modal, setModal] = useState(null);   // null | 'timer60' | 'deleteInstagram' | 'frogZoomOut'
  const [pendingChoice, setPendingChoice] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [displayedText, setDisplayedText] = useState('');

  const getReadText = (sc) => {
    let t = (sc.narrative || '').replace(/\n\n/g, '. ').replace(/\n/g, ' ');
    if (sc.boss) t = `Boss encounter: ${sc.bossName}. ` + t;
    if (sc.dataStats) t += '. Your algorithm profile: ' + sc.dataStats.map(s => `${s.label}, ${s.value} percent`).join('. ');
    if (sc.dunbarQuote) t += '. ' + sc.dunbarQuote.replace(/"/g, '');
    return t;
  };

  const startSpeech = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.88; utt.pitch = 1.0; utt.volume = 0.85;
    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  };

  const stopSpeech = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  useEffect(() => {
    setVis(false); setModal(null); setPendingChoice(null); stopSpeech();
    setDisplayedText('');
    const fade = setTimeout(() => setVis(true), 60);
    const read = setTimeout(() => startSpeech(getReadText(scene)), 700);
    let i = 0;
    const fullText = scene.narrative || '';
    const tw = setInterval(() => {
      setDisplayedText(fullText.slice(0, ++i));
      if (i >= fullText.length) clearInterval(tw);
    }, 18);
    return () => { clearTimeout(fade); clearTimeout(read); stopSpeech(); clearInterval(tw); };
  }, [scene.id]);

  const handleClick = useCallback((choice) => {
    if (choice.special === 'timer60') {
      setPendingChoice(choice); setModal('timer60');
    } else if (choice.special === 'deleteInstagram') {
      setPendingChoice(choice); setModal('deleteInstagram');
    } else if (scene.special === 'frogZoomOut') {
      setPendingChoice(choice); setModal('frogZoomOut');
    } else {
      onChoice(choice);
    }
  }, [scene.special, onChoice]);

  useEffect(() => {
    const handler = (e) => {
      const idx = parseInt(e.key) - 1;
      if (!isNaN(idx) && idx >= 0 && modal === null && scene.choices?.[idx]) {
        handleClick(scene.choices[idx]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [scene, modal, handleClick]);

  // Modal overlays
  if (modal === 'timer60') return (
    <div className={`scene-content${vis ? ' scene-content--visible' : ''}`}>
      <Timer60
        onComplete={() => { if (onAward) onAward('cushion'); onChoice(pendingChoice); }}
        onSkip={() => onChoice({ ...pendingChoice, effects: { focus: 15, tranquility: 15 } })}
      />
    </div>
  );

  if (modal === 'deleteInstagram') {
    const c = scene.choices;
    return (
      <div className={`scene-content${vis ? ' scene-content--visible' : ''}`}>
        <DeleteInstagramModal
          onDelete={() => onChoice(pendingChoice)}
          onKeep={() => onChoice(c[1])}
          onBack={() => onChoice(c[2])}
        />
      </div>
    );
  }

  if (modal === 'frogZoomOut') return (
    <div className={`scene-content${vis ? ' scene-content--visible' : ''}`}>
      <FrogZoomOut
        onClimb={() => onChoice(pendingChoice)}
        onStay={() => onChoice({ next: pendingChoice.next, effects: { dopamine: 10, tranquility: -5 } })}
      />
    </div>
  );

  const paras = (displayedText || '').split('\n\n');

  return (
    <div className={`scene-content${vis ? ' scene-content--visible' : ''}`}>
      {scene.boss && <BossTag name={scene.bossName} />}

      <div className="narrative-box">
        <div className="listen-bar">
          <button className={`listen-btn${speaking ? ' listen-btn--active' : ''}`}
            onClick={() => speaking ? stopSpeech() : startSpeech(getReadText(scene))}>
            {speaking
              ? <><span className="listen-dot" /><span>Stop</span></>
              : <><span className="listen-icon">🔊</span><span>Listen</span></>}
          </button>
        </div>
        {paras.map((p, i) => <p key={i} className="narrative-para">{p}</p>)}
        {scene.special === 'dataReveal' && scene.dataStats && (
          <DataReveal stats={scene.dataStats} question={scene.dataQuestion} />
        )}
        {scene.special === 'dunbar' && scene.dunbarQuote && (
          <div className="dunbar-quote">{scene.dunbarQuote}</div>
        )}
      </div>

      <div className="choices">
        {(scene.choices || []).map((choice, i) => (
          <button key={i} className="choice-btn" onClick={() => handleClick(choice)}>
            <span className="choice-kbd">[{i + 1}]</span> {choice.text}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
function App() {
  const [meters, setMeters] = useState(() => {
    try { const s = localStorage.getItem('wde_meters'); return s ? JSON.parse(s) : INITIAL_METERS; }
    catch { return INITIAL_METERS; }
  });
  const [sceneId, setSceneId] = useState(() => localStorage.getItem('wde_scene') || 'intro');
  const [showWorldIntro, setShowWorldIntro] = useState(false);
  const [seenWorlds, setSeenWorlds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('wde_seen') || '[]')); }
    catch { return new Set(); }
  });
  const [inventory, setInventory] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('wde_inv') || '[]')); }
    catch { return new Set(); }
  });
  const [muted, setMuted] = useState(false);
  const [history, setHistory] = useState([]);
  const [fading, setFading] = useState(false);
  const [floats, setFloats] = useState([]);
  const [itemToast, setItemToast] = useState(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_key') || '');
  const [showApiModal, setShowApiModal] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [curiosityXP, setCuriosityXP] = useState(0);
  const [gameState, setGameState] = useState(() =>
    window.location.hash === '#how-it-works' ? 'info' : 'home'
  );
  const [theme, setTheme] = useState(() => localStorage.getItem('wde_theme') || 'dark');

  const scene = window.SCENES[sceneId];
  const ghostMode = meters.dopamine > 75;

  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash === '#how-it-works') setGameState('info');
      else if (window.location.hash === '' || window.location.hash === '#') setGameState('home');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('wde_theme', theme);
  }, [theme]);

  // Check world intro on scene change
  useEffect(() => {
    if (!scene) return;
    if (scene.worldIntro && !seenWorlds.has(scene.world)) {
      setShowWorldIntro(true);
      const next = new Set([...seenWorlds, scene.world]);
      setSeenWorlds(next);
      localStorage.setItem('wde_seen', JSON.stringify([...next]));
    }
  }, [sceneId]);

  const awardItem = useCallback((key) => {
    if (!key || !ITEMS[key]) return;
    setInventory(prev => {
      if (prev.has(key)) return prev;
      const next = new Set([...prev, key]);
      localStorage.setItem('wde_inv', JSON.stringify([...next]));
      return next;
    });
    setItemToast(key);
    setTimeout(() => setItemToast(null), 2800);
  }, []);

  const triggerFloats = (effects) => {
    if (!effects) return;
    const items = Object.entries(effects)
      .filter(([, v]) => v !== 0)
      .map(([k, v]) => ({ id: Math.random(), text: `${v > 0 ? '+' : ''}${v} ${METER_CONFIG[k]?.label}`, color: METER_CONFIG[k]?.color, pos: v > 0 }));
    setFloats(items);
    setTimeout(() => setFloats([]), 2000);
  };

  const handleChoice = useCallback((choice) => {
    if (window.AudioEngine && !window.AudioEngine.ctx) {
      window.AudioEngine.init();
      window.AudioEngine.play(scene?.background || 'intro');
    }
    const newMeters = applyEffects(meters, choice.effects);
    triggerFloats(choice.effects);
    if (choice.awards) awardItem(choice.awards);
    if (choice.text && CURIOSITY_WORDS.some(w => choice.text.toLowerCase().includes(w))) {
      setCuriosityXP(prev => prev + 10);
    }
    setHistory(prev => [...prev, sceneId]);
    setFading(true);
    setTimeout(() => {
      setMeters(newMeters);
      setSceneId(choice.next);
      setFading(false);
      localStorage.setItem('wde_meters', JSON.stringify(newMeters));
      localStorage.setItem('wde_scene', choice.next);
      if (window.AudioEngine && window.AudioEngine.ctx) {
        const nextScene = window.SCENES[choice.next];
        if (nextScene) window.AudioEngine.play(nextScene.background || 'intro');
      }
    }, 550);
  }, [meters, scene, awardItem]);

  const handlePrev = useCallback(() => {
    if (history.length === 0) return;
    const prevId = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setFading(true);
    setTimeout(() => { setSceneId(prevId); setFading(false); }, 400);
  }, [history]);

  const handleSkip = useCallback(() => {
    if (!scene || !scene.choices || scene.choices.length === 0) return;
    const c = scene.choices[0];
    handleChoice({ next: c.next, effects: {}, worldClear: c.worldClear });
  }, [scene, handleChoice]);

  const handleNext = useCallback(() => {
    if (!scene || !scene.choices || scene.choices.length === 0) return;
    const last = scene.choices[scene.choices.length - 1];
    handleChoice({ next: last.next, effects: {}, worldClear: last.worldClear });
  }, [scene, handleChoice]);

  const handlePrevWorld = useCallback(() => {
    const w = scene?.world ?? 0;
    const target = WORLD_STARTS[Math.max(0, w - 1)];
    if (!target) return;
    setHistory(prev => [...prev, sceneId]);
    setFading(true);
    setTimeout(() => { setSceneId(target); setFading(false); }, 400);
  }, [scene, sceneId]);

  const handleNextWorld = useCallback(() => {
    const w = scene?.world ?? 0;
    const target = WORLD_STARTS[Math.min(5, w + 1)];
    if (!target) return;
    setHistory(prev => [...prev, sceneId]);
    setFading(true);
    setTimeout(() => { setSceneId(target); setFading(false); }, 400);
  }, [scene, sceneId]);

  const handleReset = useCallback(() => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    const savedTheme = localStorage.getItem('wde_theme');
    localStorage.clear();
    if (savedTheme) localStorage.setItem('wde_theme', savedTheme);
    window.location.reload();
  }, [confirmReset]);

  const handleFinish = useCallback(() => {
    handleChoice({ next: 'win', effects: {} });
  }, [handleChoice]);

  const handleToggleMute = useCallback(() => {
    if (window.AudioEngine && !window.AudioEngine.ctx) {
      window.AudioEngine.init();
      window.AudioEngine.play(scene?.background || 'intro');
    }
    if (window.AudioEngine) { const m = window.AudioEngine.toggle(); setMuted(m); }
  }, [scene]);

  const handleToggleTheme = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);

  const handleStartGame = useCallback((continueGame) => {
    if (!continueGame) {
      const savedTheme = localStorage.getItem('wde_theme');
      localStorage.clear();
      if (savedTheme) localStorage.setItem('wde_theme', savedTheme);
      setMeters(INITIAL_METERS);
      setSceneId('intro');
      setSeenWorlds(new Set());
      setInventory(new Set());
      setHistory([]);
      setCuriosityXP(0);
      setConfirmReset(false);
    }
    setGameState('playing');
    if (window.AudioEngine) {
      window.AudioEngine.init();
      const savedId = localStorage.getItem('wde_scene');
      const bg = (continueGame && savedId && window.SCENES[savedId])
        ? (window.SCENES[savedId].background || 'intro')
        : 'intro';
      window.AudioEngine.play(bg);
    }
  }, []);

  const hasSave = !!(localStorage.getItem('wde_scene') && localStorage.getItem('wde_scene') !== 'intro');

  const openInfo = () => { window.history.pushState(null, '', '#how-it-works'); setGameState('info'); };
  const closeInfo = () => { window.history.pushState(null, '', window.location.pathname); setGameState('home'); };

  if (gameState === 'home') {
    return <HomePage onStart={handleStartGame} hasSave={hasSave} onInfo={openInfo} theme={theme} onToggleTheme={handleToggleTheme} />;
  }

  if (gameState === 'info') {
    return <InfoPage onBack={closeInfo} theme={theme} onToggleTheme={handleToggleTheme} />;
  }

  if (!scene) return <div style={{ color: '#fff', padding: 24, fontFamily: 'monospace' }}>Loading…</div>;

  const Il = window.Illustration;
  const bg = scene.background || 'intro';

  if (scene.special === 'winScreen') {
    return (
      <div className="app">
        <Background bg="beach" theme={theme} />
        <main className="main-content">
          <div className="illustration-area">{Il && <Il bg="beach" />}</div>
          <div className="scene-area" style={{ justifyContent: 'flex-start', overflowY: 'auto' }}>
            <WinScreen meters={meters} inventory={inventory} />
          </div>
        </main>
        <div className="nav-bar">
          <button className="nav-btn nav-btn--world" onClick={handlePrevWorld} title="Previous world">⏮ World</button>
          <button className="nav-btn" onClick={handlePrev} disabled={history.length === 0}>← Scene</button>
          <button className={`nav-btn nav-btn--danger${confirmReset ? ' nav-btn--confirm' : ''}`} onClick={handleReset}>
            {confirmReset ? 'Sure?' : 'Reset'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app${fading ? ' app--fade' : ''}${ghostMode ? ' ghost-active' : ''}`}>
      <Background bg={bg} ghostMode={ghostMode} theme={theme} />

      <div className="floating-container">
        {floats.map(f => (
          <div key={f.id} className="floating-text" style={{ color: f.pos ? f.color : '#ef4444' }}>{f.text}</div>
        ))}
      </div>

      {itemToast && ITEMS[itemToast] && (
        <div className="item-toast">
          <span className="item-toast-emoji">{ITEMS[itemToast].emoji}</span>
          <div className="item-toast-text">
            <div className="item-toast-name">{ITEMS[itemToast].name}</div>
            <div className="item-toast-desc">{ITEMS[itemToast].desc}</div>
          </div>
        </div>
      )}

      <HUD meters={meters} world={scene.world} ghostMode={ghostMode}
           inventory={inventory} muted={muted} onToggleMute={handleToggleMute}
           curiosityXP={curiosityXP} onOpenSettings={() => setShowApiModal(true)}
           theme={theme} onToggleTheme={handleToggleTheme} />

      {showApiModal && (
        <div className="api-modal-overlay" onClick={() => setShowApiModal(false)}>
          <div className="api-modal" onClick={e => e.stopPropagation()}>
            <div className="api-modal-title">Settings</div>
            <label className="api-modal-label">Gemini API Key</label>
            <input
              className="api-modal-input"
              type="password"
              placeholder="Enter your Gemini API key…"
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); localStorage.setItem('gemini_key', e.target.value); }}
            />
            {!apiKey && <div className="api-modal-banner">Add an API key to enable AI-generated images and enhanced TTS.</div>}
            <button className="choice-btn choice-btn--primary" onClick={() => setShowApiModal(false)}>Save & Close</button>
          </div>
        </div>
      )}

      <main className="main-content">
        <div className="illustration-area">{Il && <Il bg={bg} />}</div>
        <div className="scene-area">
          {showWorldIntro ? (
            <WorldIntroCard scene={scene} onContinue={() => setShowWorldIntro(false)} />
          ) : (
            <SceneView scene={scene} onChoice={handleChoice} onAward={awardItem} />
          )}
        </div>
      </main>

      <div className="nav-bar">
        <button className="nav-btn nav-btn--world" onClick={handlePrevWorld} disabled={(scene?.world ?? 0) <= 0} title="Previous world">⏮ World</button>
        <button className="nav-btn" onClick={handlePrev} disabled={history.length === 0} title="Previous scene">← Scene</button>
        <button className="nav-btn" onClick={handleSkip} title="Skip scene">Skip</button>
        <button className="nav-btn" onClick={handleNext} title="Next scene">Scene →</button>
        <button className="nav-btn nav-btn--world" onClick={handleNextWorld} disabled={(scene?.world ?? 0) >= 5} title="Next world">World ⏭</button>
        <button className={`nav-btn nav-btn--danger${confirmReset ? ' nav-btn--confirm' : ''}`} onClick={handleReset} title="Reset">
          {confirmReset ? 'Sure?' : 'Reset'}
        </button>
        <button className="nav-btn nav-btn--accent" onClick={handleFinish} title="Finish">Finish</button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
