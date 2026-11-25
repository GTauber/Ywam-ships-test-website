import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './styles/base.css'
import './styles/components.css'

gsap.registerPlugin(ScrollTrigger)

const root = document.documentElement
root.classList.remove('no-js')
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
if (reducedMotion) root.classList.add('reduced-motion')

// Smooth scrolling, driven by GSAP's ticker so ScrollTrigger and Lenis agree on every frame.
export let lenis = null
if (!reducedMotion) {
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9, autoRaf: false })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
}

// Header: transparent over dark heroes, solid once you scroll, tucked away while reading down.
const header = document.querySelector('.site-header')
if (header) {
  header.querySelector(`[data-nav="${header.dataset.page}"]`)?.setAttribute('aria-current', 'page')
  let last = window.scrollY
  const solidAfter = () => (document.body.dataset.solidAfter ? Number(document.body.dataset.solidAfter) * innerHeight : 40)
  const update = () => {
    const y = window.scrollY
    header.classList.toggle('is-solid', y > solidAfter())
    const goingDown = y > last + 4
    const goingUp = y < last - 4
    if (goingDown && y > innerHeight * 0.6 && !root.classList.contains('menu-open')) header.classList.add('is-hidden')
    if (goingUp || y < 80) header.classList.remove('is-hidden')
    last = y
  }
  addEventListener('scroll', update, { passive: true })
  update()
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'))
}

// Mobile menu.
const toggle = document.querySelector('.menu-toggle')
const menu = document.getElementById('mobile-menu')
if (toggle && menu) {
  const setOpen = (open) => {
    root.classList.toggle('menu-open', open)
    toggle.setAttribute('aria-expanded', String(open))
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu')
    menu.inert = !open
    open ? lenis?.stop() : lenis?.start()
    document.body.style.overflow = open ? 'hidden' : ''
  }
  menu.inert = true
  toggle.addEventListener('click', () => setOpen(!root.classList.contains('menu-open')))
  menu.addEventListener('click', (e) => e.target.closest('a') && setOpen(false))
  addEventListener('keydown', (e) => e.key === 'Escape' && root.classList.contains('menu-open') && (setOpen(false), toggle.focus()))
}

// In-page anchors go through Lenis so they glide instead of jumping.
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]')
  if (!a || !lenis) return
  const id = a.getAttribute('href')
  if (id.length < 2) return
  const target = document.querySelector(id)
  if (!target) return
  e.preventDefault()
  lenis.scrollTo(target, { offset: -(header?.offsetHeight ?? 0) - 20 })
  // Move focus to the target; only make it focusable if it isn't already.
  if (!target.matches('a[href], button, input, select, textarea, [tabindex]')) target.setAttribute('tabindex', '-1')
  target.focus({ preventScroll: true })
})

// Newsletter: no backend wired yet, so confirm locally and say what happens next.
for (const form of document.querySelectorAll('form[data-newsletter]')) {
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const status = form.querySelector('[role="status"]') ?? form.parentElement.querySelector('[role="status"]')
    const email = form.querySelector('input[type="email"]')
    if (!email.checkValidity()) {
      status.textContent = 'Enter an email address like name@example.com.'
      email.focus()
      return
    }
    status.textContent = 'Thanks. Stories from the ship will arrive about once a month.'
    form.reset()
  })
}

document.getElementById('year')?.replaceChildren(String(new Date().getFullYear()))

export { gsap, ScrollTrigger }
