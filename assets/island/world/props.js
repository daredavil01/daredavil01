// Everything that stands on the island: Kenney kit pieces placed from
// layout.js (instanced where repeated), a scatter of trees and rocks, and the
// procedural pieces the kits don't have — banyan, chaupal, lighthouse lamp
// and beam, observatory dome, orb, paper boats, trails, stars and moon.
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PROPS, PROTO_SCALE, FLORA, RUN_LOOP, TRAIL, WORLD, PADS } from './layout.js';
import { inkMaterial, packedLineColor } from './materials.js';
import { glowMaterial } from './post.js';
import { rng } from './terrain.js';

const DEG = Math.PI / 180;

export function buildProps({ gltf, hm, post, quality }) {
  const group = new THREE.Group();
  group.name = 'props';
  const kitMat = inkMaterial('kit');
  const rustMat = inkMaterial('kit', { accent: 0.85 });
  const RUST = new Set(['flag', 'flag_banner', 'finish_gate', 'fort_tower_roof', 'library_top', 'buoy']);
  const matFor = (p) => (RUST.has(p) ? rustMat : kitMat);
  // Quantized meshes keep their dequantization scale/offset on the node, so
  // every prototype carries its node matrix into its placements.
  const protos = new Map();
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => {
    if (o.isMesh && o.name.startsWith('proto_')) protos.set(o.name.slice(6), { geo: o.geometry, m: o.matrixWorld.clone() });
  });
  const anims = { boats: [], lanterns: [], windows: [] };
  const lanternTops = [];

  // ---- placed kit pieces, batched per prototype
  const byProto = new Map();
  const matrix = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  for (const it of PROPS) {
    const proto = protos.get(it.p);
    if (!proto) { console.warn('[island] missing prototype', it.p); continue; }
    const s = (PROTO_SCALE[it.p] ?? 1) * (it.s ?? 1);
    const y = it.y ?? hm.heightAt(it.x, it.z) + (it.dy ?? 0) * 1;
    q.setFromAxisAngle(up, (it.ry ?? 0) * DEG);
    matrix.compose(new THREE.Vector3(it.x, y, it.z), q, new THREE.Vector3(s, s, s)).multiply(proto.m);
    if (/^boat|^ferry|^buoy/.test(it.p)) {
      const mesh = new THREE.Mesh(proto.geo, matFor(it.p));
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(matrix);
      mesh.userData.base = matrix.clone();
      mesh.userData.phase = anims.boats.length * 1.7;
      mesh.castShadow = true;
      group.add(mesh);
      anims.boats.push(mesh);
      continue;
    }
    if (it.p === 'lantern') lanternTops.push(new THREE.Vector3(it.x, y + 1.45 * s, it.z));
    if (!byProto.has(it.p)) byProto.set(it.p, []);
    byProto.get(it.p).push(matrix.clone());
  }

  // ---- flora scatter (seeded), respecting keep-out zones and the water
  const rand = rng(WORLD.seed + 7);
  const keep = FLORA.keepOut;
  let placed = 0, tries = 0;
  const flora = new Map();
  const target = Math.round(FLORA.count * (quality.flora ?? 1));
  while (placed < target && tries < target * 30) {
    tries++;
    const x = (rand() - 0.5) * WORLD.w * 0.86, z = (rand() - 0.5) * WORLD.d * 0.86;
    const h = hm.sample(x, z);
    const level = Math.round(h / WORLD.step);
    if (level < 1) continue;
    // stay off terrace rims: the whole footprint must share one level
    let edge = false;
    for (const [dx, dz] of [[0.35, 0], [-0.35, 0], [0, 0.35], [0, -0.35]]) if (hm.level(x + dx, z + dz) !== level) edge = true;
    if (edge) continue;
    if (keep.some(([kx, kz, r]) => Math.hypot(x - kx, z - kz) < r)) continue;
    const band = FLORA.byLevel.find(([a, b]) => level >= a && level <= b);
    if (!band) continue;
    const kinds = band[2];
    const p = kinds[Math.floor(rand() * kinds.length)];
    const s = (PROTO_SCALE[p] ?? 1) * (0.75 + rand() * 0.5);
    q.setFromAxisAngle(up, rand() * Math.PI * 2);
    matrix.compose(new THREE.Vector3(x, level * WORLD.step, z), q, new THREE.Vector3(s, s, s)).multiply(protos.get(p).m);
    if (!flora.has(p)) flora.set(p, []);
    flora.get(p).push(matrix.clone());
    placed++;
  }
  for (const [p, list] of flora) (byProto.get(p) || byProto.set(p, []).get(p)).push(...list);

  for (const [p, list] of byProto) {
    const proto = protos.get(p);
    if (!proto) continue;
    const mesh = new THREE.InstancedMesh(proto.geo, matFor(p), list.length);
    list.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `kit_${p}`;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }

  // ---- procedural pieces
  const plain = (albedo = 0.86, opts = {}) => inkMaterial('plain', { albedo, ...opts });
  const addMesh = (geo, mat, pos, opts = {}) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    if (opts.rot) m.rotation.set(...opts.rot);
    m.castShadow = opts.cast ?? true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // Banyan + chaupal at the commons
  {
    const [bx, bz] = [-8.4, 5.6];
    const by = hm.heightAt(bx, bz);
    const r2 = rng(99);
    const plat = mergeGeometries([
      new THREE.CylinderGeometry(1.35, 1.45, 0.22, 20).translate(0, 0.11, 0),
      new THREE.CylinderGeometry(1.05, 1.1, 0.18, 20).translate(0, 0.31, 0),
    ]);
    addMesh(plat, plain(0.9), new THREE.Vector3(bx, by, bz));
    const trunkParts = [new THREE.CylinderGeometry(0.22, 0.36, 1.5, 8).translate(0, 1.15, 0)];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + r2() * 0.4;
      const rr = 0.9 + r2() * 1.0;
      const h = 1.6 + r2() * 0.4;
      trunkParts.push(new THREE.CylinderGeometry(0.03, 0.05, h, 5).translate(Math.cos(a) * rr, 0.4 + h / 2, Math.sin(a) * rr));
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const branch = new THREE.CylinderGeometry(0.07, 0.12, 1.5, 6);
      branch.rotateZ(Math.PI / 2 - 0.35);
      branch.rotateY(a);
      branch.translate(Math.cos(a) * 0.6, 1.95, -Math.sin(a) * 0.6);
      trunkParts.push(branch);
    }
    addMesh(mergeGeometries(trunkParts), plain(0.55), new THREE.Vector3(bx, by + 0.4, bz));
    const canopy = [];
    for (let i = 0; i < 16; i++) {
      const a = r2() * Math.PI * 2, rr = r2() * 1.9;
      const g = new THREE.IcosahedronGeometry(0.55 + r2() * 0.35, 0);
      g.scale(1.25, 0.62, 1.25);
      g.translate(Math.cos(a) * rr, 2.45 + r2() * 0.45, Math.sin(a) * rr);
      canopy.push(g);
    }
    addMesh(mergeGeometries(canopy), plain(0.8), new THREE.Vector3(bx, by + 0.4, bz));
  }

  // Lighthouse lamp room + beam
  let beam = null;
  {
    const [lx, lz] = [-12.8, -6.6];
    const top = hm.heightAt(lx, lz) + 10.22 * PROTO_SCALE.lighthouse_tower;
    addMesh(new THREE.CylinderGeometry(0.34, 0.34, 0.5, 10), plain(0.9, { glow: 1 }), new THREE.Vector3(lx, top + 0.25, lz));
    addMesh(new THREE.ConeGeometry(0.46, 0.45, 10), plain(0.6, { accent: 0.9 }), new THREE.Vector3(lx, top + 0.72, lz));
    const len = 16;
    const cone = new THREE.ConeGeometry(1.8, len, 24, 1, true);
    cone.translate(0, -len / 2, 0);
    cone.rotateZ(Math.PI / 2);
    beam = new THREE.Mesh(
      cone,
      glowMaterial(post, /* glsl */ `
        float along = clamp(-vPos.x / 16.0, 0.0, 1.0);
        float a = (1.0 - along) * 0.32 * uNight;
        gl_FragColor = vec4(uGlowCol * a, a);`)
    );
    beam.position.set(lx, top + 0.25, lz);
    beam.layers.set(2);
    post.glowScene.add(beam);
    lanternTops.push(new THREE.Vector3(lx, top + 0.25, lz));
  }

  // Observatory dome + telescope
  {
    const [ox, oz] = [4.2, -8.6];
    const top = hm.heightAt(ox, oz) + 2.02;
    const dome = new THREE.SphereGeometry(0.62, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    addMesh(dome, plain(0.95), new THREE.Vector3(ox, top, oz));
    const scope = new THREE.CylinderGeometry(0.07, 0.1, 1.1, 8);
    scope.rotateZ(-0.9);
    addMesh(scope, plain(0.5, { accent: 0.6 }), new THREE.Vector3(ox + 0.35, top + 0.55, oz));
  }

  // The orb at the pavilion — a nod to the Three.js self-orb prototype
  let orb;
  {
    const [x, z] = [-15.0, 4.3];
    const y = hm.heightAt(x, z);
    addMesh(new THREE.CylinderGeometry(0.18, 0.24, 0.6, 8), plain(0.8), new THREE.Vector3(x, y + 0.3, z));
    orb = addMesh(new THREE.IcosahedronGeometry(0.3, 1), plain(0.95, { glow: 0.8, accent: 0.4 }), new THREE.Vector3(x, y + 0.92, z));
  }

  // Paper boats in the harbour and the cove
  {
    const hull = new THREE.BufferGeometry();
    const v = [
      -0.5, 0.0, 0, 0.5, 0.0, 0, 0, 0.25, 0.18, // side a
      -0.5, 0.0, 0, 0, 0.25, -0.18, 0.5, 0.0, 0, // side b
      -0.18, 0.08, 0, 0.18, 0.08, 0, 0, 0.55, 0, // sail
    ];
    hull.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    hull.computeVertexNormals();
    const pm = plain(0.97, { side: THREE.DoubleSide });
    for (const [x, z, r] of [[11.2, 11.6, 0.3], [-19.2, 4.6, 1.2], [3.2, 12.4, 2.2], [-6.2, -12.2, 0.8]]) {
      const b = addMesh(hull, pm, new THREE.Vector3(x, 0.02, z), { rot: [0, r, 0] });
      b.scale.setScalar(0.8);
      b.updateMatrix();
      b.userData.base = b.matrix.clone();
      b.userData.phase = x * 0.7;
      b.matrixAutoUpdate = false;
      anims.boats.push(b);
    }
  }

  // Trails: the dawn run (rust GPS trace) and the switchbacks up to the fort
  const lines = [];
  const lineAt = (pts, lift, closed) => {
    const out = [];
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), closed, 'centripetal');
    for (const p of curve.getSpacedPoints(closed ? 220 : 90)) out.push(p.x, hm.heightAt(p.x, p.z) + lift, p.z);
    return out;
  };
  const mkLine = (positions, width, ink, accent, dashed) => {
    const g = new LineGeometry();
    g.setPositions(positions);
    const { color, opacity } = packedLineColor(ink, accent, 1);
    const m = new LineMaterial({ color, opacity, linewidth: width, dashed, dashSize: 0.28, gapSize: 0.18, worldUnits: false });
    m.transparent = false;
    const l = new Line2(g, m);
    l.computeLineDistances();
    l.layers.set(1);
    group.add(l);
    lines.push(m);
    return l;
  };
  mkLine(lineAt(RUN_LOOP, 0.06, true), 2.4, 0, 1, true);
  mkLine(lineAt(TRAIL, 0.06, false), 1.6, 0.85, 0, true);

  // Lantern halos at night
  {
    const g = new THREE.BufferGeometry().setFromPoints(lanternTops);
    const halo = new THREE.Points(
      g,
      glowMaterial(
        post,
        /* glsl */ `
        vec2 c = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.0, length(c)) * 0.75 * smoothstep(0.35, 0.9, uNight);
        gl_FragColor = vec4(uGlowCol * a, a);`,
        { uSize: { value: 30 } },
        /* glsl */ `
        uniform float uSize;
        varying vec3 vPos; varying vec2 vUv;
        void main() { vPos = position; vUv = vec2(0.0); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = uSize * 12.0 / -mv.z; }`
      )
    );
    halo.layers.set(2);
    halo.frustumCulled = false;
    post.glowScene.add(halo);
  }

  return { group, anims, beam, orb, lines, protos };
}

/** Stars + moon, drawn in the glow pass. */
export function buildSky(post) {
  const r = rng(WORLD.seed + 31);
  const n = 420;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    // all the way round: the island floats, so stars show below the rim too
    const u = r() * Math.PI * 2, v = Math.asin(r() * 1.7 - 0.7);
    const R = 180;
    pos.set([Math.cos(u) * Math.cos(v) * R, Math.sin(v) * R * 0.8, Math.sin(u) * Math.cos(v) * R - 20], i * 3);
    seed[i] = r();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const stars = new THREE.Points(
    g,
    glowMaterial(
      post,
      /* glsl */ `
      vec2 c = gl_PointCoord - 0.5;
      float cross = max(smoothstep(0.07, 0.0, abs(c.x)) * smoothstep(0.5, 0.1, abs(c.y)), smoothstep(0.07, 0.0, abs(c.y)) * smoothstep(0.5, 0.1, abs(c.x)));
      float dotc = smoothstep(0.22, 0.0, length(c));
      float tw = 0.65 + 0.35 * sin(uTime * (1.0 + vSeed * 2.0) + vSeed * 40.0);
      float a = max(cross * 0.6, dotc) * tw * smoothstep(0.55, 1.0, uNight);
      gl_FragColor = vec4(vec3(0.93, 0.95, 1.0) * a, a);`,
      {},
      /* glsl */ `
      attribute float aSeed;
      varying float vSeed; varying vec3 vPos; varying vec2 vUv;
      void main() { vSeed = aSeed; vPos = position; vUv = vec2(0.0); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = (4.0 + aSeed * 7.0); }`
    )
  );
  stars.material.fragmentShader = stars.material.fragmentShader.replace('varying vec2 vUv;', 'varying vec2 vUv;\nvarying float vSeed;');
  stars.layers.set(2);
  stars.frustumCulled = false;
  post.glowScene.add(stars);

  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(4.2, 40),
    glowMaterial(
      post,
      /* glsl */ `
      float d = length(vUv - 0.5) * 2.0;
      float disc = smoothstep(1.0, 0.94, d);
      float rim = smoothstep(0.86, 0.94, d) * disc;
      float crater = smoothstep(0.2, 0.0, length(vUv - vec2(0.38, 0.6))) * 0.25 + smoothstep(0.12, 0.0, length(vUv - vec2(0.62, 0.42))) * 0.2;
      float a = (disc * (0.75 - crater) + rim * 0.3) * smoothstep(0.5, 1.0, uNight);
      gl_FragColor = vec4(vec3(0.96, 0.94, 0.86) * a, a);`
    )
  );
  moon.layers.set(2);
  post.glowScene.add(moon);
  return { stars, moon };
}
