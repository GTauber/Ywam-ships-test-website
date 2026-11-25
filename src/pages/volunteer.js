import '../main.js'
import '../styles/volunteer.css'
import { reducedMotion } from '../main.js'
import { startEmbers } from '../embers2d.js'

/* ─── Where do you fit? Light up the department you jumped to ───────────── */
// main.js glides to the anchor; this marks the row so the eye lands on it.
let lit = null
let litTimer = 0
for (const a of document.querySelectorAll('.fit__wall a')) {
  a.addEventListener('click', () => {
    const target = document.querySelector(a.getAttribute('href'))
    if (!target || !target.classList.contains('dept')) return
    lit?.classList.remove('is-found')
    clearTimeout(litTimer)
    lit = target
    target.classList.add('is-found')
    litTimer = setTimeout(() => target.classList.remove('is-found'), 3600)
  })
}

/* ─── Outreach dates: say which cycles have already ended ───────────────── */
const outreach = document.querySelector('[data-outreach]')
if (outreach) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const parse = (iso) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  for (const li of outreach.querySelectorAll('li')) {
    const [start, end] = [...li.querySelectorAll('time')].map((t) => parse(t.getAttribute('datetime')))
    const status = li.querySelector('[data-status]')
    if (!start || !end || !status) continue
    if (end < today) {
      li.classList.add('is-past')
      status.textContent = 'Ended'
    } else if (start <= today) {
      status.textContent = 'In progress'
    } else {
      // "Planned", not "Scheduled": 2026 dates are subject to change (see the notice under the list).
      status.textContent = 'Planned'
    }
  }
}

/* ─── Final call: embers rising off the page ────────────────────────────── */
const emberCanvas = document.querySelector('.cta-band canvas[data-embers]')
if (emberCanvas && !reducedMotion) startEmbers(emberCanvas)
