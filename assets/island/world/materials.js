// Ink materials. Nothing here outputs colour: every surface writes a packed
// "ink data" texel that the composite pass turns into paper, ink and rust.
//
//   R  tone    0 = sunlit paper … 1 = deep shadow (drives hatching)
//   G  ink     extra line work (strata, isobaths, ripples, painted lines)
//   B  accent  0–0.5 rust accent amount × 0.5; 0.5–1 glow (lit windows, lamps)
//   A  class   0 sky · 0.25 water · 0.5 land · 0.75 props · 1 lines
import * as THREE from 'three';

export const shared = {
  uNight: { value: 0 },
  uTime: { value: 0 },
  uToneGain: { value: 1.0 },
  uHeight: { value: null },
  uWorld: { value: new THREE.Vector4(44, 32, 0, 0) },
};

const VERT_WPOS = /* glsl */ `
  vec4 inkWp = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    inkWp = instanceMatrix * inkWp;
  #endif
  inkWp = modelMatrix * inkWp;
  vInkWPos = inkWp.xyz;
  vInkWNormal = normalize(mat3(modelMatrix) * objectNormal);
`;

const FRAG_HEAD = /* glsl */ `
  varying vec3 vInkWPos;
  varying vec3 vInkWNormal;
  uniform float uNight;
  uniform float uTime;
  uniform float uToneGain;
  uniform float uClass;
  uniform float uAlbedo;
  uniform float uStrata;
  float inkHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  float inkLum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
`;

/**
 * Lambert-lit ink material. `kind`:
 *   'kit'     Kenney props with baked COLOR_0 (accent/glass/lamp read from it)
 *   'land'    terraces (constant albedo, class land)
 *   'slab'    the diorama base (strata lines on its cut sides)
 *   'plain'   procedural props (albedo from `albedo`, optional accent)
 */
export function inkMaterial(kind, opts = {}) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: kind === 'kit', side: opts.side ?? THREE.FrontSide });
  const uClass = { value: opts.cls ?? (kind === 'land' || kind === 'slab' ? 0.5 : 0.75) };
  const uAlbedo = { value: opts.albedo ?? (kind === 'land' ? 0.97 : 0.86) };
  const uStrata = { value: kind === 'slab' ? 1 : 0 };
  const accent = (opts.accent ?? 0).toFixed(3);
  const glow = (opts.glow ?? 0).toFixed(3);
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, shared, { uClass, uAlbedo, uStrata });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vInkWPos;\nvarying vec3 vInkWNormal;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n' + VERT_WPOS);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FRAG_HEAD)
      .replace(
        '#include <color_fragment>',
        kind === 'kit'
          ? /* glsl */ `
            #if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
              float kitLum = sqrt(inkLum(vColor.rgb));
              diffuseColor.rgb = vec3(mix(0.42, 1.0, kitLum));
            #endif`
          : /* glsl */ `diffuseColor.rgb = vec3(uAlbedo);`
      )
      .replace(
        '#include <dithering_fragment>',
        /* glsl */ `
        float lum = inkLum(outgoingLight);
        float tone = clamp(1.0 - lum * uToneGain, 0.0, 1.0);
        float ink = 0.0;
        float acc = ${accent};
        float glow = ${glow} * uNight;
        ${
          kind === 'kit'
            ? /* glsl */ `
          #if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
            vec3 vc = vColor.rgb;
            float sat = max(vc.r, max(vc.g, vc.b)) - min(vc.r, min(vc.g, vc.b));
            // Kenney glass swatches (#d0e8ff, #6794d9) are blue with g well above r;
            // their blue-grey stone (#a0a8c9) is not.
            float glass = step(0.08, vc.g - vc.r) * step(0.05, vc.b - vc.g);
            float lamp = step(0.35, vc.r) * step(0.28, vc.g) * step(vc.b, vc.g * 0.55) * step(0.25, sat);
            float lit = step(0.42, inkHash(floor(vInkWPos * 1.7 + 0.5)));
            glow = max(glow, max(glass * lit, lamp) * smoothstep(0.35, 0.8, uNight));
          #endif`
            : ''
        }
        if (uStrata > 0.5 && abs(vInkWNormal.y) < 0.5) {
          float s = vInkWPos.y / 0.4;
          float dd = abs(fract(s - 0.5) - 0.5);
          float fw = fwidth(s);
          ink = max(ink, (1.0 - smoothstep(fw * 0.6, fw * 1.6, dd)) * 0.8);
          tone = max(tone, 0.28);
        }
        float B = glow > 0.02 ? 0.5 + 0.5 * clamp(glow, 0.0, 1.0) : clamp(acc, 0.0, 1.0) * 0.5;
        gl_FragColor = vec4(tone, ink, B, uClass);
        `
      );
  };
  m.customProgramCacheKey = () => `ink-${kind}-${accent}-${glow}`;
  return m;
}

/** Water: unlit; draws isobaths from the height texture and drifting ripples. */
export function waterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: shared,
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uHeight;
      uniform vec4 uWorld;
      uniform float uTime;
      uniform float uNight;
      varying vec3 vW;
      float line(float v, float width) {
        float d = abs(fract(v - 0.5) - 0.5);
        float fw = fwidth(v);
        return 1.0 - smoothstep(fw * width, fw * (width + 1.0), d);
      }
      void main() {
        vec2 uv = vec2(vW.x / uWorld.x + 0.5, vW.z / uWorld.y + 0.5);
        float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
        float h = mix(-3.0, texture2D(uHeight, uv).r * 6.0 - 3.0, inside);
        // isobaths every 0.48 below sea level, fading with depth
        float iso = line(h / 0.48, 0.6) * smoothstep(-3.0, -0.2, h) * step(h, -0.1) * 0.55;
        // foam line hugging the shore
        float foam = line((h + 0.08) / 0.34 + sin(uTime * 0.7) * 0.08, 0.8) * smoothstep(-0.7, -0.05, h) * step(h, 0.0);
        // drifting dash ripples
        vec2 q = vW.xz * vec2(1.1, 1.9) + vec2(uTime * 0.1, 0.0);
        float row = fract(q.y);
        float dash = step(0.86, fract(q.x * 0.22 + floor(q.y) * 0.37 + sin(floor(q.y) * 7.1) * 3.0));
        float rip = (1.0 - smoothstep(0.0, 0.05, abs(row - 0.5))) * dash * 0.3 * smoothstep(-2.4, -0.6, -abs(h + 1.2));
        float ink = max(iso, max(foam * 0.7, rip));
        gl_FragColor = vec4(0.12, ink, 0.0, 0.25);
      }`,
  });
}

/** Solid-colour line work (Line2): write packed values directly. */
export function packedLineColor(ink, accent, cls = 1) {
  return { color: new THREE.Color().setRGB(0, ink, accent * 0.5, THREE.LinearSRGBColorSpace), opacity: cls };
}
