// The camera rail: smooth curves through every stop's camera and look-at
// point. u runs from 0 (first stop) to n-1 (last stop); integer u parks the
// camera exactly on a stop's authored shot.
import * as THREE from 'three';
import { STOPS } from './layout.js';

export class Rail {
  constructor(stops = STOPS) {
    this.stops = stops;
    this.n = stops.length;
    const lift = (a, b, k) => {
      // raise the midpoint between two shots so transits arc over the island
      const m = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
      m.y += k;
      return m;
    };
    const cams = [], looks = [];
    this.index = []; // curve-point index of each stop
    stops.forEach((s, i) => {
      const c = new THREE.Vector3(...s.cam), l = new THREE.Vector3(...s.look);
      if (i > 0) {
        const pc = new THREE.Vector3(...stops[i - 1].cam), pl = new THREE.Vector3(...stops[i - 1].look);
        const dist = c.distanceTo(pc);
        cams.push(lift(pc, c, Math.min(9, dist * 0.22)));
        looks.push(lift(pl, l, 0));
      }
      this.index.push(cams.length);
      cams.push(c);
      looks.push(l);
    });
    this.cam = new THREE.CatmullRomCurve3(cams, false, 'centripetal', 0.5);
    this.look = new THREE.CatmullRomCurve3(looks, false, 'centripetal', 0.5);
    this.points = cams.length;
  }

  /** Camera pose at rail position u ∈ [0, n-1]. */
  sample(u, out = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 35 }) {
    const n = this.n;
    const uu = Math.min(n - 1, Math.max(0, u));
    const i = Math.min(n - 2, Math.floor(uu));
    const f = uu - i;
    const a = this.index[i], b = this.index[i + 1];
    const t = (a + (b - a) * f) / (this.points - 1);
    this.cam.getPoint(t, out.pos);
    this.look.getPoint(t, out.look);
    const s = f * f * (3 - 2 * f);
    out.fov = this.stops[i].fov + (this.stops[i + 1].fov - this.stops[i].fov) * s;
    return out;
  }

  indexOf(id) {
    return this.stops.findIndex((s) => s.id === id);
  }
}
