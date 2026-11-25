import * as THREE from 'three'

// [dirX, dirZ, steepness, wavelength] — mirrored by the gerstner() GLSL in glsl.js.
export const WAVES = [
  [1.0, 0.35, 0.16, 64],
  [1.0, 0.7, 0.14, 33],
  [0.8, 1.4, 0.12, 19],
  [0.25, 1.0, 0.1, 11],
  [-0.45, 1.0, 0.08, 6.5],
]

export const waveUniform = () => WAVES.map(([x, z, s, l]) => new THREE.Vector4(x, z, s, l))

// Height and surface normal at (x, z) — used to float the ship on the same sea the shader draws.
// Ignores the horizontal Gerstner shift, which is fine for something the size of a ship.
export function sampleSea(x, z, time, swell, outNormal) {
  let y = 0
  let tx = 1, ty = 0, tz = 0
  let bx = 0, by = 0, bz = 1
  for (const [dx0, dz0, s, l] of WAVES) {
    const len = Math.hypot(dx0, dz0)
    const dx = dx0 / len, dz = dz0 / len
    const k = (Math.PI * 2) / l
    const c = Math.sqrt(9.8 / k)
    const q = s * swell
    const f = k * (dx * x + dz * z - c * time)
    const sf = Math.sin(f), cf = Math.cos(f)
    y += (q / k) * sf
    tx += -dx * dx * q * sf; ty += dx * q * cf; tz += -dx * dz * q * sf
    bx += -dx * dz * q * sf; by += dz * q * cf; bz += -dz * dz * q * sf
  }
  if (outNormal) {
    // cross(binormal, tangent)
    outNormal.set(by * tz - bz * ty, bz * tx - bx * tz, bx * ty - by * tx).normalize()
  }
  return y
}
