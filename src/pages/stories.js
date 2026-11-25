import '../main.js'
import '../styles/stories.css'
import { reducedMotion, lenis } from '../main.js'
import { stories, formatStoryDate } from '../data/stories.js'
import { startEmbers } from '../embers2d.js'

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const esc = (text) => String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

// Alt text checked against each photo on this page; anything not listed uses the data file's alt.
const altFix = {
  'surgery-to-shores.jpg': 'Jeff Wilke smiling from a hospital bed in a patient gown',
  'kiki-journey.jpg': 'Kikiwai smiling in a yellow and navy crew shirt beside the water',
  'serving-and-being-served.jpg': 'Two YWAM team members in navy polo shirts smiling under the trees',
  'one-tooth.jpg': "A dental volunteer in a mask and headlamp examining a man's teeth",
  'so-little-big-difference.jpg': 'A smiling optical volunteer with a clipboard beside an elderly woman trying on glasses',
  'rose-and-bern.jpg': 'Rose and Bern with YWAM friends by the water, everyone wearing garlands of leaves',
  'serving-with-purpose.jpg': 'A volunteer in navy scrubs going over a paper form with a mother holding her baby',
}
// Where to aim the crop so faces stay in frame, mostly for portrait photos.
const crop = {
  'surgery-to-shores.jpg': '50% 38%',
  'firsts-with-paise.jpg': '50% 30%',
  'rose-and-bern.jpg': '50% 55%',
  'joan-fox.jpg': '50% 35%',
  'one-tooth.jpg': '60% 45%',
  'godfried.jpg': '50% 30%',
}

// The only small original (480 px wide): when it leads, show it at a size it can hold.
const smallPhoto = new Set(['firsts-with-paise.jpg'])

// Real pixel widths of the small (sm/) and full copies, so the browser can pick the lighter file.
// Small copies are all 800 wide; full copies are 1800 wide except the portrait ones.
const widths = {
  'surgery-to-shores.jpg': [800, 1350],
  'rose-and-bern.jpg': [800, 1350],
  'joan-fox.jpg': [800, 1114],
  'one-tooth.jpg': [800, 1199],
}
// Rendered width of each tier's photo, matching stories.css.
const sizes = {
  lead: '(max-width: 960px) 100vw, 52vw',
  side: '(max-width: 760px) 30vw, (max-width: 960px) 40vw, 18vw',
  row: '(max-width: 760px) 88px, (max-width: 1100px) 128px, 152px',
}
const base = '/assets/img/stories/'
const sources = (s, tier) => {
  if (smallPhoto.has(s.img)) return `src="${base}${s.img}"`
  const [sm, full] = widths[s.img] ?? [800, 1800]
  return `src="${base}${s.img}" srcset="${base}sm/${s.img} ${sm}w, ${base}${s.img} ${full}w" sizes="${sizes[tier]}"`
}

const photo = (s, tier) =>
  `<div class="st-photo"><img ${sources(s, tier)} alt="${esc(altFix[s.img] ?? s.alt)}" loading="lazy" decoding="async" style="object-position: ${crop[s.img] ?? '50% 50%'}" /></div>`
const when = (s) => `<time datetime="${s.date}">${formatStoryDate(s.date)}</time>`
const tag = (s) => `<span class="tag">${esc(s.tag)}</span>`
const title = (s) => `<a class="st-link" href="${s.url}">${esc(s.title)}</a>`

// Three tiers so the list reads like a front page: one lead, up to three beside it, the rest as dated rows.
const lead = (s) => `
  <article class="st-story st-story--lead${smallPhoto.has(s.img) ? ' has-small-photo' : ''}">
    ${photo(s, 'lead')}
    <div class="st-story__body">
      <div class="st-story__meta">${tag(s)}${when(s)}</div>
      <h3>${title(s)}</h3>
      <p>${esc(s.excerpt)}</p>
    </div>
  </article>`

const side = (s) => `
  <article class="st-story st-story--side">
    ${photo(s, 'side')}
    <div class="st-story__body">
      <div class="st-story__meta">${tag(s)}${when(s)}</div>
      <h3>${title(s)}</h3>
      <p>${esc(s.excerpt)}</p>
    </div>
  </article>`

const row = (s) => `
  <li>
    <article class="st-story st-story--row">
      <div class="st-story__date">${when(s)}</div>
      <div class="st-story__body">
        <h3>${title(s)}</h3>
        <p>${esc(s.excerpt)}</p>
      </div>
      <div class="st-story__tag">${tag(s)}</div>
      ${photo(s, 'row')}
    </article>
  </li>`

/* ─── The index ─────────────────────────────────────────────────────────── */
const results = document.querySelector('[data-results]')
const count = document.querySelector('[data-count]')
const buttons = [...document.querySelectorAll('.st-filters [data-topic]')]

const topics = new Set(stories.map((s) => slug(s.tag)))
const pick = (topic) => (topic === 'all' ? stories : stories.filter((s) => slug(s.tag) === topic))

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
const phrase = {
  all: (n) => `Showing all ${plural(n, 'story', 'stories')}`,
  'from-the-crew': (n) => `Showing ${plural(n, 'story', 'stories')} from the crew`,
  'from-the-field': (n) => `Showing ${plural(n, 'story', 'stories')} from the field`,
  'bible-translation': (n) => `Showing ${plural(n, 'story', 'stories')} about Bible translation`,
  'dts-outreach': (n) => `Showing ${plural(n, 'story', 'stories')} from a DTS outreach`,
  updates: (n) => `Showing ${plural(n, 'update', 'updates')}`,
}

function render(topic) {
  const list = pick(topic)
  const [first, ...rest] = list
  const beside = rest.slice(0, 3)
  const rows = rest.slice(3)
  results.innerHTML = `
    <div class="st-top${beside.length ? '' : ' is-solo'}">
      ${first ? lead(first) : ''}
      ${beside.length ? `<div class="st-beside">${beside.map(side).join('')}</div>` : ''}
    </div>
    ${rows.length ? `<ul class="st-rows" role="list">${rows.map(row).join('')}</ul>` : ''}`
  count.textContent = (phrase[topic] ?? phrase.all)(list.length)
}

function choose(topic, { updateUrl = true } = {}) {
  if (topic !== 'all' && !topics.has(topic)) topic = 'all'
  buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.topic === topic)))
  render(topic)
  if (updateUrl) {
    const url = new URL(location.href)
    topic === 'all' ? url.searchParams.delete('topic') : url.searchParams.set('topic', topic)
    history.replaceState(history.state, '', url)
  }
}

if (results && count) {
  // Each button shows how many stories it holds; screen readers hear "From the crew, 5 stories".
  for (const b of buttons) {
    const n = pick(b.dataset.topic).length
    if (!n) {
      b.hidden = true
      continue
    }
    b.insertAdjacentHTML('beforeend', `<span class="filter__n" aria-hidden="true">${n}</span><span class="visually-hidden">, ${plural(n, 'story', 'stories')}</span>`)
    b.addEventListener('click', () => choose(b.dataset.topic))
  }
  const fromUrl = new URLSearchParams(location.search).get('topic')
  choose(fromUrl ?? 'all', { updateUrl: false })
}

/* ─── The film: nothing loads from YouTube until the visitor presses play ── */
const film = document.querySelector('[data-film]')
film?.querySelector('button')?.addEventListener(
  'click',
  () => {
    const frame = document.createElement('iframe')
    frame.src = `https://www.youtube-nocookie.com/embed/${film.dataset.film}?autoplay=1`
    frame.title = film.dataset.title
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
    frame.allowFullscreen = true
    frame.referrerPolicy = 'strict-origin-when-cross-origin'
    film.replaceChildren(frame)
    film.classList.add('is-playing')
    frame.focus()
  },
  { once: true },
)

/* ─── "Get stories by email": land on the footer's email field, ready to type ─
   Handled here so the shared in-page-anchor handler doesn't set tabindex="-1" on the input,
   which would drop it out of the Tab order. */
const newsletterInput = document.getElementById('newsletter-email')
document.querySelector('.st-keep a[href="#newsletter-email"]')?.addEventListener('click', (e) => {
  if (!newsletterInput) return
  e.preventDefault()
  e.stopPropagation()
  if (lenis) lenis.scrollTo(newsletterInput, { offset: -innerHeight / 2 })
  else newsletterInput.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' })
  newsletterInput.focus({ preventScroll: true })
})

/* ─── Closing call: embers over the village at dusk (the page's one moving moment) */
const embers = document.querySelector('.st-cta canvas[data-embers]')
if (embers && !reducedMotion) startEmbers(embers)
