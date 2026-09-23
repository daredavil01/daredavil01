// The island as a laser-cut topographic model: a seeded heightmap, cut into
// contour rings with marching squares, each ring extruded into one terrace.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WORLD, SHAPE, MESA, HILLS, RIVER, RIVER_WIDTH, BAYS, PADS } from './layout.js';

// ---------------------------------------------------------------- random --
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simplex2(seed) {
  const rand = rng(seed);
  const p = new Uint8Array(512);
  const perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const g = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  return (x, y) => {
    const s = (x + y) * F2;
    const i = Math.floor(x + s), j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t), y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n = 0;
    for (const [dx, dy, gi] of [[x0, y0, p[ii + p[jj]]], [x1, y1, p[ii + i1 + p[jj + j1]]], [x2, y2, p[ii + 1 + p[jj + 1]]]]) {
      let tt = 0.5 - dx * dx - dy * dy;
      if (tt > 0) {
        tt *= tt;
        const gr = g[gi & 7];
        n += tt * tt * (gr[0] * dx + gr[1] * dy);
      }
    }
    return 70 * n;
  };
}

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function distToPolyline(x, z, pts) {
  let best = Infinity, bestT = 0, acc = 0, total = 0;
  const lens = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    lens.push(l);
    total += l;
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
    if (d < best) { best = d; bestT = (acc + t * lens[i]) / total; }
    acc += lens[i];
  }
  return [best, bestT];
}

// ------------------------------------------------------------- heightmap --
export function buildHeightmap() {
  const { w, d, cell, step, seed } = WORLD;
  const nx = Math.round(w / cell) + 1, nz = Math.round(d / cell) + 1;
  const n1 = simplex2(seed), n2 = simplex2(seed + 1), n3 = simplex2(seed + 2);
  const fbm = (x, z) => n1(x, z) * 0.55 + n1(x * 2.1, z * 2.1) * 0.27 + n1(x * 4.3, z * 4.3) * 0.12;
  const H = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = -w / 2 + i * cell, z = -d / 2 + j * cell;
      // warped ellipse for the coast
      const wx = x + 1.8 * n2(x * 0.08, z * 0.08), wz = z + 1.8 * n3(x * 0.08, z * 0.08);
      const e = Math.hypot(wx / SHAPE.rx, wz / SHAPE.rz);
      const land = 1 - smoothstep(0.62, 1.02, e);
      let h = land * (1.5 + 1.4 * (fbm(x * 0.09, z * 0.09) + 0.5)) - (1 - land) * 2.6;
      // hills
      for (const [hx, hz, r, hh] of HILLS) h += hh * (1 - smoothstep(r * 0.25, r, Math.hypot(x - hx, z - hz))) * land;
      // mesa with scarp sides: an irregular Deccan-trap table, not a cylinder
      const ang = Math.atan2(z - MESA.z, x - MESA.x);
      const wob = 1 + 0.16 * n2(Math.cos(ang) * 1.3 + 7, Math.sin(ang) * 1.3 + 3) + 0.08 * n3(Math.cos(ang) * 3.1, Math.sin(ang) * 3.1);
      const md = Math.hypot((x - MESA.x) * 1.0, (z - MESA.z) * 1.15) / wob;
      const m = 1 - smoothstep(MESA.r0, MESA.r1 + 0.8 * (1 + n1(x * 0.4, z * 0.4)), md);
      const mesaTop = MESA.top * step + 0.05;
      h = h * (1 - m) + Math.max(h, mesaTop - (1 - m) * 1.2 - 0.9 * smoothstep(0.2, 0.9, 1 - m) * (0.5 + 0.5 * n3(x * 0.5, z * 0.5))) * m;
      if (md < MESA.r0 * 0.9) h = mesaTop;
      // bays
      for (const [bx, bz, r] of BAYS) {
        const b = 1 - smoothstep(r * 0.55, r, Math.hypot(x - bx, z - bz));
        h = h * (1 - b) + -1.6 * b;
      }
      // river
      const [rd, rt] = distToPolyline(x, z, RIVER);
      const rw = RIVER_WIDTH[0] + (RIVER_WIDTH[1] - RIVER_WIDTH[0]) * rt;
      const r = 1 - smoothstep(rw * 0.7, rw * 1.6, rd);
      h = h * (1 - r) + Math.min(h, -0.45 - rt * 0.6) * r;
      // building pads
      for (const [px, pz, pr, level] of PADS) {
        const pd = Math.hypot(x - px, z - pz);
        const k = 1 - smoothstep(pr * 0.8, pr * 1.35, pd);
        h = h * (1 - k) + (level * step + 0.02) * k;
      }
      H[j * nx + i] = h;
    }
  }
  const sample = (x, z) => {
    const fi = (x + w / 2) / cell, fj = (z + d / 2) / cell;
    const i = Math.max(0, Math.min(nx - 2, Math.floor(fi))), j = Math.max(0, Math.min(nz - 2, Math.floor(fj)));
    const tx = Math.min(1, Math.max(0, fi - i)), tz = Math.min(1, Math.max(0, fj - j));
    const a = H[j * nx + i], b = H[j * nx + i + 1], c = H[(j + 1) * nx + i], e = H[(j + 1) * nx + i + 1];
    return a * (1 - tx) * (1 - tz) + b * tx * (1 - tz) + c * (1 - tx) * tz + e * tx * tz;
  };
  const level = (x, z) => Math.max(0, Math.round(sample(x, z) / step));
  const heightAt = (x, z) => level(x, z) * step;
  return { H, nx, nz, sample, level, heightAt };
}

// -------------------------------------------------------- marching squares --
function contours(hm, T) {
  const { H, nx, nz } = hm;
  const { w, d, cell } = WORLD;
  const pts = new Map();
  const adj = new Map();
  const v = (i, j) => H[j * nx + i] - T;
  const key = (type, i, j) => ((j * nx + i) << 1) | type; // type 0 = horizontal edge, 1 = vertical
  const pointOn = (k) => {
    if (pts.has(k)) return;
    const type = k & 1, idx = k >> 1, i = idx % nx, j = Math.floor(idx / nx);
    const [i2, j2] = type === 0 ? [i + 1, j] : [i, j + 1];
    const a = v(i, j), b = v(i2, j2);
    const t = a / (a - b);
    pts.set(k, [-w / 2 + (i + (i2 - i) * t) * cell, -d / 2 + (j + (j2 - j) * t) * cell]);
  };
  const link = (a, b) => {
    pointOn(a); pointOn(b);
    (adj.get(a) || adj.set(a, []).get(a)).push(b);
    (adj.get(b) || adj.set(b, []).get(b)).push(a);
  };
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const c0 = v(i, j) >= 0, c1 = v(i + 1, j) >= 0, c2 = v(i + 1, j + 1) >= 0, c3 = v(i, j + 1) >= 0;
      const idx = c0 | (c1 << 1) | (c2 << 2) | (c3 << 3);
      if (idx === 0 || idx === 15) continue;
      const e0 = key(0, i, j), e1 = key(1, i + 1, j), e2 = key(0, i, j + 1), e3 = key(1, i, j);
      const centre = (v(i, j) + v(i + 1, j) + v(i + 1, j + 1) + v(i, j + 1)) / 4 >= 0;
      switch (idx) {
        case 1: case 14: link(e3, e0); break;
        case 2: case 13: link(e0, e1); break;
        case 3: case 12: link(e3, e1); break;
        case 4: case 11: link(e1, e2); break;
        case 6: case 9: link(e0, e2); break;
        case 7: case 8: link(e3, e2); break;
        case 5: centre ? (link(e0, e1), link(e2, e3)) : (link(e3, e0), link(e1, e2)); break;
        case 10: centre ? (link(e3, e0), link(e1, e2)) : (link(e0, e1), link(e2, e3)); break;
      }
    }
  }
  const loops = [];
  const seen = new Set();
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const loop = [];
    let prev = -1, cur = start;
    while (cur !== undefined && !seen.has(cur)) {
      seen.add(cur);
      loop.push(pts.get(cur));
      const nb = adj.get(cur);
      const next = nb[0] !== prev ? nb[0] : nb[1];
      prev = cur;
      cur = next;
    }
    if (loop.length > 6) loops.push(loop);
  }
  return loops;
}

function chaikin(loop, iterations = 1) {
  let pts = loop;
  for (let k = 0; k < iterations; k++) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
      out.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25], [ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]);
    }
    pts = out;
  }
  return pts;
}

function simplify(loop, tol) {
  // radial-distance thinning — fast and good enough for smooth contours
  const out = [loop[0]];
  for (let i = 1; i < loop.length; i++) {
    const [x, z] = loop[i], [px, pz] = out[out.length - 1];
    if (Math.hypot(x - px, z - pz) >= tol) out.push(loop[i]);
  }
  return out;
}

const area = (loop) => {
  let a = 0;
  for (let i = 0; i < loop.length; i++) {
    const [x1, z1] = loop[i], [x2, z2] = loop[(i + 1) % loop.length];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
};

function inside([x, z], loop) {
  let c = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const [xi, zi] = loop[i], [xj, zj] = loop[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

/** Group loops for one level into shapes (outer + holes) by nesting depth. */
function shapesFor(loops) {
  const items = loops.filter((l) => Math.abs(area(l)) > 0.06).map((l) => ({ l, a: Math.abs(area(l)), depth: 0, parent: null }));
  items.sort((a, b) => b.a - a.a);
  for (let i = 0; i < items.length; i++) {
    for (let j = i - 1; j >= 0; j--) {
      if (items[j].a > items[i].a && inside(items[i].l[0], items[j].l)) {
        items[i].parent = items[j];
        items[i].depth = items[j].depth + 1;
        break;
      }
    }
  }
  const shapes = [];
  for (const it of items) {
    if (it.depth % 2) continue;
    // shape space: (x, -z) so that rotating -90° about X maps it back onto XZ
    const s = new THREE.Shape(it.l.map(([x, z]) => new THREE.Vector2(x, -z)));
    for (const h of items) if (h.parent === it) s.holes.push(new THREE.Path(h.l.map(([x, z]) => new THREE.Vector2(x, -z))));
    shapes.push(s);
  }
  return shapes;
}

// -------------------------------------------------------------- geometry --
export function buildTerrain(hm) {
  const { step } = WORLD;
  let maxLevel = 0;
  for (const h of hm.H) maxLevel = Math.max(maxLevel, Math.round(h / step));
  const tops = [], walls = [];
  const rings = []; // for rim lines / isobaths
  // ExtrudeGeometry is non-indexed with two groups: caps first, then sides.
  const slice = (g, grp, k) => {
    const out = new THREE.BufferGeometry();
    for (const name of ['position', 'normal']) {
      const a = g.attributes[name];
      out.setAttribute(name, new THREE.BufferAttribute(a.array.slice(grp.start * 3, (grp.start + grp.count) * 3), 3));
    }
    out.setAttribute('aLevel', new THREE.BufferAttribute(new Float32Array(grp.count).fill(k), 1));
    return out;
  };
  for (let k = 1; k <= maxLevel; k++) {
    const T = (k - 0.5) * step;
    const loops = contours(hm, T).map((l) => simplify(chaikin(l, 2), 0.09));
    rings.push({ k, y: k * step, loops });
    const shapes = shapesFor(loops);
    if (!shapes.length) continue;
    const g = new THREE.ExtrudeGeometry(shapes, { depth: step, bevelEnabled: false, curveSegments: 1 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, (k - 1) * step, 0);
    const [caps, sides] = g.groups;
    tops.push(slice(g, caps, k));
    if (sides) walls.push(slice(g, sides, k));
    g.dispose();
  }
  const land = { tops: mergeGeometries(tops), walls: mergeGeometries(walls) };
  land.tops.computeBoundingSphere();
  land.walls.computeBoundingSphere();
  const iso = [];
  for (let k = 1; k <= 5; k++) {
    const T = -k * step * 1.2;
    iso.push({ k: -k, loops: contours(hm, T).map((l) => simplify(chaikin(l, 2), 0.12)) });
  }
  return { land, rings, iso, maxLevel };
}

export function buildSlab() {
  const { w, d, r, depth } = WORLD.slab;
  const s = new THREE.Shape();
  const x0 = -w / 2, x1 = w / 2, z0 = -d / 2, z1 = d / 2;
  s.moveTo(x0 + r, z0);
  s.lineTo(x1 - r, z0);
  s.quadraticCurveTo(x1, z0, x1, z0 + r);
  s.lineTo(x1, z1 - r);
  s.quadraticCurveTo(x1, z1, x1 - r, z1);
  s.lineTo(x0 + r, z1);
  s.quadraticCurveTo(x0, z1, x0, z1 - r);
  s.lineTo(x0, z0 + r);
  s.quadraticCurveTo(x0, z0, x0 + r, z0);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 10 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -depth - 0.02, 0);
  g.deleteAttribute('uv');
  const water = new THREE.ShapeGeometry(s, 10);
  water.rotateX(-Math.PI / 2);
  water.deleteAttribute('uv');
  return { slab: g, water };
}

/** Height field as a texture for the water shader (isobaths + shoreline foam). */
export function heightTexture(hm) {
  const { nx, nz, H } = hm;
  const data = new Uint8Array(nx * nz * 4);
  for (let i = 0; i < nx * nz; i++) {
    const v = Math.min(1, Math.max(0, (H[i] + 3) / 6)); // -3..3 → 0..1
    data[i * 4] = Math.round(v * 255); // bilinear filtering smooths the 8-bit steps
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, nx, nz, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
