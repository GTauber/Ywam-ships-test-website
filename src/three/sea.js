import * as THREE from 'three'
import { noise, sky, waves } from './glsl.js'
import { waveUniform } from './waves.js'

// Brand colors, tuned for a dusk sea. THREE.Color converts these sRGB hexes to linear.
export const palette = {
  zenith: new THREE.Color('#050d19'),
  mid: new THREE.Color('#1d2a55'),
  horizon: new THREE.Color('#d0603f'),
  sun: new THREE.Color('#ff7a3d'),
  deep: new THREE.Color('#071426'),
  shallow: new THREE.Color('#50c2db'),
  glow: new THREE.Color('#50c2db'),
  ember: new THREE.Color('#df6441'),
  flare: new THREE.Color('#b8162d'),
}

// The sun has just set to the west (−x), slightly south, over the route to Micronesia.
export const sunDir = new THREE.Vector3(-0.21, 0.022, -0.98).normalize()

export function skyUniforms() {
  return {
    uZenith: { value: palette.zenith },
    uMid: { value: palette.mid },
    uHorizon: { value: palette.horizon },
    uSunColor: { value: palette.sun },
    uSunDir: { value: sunDir },
  }
}

export function createSky(shared) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { ...shared, uStars: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vDir = wp.xyz - cameraPosition;
        gl_Position = projectionMatrix * viewMatrix * wp;
        gl_Position.z = gl_Position.w; // pin to the far plane
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uStars;
      varying vec3 vDir;
      ${sky}
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec3 d = normalize(vDir);
        vec3 col = skyColor(d);
        vec2 sph = vec2(atan(d.z, d.x), asin(clamp(d.y, -1.0, 1.0))) * 57.2958;
        vec2 g = sph * 1.6;
        vec2 id = floor(g);
        vec2 f = fract(g) - 0.5;
        float h = hash(id);
        vec2 jitter = vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5;
        float star = step(0.975, h) * smoothstep(0.09, 0.0, length(f - jitter * 0.6));
        star *= 0.55 + 0.45 * sin(uTime * (1.0 + h * 3.0) + h * 80.0);
        star *= smoothstep(0.1, 0.45, d.y) * uStars;
        col += vec3(0.85, 0.9, 1.0) * star * (0.6 + 2.0 * step(0.996, h));
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), material)
  mesh.frustumCulled = false
  mesh.renderOrder = -10
  return mesh
}

// Hawaiʻi Island to the east, behind the ship: broad shield volcanoes and the lights of Kona town.
export function createIsland(shared) {
  const group = new THREE.Group()
  const peaks = [
    // [x, height, width] — Hualālai, Mauna Loa's long flank, Mauna Kea behind
    [520, 38, 220],
    [820, 74, 420],
    [1180, 66, 300],
  ]
  const profile = (x) => {
    let h = 0
    for (const [px, ph, pw] of peaks) h = Math.max(h, ph * Math.exp(-(((x - px) / pw) ** 2)))
    return h + 3 * Math.sin(x * 0.03) * Math.exp(-(((x - 800) / 700) ** 2))
  }
  const steps = 220
  const positions = []
  const heights = []
  const x0 = 180, x1 = 1700, z = -1650
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps
    const h = Math.max(profile(x), 0)
    positions.push(x, -4, z, x, h, z)
    heights.push(0, h)
  }
  const index = []
  for (let i = 0; i < steps; i++) {
    const a = i * 2
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('aHeight', new THREE.Float32BufferAttribute(heights, 1))
  geometry.setIndex(index)
  const material = new THREE.ShaderMaterial({
    uniforms: shared,
    side: THREE.DoubleSide,
    depthWrite: true,
    vertexShader: /* glsl */ `
      attribute float aHeight;
      varying float vH;
      varying vec3 vDir;
      void main() {
        vH = aHeight;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vDir = wp.xyz - cameraPosition;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      varying float vH;
      varying vec3 vDir;
      ${sky}
      void main() {
        vec3 d = normalize(vDir);
        vec3 haze = skyColor(vec3(d.x, 0.01, d.z));
        // Distant basalt, lit faintly by the afterglow, dissolving into haze at its foot.
        vec3 rock = mix(haze * 0.28, haze * 0.5, smoothstep(0.0, 70.0, vH));
        float foot = smoothstep(14.0, 0.0, vH);
        gl_FragColor = vec4(mix(rock, haze * 0.8, foot * 0.55), 1.0);
      }`,
  })
  group.add(new THREE.Mesh(geometry, material))

  // Town lights strung along the Kona coast.
  const count = 140
  const lp = new Float32Array(count * 3)
  const ls = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const x = 260 + Math.random() * 720
    const lift = Math.random() < 0.8 ? Math.random() * 4 : 4 + Math.random() * Math.max(profile(x) * 0.25, 1)
    lp.set([x, lift, z + 10], i * 3)
    ls[i] = Math.random()
  }
  const lg = new THREE.BufferGeometry()
  lg.setAttribute('position', new THREE.BufferAttribute(lp, 3))
  lg.setAttribute('aSeed', new THREE.BufferAttribute(ls, 1))
  const lights = new THREE.Points(
    lg,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: shared.uTime, uPixelRatio: shared.uPixelRatio },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vTw;
        void main() {
          vTw = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed * 2.0) + aSeed * 40.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (1.4 + aSeed * 1.6) * uPixelRatio;
        }`,
      fragmentShader: /* glsl */ `
        varying float vTw;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vTw;
          gl_FragColor = vec4(vec3(1.0, 0.72, 0.42) * a * 1.6, a);
        }`,
    }),
  )
  group.add(lights)
  return group
}

// Ocean: Gerstner swell, sky reflection, sunset glitter, the ship's wake, and bioluminescent
// rings wherever the visitor stirs the water.
export function createOcean(shared, { segments = 320, radius = 2600 } = {}) {
  const n = segments
  const positions = new Float32Array((n + 1) * (n + 1) * 3)
  const index = []
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const u = (i / n) * 2 - 1
      const v = (j / n) * 2 - 1
      // Concentrate vertices near the viewer.
      const x = Math.sign(u) * Math.abs(u) ** 2.6 * radius
      const z = Math.sign(v) * Math.abs(v) ** 2.6 * radius
      positions.set([x, 0, z], (j * (n + 1) + i) * 3)
    }
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i
      const b = a + 1
      const c = a + n + 1
      const d = c + 1
      index.push(a, c, b, b, c, d)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setIndex(index)

  const uniforms = {
    ...shared,
    uWaves: { value: waveUniform() },
    uSeaOffset: { value: new THREE.Vector2() },
    uDeep: { value: palette.deep },
    uShallow: { value: palette.shallow },
    uGlow: { value: palette.glow },
    uRipples: { value: Array.from({ length: 16 }, () => new THREE.Vector4(0, 0, -999, 0)) },
    uShipPos: { value: new THREE.Vector3(0, 0, -110) },
    uShipDir: { value: new THREE.Vector2(-1, 0) },
    uShipLen: { value: 56 },
    uShipBeam: { value: 11 },
    uWake: { value: 1 },
    uReflect: { value: 1 },
    uFogNear: { value: 380 },
    uFogFar: { value: 2300 },
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      uniform vec2 uSeaOffset;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying float vHeight;
      varying vec2 vSea;
      ${waves}
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vec3 p = vec3(wp.x + uSeaOffset.x, 0.0, wp.z + uSeaOffset.y);
        vec3 n;
        vec3 g = gerstner(p, n);
        float dist = length(wp.xz - cameraPosition.xz);
        float fade = 1.0 - smoothstep(220.0, 1100.0, dist);
        vec3 disp = (g - p) * fade;
        wp.xyz += disp;
        vNormal = normalize(mix(vec3(0.0, 1.0, 0.0), n, fade));
        vHeight = disp.y;
        vWorld = wp.xyz;
        vSea = p.xz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uGlow;
      uniform vec4 uRipples[16];
      uniform vec3 uShipPos;
      uniform vec2 uShipDir;
      uniform float uShipLen;
      uniform float uShipBeam;
      uniform float uWake;
      uniform float uReflect;
      uniform float uFogNear;
      uniform float uFogFar;
      uniform float uTime;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying float vHeight;
      varying vec2 vSea;
      ${sky}
      ${noise}

      // Cheap capillary ripples: a handful of rotated sine trains.
      vec2 chop(vec2 p, float t) {
        vec2 g = vec2(0.0);
        float a = 0.0;
        float amp = 0.06, freq = 0.9;
        for (int i = 0; i < 6; i++) {
          vec2 d = vec2(cos(a), sin(a));
          float ph = dot(d, p) * freq + t * (1.2 + float(i) * 0.37);
          g += d * cos(ph) * amp * freq;
          a += 2.39996;
          freq *= 1.55;
          amp *= 0.62;
        }
        return g;
      }

      void main() {
        vec3 toCam = cameraPosition - vWorld;
        float dist = length(toCam);
        vec3 V = toCam / dist;

        // Wake: a Kelvin V (≈19.5°) plus the churned centreline behind the stern.
        vec2 rel = vWorld.xz - uShipPos.xz;
        vec2 fwd = normalize(uShipDir);
        vec2 side = vec2(-fwd.y, fwd.x);
        float behind = -dot(rel, fwd) + uShipLen * 0.45;
        float lateral = dot(rel, side);
        float wake = 0.0;
        if (behind > 0.0) {
          float spread = behind * 0.354 + uShipBeam * 0.4;
          float arms = exp(-pow((abs(lateral) - spread) / (0.8 + behind * 0.035), 2.0));
          float trail = exp(-pow(lateral / (uShipBeam * 0.45 + behind * 0.06), 2.0));
          float breakup = smoothstep(-0.2, 0.7, snoise(vec3(vSea * 0.22, uTime * 0.4)));
          wake = (arms * 0.55 + trail * (0.4 + 0.6 * breakup)) * exp(-behind / 260.0);
        }
        // Bow wave, hugging the hull.
        float alongHull = dot(rel, fwd);
        float hull = exp(-pow(lateral / (uShipBeam * 0.62), 6.0)) * step(abs(alongHull), uShipLen * 0.5);
        float bow = exp(-pow((abs(lateral) - uShipBeam * 0.55) / 1.2, 2.0)) * smoothstep(-uShipLen * 0.5, uShipLen * 0.45, alongHull) * step(abs(alongHull), uShipLen * 0.52);
        wake = (wake + bow * 0.8) * uWake;

        // Visitor's ripples.
        vec2 rg = vec2(0.0);
        float bio = 0.0;
        for (int i = 0; i < 16; i++) {
          vec4 r = uRipples[i];
          float age = uTime - r.z;
          if (age < 0.0 || age > 7.0) continue;
          vec2 dv = vSea - r.xy;
          float d = length(dv);
          float radius = age * 2.6;
          float ring = exp(-pow((d - radius) * 1.1, 2.0));
          float decay = exp(-age * 0.75) * r.w;
          rg += (dv / max(d, 0.001)) * sin((d - radius) * 4.0) * ring * decay * 0.5;
          bio += (exp(-d * d * 0.35) * exp(-age * 1.4) * 1.4 + ring * decay * 0.55);
        }

        float detailFade = 1.0 - smoothstep(25.0, 420.0, dist);
        vec2 c = chop(vSea, uTime) * detailFade;
        vec3 N = normalize(vNormal + vec3(c.x + rg.x, 0.0, c.y + rg.y));

        float NdV = max(dot(N, V), 0.0);
        float fres = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);
        vec3 R = reflect(-V, N);
        R.y = abs(R.y);
        vec3 refl = skyColor(R);

        vec3 body = uDeep + uShallow * clamp(vHeight * 0.12 + 0.04, 0.0, 0.3) * 0.25;
        vec3 col = mix(body, refl * 0.82, fres * uReflect);

        float sd = max(dot(R, uSunDir), 0.0);
        col += uSunColor * (pow(sd, 900.0) * 18.0 + pow(sd, 90.0) * 0.6) * uReflect;

        vec3 foamCol = mix(vec3(0.62, 0.68, 0.74), uGlow, 0.35);
        col = mix(col, foamCol * (0.55 + 0.45 * fres), clamp(wake * 0.85, 0.0, 0.9));
        col += uGlow * wake * 0.12;
        col += uGlow * bio * 0.9;

        float fogF = smoothstep(uFogNear, uFogFar, dist);
        vec3 hz = skyColor(normalize(vec3(-V.x, 0.0, -V.z)));
        col = mix(col, hz, fogF);
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  return mesh
}

// Embers rising through the frame — fire carried over water. Lives in camera space.
export function createEmbers(shared, count = 900) {
  const seeds = new Float32Array(count * 4)
  for (let i = 0; i < count * 4; i++) seeds[i] = Math.random()
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: shared.uTime,
      uPixelRatio: shared.uPixelRatio,
      uRes: shared.uRes,
      uMouse: shared.uMouse,
      uIntensity: { value: 1 },
      uRise: { value: 1 },
      uEmber: { value: palette.ember },
      uFlare: { value: palette.flare },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      uniform float uTime;
      uniform float uPixelRatio;
      uniform vec2 uRes;
      uniform vec2 uMouse;
      uniform float uRise;
      varying float vLife;
      varying float vFlicker;
      ${noise}
      void main() {
        float speed = 0.035 + aSeed.y * 0.06;
        float life = fract(uTime * speed * uRise + aSeed.x);
        vec3 p;
        float depth = 5.0 + aSeed.w * aSeed.w * 60.0;
        p.z = -depth;
        p.x = (aSeed.z - 0.5) * depth * 1.6;
        p.y = (-0.62 + life * 1.5) * depth * 0.75;
        float t = uTime * 0.2 + aSeed.y * 10.0;
        p.x += snoise(vec3(p.xy * 0.05, t)) * depth * 0.06 + sin(uTime * 0.8 + aSeed.x * 40.0) * 0.25;
        p.y += snoise(vec3(p.yx * 0.05, t + 5.0)) * depth * 0.03;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vec4 clip = projectionMatrix * mv;
        vec2 ndc = clip.xy / clip.w;
        vec2 dm = (ndc - uMouse) * vec2(uRes.x / uRes.y, 1.0);
        float md = length(dm);
        ndc += (dm / max(md, 0.0001)) * vec2(uRes.y / uRes.x, 1.0) * 0.14 * exp(-md * md * 14.0) * (1.0 - aSeed.w * 0.5);
        clip.xy = ndc * clip.w;
        gl_Position = clip;
        float size = (0.06 + aSeed.y * aSeed.y * 0.16) * (1.0 - life * 0.5);
        gl_PointSize = max(size * uRes.y * 0.5 * projectionMatrix[1][1] / -mv.z, 1.0);
        vLife = life;
        vFlicker = 0.65 + 0.35 * sin(uTime * (7.0 + aSeed.z * 9.0) + aSeed.w * 30.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uIntensity;
      uniform vec3 uEmber;
      uniform vec3 uFlare;
      varying float vLife;
      varying float vFlicker;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float halo = smoothstep(0.5, 0.0, d);
        halo *= halo * halo;
        float core = smoothstep(0.16, 0.0, d);
        vec3 hot = vec3(1.0, 0.7, 0.38);
        vec3 col = mix(hot, uEmber, smoothstep(0.0, 0.3, vLife));
        col = mix(col, uFlare, smoothstep(0.5, 0.95, vLife));
        float life = smoothstep(0.0, 0.06, vLife) * (1.0 - smoothstep(0.62, 1.0, vLife)) * vFlicker * uIntensity;
        vec3 c = col * halo * 1.1 + mix(col, hot, 0.6) * core * 1.6;
        gl_FragColor = vec4(c * life, (halo * 0.5 + core) * life);
      }`,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  return points
}
