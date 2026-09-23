#!/usr/bin/env node
// Build assets/island/models/{props,runner}.glb.gz from Kenney CC0 kits.
//
//   npm ci --prefix tools && node tools/props/build-props.mjs
//
// 1. downloads the pinned kit zips (tools/props/kits.json) into
//    ~/.cache/day-island/kits, checks sha256 and unzips them;
// 2. for every prop, flattens the model into one mesh, samples the kit's
//    colormap under each vertex into COLOR_0 (linear) and drops textures,
//    UVs and tangents, so all kits read as one ink style at runtime;
// 3. writes one node per prop named proto_<name>, meshopt-compresses the lot
//    and gzips it. The runner (a skinned Kenney character) keeps its skeleton
//    and only the clips listed in kits.json, in a file of its own.
//
// The site never runs this: the outputs are committed static files.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, quantize, reorder, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { PNG } from 'pngjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const OUT = join(REPO, 'assets/island/models');
const CACHE = process.env.DAYISLAND_CACHE || join(homedir(), '.cache/day-island/kits');
const BUDGET = { 'props.glb.gz': 600 * 1024, 'runner.glb.gz': 160 * 1024 };
const cfg = JSON.parse(readFileSync(join(HERE, 'kits.json'), 'utf8'));

await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

// ---------------------------------------------------------------- kits ----
function ensureKit(id) {
  const kit = cfg.kits[id];
  if (!kit) throw new Error(`unknown kit ${id}`);
  const zip = join(CACHE, `${id}.zip`);
  const dir = join(CACHE, id);
  mkdirSync(CACHE, { recursive: true });
  if (!existsSync(zip)) {
    console.log(`  ↓ ${id}`);
    execFileSync('curl', ['-sSfL', '--retry', '3', '-o', zip, kit.url], { stdio: 'inherit' });
  }
  const sum = createHash('sha256').update(readFileSync(zip)).digest('hex');
  if (sum !== kit.sha256) throw new Error(`${id}: sha256 ${sum} != pinned ${kit.sha256}`);
  if (!existsSync(join(dir, kit.dir))) execFileSync('unzip', ['-qo', zip, '-d', dir]);
  return join(dir, kit.dir);
}

// ------------------------------------------------------------- colours ----
const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const pngCache = new Map();
function texture(path) {
  if (!pngCache.has(path)) pngCache.set(path, PNG.sync.read(readFileSync(path)));
  return pngCache.get(path);
}
function sampler(material, modelDir) {
  const f = material ? material.getBaseColorFactor() : [1, 1, 1, 1];
  const tex = material && material.getBaseColorTexture();
  if (!tex) return () => [f[0], f[1], f[2]];
  const img = texture(join(modelDir, tex.getURI()));
  return (u, v) => {
    const x = Math.min(img.width - 1, Math.max(0, Math.floor((((u % 1) + 1) % 1) * img.width)));
    const y = Math.min(img.height - 1, Math.max(0, Math.floor((((v % 1) + 1) % 1) * img.height)));
    const i = (y * img.width + x) * 4;
    return [0, 1, 2].map((k) => srgbToLinear(img.data[i + k] / 255) * f[k]);
  };
}

// --------------------------------------------------------------- maths ----
function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
const xformPoint = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
function xformNormal(m, x, y, z) {
  // Kenney transforms are rotation + uniform scale, so the upper 3x3 is fine.
  const n = [m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z];
  const l = Math.hypot(...n) || 1;
  return n.map((v) => v / l);
}

// -------------------------------------------------------------- flatten ----
async function flattenModel(file) {
  const src = await io.read(file);
  const modelDir = dirname(file);
  const P = [], N = [], C = [], I = [];
  const visit = (node, parent) => {
    const world = mul(parent, node.getMatrix());
    const mesh = node.getMesh();
    if (mesh) {
      for (const prim of mesh.listPrimitives()) {
        const pos = prim.getAttribute('POSITION');
        const nor = prim.getAttribute('NORMAL');
        const uv = prim.getAttribute('TEXCOORD_0');
        const sample = sampler(prim.getMaterial(), modelDir);
        const base = P.length / 3;
        const t = [0, 0, 0], n = [0, 0, 0], u = [0, 0];
        for (let i = 0; i < pos.getCount(); i++) {
          pos.getElement(i, t);
          P.push(...xformPoint(world, t[0], t[1], t[2]));
          if (nor) nor.getElement(i, n); else n.splice(0, 3, 0, 1, 0);
          N.push(...xformNormal(world, n[0], n[1], n[2]));
          if (uv) uv.getElement(i, u);
          C.push(...sample(u[0], u[1]));
        }
        const idx = prim.getIndices();
        if (idx) for (let i = 0; i < idx.getCount(); i++) I.push(base + idx.getScalar(i));
        else for (let i = 0; i < pos.getCount(); i++) I.push(base + i);
      }
    }
    for (const child of node.listChildren()) visit(child, world);
  };
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (const scene of src.getRoot().listScenes()) for (const node of scene.listChildren()) visit(node, identity);
  return { P, N, C, I };
}

// ---------------------------------------------------------------- props ----
async function buildProps() {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const material = doc.createMaterial('ink_kit').setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(1).setMetallicFactor(0);
  const scene = doc.createScene('props');
  const manifest = [];
  for (const [name, [kit, model]] of Object.entries(cfg.props)) {
    const file = join(ensureKit(kit), `${model}.glb`);
    const { P, N, C, I } = await flattenModel(file);
    const acc = (type, arr, T) => doc.createAccessor().setType(type).setArray(new T(arr)).setBuffer(buffer);
    const prim = doc
      .createPrimitive()
      .setAttribute('POSITION', acc('VEC3', P, Float32Array))
      .setAttribute('NORMAL', acc('VEC3', N, Float32Array))
      .setAttribute('COLOR_0', acc('VEC3', C, Float32Array))
      .setIndices(acc('SCALAR', I, P.length / 3 > 65535 ? Uint32Array : Uint16Array))
      .setMaterial(material);
    const mesh = doc.createMesh(`proto_${name}`).addPrimitive(prim);
    scene.addChild(doc.createNode(`proto_${name}`).setMesh(mesh));
    manifest.push({ name: `proto_${name}`, kit, model, tris: I.length / 3 });
  }
  await doc.transform(weld(), dedup(), prune({ keepLeaves: true }), quantize(), reorder({ encoder: MeshoptEncoder }));
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  return { bytes: await io.writeBinary(doc), manifest };
}

// --------------------------------------------------------------- runner ----
async function buildRunner() {
  const { kit, model, clips } = cfg.runner;
  const file = join(ensureKit(kit), `${model}.glb`);
  const doc = await io.read(file);
  const root = doc.getRoot();
  const material = doc.createMaterial('ink_kit').setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(1).setMetallicFactor(0);
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const sample = sampler(prim.getMaterial(), dirname(file));
      const uv = prim.getAttribute('TEXCOORD_0');
      const count = prim.getAttribute('POSITION').getCount();
      const colors = new Float32Array(count * 3);
      const u = [0, 0];
      for (let i = 0; i < count; i++) {
        if (uv) uv.getElement(i, u);
        colors.set(sample(u[0], u[1]), i * 3);
      }
      prim.setAttribute('COLOR_0', doc.createAccessor().setType('VEC3').setArray(colors).setBuffer(root.listBuffers()[0]));
      for (const sem of ['TANGENT', 'TEXCOORD_0', 'TEXCOORD_1']) prim.setAttribute(sem, null);
      prim.setMaterial(material);
    }
  }
  for (const anim of root.listAnimations()) if (!clips.includes(anim.getName())) anim.dispose();
  for (const m of root.listMaterials()) if (m !== material) m.dispose();
  for (const t of root.listTextures()) t.dispose();
  const top = root.listScenes()[0].listChildren()[0];
  top.setName('proto_runner');
  await doc.transform(prune({ keepLeaves: true }), dedup(), quantize(), reorder({ encoder: MeshoptEncoder }));
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  return { bytes: await io.writeBinary(doc), manifest: [{ name: 'proto_runner', kit, model, clips: root.listAnimations().map((a) => a.getName()) }] };
}

// ---------------------------------------------------------------- write ----
mkdirSync(OUT, { recursive: true });
const files = {};
for (const [name, build] of [['props.glb.gz', buildProps], ['runner.glb.gz', buildRunner]]) {
  const { bytes, manifest } = await build();
  const gz = gzipSync(bytes, { level: 9 });
  writeFileSync(join(OUT, name), gz);
  const sha256 = createHash('sha256').update(gz).digest('hex');
  files[name] = { bytes: gz.length, glbBytes: bytes.length, sha256, items: manifest };
  const ok = gz.length <= BUDGET[name];
  console.log(`${ok ? '✓' : '✗'} ${name}: ${(gz.length / 1024).toFixed(1)} KB gz (${(bytes.length / 1024).toFixed(1)} KB glb), ${manifest.length} nodes`);
  if (!ok) process.exitCode = 1;
}
writeFileSync(
  join(OUT, 'manifest.json'),
  JSON.stringify({ licence: 'CC0 1.0 — Kenney (https://kenney.nl)', kits: cfg.kits, files }, null, 2) + '\n'
);
