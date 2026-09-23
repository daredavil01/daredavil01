#!/usr/bin/env node
// QA for the whole site. Exits non-zero on any failure.
//
//   npm ci --prefix tools && node tools/qa.mjs [--quick]
//
//  static   every relative href/src resolves; every repo page is linked from
//           index.html; registry cards are well-formed; return chips deep-link
//           to real ids; asset budgets
//  browser  no page errors on all pages; classic view (landmarks, one h1, cards
//           placed, ⌘K, deep links); no-JS and reduced-motion fall back to
//           classic; island view (3D contract, notes, flights); decks still
//           take their arrow keys; screenshots in tools/.qa/
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { launch, routeCdn } from './lib/browser.mjs';
import { serve, REPO } from './lib/serve.mjs';

const QUICK = process.argv.includes('--quick');
const OUT = join(REPO, 'tools/.qa');
mkdirSync(OUT, { recursive: true });
let fails = 0;
const ok = (msg) => console.log('  ✓ ' + msg);
const bad = (msg) => {
  fails++;
  console.log('  ✗ ' + msg);
};
const check = (cond, msg) => (cond ? ok(msg) : bad(msg));

// ------------------------------------------------------------------ static --
const SKIP = new Set(['node_modules', '.git', '.qa', '.claude']);
function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    if (SKIP.has(f) || f.startsWith('_')) continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      if (relative(REPO, p) === 'tools') continue;
      walk(p, out);
    } else if (f.endsWith('.html')) out.push(relative(REPO, p));
  }
  return out;
}
const pages = walk(REPO).sort();
const html = Object.fromEntries(pages.map((p) => [p, readFileSync(join(REPO, p), 'utf8')]));
const ids = (src) => new Set([...src.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const indexIds = ids(html['index.html']);

console.log('static checks');
let broken = 0;
for (const [page, src] of Object.entries(html)) {
  for (const m of src.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|data:|javascript:|#|\{)/.test(url) || /\$\{|'|\s\+\s/.test(url)) continue; // skip URLs built in JS
    const [path, hash] = url.split('#');
    const clean = path.split('?')[0];
    if (!clean) continue;
    const target = join(REPO, dirname(page), clean);
    if (!existsSync(target)) {
      broken++;
      bad(`${page}: ${url} does not exist`);
      continue;
    }
    if (hash && relative(REPO, target) === 'index.html' && !indexIds.has(decodeURIComponent(hash))) {
      broken++;
      bad(`${page}: ${url} — no #${hash} on the homepage`);
    }
  }
}
check(!broken, `relative links resolve across ${pages.length} pages`);

const linked = new Set([...html['index.html'].matchAll(/\shref="([^"#?]+\.html)/g)].map((m) => m[1]));
const orphans = pages.filter((p) => p !== 'index.html' && !linked.has(p));
check(!orphans.length, 'every repo page is linked from index.html' + (orphans.length ? ': missing ' + orphans.join(', ') : ''));

const STOPS = ['island', 'run', 'build', 'read', 'climb', 'commons', 'play', 'write', 'night'];
const cards = [...html['index.html'].matchAll(/<article class="card" id="([^"]+)" data-stop="([^"]+)" data-band="([^"]+)">([\s\S]*?)<\/article>/g)];
let cardErr = 0;
for (const [, id, stop, band, body] of cards) {
  const href = (body.match(/href="([^"]+)"/) || [])[1] || '';
  const kicker = ((body.match(/card__kicker">([^<]+)</) || [])[1] || '').trim();
  const external = /^https?:/.test(href);
  if (!/^[a-z]+\/[a-z0-9-]+$/.test(id) || id.split('/')[0] !== stop) cardErr++, bad(`card ${id}: id must be <stop>/<slug> matching data-stop`);
  if (!STOPS.includes(stop)) cardErr++, bad(`card ${id}: unknown stop ${stop}`);
  if (!['play', 'sites'].includes(band)) cardErr++, bad(`card ${id}: band must be play|sites`);
  if (external !== kicker.endsWith('↗')) cardErr++, bad(`card ${id}: off-repo links (and only they) end the kicker with ↗`);
}
check(cards.length >= 21 && !cardErr, `${cards.length} registry cards well-formed`);

const chipPages = pages.filter((p) => p !== 'index.html');
const noChip = chipPages.filter((p) => !/data-island-return/.test(html[p]) || !/assets\/chrome\/chrome\.js/.test(html[p]));
check(!noChip.length, 'every sub-page has a data-island-return link + chrome.js' + (noChip.length ? ': ' + noChip.join(', ') : ''));

const size = (p) => (existsSync(join(REPO, p)) ? statSync(join(REPO, p)).size : -1);
check(size('assets/island/models/props.glb.gz') > 0 && size('assets/island/models/props.glb.gz') <= 600 * 1024, `props.glb.gz ${(size('assets/island/models/props.glb.gz') / 1024).toFixed(0)} KB ≤ 600 KB`);
check(size('assets/island/models/runner.glb.gz') > 0 && size('assets/island/models/runner.glb.gz') <= 160 * 1024, `runner.glb.gz ${(size('assets/island/models/runner.glb.gz') / 1024).toFixed(0)} KB ≤ 160 KB`);
const stills = STOPS.filter((s) => size(`assets/island/illustrations/${s}.webp`) <= 0);
check(!stills.length, 'every stop has a classic-view still' + (stills.length ? ': missing ' + stills.join(', ') : ''));
check(['readme-day.jpg', 'readme-night.jpg', 'og.jpg'].every((f) => size('assets/island/renders/' + f) > 0), 'README banners and OG card exist');

// ----------------------------------------------------------------- browser --
const { server, url } = await serve();
const browser = await launch();
const ctxFor = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...opts });
  await routeCdn(ctx);
  // other pages' own CDN libraries (React, Chart.js, an older three) stay offline in QA
  await ctx.route(/unpkg\.com|cdnjs\.cloudflare\.com/, (r) => r.abort('blockedbyclient'));
  return ctx;
};
const errorsOn = (page) => {
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text());
  });
  return errs;
};

console.log('sub-pages');
{
  const ctx = await ctxFor();
  const page = await ctx.newPage();
  for (const p of chipPages) {
    const errs = errorsOn(page);
    const blocked = [];
    page.on('requestfailed', (r) => {
      if (/blocked/i.test(r.failure()?.errorText || '')) blocked.push(new URL(r.url()).host);
    });
    await page.goto(url + p, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    const chip = await page.evaluate(() => {
      const h = document.querySelector('island-return');
      const a = h && h.shadowRoot && h.shadowRoot.querySelector('a');
      if (!a) return null;
      const r = h.getBoundingClientRect();
      return { href: a.getAttribute('href'), visible: r.width > 40 && r.height > 20 };
    });
    let keys = '', keysOk = true;
    if (p.startsWith('presentations/') || p === 'about.html') {
      await page.mouse.move(640, 400);
      const before = await page.screenshot();
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(900);
      const after = await page.screenshot();
      keysOk = !before.equals(after);
      keys = keysOk ? ' · ArrowRight still advances' : ' · ArrowRight did nothing';
    }
    // errors from libraries QA keeps offline (React, Chart.js…) are the page's own deps, not ours
    const offline = [...new Set(blocked)];
    const good = chip && chip.visible && /index\.html#/.test(chip.href) && keysOk && (!errs.length || offline.length);
    const note = errs.length ? (offline.length ? ` · (errors from offline CDN deps: ${offline.join(', ')})` : ' · errors: ' + errs.join(' | ').slice(0, 160)) : '';
    check(good, `${p}: return chip ${chip ? '→ ' + chip.href.replace(url, '') : 'missing'}${keys}${note}`);
    page.removeAllListeners('pageerror');
    page.removeAllListeners('console');
    page.removeAllListeners('requestfailed');
  }
  await page.goto(url + 'about.html');
  await page.screenshot({ path: join(OUT, 'subpage-about.png') });
  await ctx.close();
}

console.log('homepage · classic view');
{
  const ctx = await ctxFor();
  const page = await ctx.newPage();
  const errs = errorsOn(page);
  await page.goto(url + 'index.html?classic&t=14:07');
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => ({
    mode: document.documentElement.className,
    h1: document.querySelectorAll('h1').length,
    landmarks: ['header', 'main', 'nav', 'footer'].every((t) => document.querySelector(t)),
    placed: document.querySelectorAll('.stop-cards article.card').length,
    lists: document.querySelectorAll('.band-list li').length,
    clock: document.getElementById('clock').textContent,
    now: document.getElementById('now-line').textContent,
    alts: [...document.images].every((i) => i.hasAttribute('alt')),
    og: !!document.querySelector('meta[property="og:image"]'),
  }));
  check(/mode-classic/.test(r.mode), '?classic gives the classic view');
  check(r.h1 === 1 && r.landmarks, 'one h1 and header/main/nav/footer landmarks');
  check(r.placed === 21 && r.lists === 21, `registry placed ${r.placed} cards at their stops and listed ${r.lists} in the bands`);
  check(r.clock === '14:07' && /14:07 in Pune/.test(r.now), `IST clock + now line (${r.now})`);
  check(r.alts && r.og, 'images have alt text; OG image set');
  await page.keyboard.press('Control+k');
  await page.keyboard.type('pawan');
  await page.waitForTimeout(200);
  const hit = await page.evaluate(() => (document.querySelector('.cmdk__item[aria-selected="true"] .cmdk__label') || {}).textContent);
  check(/Pawankhind/.test(hit || ''), `⌘K finds "${hit}"`);
  await page.keyboard.press('Escape');
  await page.screenshot({ path: join(OUT, 'classic-top.png') });
  check(!errs.length, 'classic view has no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  const deep = await ctx.newPage();
  await deep.goto(url + 'index.html?classic#read/ask-the-archive');
  await deep.waitForTimeout(900);
  const tgt = await deep.evaluate(() => {
    const el = document.getElementById('read/ask-the-archive');
    const r = el.getBoundingClientRect();
    return { target: el.classList.contains('is-target'), inView: r.top >= 0 && r.top < innerHeight, parent: el.parentElement.getAttribute('data-cards-for') };
  });
  check(tgt.target && tgt.inView && tgt.parent === 'read', 'deep link #read/ask-the-archive lands on its card at the Read stop');
  await ctx.close();
}
{
  const ctx = await ctxFor({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(url + 'index.html');
  const n = await page.evaluate(() => document.querySelectorAll('#map article.card').length);
  check(n === 21, 'without JS all 21 cards are in the bands');
  await page.screenshot({ path: join(OUT, 'no-js.png') });
  await ctx.close();
}
{
  const ctx = await ctxFor({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(url + 'index.html');
  await page.waitForTimeout(500);
  const mode = await page.evaluate(() => document.documentElement.className);
  check(/mode-classic/.test(mode) && !/mode-island/.test(mode), 'reduced motion defaults to the classic view');
  await ctx.close();
}
{
  const ctx = await ctxFor({ colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto(url + 'index.html?classic');
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, 'classic-dark.png') });
  await ctx.close();
}

console.log('homepage · island view');
{
  const ctx = await ctxFor();
  const page = await ctx.newPage();
  const errs = errorsOn(page);
  await page.goto(url + 'index.html?island&t=14:07');
  const ready = await page.waitForFunction(() => window.__island && window.__island.ready, null, { timeout: 240000 }).then(() => true, () => false);
  check(ready, 'island view boots');
  if (ready) {
    const c = await page.evaluate(() => window.__island.contract);
    check(JSON.stringify(c.stops) === JSON.stringify(c.pageStops), 'world stops match the page stops, in order');
    check(c.pageStops.filter((s) => s !== 'island' && s !== 'map').every((s) => c.hotspots.includes(s)), 'every stop has a hotspot');
    check(c.pageNotes.every((n) => c.notes.includes(n)), `all ${c.pageNotes.length} field notes have anchors`);
    await page.screenshot({ path: join(OUT, 'island-top.png') });
    const hops = QUICK ? ['run', 'climb', 'night'] : ['run', 'build', 'read', 'climb', 'commons', 'play', 'write', 'night', 'map'];
    for (const s of hops) {
      await page.evaluate((t) => window.DayIsland.go(t), s);
      await page.waitForTimeout(2600);
      const st = await page.evaluate(() => ({ stop: window.DayIsland.currentStop, hash: location.hash }));
      check(st.stop === s && st.hash === '#' + s, `flies to #${s}`);
      await page.screenshot({ path: join(OUT, `island-${s}.png`) });
    }
    await page.goBack();
    await page.waitForTimeout(2600);
    const back = await page.evaluate(() => window.DayIsland.currentStop);
    check(back === hops[hops.length - 2], `Back returns to #${hops[hops.length - 2]} (${back})`);
  }
  check(!errs.length, 'island view has no page errors' + (errs.length ? ': ' + errs.join(' | ').slice(0, 300) : ''));
  await ctx.close();
}
if (!QUICK) {
  const ctx = await ctxFor({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(url + 'index.html?island&t=21:40');
  const ready = await page.waitForFunction(() => window.__island && window.__island.ready, null, { timeout: 240000 }).then(() => true, () => false);
  check(ready, 'island view boots on a phone-sized screen');
  if (ready) {
    await page.screenshot({ path: join(OUT, 'mobile-top.png') });
    await page.evaluate(() => window.DayIsland.go('climb'));
    await page.waitForTimeout(2600);
    await page.screenshot({ path: join(OUT, 'mobile-climb.png') });
  }
  await ctx.close();
}

await browser.close();
server.close();
console.log(fails ? `\n${fails} check(s) failed` : '\nall checks passed');
process.exitCode = fails ? 1 : 0;
