// Shared GLSL chunks for the voyage scenes.

// Simplex noise — Ashima Arts / Stefan Gustavson (MIT).
export const noise = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
    i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
    i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float fbm(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * snoise(p); p *= 2.03; a *= 0.5; }
  return s;
}
`

// Dusk sky over Kona: basalt-navy zenith, violet band, ember horizon, glow where the sun just set.
export const sky = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
vec3 skyColor(vec3 dir) {
  vec3 d = normalize(dir);
  float y = d.y;
  // Warm only where the sun went down; the rest of the horizon is dusky violet.
  float toward = dot(normalize(d.xz + 1e-5), normalize(uSunDir.xz)) * 0.5 + 0.5;
  toward = pow(toward, 2.4);
  vec3 dusk = uMid * 1.7 + vec3(0.05, 0.02, 0.06);
  vec3 horizon = mix(dusk, uHorizon, toward);
  vec3 col = mix(horizon, uMid, smoothstep(-0.01, 0.07 + 0.12 * toward, y));
  col = mix(col, uZenith, smoothstep(0.08, 0.6, y));
  float s = max(dot(d, uSunDir), 0.0);
  float band = 1.0 - smoothstep(0.0, 0.25, abs(y - 0.01));
  col += uSunColor * (pow(s, 5.0) * 0.3 * band + pow(s, 36.0) * 0.7 + pow(s, 260.0) * 1.6);
  // Below the horizon the sky fades to the sea's own darkness.
  col = mix(col, horizon * 0.3, smoothstep(0.0, -0.25, y));
  return col;
}
`

// Gerstner waves. Keep in sync with WAVES in waves.js.
export const waves = /* glsl */ `
uniform vec4 uWaves[5]; // xy = direction, z = steepness, w = wavelength
uniform float uTime;
uniform float uSwell;
vec3 gerstner(vec3 p, out vec3 normal) {
  vec3 pos = p;
  vec3 tangent = vec3(1.0, 0.0, 0.0);
  vec3 binormal = vec3(0.0, 0.0, 1.0);
  for (int i = 0; i < 5; i++) {
    vec4 w = uWaves[i];
    float k = 6.28318 / w.w;
    float c = sqrt(9.8 / k);
    vec2 d = normalize(w.xy);
    float q = w.z * uSwell;
    float f = k * (dot(d, p.xz) - c * uTime);
    float a = q / k;
    float sf = sin(f), cf = cos(f);
    pos.x += d.x * a * cf;
    pos.y += a * sf;
    pos.z += d.y * a * cf;
    tangent += vec3(-d.x * d.x * q * sf, d.x * q * cf, -d.x * d.y * q * sf);
    binormal += vec3(-d.x * d.y * q * sf, d.y * q * cf, -d.y * d.y * q * sf);
  }
  normal = normalize(cross(binormal, tangent));
  return pos;
}
`
