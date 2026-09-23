// ?capture=banner|og|still — render one frame for tools/capture.mjs.
//   banner/og   full-colour frames from the SHOTS poses, at ?t=HH:MM
//   still       ink-only (alpha) frame of ?stop=<id> for the classic view
import * as THREE from 'three';
import { IslandView } from './scene.js';
import { SHOTS, STILL_HOURS } from './layout.js';

export async function boot(DI) {
  const p = DI.params;
  const kind = p.get('capture');
  const w = +p.get('w') || 1600, h = +p.get('h') || 600, dpr = +p.get('dpr') || 1;
  const stage = document.getElementById('stage');
  const canvas = document.createElement('canvas');
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  stage.prepend(canvas);
  const view = new IslandView(canvas, { tier: 'high', base: new URL('../', import.meta.url).href, capture: kind === 'still' ? 'alpha' : true });
  await view.build();
  view.resize(w, h, dpr);
  const t = p.get('t');
  const stop = p.get('stop');
  let hour = t ? +t.split(':')[0] + +(t.split(':')[1] || 0) / 60 : 10;
  if (kind === 'still' && stop) {
    if (!t) hour = STILL_HOURS[stop] ?? 12;
    view.setState(view.rail.indexOf(stop), hour);
  } else {
    const shot = SHOTS[kind] || SHOTS.banner;
    view.setPose(new THREE.Vector3(...shot.cam), new THREE.Vector3(...shot.look), shot.fov);
    view.setHour(hour);
  }
  view.time = 8; // deterministic boats, beam and runner
  view.post.uniforms.uGrain.value = +(p.get('grain') ?? 0.25);
  view.render(0);
  view.render(0);
  window.__capture = { ready: true, info: view.info() };
}
