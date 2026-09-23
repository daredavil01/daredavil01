// IslandView: builds the island once and renders it for a camera pose and
// an hour. It knows nothing about the page — main3d.js drives it from the
// scroll, and tools/capture.mjs drives it directly for stills.
import * as THREE from 'three';
import { WORLD, RUN_LOOP, STOPS } from './layout.js';
import { buildHeightmap, buildTerrain, buildSlab, heightTexture } from './terrain.js';
import { inkMaterial, waterMaterial, shared } from './materials.js';
import { InkPost } from './post.js';
import { buildProps, buildSky } from './props.js';
import { loadGLB } from './loader.js';
import { paletteAt, sky, nightness } from './palette.js';
import { Rail } from './rail.js';

export const QUALITY = {
  high: { dpr: 2, shadows: 2048, hatch: 1, flora: 1 },
  mid: { dpr: 1.5, shadows: 1024, hatch: 1, flora: 0.85 },
  low: { dpr: 1.25, shadows: 0, hatch: 1, flora: 0.6 },
};

export class IslandView {
  constructor(canvas, { tier = 'high', base = './assets/island/', capture = false } = {}) {
    this.canvas = canvas;
    this.base = base;
    this.tier = tier;
    this.q = QUALITY[tier];
    this.capture = capture;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: capture, powerPreference: 'high-performance', preserveDrawingBuffer: capture });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = this.q.shadows > 0;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.5, 400);
    this.post = new InkPost(this.renderer);
    this.post.uniforms.uHatch.value = this.q.hatch;
    this.rail = new Rail(STOPS);
    this.pose = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 35 };
    this.hour = 12;
    this.time = 0;
    this.viewOffset = [0, 0]; // CSS px to shift the subject (panels cover part of the screen)
    this.last = performance.now();
    this.renderer.info.autoReset = false;
  }

  async build(onProgress = () => {}) {
    const t0 = performance.now();
    const hm = (this.hm = buildHeightmap());
    const terrain = buildTerrain(hm);
    const { slab, water } = buildSlab();
    shared.uHeight.value = heightTexture(hm);
    shared.uWorld.value.set(WORLD.w, WORLD.d, 0, 0);
    this.stats = { terrainMs: Math.round(performance.now() - t0) };

    const tops = new THREE.Mesh(terrain.land.tops, inkMaterial('land', { albedo: 0.98 }));
    const walls = new THREE.Mesh(terrain.land.walls, inkMaterial('land', { albedo: 0.9 }));
    for (const m of [tops, walls]) {
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
    }
    tops.name = 'terrain';
    walls.name = 'terrain_walls';
    this.terrain = [tops, walls];
    const slabMesh = new THREE.Mesh(slab, inkMaterial('slab', { albedo: 0.9 }));
    slabMesh.name = 'slab';
    slabMesh.receiveShadow = true;
    this.scene.add(slabMesh);
    const waterMesh = new THREE.Mesh(water, waterMaterial());
    waterMesh.name = 'water';
    waterMesh.position.y = WORLD.sea;
    this.scene.add(waterMesh);

    // lights
    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = this.q.shadows > 0;
    if (this.sun.castShadow) {
      this.sun.shadow.mapSize.set(this.q.shadows, this.q.shadows);
      const c = this.sun.shadow.camera;
      c.left = -26; c.right = 26; c.top = 20; c.bottom = -20; c.near = 1; c.far = 120;
      this.sun.shadow.bias = -0.0008;
      this.sun.shadow.normalBias = 0.03;
    }
    this.scene.add(this.sun, this.sun.target);
    this.moon = new THREE.DirectionalLight(0xffffff, 0);
    this.scene.add(this.moon, this.moon.target);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
    this.scene.add(this.hemi);

    // props
    const [gltf, runner] = await Promise.all([
      loadGLB(this.base + 'models/props.glb.gz', (p) => onProgress(p * 0.8)),
      loadGLB(this.base + 'models/runner.glb.gz').catch(() => null),
    ]);
    const props = buildProps({ gltf, hm, post: this.post, quality: this.q });
    this.props = props;
    this.scene.add(props.group);
    this.sky = buildSky(this.post);

    // the runner on the dawn loop
    if (runner) {
      const r = runner.scene;
      r.traverse((o) => {
        if (o.isMesh) {
          o.material = inkMaterial('kit');
          o.castShadow = true;
          o.frustumCulled = false;
        }
      });
      const box = new THREE.Box3().setFromObject(r);
      const h = box.max.y - box.min.y || 1;
      r.scale.setScalar(0.62 / h);
      this.runner = r;
      this.runnerCurve = new THREE.CatmullRomCurve3(RUN_LOOP.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
      this.mixer = new THREE.AnimationMixer(r);
      const clip = runner.animations.find((a) => a.name === 'sprint') || runner.animations[0];
      if (clip) this.mixer.clipAction(clip).play();
      this.scene.add(r);
    }
    onProgress(1);
    this.stats.buildMs = Math.round(performance.now() - t0);
    this.ready = true;
  }

  resize(w, h, dpr = Math.min(window.devicePixelRatio || 1, this.q.dpr)) {
    this.size = [w, h];
    this.dpr = dpr;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.post.setSize(w, h, dpr);
    this.camera.aspect = w / h;
    this.applyView();
  }

  /** Shift the rendered view by (px, py) CSS pixels: positive x moves the subject left. */
  setViewOffset(px, py) {
    if (Math.abs(px - this.viewOffset[0]) < 0.5 && Math.abs(py - this.viewOffset[1]) < 0.5) return;
    this.viewOffset = [px, py];
    this.applyView();
  }

  applyView() {
    if (!this.size) return;
    const [w, h] = this.size;
    const [px, py] = this.viewOffset;
    if (px || py) this.camera.setViewOffset(w, h, px, py, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  /** Drop to a cheaper tier at runtime (the FPS governor calls this). */
  setTier(tier) {
    if (tier === this.tier || !QUALITY[tier]) return;
    this.tier = tier;
    this.q = QUALITY[tier];
    this.sun.castShadow = this.q.shadows > 0;
    if (this.sun.castShadow && this.sun.shadow.mapSize.x !== this.q.shadows) {
      this.sun.shadow.mapSize.set(this.q.shadows, this.q.shadows);
      if (this.sun.shadow.map) {
        this.sun.shadow.map.dispose();
        this.sun.shadow.map = null;
      }
    }
    if (this.size) this.resize(this.size[0], this.size[1]);
  }

  /** Put the camera on the rail (u) and set the scene hour. */
  setState(u, hour) {
    this.u = u;
    this.rail.sample(u, this.pose);
    this.setHour(hour);
  }

  setPose(pos, look, fov) {
    this.pose.pos.copy(pos);
    this.pose.look.copy(look);
    this.pose.fov = fov;
  }

  setHour(hour) {
    this.hour = hour;
    const p = paletteAt(hour);
    const n = nightness(hour);
    this.palette = p;
    this.night = n;
    this.post.setPalette(p, n);
    shared.uNight.value = n;
    const s = sky(hour);
    const c = new THREE.Vector3(0, 0, 0);
    this.sun.position.set(s.sun[0] * 60, s.sun[1] * 60, s.sun[2] * 60).add(c);
    this.sun.target.position.copy(c);
    this.sun.intensity = 3.2 * s.sunI;
    this.moon.position.set(s.moon[0] * 60, s.moon[1] * 60, s.moon[2] * 60);
    this.moon.intensity = 1.6 * s.moonI;
    // more sky light when the sun is low, so dusk isn't a wall of hatching
    this.hemi.intensity = 1.0 + 1.35 * (1 - s.sunI) * (1 - n) + 0.35 * n;
    this.moonDir = new THREE.Vector3(...s.moon);
  }

  frame(dt) {
    this.time += dt;
    shared.uTime.value = this.time;
    this.post.uniforms.uTime.value = this.time;
    // camera
    const cam = this.camera;
    const aspect = this.size ? this.size[0] / this.size[1] : 1.6;
    // keep horizontal coverage on portrait screens
    const fov0 = this.pose.fov;
    const design = 1.6;
    const fov = aspect < design ? (2 * Math.atan(Math.tan((fov0 * Math.PI) / 360) * Math.min(1.9, design / aspect)) * 180) / Math.PI : fov0;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    cam.position.copy(this.pose.pos);
    cam.lookAt(this.pose.look);
    // runner: out at dawn only
    if (this.runner) {
      const h = ((this.hour % 24) + 24) % 24;
      const on = h > 5.0 && h < 7.6;
      this.runner.visible = on;
      if (on) {
        this.mixer.update(dt);
        const t = (this.time * 0.018) % 1;
        const p = this.runnerCurve.getPointAt(t);
        const ahead = this.runnerCurve.getPointAt((t + 0.004) % 1);
        p.y = this.hm.heightAt(p.x, p.z);
        this.runner.position.copy(p);
        this.runner.lookAt(ahead.x, p.y, ahead.z);
      }
    }
    // boats bob
    const m = new THREE.Matrix4(), r = new THREE.Matrix4();
    for (const b of this.props.anims.boats) {
      const ph = b.userData.phase + this.time * 0.9;
      m.makeTranslation(0, Math.sin(ph) * 0.04, 0);
      r.makeRotationZ(Math.sin(ph * 0.8) * 0.04);
      b.matrix.copy(b.userData.base).premultiply(m).multiply(r);
    }
    // lighthouse beam sweeps
    if (this.props.beam) this.props.beam.rotation.y = this.time * 0.6;
    if (this.props.orb) this.props.orb.rotation.y = this.time * 0.3;
    // moon faces the camera, far away in its direction
    if (this.sky && this.moonDir) {
      this.sky.moon.position.copy(this.moonDir).multiplyScalar(150);
      this.sky.moon.lookAt(cam.position);
    }
    const fogFar = cam.position.length() + 30;
    this.post.uniforms.uFogNear.value = fogFar * 0.55;
    this.post.uniforms.uFogFar.value = fogFar * 1.25;
  }

  render(dt) {
    if (!this.ready) return;
    const now = performance.now();
    if (dt === undefined) dt = (now - this.last) / 1000;
    this.last = now;
    this.renderer.info.reset();
    this.frame(Math.min(dt, 0.1));
    this.post.uniforms.uCapture.value = this.capture === 'alpha' ? 1 : 0;
    this.post.glowScene.visible = this.capture !== 'alpha';
    this.post.render(this.scene, this.camera);
  }

  /** Screen position (CSS px) of a world point, or null if behind the camera. */
  project(v) {
    const p = v.clone().project(this.camera);
    if (p.z > 1) return null;
    const [w, h] = this.size;
    return [(p.x * 0.5 + 0.5) * w, (-p.y * 0.5 + 0.5) * h, p.z];
  }

  info() {
    const i = this.renderer.info;
    return { calls: i.render.calls, triangles: i.render.triangles, ...this.stats, tier: this.tier };
  }
}
