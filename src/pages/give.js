import '../main.js'
import '../styles/give.css'
import { reducedMotion } from '../main.js'
import { startEmbers } from '../embers2d.js'

/* ─── The chooser ────────────────────────────────────────────────────────────
   CSS (:has) decides which readout and which giving link are visible, so the
   chooser works without JavaScript. Here we announce the change to screen
   readers, start the settle-in animation, and cover browsers without :has. */
const chooser = document.querySelector('[data-chooser]')
if (chooser) {
  const status = chooser.querySelector('[data-chooser-status]')
  const items = [...chooser.querySelectorAll('.readout__item')]
  const hasSupport = CSS.supports?.('selector(:has(*))')

  const current = () => {
    const freq = chooser.querySelector('input[name="frequency"]:checked')?.value
    const amount = chooser.querySelector('input[name="amount"]:checked')?.value
    return freq === 'once' ? 'once' : `m${amount}`
  }

  // Fallback for browsers without :has: toggle the same elements by hand.
  const applyFallback = (state) => {
    const once = state === 'once'
    items.forEach((el) => (el.style.display = el.dataset.show === state ? 'grid' : 'none'))
    chooser.querySelector('.amounts').style.display = once ? 'none' : ''
    chooser.querySelector('.chooser__note').style.display = once ? 'none' : ''
    chooser.querySelector('.chooser__go--monthly').style.display = once ? 'none' : 'flex'
    chooser.querySelector('.chooser__go--once').style.display = once ? 'flex' : 'none'
  }

  chooser.addEventListener('change', () => {
    const state = current()
    chooser.classList.add('is-live')
    if (!hasSupport) applyFallback(state)
    // Announce exactly what the visible readout says, so the two can never drift apart.
    const item = items.find((el) => el.dataset.show === state)
    if (item && status) {
      status.textContent = [...item.querySelectorAll('p')]
        .map((p) => p.textContent.replace(/\s+/g, ' ').trim().replace(/\.$/, ''))
        .join('. ')
        .concat('.')
    }
  })

  // Readout photos start lazy; fetch them once the page is idle so a switch never shows an empty frame.
  const warm = () => chooser.querySelectorAll('img[loading="lazy"]').forEach((img) => (img.loading = 'eager'))
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 4000 })
  else setTimeout(warm, 2500)
}

/* ─── Copy buttons for addresses and the EIN ────────────────────────────── */
const copyStatus = document.querySelector('[data-copy-status]')
if (navigator.clipboard && window.isSecureContext) {
  for (const btn of document.querySelectorAll('button[data-copy]')) {
    btn.hidden = false
    // Keep the markup, not just the text: each label carries a visually hidden "for US checks" / "EIN".
    const label = btn.innerHTML
    let timer = 0
    btn.addEventListener('click', async () => {
      let said
      try {
        await navigator.clipboard.writeText(btn.dataset.copy)
        btn.textContent = 'Copied'
        said = btn.dataset.copied || 'Copied'
      } catch {
        btn.textContent = 'Copy failed'
        said = 'Copy failed. Select the text and copy it instead.'
      }
      if (copyStatus) copyStatus.textContent = said
      clearTimeout(timer)
      timer = setTimeout(() => {
        btn.innerHTML = label
        if (copyStatus) copyStatus.textContent = ''
      }, 2200)
    })
  }
}

/* ─── Closing call: embers rising off the page ─────────────────────────── */
const emberCanvas = document.querySelector('.cta-band [data-embers]')
if (emberCanvas && !reducedMotion) startEmbers(emberCanvas)
