#!/usr/bin/env node
// Render the island's stills with headless Chromium:
//   assets/island/renders/readme-day.png, readme-night.png   (README banner)
//   assets/island/renders/og.png                              (social card)
//   assets/island/illustrations/<stop>.webp                   (classic view, ink on alpha)
//
//   npm ci --prefix tools && node tools/capture.mjs [--only banner,og,stills]
//
// Uses the page's own ?capture mode, so the images are the island exactly as
// the site draws it. Re-run after changing the world (layout.js, props, shaders).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch, routeCdn } from './lib/browser.mjs';
import { serve, REPO } from './lib/serve.mjs';

const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const want = (k) => !only.length || only.includes(k);
const STOPS = ['island', 'run', 'build', 'read', 'climb', 'commons', 'play', 'write', 'night'];
const jobs = [];
if (want('banner')) {
  jobs.push({ out: 'assets/island/renders/readme-day.jpg', q: 'capture=banner&t=09:30&w=1600&h=600', type: 'image/jpeg', quality: 0.86 });
  jobs.push({ out: 'assets/island/renders/readme-night.jpg', q: 'capture=banner&t=22:30&w=1600&h=600', type: 'image/jpeg', quality: 0.86 });
}
if (want('og')) jobs.push({ out: 'assets/island/renders/og.jpg', q: 'capture=og&t=16:40&w=1200&h=630', type: 'image/jpeg', quality: 0.86 });
if (want('stills')) for (const s of STOPS) jobs.push({ out: `assets/island/illustrations/${s}.webp`, q: `capture=still&stop=${s}&w=1200&h=800`, type: 'image/webp', quality: 0.7 });

const { server, url } = await serve();
const browser = await launch();
const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
await routeCdn(context);
const page = await context.newPage();
page.on('pageerror', (e) => console.error('pageerror:', e.message));
let failed = 0;
for (const job of jobs) {
  await page.goto(url + 'index.html?' + job.q);
  await page.waitForFunction(() => window.__capture && window.__capture.ready, null, { timeout: 240000 });
  const data = await page.evaluate(({ type, quality }) => document.querySelector('#stage canvas').toDataURL(type, quality), job);
  const bytes = Buffer.from(data.split(',')[1], 'base64');
  if (!data.startsWith('data:' + job.type)) { console.error('✗', job.out, 'encoder fell back to', data.slice(0, 20)); failed++; continue; }
  mkdirSync(join(REPO, job.out, '..'), { recursive: true });
  writeFileSync(join(REPO, job.out), bytes);
  console.log('✓', job.out, (bytes.length / 1024).toFixed(0) + ' KB');
}
await browser.close();
server.close();
process.exitCode = failed ? 1 : 0;
