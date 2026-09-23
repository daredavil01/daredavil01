// Post-processing: the pass that turns packed ink data into a drawing.
//
//   1. normal/depth prepass  → edges (Sobel on normals + depth)
//   2. ink-data pass         → tone / ink / accent / class (materials.js)
//   3. composite             → paper, hatching, ink, rust, glow, grain
//   4. glow pass (additive)  → beam, stars, moon, lantern halos — depth-tested
//      against the prepass so the island still hides them
import * as THREE from 'three';

const FULLSCREEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const COMPOSITE_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tInk;
  uniform sampler2D tNormal;
  uniform sampler2D tDepth;
  uniform vec2 uRes;       // drawing-buffer pixels
  uniform float uDpr;
  uniform float uNear;
  uniform float uFar;
  uniform vec3 uPaper;
  uniform vec3 uPaper2;
  uniform vec3 uInk;
  uniform vec3 uAccent;
  uniform vec3 uGlow;
  uniform float uNight;
  uniform float uTime;
  uniform float uHatch;    // 0 disables hatching (low tier)
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uCapture;  // 1: output ink as alpha over transparent paper
  uniform float uGrain;    // paper grain strength (lower for compressed captures)

  float linDepth(float z) {
    float ndc = z * 2.0 - 1.0;
    return (2.0 * uNear * uFar) / (uFar + uNear - ndc * (uFar - uNear));
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    float a = hash(i), b = hash(i + vec2(1, 0)), c = hash(i + vec2(0, 1)), d = hash(i + vec2(1, 1));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float hatchLine(vec2 p, float spacing, float width) {
    float d = abs(fract(p.x / spacing) - 0.5) * spacing;
    return 1.0 - smoothstep(width * 0.5, width * 0.5 + 0.9, d);
  }

  void main() {
    vec2 px = vUv * uRes;
    vec4 data = texture2D(tInk, vUv);
    float cls = data.a;

    // ---- edges
    float o = max(1.0, uDpr * 0.85);
    vec2 t = o / uRes;
    vec3 nC = texture2D(tNormal, vUv).xyz;
    float dC = linDepth(texture2D(tDepth, vUv).r);
    float nEdge = 0.0, dEdge = 0.0;
    vec2 offs[4];
    offs[0] = vec2(t.x, 0.0); offs[1] = vec2(-t.x, 0.0); offs[2] = vec2(0.0, t.y); offs[3] = vec2(0.0, -t.y);
    for (int i = 0; i < 4; i++) {
      vec3 n = texture2D(tNormal, vUv + offs[i]).xyz;
      float d = linDepth(texture2D(tDepth, vUv + offs[i]).r);
      nEdge += length(n - nC);
      dEdge += abs(d - dC) / max(dC, 0.001);
    }
    float edge = max(smoothstep(0.45, 0.9, nEdge), smoothstep(0.035, 0.07, dEdge));

    // ---- hatching (screen space, CSS-pixel pitch, a little hand wobble)
    vec2 cp = px / uDpr;
    float wob = (vnoise(cp * 0.02) - 0.5) * 3.0;
    // at night only the deepest shade is hatched; edges carry the drawing
    float tone = data.r - uNight * 0.18;
    float nightHatch = mix(1.0, 0.55, uNight);
    float h1 = hatchLine(vec2(cp.x + cp.y + wob, 0.0), 5.2, 0.9) * smoothstep(0.30, 0.40, tone);
    float h2 = hatchLine(vec2(cp.x - cp.y + wob, 0.0), 5.2, 0.9) * smoothstep(0.52, 0.62, tone);
    float h3 = hatchLine(vec2(cp.y + wob * 0.5, 0.0), 3.4, 0.8) * smoothstep(0.74, 0.84, tone);
    float hatch = max(h1, max(h2, h3)) * uHatch * nightHatch;

    // ---- fade with distance (atmospheric perspective)
    float fade = 1.0 - smoothstep(uFogNear, uFogFar, dC) * 0.75;

    float isSky = 1.0 - step(0.05, cls);
    float inkAmt = clamp(max(max(edge, data.g), hatch * 0.85), 0.0, 1.0) * fade * (1.0 - isSky);

    // ---- paper: sky and water lean to paper2, a faint grain everywhere
    vec3 paper = uPaper;
    paper = mix(paper, uPaper2, isSky * (0.35 + 0.65 * smoothstep(0.2, 1.0, vUv.y)));
    paper = mix(paper, uPaper2, step(0.2, cls) * step(cls, 0.3) * 0.55);
    float grain = ((vnoise(cp * 0.9) - 0.5) * 0.035 + (vnoise(cp * 0.05) - 0.5) * 0.05) * uGrain;
    vec3 col = paper + grain;

    vec3 ink = uInk;
    col = mix(col, ink, inkAmt);

    // ---- accent (rust) and glow
    float B = data.b;
    float acc = B < 0.5 ? B * 2.0 : 0.0;
    float glow = B >= 0.5 ? (B - 0.5) * 2.0 : 0.0;
    col = mix(col, uAccent, acc * (1.0 - isSky) * 0.55 * fade);
    col = mix(col, uAccent, acc * inkAmt * 0.6);
    col = mix(col, uGlow, glow * 0.95);

    // ---- vignette
    vec2 v = vUv - 0.5;
    col *= 1.0 - dot(v, v) * 0.22;

    if (uCapture > 0.5) {
      float a = clamp(inkAmt + acc * 0.4 * (1.0 - isSky) + glow, 0.0, 1.0);
      gl_FragColor = vec4(vec3(0.0), a);
      return;
    }
    gl_FragColor = vec4(col, 1.0);
  }`;

export class InkPost {
  constructor(renderer) {
    this.renderer = renderer;
    const mk = (opts) => new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType, ...opts });
    this.depthTex = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
    this.normalRT = mk({ depthTexture: this.depthTex, depthBuffer: true, samples: 0 });
    this.inkRT = mk({ depthBuffer: true, samples: 0 });
    this.normalMat = new THREE.MeshNormalMaterial();
    this.uniforms = {
      tInk: { value: this.inkRT.texture },
      tNormal: { value: this.normalRT.texture },
      tDepth: { value: this.depthTex },
      uRes: { value: new THREE.Vector2(1, 1) },
      uDpr: { value: 1 },
      uNear: { value: 0.5 },
      uFar: { value: 400 },
      uPaper: { value: new THREE.Vector3() },
      uPaper2: { value: new THREE.Vector3() },
      uInk: { value: new THREE.Vector3() },
      uAccent: { value: new THREE.Vector3() },
      uGlow: { value: new THREE.Vector3() },
      uNight: { value: 0 },
      uTime: { value: 0 },
      uHatch: { value: 1 },
      uFogNear: { value: 40 },
      uFogFar: { value: 120 },
      uCapture: { value: 0 },
      uGrain: { value: 1 },
    };
    this.quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({ vertexShader: FULLSCREEN_VERT, fragmentShader: COMPOSITE_FRAG, uniforms: this.uniforms, depthTest: false, depthWrite: false, transparent: true })
    );
    this.quad.frustumCulled = false;
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.glowScene = new THREE.Scene();
  }

  setSize(w, h, dpr) {
    const W = Math.max(1, Math.floor(w * dpr)), H = Math.max(1, Math.floor(h * dpr));
    this.normalRT.setSize(W, H);
    this.inkRT.setSize(W, H);
    this.uniforms.uRes.value.set(W, H);
    this.uniforms.uDpr.value = dpr;
  }

  setPalette(p, night) {
    const u = this.uniforms;
    u.uPaper.value.fromArray(p.paper);
    u.uPaper2.value.fromArray(p.paper2);
    u.uInk.value.fromArray(p.ink);
    u.uAccent.value.fromArray(p.accent);
    u.uGlow.value.fromArray(p.glow);
    u.uNight.value = night;
  }

  render(scene, camera) {
    const r = this.renderer;
    const u = this.uniforms;
    u.uNear.value = camera.near;
    u.uFar.value = camera.far;
    const bg = scene.background;
    scene.background = null;
    // 1. normals + depth (layer 0 only: no line work, no glow)
    camera.layers.set(0);
    scene.overrideMaterial = this.normalMat;
    r.setRenderTarget(this.normalRT);
    r.setClearColor(0x8080ff, 1);
    r.clear();
    r.render(scene, camera);
    scene.overrideMaterial = null;
    // 2. ink data (layers 0 + 1)
    camera.layers.enable(1);
    r.setRenderTarget(this.inkRT);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(scene, camera);
    // 3. composite to screen
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCam);
    // 4. glow on top
    camera.layers.set(2);
    r.autoClear = false;
    r.render(this.glowScene, camera);
    r.autoClear = true;
    camera.layers.set(0);
    scene.background = bg;
  }
}

/** Material for additive glow objects that hides behind the island. */
export function glowMaterial(post, fragBody, extraUniforms = {}, vertex) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: { tDepth: { value: post.depthTex }, uRes: post.uniforms.uRes, uGlowCol: post.uniforms.uGlow, uNight: post.uniforms.uNight, uTime: post.uniforms.uTime, ...extraUniforms },
    vertexShader:
      vertex ||
      /* glsl */ `
      varying vec3 vPos;
      varying vec2 vUv;
      void main() { vPos = position; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDepth;
      uniform vec2 uRes;
      uniform vec3 uGlowCol;
      uniform float uNight;
      uniform float uTime;
      varying vec3 vPos;
      varying vec2 vUv;
      ${Object.keys(extraUniforms).map((k) => `uniform ${extraUniforms[k].type || 'float'} ${k};`).join('\n')}
      void main() {
        float scene = texture2D(tDepth, gl_FragCoord.xy / uRes).r;
        if (scene < gl_FragCoord.z - 0.00002) discard;
        ${fragBody}
      }`,
  });
}
