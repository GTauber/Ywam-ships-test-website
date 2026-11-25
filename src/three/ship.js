import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

let _glow
function glowTexture() {
  if (_glow) return _glow
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.18, 'rgba(255,255,255,0.75)')
  grad.addColorStop(0.5, 'rgba(255,255,255,0.12)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  _glow = new THREE.CanvasTexture(c)
  _glow.colorSpace = THREE.SRGBColorSpace
  return _glow
}

function lamp(color, size, x, y, z) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  )
  s.scale.setScalar(size)
  s.position.set(x, y, z)
  return s
}

// Lit windows as a canvas texture: rows of warm panes with a few dark ones.
function windowTexture(cols, rows, { seed = 1, lit = 0.72, pane = [8, 6] } = {}) {
  const c = document.createElement('canvas')
  c.width = cols * 16
  c.height = rows * 16
  const g = c.getContext('2d')
  g.fillStyle = '#000'
  g.fillRect(0, 0, c.width, c.height)
  let s = seed
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (rand() > lit) continue
      const warm = 190 + Math.floor(rand() * 60)
      g.fillStyle = `rgb(255,${warm},${Math.floor(warm * 0.52)})`
      g.fillRect(x * 16 + (16 - pane[0]) / 2, y * 16 + (16 - pane[1]) / 2, pane[0], pane[1])
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function nameTexture(text) {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 128
  const g = c.getContext('2d')
  g.fillStyle = '#e8eef0'
  g.fillRect(0, 0, c.width, c.height)
  g.fillStyle = '#213854'
  g.font = '800 78px Archivo Variable, Archivo, sans-serif'
  g.textBaseline = 'middle'
  g.fillText(text, 24, 68)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/**
 * The m/v YWAM Liberty, modelled from her photographs: 65 m, white hull over a navy
 * boot-top, superstructure forward with the bridge and a blue lookout, the red crane
 * pedestal amidships, an orange lifeboat, and the long railed working deck aft.
 * Bow points along −x, so the port side faces +z (towards the hero camera).
 */
export function buildLiberty() {
  const ship = new THREE.Group()
  const L = 65, B = 12.4
  const DECK = 4.4 // main deck above the waterline
  const white = new THREE.MeshStandardMaterial({ color: '#cdd7db', roughness: 0.5, metalness: 0.04 })
  const shade = new THREE.MeshStandardMaterial({ color: '#d6dee2', roughness: 0.6 })
  const navy = new THREE.MeshStandardMaterial({ color: '#1d3756', roughness: 0.55 })
  const red = new THREE.MeshStandardMaterial({ color: '#c3352b', roughness: 0.5 })
  const orange = new THREE.MeshStandardMaterial({ color: '#ef6a2c', roughness: 0.45, emissive: '#5a1a05', emissiveIntensity: 0.4 })
  const blue = new THREE.MeshStandardMaterial({ color: '#2f78bf', roughness: 0.45 })
  const dark = new THREE.MeshStandardMaterial({ color: '#222626', roughness: 0.8 })

  // Hull in plan: fine bow at −x, full body, square transom.
  const plan = new THREE.Shape()
  plan.moveTo(L / 2, -B / 2 + 0.6)
  plan.lineTo(L / 2 - 0.6, -B / 2)
  plan.lineTo(-L * 0.18, -B / 2)
  plan.bezierCurveTo(-L * 0.36, -B / 2, -L * 0.46, -B * 0.22, -L / 2, 0)
  plan.bezierCurveTo(-L * 0.46, B * 0.22, -L * 0.36, B / 2, -L * 0.18, B / 2)
  plan.lineTo(L / 2 - 0.6, B / 2)
  plan.lineTo(L / 2, B / 2 - 0.6)
  plan.closePath()
  const extrude = (from, to, mat, inflate = 1) => {
    const g = new THREE.ExtrudeGeometry(plan, { depth: to - from, bevelEnabled: false, curveSegments: 20 })
    g.rotateX(-Math.PI / 2)
    g.translate(0, from, 0)
    g.scale(inflate, 1, inflate)
    // Sheer: the foredeck rises toward the bow.
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i)
      if (y > from + 0.01) p.setY(i, y + Math.max(0, -x - L * 0.22) * 0.09)
    }
    g.computeVertexNormals()
    return new THREE.Mesh(g, mat)
  }
  ship.add(extrude(-3.2, 0.9, navy, 1.003))
  ship.add(extrude(0.9, DECK, white))
  // Bulwark along the foredeck.
  const bulwark = extrude(DECK, DECK + 1.1, white, 0.995)
  bulwark.material = white
  ship.add(bulwark)

  const box = (w, h, d, x, y, z, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    m.position.set(x, y + h / 2, z)
    ship.add(m)
    return m
  }
  const windowed = (tex, intensity = 2.4) =>
    new THREE.MeshStandardMaterial({ color: '#eef3f4', roughness: 0.5, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: intensity })

  // Forward superstructure, three tiers stepping up to the bridge.
  const t1 = windowed(windowTexture(18, 2, { seed: 4, lit: 0.6 }))
  box(24, 3, B * 0.9, -9, DECK, 0, [shade, white, white, white, t1, t1])
  const t2 = windowed(windowTexture(12, 1, { seed: 9, lit: 0.7 }))
  box(16, 2.7, B * 0.78, -10, DECK + 3, 0, [shade, white, white, white, t2, t2])
  const bridgeTex = windowTexture(10, 1, { seed: 2, lit: 0.95, pane: [12, 8] })
  const bridgeMat = windowed(bridgeTex, 2.8)
  box(8.5, 2.5, B * 0.7, -13, DECK + 5.7, 0, [white, bridgeMat, white, white, bridgeMat, bridgeMat])
  box(2.4, 0.35, B * 1.02, -15.6, DECK + 6.2, 0, white) // bridge wings
  box(9.2, 0.25, B * 0.74, -13, DECK + 8.2, 0, white) // monkey island

  // Mast with radar, and the blue lookout on its lattice tower.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 9, 8), white)
  mast.position.set(-12, DECK + 12.6, 0)
  ship.add(mast)
  box(0.18, 0.18, 4.4, -12, DECK + 14.6, 0, white)
  box(3.2, 0.12, 0.35, -12, DECK + 10.1, 0, dark) // radar scanner
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.7, 6, 4, 1, true), new THREE.MeshStandardMaterial({ color: '#c8d2d6', wireframe: true }))
  tower.position.set(-7.4, DECK + 8.4 + 3, 0)
  ship.add(tower)
  box(1.9, 1.7, 1.9, -7.4, DECK + 14.2, 0, blue)

  // Orange lifeboat on davits, port and starboard.
  for (const side of [1, -1]) {
    const boat = new THREE.Mesh(new THREE.CapsuleGeometry(1.0, 4.6, 6, 10), orange)
    boat.rotation.z = Math.PI / 2
    boat.scale.set(1, 1, 0.85)
    boat.position.set(-4.6, DECK + 4.0, side * (B * 0.44))
    ship.add(boat)
  }

  // The red crane: pedestal with a ringed platform and a jib reaching aft.
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 9.5, 20), red)
  ped.position.set(0.6, DECK + 4.75, 0)
  ship.add(ped)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.06, 6, 24), red)
  ring.rotation.x = Math.PI / 2
  ring.position.set(0.6, DECK + 8.2, 0)
  ship.add(ring)
  const jib = box(0.45, 0.45, 13, 0.6, 0, 0, red)
  jib.position.set(6.4, DECK + 7.2, 1.2)
  jib.rotation.set(0, Math.PI / 2 - 0.16, 0.42)

  // The long working deck aft: a low deckhouse with tall white railings above.
  const aftTex = windowed(windowTexture(20, 1, { seed: 13, lit: 0.45 }), 1.8)
  box(26, 2.6, B * 0.94, 18.5, DECK, 0, [white, shade, white, white, aftTex, aftTex])
  const postGeo = new THREE.BoxGeometry(0.16, 2.5, 0.16)
  const posts = new THREE.InstancedMesh(postGeo, white, 2 * 9 + 6)
  const m4 = new THREE.Matrix4()
  let k = 0
  for (let i = 0; i < 9; i++) {
    const x = 6.5 + i * 3
    for (const side of [1, -1]) posts.setMatrixAt(k++, m4.makeTranslation(x, DECK + 2.6 + 1.25, side * B * 0.46))
  }
  for (let i = 0; i < 6; i++) posts.setMatrixAt(k++, m4.makeTranslation(31.2, DECK + 2.6 + 1.25, -B * 0.4 + i * (B * 0.8) / 5))
  ship.add(posts)
  for (const side of [1, -1]) box(24.4, 0.14, 0.14, 18.5, DECK + 2.6 + 2.45, side * B * 0.46, white)
  box(0.14, 0.14, B * 0.92, 31.2, DECK + 2.6 + 2.45, 0, white)
  box(2.6, 1.2, 2.2, 26, DECK + 2.6, -2.5, shade) // container on deck

  // Her name on the port quarter, and a row of portholes.
  const name = new THREE.Mesh(new THREE.PlaneGeometry(13, 1.6), new THREE.MeshStandardMaterial({ map: nameTexture('YWAM LIBERTY'), roughness: 0.6 }))
  name.position.set(19, 2.7, B / 2 + 0.03)
  ship.add(name)
  const portMat = new THREE.MeshBasicMaterial({
    map: windowTexture(30, 1, { seed: 21, lit: 0.55, pane: [6, 6] }),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  for (const side of [1, -1]) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.5, 0.8), portMat)
    strip.position.set(-6, 2.1, side * (B / 2 + 0.04))
    if (side < 0) strip.rotation.y = Math.PI
    ship.add(strip)
  }

  // Running lights (COLREGs): red to port, green to starboard, white masthead and stern.
  ship.add(lamp(new THREE.Color(5, 0.3, 0.25), 3.4, -15.6, DECK + 6.8, B * 0.52))
  ship.add(lamp(new THREE.Color(0.25, 4, 0.8), 3.4, -15.6, DECK + 6.8, -B * 0.52))
  ship.add(lamp(new THREE.Color(4, 3.7, 3.2), 3.8, -12, DECK + 17.2, 0))
  ship.add(lamp(new THREE.Color(4, 3.7, 3.2), 2.8, L / 2, DECK + 1.2, 0))
  // Deck floodlights spill warm light onto the aft deck.
  for (let i = 0; i < 3; i++) ship.add(lamp(new THREE.Color(2.2, 1.6, 1.0), 4.5, 10 + i * 9, DECK + 5.4, 0))

  ship.userData = { length: L, beam: B, draft: 3.2 }
  return ship
}

// Load a GLB, normalise it to `length` metres with its bow along −x, and float it at the waterline.
export async function loadShip(url, { forward = '-x', length = 65, waterline = 0.18, tune } = {}) {
  const gltf = await new GLTFLoader().loadAsync(url)
  const model = gltf.scene
  const turn = { '-x': 0, '+x': Math.PI, '-z': -Math.PI / 2, '+z': Math.PI / 2 }[forward] ?? 0
  model.rotation.y = turn
  model.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  model.scale.setScalar(length / Math.max(size.x, size.z))
  model.updateMatrixWorld(true)
  box.setFromObject(model)
  const center = box.getCenter(new THREE.Vector3())
  const h = box.max.y - box.min.y
  model.position.sub(new THREE.Vector3(center.x, box.min.y + h * waterline, center.z))
  model.traverse((o) => o.isMesh && tune?.(o))
  const ship = new THREE.Group()
  ship.add(model)
  const beam = box.max.z - box.min.z
  ship.add(lamp(new THREE.Color(5, 0.3, 0.25), 3.4, -length * 0.2, h * 0.5, beam * 0.52))
  ship.add(lamp(new THREE.Color(0.25, 4, 0.8), 3.4, -length * 0.2, h * 0.5, -beam * 0.52))
  ship.add(lamp(new THREE.Color(4, 3.7, 3.2), 3.8, -length * 0.18, h * 0.82, 0))
  ship.userData = { length, beam, draft: h * waterline }
  return ship
}
