// Node: write the pen strokes and effect cues the sound mix needs.
import fs from 'node:fs';
import WORDS from './src/words.json';
import { buildFilm, timing } from './src/timeline.jsx';
for (const L of ['h', 'v']) {
  const F = buildFilm(L, WORDS, (txt, size, bold) => txt.length * size * (bold ? 0.5 : 0.46));
  const out = { TOTAL: F.TOTAL, scenes: Object.values(F.SC).map((s) => ({ id: s.id, start: s.start })), events: F.events, pops: F.pops };
  fs.writeFileSync(`film-${L}.json`, JSON.stringify(out));
  console.log(L, F.TOTAL.toFixed(2), F.events.length, 'strokes', F.pops.length, 'cues');
}
