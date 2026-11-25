import * as THREE from 'three'
import { noise } from './glsl.js'
import { palette } from './sea.js'

// A living nautical chart of the western Pacific. Equirectangular, 10 units per degree,
// longitudes east-positive and continued past 180° so Hawaiʻi sits at ~204°.
export const LON0 = 172
export const LAT0 = 4
export const DEG = 10
export const BOUNDS = { lonMin: 118, lonMax: 224, latMin: -24, latMax: 32 }

export const project = (lon, lat, y = 0) => {
  const l = lon < 0 ? lon + 360 : lon
  return new THREE.Vector3((l - LON0) * DEG, y, -(lat - LAT0) * DEG)
}

const W = (BOUNDS.lonMax - BOUNDS.lonMin) * DEG
const H = (BOUNDS.latMax - BOUNDS.latMin) * DEG
const CX = ((BOUNDS.lonMin + BOUNDS.lonMax) / 2 - LON0) * DEG
const CZ = -((BOUNDS.latMin + BOUNDS.latMax) / 2 - LAT0) * DEG

// Rasterise land (and atoll rings) into two textures: a crisp mask and a soft halo
// that becomes reef shallows and terrain height.
function landTextures(polygons, atolls) {
  const pxPerDeg = 22
  const w = (BOUNDS.lonMax - BOUNDS.lonMin) * pxPerDeg
  const h = (BOUNDS.latMax - BOUNDS.latMin) * pxPerDeg
  const toPx = (lon, lat) => [((lon < 0 ? lon + 360 : lon) - BOUNDS.lonMin) * pxPerDeg, (BOUNDS.latMax - lat) * pxPerDeg]

  const mask = document.createElement('canvas')
  mask.width = w
  mask.height = h
  const m = mask.getContext('2d')
  m.fillStyle = '#000'
  m.fillRect(0, 0, w, h)
  m.fillStyle = '#fff'
  m.strokeStyle = '#fff'
  for (const rings of polygons) {
    m.beginPath()
    for (const ring of rings) {
      ring.forEach(([lon, lat], i) => {
        const [x, y] = toPx(lon, lat)
        i ? m.lineTo(x, y) : m.moveTo(x, y)
      })
      m.closePath()
    }
    m.fill('evenodd')
  }
  // Atolls are too small for the coastline data; draw each as a reef ring.
  m.lineWidth = 1.6
  for (const { lon, lat, r = 0.18 } of atolls) {
    const [x, y] = toPx(lon, lat)
    m.beginPath()
    m.ellipse(x, y, r * pxPerDeg, r * pxPerDeg * 0.7, 0.4, 0, Math.PI * 2)
    m.stroke()
  }

  const halo = document.createElement('canvas')
  halo.width = w
  halo.height = h
  const hx = halo.getContext('2d')
  hx.fillStyle = '#000'
  hx.fillRect(0, 0, w, h)
  hx.filter = 'blur(10px)'
  hx.drawImage(mask, 0, 0)
  hx.filter = 'blur(3px)'
  hx.globalCompositeOperation = 'lighter'
  hx.globalAlpha = 0.6
  hx.drawImage(mask, 0, 0)

  const tex = (c) => {
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.NoColorSpace
    t.anisotropy = 4
    t.needsUpdate = true
    return t
  }
  return { mask: tex(mask), halo: tex(halo) }
}

export function createChart(shared, { polygons, atolls, route }) {
  const group = new THREE.Group()
  const { mask, halo } = landTextures(polygons, atolls)

  const uniforms = {
    uTime: shared.uTime,
    uMask: { value: mask },
    uHalo: { value: halo },
    uSea: { value: new THREE.Color('#152842') },
    uDeep: { value: new THREE.Color('#0a1628') },
    uLagoon: { value: palette.shallow },
    uLand: { value: new THREE.Color('#141d1a') },
    uLandLit: { value: new THREE.Color('#2b3a32') },
    uGrid: { value: new THREE.Color('#50c2db') },
    uEmber: { value: palette.ember },
    uTexel: { value: new THREE.Vector2(1 / mask.image.width, 1 / mask.image.height) },
    uSize: { value: new THREE.Vector2(W, H) },
    uOrigin: { value: new THREE.Vector2(BOUNDS.lonMin, BOUNDS.latMax) },
    uReveal: { value: 0 },
  }

  const geometry = new THREE.PlaneGeometry(W, H, 420, 240)
  geometry.rotateX(-Math.PI / 2)
  const sea = new THREE.Mesh(
    geometry,
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        uniform sampler2D uHalo;
        varying vec2 vUv;
        varying float vLand;
        varying vec3 vWorld;
        void main() {
          vUv = uv;
          float hgt = texture2D(uHalo, uv).r;
          vLand = hgt;
          vec3 p = position;
          p.y += pow(hgt, 1.6) * 9.0;
          vec4 wp = modelMatrix * vec4(p, 1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMask;
        uniform sampler2D uHalo;
        uniform vec3 uSea, uDeep, uLagoon, uLand, uLandLit, uGrid, uEmber;
        uniform vec2 uTexel, uSize, uOrigin;
        uniform float uTime;
        uniform float uReveal;
        varying vec2 vUv;
        varying float vLand;
        varying vec3 vWorld;
        ${noise}
        float gridLine(float coord, float spacing, float width) {
          float f = abs(fract(coord / spacing + 0.5) - 0.5) * spacing;
          float w = fwidth(coord) * width;
          return 1.0 - smoothstep(0.0, w, f);
        }
        void main() {
          float land = texture2D(uMask, vUv).r;
          float halo = texture2D(uHalo, vUv).r;
          // Degrees, for the graticule.
          float lon = uOrigin.x + vUv.x * uSize.x / 10.0;
          float lat = uOrigin.y - uSize.y / 10.0 + vUv.y * uSize.y / 10.0;

          // Bathymetry: slow fbm depth field drawn as contour lines.
          float depth = fbm(vec3(vUv * vec2(6.0, 3.4), 0.0)) * 0.5 + 0.5;
          depth = clamp(depth - halo * 0.6, 0.0, 1.0);
          vec3 col = mix(uSea, uDeep, smoothstep(0.25, 0.85, depth));
          float bands = depth * 12.0;
          float fb = abs(fract(bands) - 0.5) * 2.0;
          float contour = smoothstep(1.0 - fwidth(bands) * 2.2, 1.0, fb);
          col += uGrid * contour * 0.07;

          // Reef shallows around every coast and atoll.
          float shallow = smoothstep(0.02, 0.5, halo) * (1.0 - land);
          col = mix(col, uLagoon * 0.55, shallow * 0.55);
          col += uLagoon * smoothstep(0.35, 0.9, halo) * (1.0 - land) * 0.25;

          // Graticule every 10°, with the equator and the antimeridian a touch brighter.
          float g = max(gridLine(lon, 10.0, 1.0), gridLine(lat, 10.0, 1.0));
          float eq = gridLine(lat, 180.0, 1.6);
          col += uGrid * (g * 0.07 + eq * 0.12) * (1.0 - land);

          // Land: basalt, lit from the north-west by a low sun.
          float hx = texture2D(uHalo, vUv + vec2(uTexel.x * 2.0, 0.0)).r - texture2D(uHalo, vUv - vec2(uTexel.x * 2.0, 0.0)).r;
          float hy = texture2D(uHalo, vUv + vec2(0.0, uTexel.y * 2.0)).r - texture2D(uHalo, vUv - vec2(0.0, uTexel.y * 2.0)).r;
          float lit = clamp(0.55 + (-hx * 0.9 + hy * 0.6) * 6.0, 0.0, 1.0);
          vec3 ground = mix(uLand, uLandLit, lit);
          ground += vec3(0.05, 0.09, 0.05) * smoothstep(0.6, 1.0, halo);
          col = mix(col, ground, land);
          // Surf line.
          float surf = smoothstep(0.15, 0.5, land) * (1.0 - smoothstep(0.5, 0.95, land));
          col += vec3(0.75, 0.9, 0.95) * surf * 0.35;

          // Edge fade into the dark.
          vec2 e = smoothstep(vec2(0.0), vec2(0.08, 0.12), vUv) * smoothstep(vec2(0.0), vec2(0.08, 0.12), 1.0 - vUv);
          col *= e.x * e.y;
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  )
  sea.position.set(CX, 0, CZ)
  group.add(sea)

  // Route: a ribbon that draws itself as the voyage progresses, ember head, faint dashes ahead.
  const pts = route.map(([lon, lat]) => project(lon, lat, 1.2))
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5)
  const segs = 600
  const ribbonPos = []
  const ribbonUv = []
  const idx = []
  const width = 2.8
  const up = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    const p = curve.getPointAt(t)
    const tan = curve.getTangentAt(t)
    const side = new THREE.Vector3().crossVectors(tan, up).normalize().multiplyScalar(width / 2)
    ribbonPos.push(p.x - side.x, p.y, p.z - side.z, p.x + side.x, p.y, p.z + side.z)
    ribbonUv.push(t, 0, t, 1)
    if (i < segs) {
      const a = i * 2
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const rg = new THREE.BufferGeometry()
  rg.setAttribute('position', new THREE.Float32BufferAttribute(ribbonPos, 3))
  rg.setAttribute('uv', new THREE.Float32BufferAttribute(ribbonUv, 2))
  rg.setIndex(idx)
  const routeUniforms = {
    uTime: shared.uTime,
    uProgress: { value: 0 },
    uLength: { value: curve.getLength() },
    uEmber: { value: palette.ember },
  }
  const ribbon = new THREE.Mesh(
    rg,
    new THREE.ShaderMaterial({
      uniforms: routeUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uProgress;
        uniform float uLength;
        uniform float uTime;
        uniform vec3 uEmber;
        varying vec2 vUv;
        void main() {
          float across = 1.0 - abs(vUv.y * 2.0 - 1.0);
          float core = smoothstep(0.35, 1.0, across);
          float soft = smoothstep(0.0, 1.0, across);
          float drawn = step(vUv.x, uProgress);
          float head = exp(-pow((vUv.x - uProgress) * uLength / 6.0, 2.0));
          float dash = step(0.5, fract(vUv.x * uLength / 7.0 - uTime * 0.15));
          float ahead = (1.0 - drawn) * dash * 0.18 * core;
          vec3 col = uEmber * (drawn * (core * 1.2 + soft * 0.35) + ahead) + vec3(1.0, 0.8, 0.55) * head * core * 2.0;
          float a = clamp(drawn * soft + ahead + head, 0.0, 1.0);
          gl_FragColor = vec4(col * a, a);
        }`,
    }),
  )
  ribbon.renderOrder = 2
  group.add(ribbon)

  return { group, curve, routeUniforms, sea }
}

// Pulsing beacons for ports of call.
export function createBeacon(shared, color = palette.ember) {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: shared.uTime, uColor: { value: color }, uActive: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uActive;
      varying vec2 vUv;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float dot_ = smoothstep(0.16, 0.1, d);
        float glow = exp(-d * d * 9.0) * (0.35 + uActive * 0.5);
        float t = fract(uTime * 0.45);
        float ring = smoothstep(0.035, 0.0, abs(d - t)) * (1.0 - t) * (0.35 + uActive * 0.9);
        float a = clamp(dot_ + glow + ring, 0.0, 1.0);
        vec3 col = mix(uColor, vec3(1.0, 0.85, 0.6), dot_) * (dot_ * 1.6 + glow + ring * 1.4);
        gl_FragColor = vec4(col, a);
      }`,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(26, 26).rotateX(-Math.PI / 2), material)
  mesh.renderOrder = 3
  return mesh
}
