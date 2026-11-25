import '../main.js'
import '../styles/train.css'
import { reducedMotion } from '../main.js'
import { upcoming, formatDate, countdown, typeLabel } from '../data/schools.js'
import { startEmbers } from '../embers2d.js'

/* ─── Hero: embers rising over the worship night (the page's one moment) ── */
const heroEmbers = document.querySelector('.train-hero canvas[data-embers]')
if (heroEmbers && !reducedMotion) startEmbers(heroEmbers, { density: 0.00007 })

/* ─── Departures board ───────────────────────────────────────────────────── */
// Costs as published on each school's page on ywamshipskona.org (October 2026).
const costs = {
  'Ring of Fire DTS': ['$11,100'],
  'Island Adventure DTS': ['$10,100'],
  'Encounter DTS': ['$10,100'],
  'Aloha DTS': ['$11,100'],
  'Ablaze DTS': ['$10,100'],
  'Wayfinders DTS': ['$10,100'],
  'Discipleship Bible School': ['$4,200', 'Training only'],
  'Bible Core Course': ['$4,200', 'Training only'],
  'Bible Core Course on Location': ['$8,200'],
  'Word By Heart': ['$4,200'],
  'Transformational Development School': ['$4,200', 'Training only'],
}

const board = document.querySelector('[data-board]')
const status = document.querySelector('[data-board-status]')
const list = upcoming()

if (board) {
  board.innerHTML = list
    .map((s) => {
      const [price, note] = costs[s.name] ?? ['Ask the registrar']
      return `
      <tr data-type="${s.type}">
        <td class="board__date">${formatDate(s.start).replace(/, (\d{4})$/, ' <small>$1</small>')}</td>
        <td class="board__school"><a href="#${s.slug}">${s.name}</a> <em>${s.line}</em></td>
        <td class="board__type"><span class="tag tag--${s.type}">${typeLabel[s.type]}</span></td>
        <td class="board__cost">${price}${note ? ` <small>${note}</small>` : ''}</td>
        <td class="board__status"><span class="open">Open</span> <span class="countdown">${countdown(s.start)}</span></td>
      </tr>`
    })
    .join('')

  const label = { all: 'schools', dts: 'Discipleship Training Schools', uofn: 'University of the Nations courses' }
  const filters = [...document.querySelectorAll('.train-board .filter')]
  for (const f of filters) {
    f.addEventListener('click', () => {
      filters.forEach((b) => b.setAttribute('aria-pressed', String(b === f)))
      const type = f.dataset.filter
      let shown = 0
      board.querySelectorAll('tr').forEach((tr) => {
        tr.hidden = type !== 'all' && tr.dataset.type !== type
        if (!tr.hidden) shown++
      })
      if (status) status.textContent = `Showing ${shown} ${label[type]}`
    })
  }
}

// The next DTS to start, wherever the page mentions it.
const nextDts = list.find((s) => s.type === 'dts')
if (nextDts) document.querySelectorAll('[data-next-school]').forEach((el) => (el.textContent = formatDate(nextDts.start)))

/* ─── Track index: mark the track being read ────────────────────────────── */
const indexLinks = [...document.querySelectorAll('.track-index ol a[href^="#"]')]
const tracks = indexLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean)

function markTrack(id) {
  for (const a of indexLinks) {
    if (a.getAttribute('href') === `#${id}`) a.setAttribute('aria-current', 'location')
    else a.removeAttribute('aria-current')
  }
}

if (tracks.length && 'IntersectionObserver' in window) {
  // A track counts as "being read" when it crosses a band just above the middle of the screen.
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) markTrack(e.target.id)
    },
    { rootMargin: '-40% 0px -55% 0px' },
  )
  tracks.forEach((t) => io.observe(t))
}
