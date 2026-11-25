import { gsap, ScrollTrigger, reducedMotion, lenis } from './main.js'
import './styles/home.css'
import { route, stops, atolls, labels } from './data/voyage.js'
import { upcoming, formatDate, countdown, typeLabel } from './data/schools.js'
import { stories, storyCard } from './data/stories.js'
import { startEmbers } from './embers2d.js'

const clamp01 = (v) => Math.min(Math.max(v, 0), 1)
const range = (v, a, b) => clamp01((v - a) / (b - a))

/* ─── The voyage ─────────────────────────────────────────────────────────── */
const voyageEl = document.getElementById('voyage')
const stage = voyageEl.querySelector('.voyage__stage')
const canvas = voyageEl.querySelector('.voyage__canvas')
const layers = Object.fromEntries([...voyageEl.querySelectorAll('[data-layer]')].map((el) => [el.dataset.layer, el]))
const ports = [...voyageEl.querySelectorAll('[data-port]')]
const progressItems = [...voyageEl.querySelectorAll('[data-stop]')]
const shade = voyageEl.querySelector('.voyage__shade')

// Split the manifesto into words that light up as the camera lifts.
const words = []
for (const p of voyageEl.querySelectorAll('[data-words]')) {
  const text = p.textContent.trim()
  p.innerHTML =
    `<span class="visually-hidden">${text}</span>` +
    text
      .split(/\s+/)
      .map((w) => `<span class="word" aria-hidden="true">${w}</span>`)
      .join(' ')
  words.push(...p.querySelectorAll('.word'))
}

// Chart labels, positioned every frame by the Voyage.
const labelBox = voyageEl.querySelector('.chart-labels')
const labelEls = labels.map((l) => {
  const el = document.createElement('div')
  el.className = `chart-label${l.kind ? ` is-${l.kind}` : ''}${l.side ? ` is-${l.side}` : ''}`
  el.innerHTML = `<span>${l.text}</span>`
  labelBox.append(el)
  return { ...l, el }
})

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!c.getContext('webgl2')
  } catch {
    return false
  }
}

let voyage = null
const lowPower = matchMedia('(max-width: 760px)').matches || (navigator.hardwareConcurrency || 8) <= 4

async function startVoyage() {
  if (!hasWebGL()) {
    document.documentElement.classList.add('no-webgl')
    return
  }
  const [{ Voyage }, geo] = await Promise.all([
    import('./three/voyage.js'),
    fetch('/assets/geo/pacific.json').then((r) => r.json()),
  ])
  voyage = new Voyage(canvas, {
    chart: { polygons: geo.polygons, atolls, route, stops },
    labels: labelEls,
    hdri: '/assets/hdri/qwantani_dusk_2_puresky_1k.hdr',
    dolphins: '/assets/3d/fauna/quaternius-dolphin.glb',
    reducedMotion,
    lowPower,
    onReady: () => voyageEl.classList.add('is-ready'),
  })
  if (import.meta.env.DEV) window.__voyage = voyage
  // Pause rendering when the voyage is off screen.
  new IntersectionObserver(([e]) => voyage.setActive(e.isIntersecting), { rootMargin: '100px' }).observe(stage)
  update(trigger.progress)
}

// Scroll choreography across the 640vh section. Ranges are fractions of the scroll distance.
const T = {
  heroOut: [0.02, 0.085],
  rise: [0, 0.27],
  manifestoIn: [0.075, 0.1],
  words: [0.1, 0.26],
  manifestoOut: [0.285, 0.31],
  burn: [0.3, 0.4],
  portsIn: [0.38, 0.42],
}
// Route progress with a pause at each port so its card can be read.
function routeAt(p, majuro) {
  const keys = [
    [0.4, 0],
    [0.5, 0],
    [0.66, majuro],
    [0.76, majuro],
    [0.94, 1],
  ]
  if (p <= keys[0][0]) return 0
  for (let i = 1; i < keys.length; i++) {
    const [p1, r1] = keys[i]
    const [p0, r0] = keys[i - 1]
    if (p <= p1) {
      const t = (p - p0) / (p1 - p0)
      return r0 + (r1 - r0) * (t * t * (3 - 2 * t))
    }
  }
  return 1
}

// Layers fade with scroll but stay readable by screen readers; a focused layer shows itself (see CSS).
function show(el, opacity) {
  el.style.opacity = opacity
  el.style.pointerEvents = opacity < 0.05 ? 'none' : ''
}

let activePort = -1
function update(p) {
  const heroOut = range(p, ...T.heroOut)
  show(layers.hero, 1 - heroOut)
  layers.hero.style.transform = `translateY(${-heroOut * 40}px)`

  const mIn = range(p, ...T.manifestoIn)
  const mOut = range(p, ...T.manifestoOut)
  show(layers.manifesto, mIn * (1 - mOut))
  const lit = Math.floor(range(p, ...T.words) * (words.length + 1))
  words.forEach((w, i) => w.classList.toggle('is-lit', i < lit))

  const portsIn = range(p, ...T.portsIn)
  show(layers.ports, portsIn)

  const majuro = voyage?.stops?.[1]?.at ?? 0.5
  const r = routeAt(p, majuro)
  voyage?.set({ rise: range(p, ...T.rise), burn: range(p, ...T.burn), route: r })

  let port = -1
  if (portsIn > 0.5) port = r >= 0.97 ? 2 : r >= majuro - 0.02 ? 1 : 0
  if (port !== activePort) {
    activePort = port
    ports.forEach((el, i) => el.classList.toggle('is-active', i === port))
    progressItems.forEach((el, i) => el.classList.toggle('is-passed', i <= port))
  }
  shade.style.opacity = 1 - range(p, 0.3, 0.38) * 0.6
}

// The progress markers jump to each port of call.
const portAt = [0.45, 0.71, 0.97]
progressItems.forEach((li, i) =>
  li.querySelector('button').addEventListener('click', () => {
    const y = trigger.start + (trigger.end - trigger.start) * portAt[i]
    lenis ? lenis.scrollTo(y, { duration: 1.6 }) : window.scrollTo({ top: y, behavior: reducedMotion ? 'auto' : 'smooth' })
  }),
)

const trigger = ScrollTrigger.create({
  trigger: voyageEl,
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: (self) => update(self.progress),
})
// Also sync after layout changes and when the page opens mid-scroll (e.g. on reload).
ScrollTrigger.addEventListener('refresh', () => update(trigger.progress))
update(trigger.progress)

// Intro: the headline rises line by line once, on load.
if (!reducedMotion) {
  gsap.from('.hero h1 .line > span', { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.09, delay: 0.15 })
  gsap.from(['.hero__lede', '.hero__actions', '.hero__port'], { opacity: 0, y: 18, duration: 1, ease: 'power3.out', stagger: 0.08, delay: 0.55 })
}
startVoyage()

/* ─── Three ways aboard: a photo that follows the pointer ───────────────── */
const peek = document.querySelector('.ways__peek')
const ways = document.querySelector('.ways__list')
if (peek && ways && matchMedia('(hover: hover) and (min-width: 861px)').matches) {
  const imgs = [...peek.querySelectorAll('img')]
  const xTo = gsap.quickTo(peek, 'x', { duration: 0.6, ease: 'power3' })
  const yTo = gsap.quickTo(peek, 'y', { duration: 0.6, ease: 'power3' })
  const rTo = gsap.quickTo(peek, 'rotation', { duration: 0.8, ease: 'power3' })
  let lastX = 0
  ways.addEventListener('pointermove', (e) => {
    xTo(e.clientX + 40)
    yTo(e.clientY)
    rTo(gsap.utils.clamp(-8, 8, (e.clientX - lastX) * 0.4))
    lastX = e.clientX
  })
  for (const li of ways.querySelectorAll('[data-peek]')) {
    li.addEventListener('pointerenter', () => {
      peek.classList.add('is-on')
      imgs.forEach((img, i) => img.classList.toggle('is-on', i === Number(li.dataset.peek)))
    })
  }
  ways.addEventListener('pointerleave', () => peek.classList.remove('is-on'))
  gsap.set(peek, { xPercent: 0, yPercent: -50, scale: 1 })
}

/* ─── Departures board ───────────────────────────────────────────────────── */
const board = document.querySelector('[data-board]')
if (board) {
  const list = upcoming()
  board.innerHTML = list
    .map(
      (s) => `
      <tr data-type="${s.type}">
        <td class="board__date">${formatDate(s.start).replace(/, (\d{4})$/, '<small>$1</small>')}</td>
        <td class="board__school"><a href="/train.html#${s.slug}">${s.name}</a><em>${s.line}</em></td>
        <td><span class="tag tag--${s.type}">${typeLabel[s.type]}</span></td>
        <td class="board__status"><span class="open">Open</span><span class="countdown">${countdown(s.start)}</span></td>
      </tr>`,
    )
    .join('')
  const next = list.find((s) => s.type === 'dts')
  if (next) document.querySelectorAll('[data-next-school]').forEach((el) => (el.textContent = formatDate(next.start)))

  const filters = [...document.querySelectorAll('.filter')]
  for (const f of filters) {
    f.addEventListener('click', () => {
      filters.forEach((b) => b.setAttribute('aria-pressed', String(b === f)))
      const type = f.dataset.filter
      board.querySelectorAll('tr').forEach((tr) => (tr.hidden = type !== 'all' && tr.dataset.type !== type))
    })
  }
}

/* ─── The Liberty, deck by deck ─────────────────────────────────────────── */
const deckTabs = [...document.querySelectorAll('.deck-list [role="tab"]')]
const hotspots = [...document.querySelectorAll('.hotspot')]
function showDeck(name, focus = false) {
  for (const t of deckTabs) {
    const on = t.dataset.deck === name
    t.setAttribute('aria-selected', String(on))
    t.tabIndex = on ? 0 : -1
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on
    if (on && focus) t.focus()
  }
  hotspots.forEach((h) => h.setAttribute('aria-pressed', String(h.dataset.deck === name)))
}
deckTabs.forEach((t, i) => {
  t.addEventListener('click', () => showDeck(t.dataset.deck))
  t.addEventListener('keydown', (e) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    showDeck(deckTabs[(i + step + deckTabs.length) % deckTabs.length].dataset.deck, true)
  })
})
hotspots.forEach((h) => h.addEventListener('click', () => showDeck(h.dataset.deck)))

/* ─── Stories ────────────────────────────────────────────────────────────── */
const storyGrid = document.querySelector('[data-stories]')
if (storyGrid) {
  const lead = stories.find((s) => s.img === 'kiki-journey.jpg')
  const side = stories.filter((s) => s !== lead).slice(0, 3)
  storyGrid.innerHTML = `${storyCard(lead, { lead: true })}<div class="stories__side">${side.map((s) => storyCard(s)).join('')}</div>`
}

/* ─── Voices ─────────────────────────────────────────────────────────────── */
const voiceTabs = [...document.querySelectorAll('.voices__nav [role="tab"]')]
function showVoice(i, focus = false) {
  voiceTabs.forEach((t, j) => {
    t.setAttribute('aria-selected', String(i === j))
    t.tabIndex = i === j ? 0 : -1
    document.getElementById(t.getAttribute('aria-controls')).hidden = i !== j
  })
  if (focus) voiceTabs[i].focus()
  if (!reducedMotion) gsap.fromTo(`#voice-${i} blockquote p`, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' })
}
voiceTabs.forEach((t, i) => {
  t.addEventListener('click', () => showVoice(i))
  t.addEventListener('keydown', (e) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    showVoice((i + step + voiceTabs.length) % voiceTabs.length, true)
  })
})

/* ─── Final call: embers rising off the page ────────────────────────────── */
const emberCanvas = document.querySelector('[data-embers]')
if (emberCanvas && !reducedMotion) startEmbers(emberCanvas)
