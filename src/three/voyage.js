import * as THREE from 'three'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import { noise } from './glsl.js'
import { sampleSea } from './waves.js'
import { createSky, createIsland, createOcean, createEmbers, skyUniforms, sunDir, palette } from './sea.js'
import { createChart, createBeacon, project } from './chart.js'
import { buildLiberty, loadShip } from './ship.js'
import { createPod } from './dolphins.js'

const clamp01 = (v) => Math.min(Math.max(v, 0), 1)
const smooth = (v) => v * v * (3 - 2 * v)
const lerp = (a, b, t) => a + (b - a) * t

/**
 * The homepage voyage: a dusk sea off Kona that burns away into a chart of the Pacific.
 * The page drives it with three numbers — rise (camera lifts off the water), burn (the sea
 * gives way to the chart) and route (how far the voyage has drawn).
 */
export class Voyage {
  constructor(canvas, { chart, ship = {}, labels = [], hdri, dolphins, onReady, reducedMotion = false, lowPower = false }) {
    this.onReady = onReady
    this.canvas = canvas
    this.labels = labels
    this.reducedMotion = reducedMotion
    this.state = { rise: 0, burn: 0, route: 0 }
    this.active = true
    this.last = performance.now()
    this.time = reducedMotion ? 14 : 0
    this.pointer = new THREE.Vector2(9, 9)
    this.rippleIndex = 0
    this.lastRipple = new THREE.Vector3(1e9, 0, 0)
    this.shipSpeed = 4.2

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer = renderer
    this.maxDpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.75)
    this.dpr = this.maxDpr

    this.shared = {
      uTime: { value: 0 },
      uPixelRatio: { value: this.dpr },
      uRes: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: this.pointer },
      uSwell: { value: 0.72 },
      ...skyUniforms(),
    }

    this.#buildSea({ lowPower, hdri, ship, dolphins })
    this.#buildChart(chart)
    this.#buildComposite()

    this.resize()
    this.onResize = () => this.resize()
    window.addEventListener('resize', this.onResize)
    this.onPointer = (e) => this.#pointer(e)
    window.addEventListener('pointermove', this.onPointer, { passive: true })
    this.loop = this.loop.bind(this)
    this.raf = requestAnimationFrame(this.loop)
  }

  #buildSea({ lowPower, hdri, ship, dolphins }) {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 9000)
    scene.add(camera)
    this.seaScene = scene
    this.seaCam = camera

    scene.add(createSky(this.shared))
    scene.add(createIsland(this.shared))
    this.ocean = createOcean(this.shared, { segments: lowPower ? 200 : 320 })
    scene.add(this.ocean)
    this.embers = createEmbers(this.shared, lowPower ? 320 : 620)
    camera.add(this.embers)

    scene.add(new THREE.HemisphereLight('#34467e', '#081220', 0.55))
    const sun = new THREE.DirectionalLight('#ff9663', 2.4)
    sun.position.copy(sunDir).multiplyScalar(500)
    scene.add(sun)
    const rim = new THREE.DirectionalLight('#50c2db', 0.22)
    rim.position.set(200, 120, 300)
    scene.add(rim)

    if (hdri) {
      new HDRLoader().load(hdri, (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping
        const pmrem = new THREE.PMREMGenerator(this.renderer)
        scene.environment = pmrem.fromEquirectangular(tex).texture
        scene.environmentIntensity = 0.22
        tex.dispose()
        pmrem.dispose()
      })
    }

    this.shipPos = new THREE.Vector3(62, 0, -240)
    this.shipHolder = new THREE.Group()
    this.shipHolder.position.copy(this.shipPos)
    scene.add(this.shipHolder)
    const mount = (s) => {
      this.shipHolder.clear()
      this.shipHolder.add(s)
      this.ship = s
      const u = this.ocean.material.uniforms
      u.uShipLen.value = s.userData.length
      u.uShipBeam.value = s.userData.beam
    }
    mount(buildLiberty())
    if (ship.url) loadShip(ship.url, ship).then(mount).catch((e) => console.warn('Ship model failed, keeping the drawn ship.', e))
    this.ocean.material.uniforms.uShipPos.value.copy(this.shipPos)

    if (dolphins && !this.reducedMotion) {
      createPod(dolphins, { count: lowPower ? 3 : 4, onSplash: (pos, strength) => this.#addRipple(pos, strength) })
        .then((pod) => {
          scene.add(pod.group)
          this.pod = pod
          this.resize()
        })
        .catch((e) => console.warn('Dolphins stayed below.', e))
    }
  }

  #buildChart({ polygons, atolls, route, stops }) {
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#050c17')
    const camera = new THREE.PerspectiveCamera(36, 1, 1, 6000)
    this.chartScene = scene
    this.chartCam = camera
    const { group, curve, routeUniforms } = createChart(this.shared, { polygons, atolls, route })
    scene.add(group)
    this.curve = curve
    this.routeUniforms = routeUniforms
    // Where along the route each port falls, so the page can pause the voyage there.
    const samples = Array.from({ length: 801 }, (_, i) => curve.getPointAt(i / 800))
    this.stops = stops.map((s) => {
      const beacon = createBeacon(this.shared)
      const at = project(s.lon, s.lat, 1.6)
      beacon.position.copy(at)
      scene.add(beacon)
      let best = 0
      samples.forEach((pt, i) => {
        if (pt.distanceToSquared(at) < samples[best].distanceToSquared(at)) best = i
      })
      return { ...s, beacon, at: best / 800 }
    })
    // The ship on the chart: a small ember chevron that leads the line.
    const chevron = new THREE.Shape()
    chevron.moveTo(4.2, 0)
    chevron.lineTo(-2.6, 2.4)
    chevron.lineTo(-1.2, 0)
    chevron.lineTo(-2.6, -2.4)
    chevron.closePath()
    const marker = new THREE.Mesh(
      new THREE.ShapeGeometry(chevron).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.6, 0.9), transparent: true, depthWrite: false }),
    )
    marker.renderOrder = 4
    scene.add(marker)
    this.marker = marker
    this.chartLook = new THREE.Vector3()
    this.chartEye = new THREE.Vector3()
    this.chartInit = false
  }

  #buildComposite() {
    const rtOpts = { type: THREE.HalfFloatType, samples: 4 }
    this.rtA = new THREE.WebGLRenderTarget(1, 1, rtOpts)
    this.rtB = new THREE.WebGLRenderTarget(1, 1, rtOpts)
    this.post = new THREE.Scene()
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2))
    this.composite = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        uniforms: {
          tA: { value: this.rtA.texture },
          tB: { value: this.rtB.texture },
          uBurn: { value: 0 },
          uTime: this.shared.uTime,
          uRes: this.shared.uRes,
          uEmber: { value: palette.ember },
          uFlare: { value: palette.flare },
          uFade: { value: 1 },
        },
        depthTest: false,
        depthWrite: false,
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D tA;
          uniform sampler2D tB;
          uniform float uBurn;
          uniform float uTime;
          uniform vec2 uRes;
          uniform vec3 uEmber;
          uniform vec3 uFlare;
          uniform float uFade;
          varying vec2 vUv;
          ${noise}
          void main() {
            vec3 col;
            if (uBurn <= 0.0) {
              col = texture2D(tA, vUv).rgb;
            } else if (uBurn >= 1.0) {
              col = texture2D(tB, vUv).rgb;
            } else {
              // Fire rises: the sea burns away from the bottom of the frame upward.
              vec2 p = vUv * vec2(uRes.x / uRes.y, 1.0);
              float n = fbm(vec3(p * 2.4, uTime * 0.06)) * 0.5 + 0.5;
              n = n * 0.62 + vUv.y * 0.38;
              float t = uBurn * 1.32 - 0.12;
              float edge = 0.045;
              float k = smoothstep(t, t + edge, n);
              vec3 a = texture2D(tA, vUv).rgb;
              vec3 b = texture2D(tB, vUv).rgb;
              float charZone = (1.0 - smoothstep(t + edge, t + edge * 5.0, n)) * k;
              a *= 1.0 - charZone * 0.7;
              col = mix(b, a, k);
              float band = 1.0 - abs(k * 2.0 - 1.0);
              band = pow(band, 1.5);
              vec3 fire = mix(uFlare, uEmber * 2.4 + vec3(0.9, 0.55, 0.15), band);
              col += fire * band * 2.6;
            }
            // Vignette and a little film grain to keep the darks alive.
            vec2 q = vUv - 0.5;
            col *= 1.0 - dot(q, q) * 0.55;
            float grain = fract(sin(dot(vUv * uRes + fract(uTime) * 91.7, vec2(12.9898, 78.233))) * 43758.5453);
            col += (grain - 0.5) * 0.018;
            col *= uFade;
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    )
    this.composite.frustumCulled = false
    this.post.add(this.composite)
  }

  #pointer(e) {
    const r = this.canvas.getBoundingClientRect()
    if (e.clientY < r.top || e.clientY > r.bottom) return
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    if (this.state.burn >= 0.6 || this.reducedMotion) return
    // Stir the sea where the pointer meets it.
    this.raycaster ??= new THREE.Raycaster()
    this.raycaster.setFromCamera(this.pointer, this.seaCam)
    const hit = new THREE.Vector3()
    if (!this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return
    if (hit.distanceTo(this.lastRipple) < 2.2 || hit.distanceTo(this.seaCam.position) > 420) return
    const speed = Math.min(hit.distanceTo(this.lastRipple) / 6, 1)
    this.lastRipple.copy(hit)
    this.#addRipple(hit, 0.45 + speed * 0.55)
  }

  // A ring of bioluminescence on the water at a world position.
  #addRipple(pos, strength) {
    const off = this.ocean.material.uniforms.uSeaOffset.value
    const slot = this.ocean.material.uniforms.uRipples.value[this.rippleIndex++ % 16]
    slot.set(pos.x + off.x, pos.z + off.y, this.time, strength)
  }

  set(values) {
    Object.assign(this.state, values)
    if (this.reducedMotion) this.renderOnce = true
  }

  setActive(on) {
    if (on === this.active) return
    this.active = on
    if (on) {
      this.last = performance.now()
      this.raf = requestAnimationFrame(this.loop)
    }
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    this.renderer.setPixelRatio(this.dpr)
    this.renderer.setSize(w, h, false)
    const pw = Math.floor(w * this.dpr), ph = Math.floor(h * this.dpr)
    this.rtA.setSize(pw, ph)
    this.rtB.setSize(pw, ph)
    this.shared.uRes.value.set(pw, ph)
    this.shared.uPixelRatio.value = this.dpr
    const aspect = w / h
    // Keep the ship and the sunset in frame on tall phones by widening the lens.
    this.seaCam.fov = aspect < 0.8 ? 58 : aspect < 1.2 ? 48 : 40
    this.seaCam.aspect = aspect
    this.seaCam.updateProjectionMatrix()
    this.chartCam.fov = aspect < 0.8 ? 54 : 36
    this.chartCam.aspect = aspect
    this.chartCam.updateProjectionMatrix()
    this.aspect = aspect
    // Keep the dolphins in open water on narrow screens.
    if (this.pod) this.pod.group.position.x = aspect < 0.8 ? -22 : aspect < 1.2 ? -10 : 0
    this.renderOnce = true
  }

  #updateSea(dt) {
    const t = this.time
    const { rise } = this.state
    const sw = this.shared.uSwell.value
    const off = this.ocean.material.uniforms.uSeaOffset.value
    off.set(-this.shipSpeed * t, 0)

    // Float the ship on the same swell the shader draws, with a little inertia.
    if (this.ship) {
      const L = this.ship.userData.length
      const B = this.ship.userData.beam
      const sx = this.shipPos.x + off.x, sz = this.shipPos.z + off.y
      const bow = sampleSea(sx - L * 0.4, sz, t, sw)
      const stern = sampleSea(sx + L * 0.4, sz, t, sw)
      const port = sampleSea(sx, sz + B * 0.5, t, sw)
      const stbd = sampleSea(sx, sz - B * 0.5, t, sw)
      const y = (bow + stern + port + stbd) / 4
      const k = 1 - Math.exp(-dt * 2.2)
      this.shipHolder.position.y = lerp(this.shipHolder.position.y, y * 0.85, k)
      this.shipHolder.rotation.z = lerp(this.shipHolder.rotation.z, Math.atan2(bow - stern, L * 0.8) * 0.8, k)
      this.shipHolder.rotation.x = lerp(this.shipHolder.rotation.x, Math.atan2(port - stbd, B) * 0.5, k)
    }

    this.pod?.update(dt, t)

    // Camera: from eye-level on the swell to high above the ship's wake.
    const r = smooth(clamp01(rise))
    const aspectShift = this.aspect < 0.8 ? 22 : this.aspect < 1.2 ? 10 : 0
    const bob = sampleSea(off.x, off.y, t, sw) * (1 - r)
    this.seaCam.position.set(lerp(0, -30, r), lerp(4.6 + bob * 0.35, 120, r), lerp(0, -20, r))
    const tilt = this.aspect < 0.8 ? 38 : 0
    const look = new THREE.Vector3(lerp(-8 + aspectShift, 18, r), lerp(7 - tilt, 0, r), lerp(-200, -160, r))
    this.seaCam.lookAt(look)
    this.seaCam.rotateZ(Math.sin(t * 0.5) * 0.004 * (1 - r))
    this.embers.material.uniforms.uIntensity.value = 1 - r * 0.35
    this.ocean.material.uniforms.uReflect.value = 1 - r * 0.6
  }

  #updateChart(dt) {
    const p = clamp01(this.state.route)
    this.routeUniforms.uProgress.value = p
    const head = this.curve.getPointAt(Math.min(p, 0.9999))
    const tan = this.curve.getTangentAt(Math.min(p, 0.9999))
    this.marker.position.set(head.x, 2.2, head.z)
    this.marker.rotation.y = Math.atan2(-tan.z, tan.x)

    // Follow just ahead of the ship; pull back as the voyage lengthens.
    const lead = this.curve.getPointAt(Math.min(p + 0.04, 1))
    const lookTarget = new THREE.Vector3().lerpVectors(head, lead, 0.5)
    const mobile = this.aspect < 0.8
    const height = lerp(150, 290, smooth(clamp01(p * 2.2))) * (mobile ? 1.3 : 1)
    // On tall screens look more steeply down, and keep the ship in the upper half above the port card.
    if (mobile) lookTarget.z += height * 0.38
    const eyeTarget = lookTarget.clone().add(new THREE.Vector3(-30, height, height * (mobile ? 0.3 : 0.78)))
    const k = this.chartInit ? 1 - Math.exp(-dt * 3.5) : 1
    this.chartInit = true
    this.chartLook.lerp(lookTarget, k)
    this.chartEye.lerp(eyeTarget, k)
    this.chartCam.position.copy(this.chartEye)
    this.chartCam.lookAt(this.chartLook)

    for (const s of this.stops) {
      const near = 1 - clamp01(Math.abs(p - s.at) / 0.12)
      s.beacon.material.uniforms.uActive.value = near
    }
  }

  #updateLabels() {
    if (!this.labels.length) return
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight
    const v = new THREE.Vector3()
    const show = this.state.burn > 0.7
    for (const l of this.labels) {
      l.pos ??= project(l.lon, l.lat, 2)
      v.copy(l.pos).project(this.chartCam)
      const x = (v.x * 0.5 + 0.5) * w
      const y = (-v.y * 0.5 + 0.5) * h
      const visible = show && v.z < 1 && x > -40 && x < w + 40 && y > -40 && y < h + 40
      l.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      l.el.classList.toggle('is-visible', visible && (l.at === undefined || this.state.route >= l.at - 0.08))
    }
  }

  loop() {
    if (!this.active) return
    this.raf = requestAnimationFrame(this.loop)
    const now = performance.now()
    const dt = Math.min((now - this.last) / 1000, 0.1)
    this.last = now
    if (this.reducedMotion && !this.renderOnce) return
    this.renderOnce = false
    if (!this.reducedMotion) this.time += dt
    this.shared.uTime.value = this.time

    const burn = clamp01(this.state.burn)
    const r = this.renderer
    if (burn < 1) {
      this.#updateSea(dt)
      r.setRenderTarget(this.rtA)
      r.render(this.seaScene, this.seaCam)
    }
    if (burn > 0) {
      this.#updateChart(dt)
      r.setRenderTarget(this.rtB)
      r.render(this.chartScene, this.chartCam)
    }
    this.#updateLabels()
    this.composite.material.uniforms.uBurn.value = burn
    r.setRenderTarget(null)
    r.render(this.post, this.postCam)
    if (this.onReady) {
      this.onReady()
      this.onReady = null
    }
    this.#adapt(dt)
  }

  // Drop resolution on slow devices rather than dropping frames.
  #adapt(dt) {
    this.frames = (this.frames || 0) + 1
    this.acc = (this.acc || 0) + dt
    if (this.frames < 90) return
    const avg = this.acc / this.frames
    this.frames = 0
    this.acc = 0
    if (avg > 1 / 40 && this.dpr > 1) {
      this.dpr = Math.max(1, this.dpr - 0.25)
      this.resize()
    }
  }

  dispose() {
    this.active = false
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.onResize)
    window.removeEventListener('pointermove', this.onPointer)
    this.renderer.dispose()
  }
}
