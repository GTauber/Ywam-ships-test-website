import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'

/**
 * A small pod of spinner dolphins porpoising alongside us. Each one surfaces, arcs through the
 * air and re-enters, and `onSplash` lets the sea answer with a ring of light.
 * Model: "Dolphin" by Quaternius (CC0), via poly.pizza.
 */
export async function createPod(url, { count = 4, onSplash } = {}) {
  const gltf = await new GLTFLoader().loadAsync(url)
  const source = gltf.scene
  const clip = gltf.animations.find((a) => /swim/i.test(a.name)) ?? gltf.animations[0]

  // Normalise: 2.4 m long, nose along −x (the direction we sail).
  const box = new THREE.Box3().setFromObject(source)
  const size = box.getSize(new THREE.Vector3())
  const alongZ = size.z >= size.x
  const scale = 2.4 / Math.max(size.x, size.z)

  const group = new THREE.Group()
  const members = []
  for (let i = 0; i < count; i++) {
    const body = clone(source)
    body.scale.setScalar(scale)
    body.rotation.y = alongZ ? -Math.PI / 2 : Math.PI
    body.traverse((o) => {
      if (o.isMesh) {
        o.frustumCulled = false
        o.material = o.material.clone()
        o.material.roughness = 0.35
        o.material.color.multiplyScalar(0.8)
      }
    })
    const pitch = new THREE.Group()
    pitch.add(body)
    const holder = new THREE.Group()
    holder.add(pitch)
    group.add(holder)
    const mixer = new THREE.AnimationMixer(body)
    if (clip) {
      const action = mixer.clipAction(clip)
      action.timeScale = 1.6
      action.play()
      action.time = Math.random() * clip.duration
    }
    members.push({
      holder,
      pitch,
      mixer,
      period: 3.6 + Math.random() * 1.6,
      phase: Math.random() * 10,
      base: new THREE.Vector3(16 + i * 8 + Math.random() * 3, 0, -58 - i * 6 - Math.random() * 5),
      wasUp: false,
    })
  }

  const leap = 1.15 // seconds airborne
  const height = 2.1

  function update(dt, time) {
    for (const m of members) {
      m.mixer.update(dt)
      const t = (time + m.phase) % m.period
      // Underwater most of the cycle, then a ballistic arc.
      const air = t < leap ? t / leap : -1
      const drift = Math.sin((time + m.phase) * 0.35) * 3
      const x = m.base.x + drift - (air >= 0 ? air * 5.5 : 0)
      let y = -1.6
      let pitch = 0
      if (air >= 0) {
        y = -0.6 + 4 * height * air * (1 - air)
        pitch = Math.atan((4 * height * (1 - 2 * air)) / 5.5)
      }
      m.holder.position.set(x, y, m.base.z)
      m.holder.visible = y > -1.4
      // Nose follows the arc: up on the way out, down on the way back in.
      m.pitch.rotation.z = -pitch
      const up = y > 0
      if (up !== m.wasUp) onSplash?.(new THREE.Vector3(x, 0, m.base.z), up ? 0.6 : 0.9)
      m.wasUp = up
    }
  }

  return { group, update }
}
