import '../main.js'
import '../styles/about.css'
import { reducedMotion } from '../main.js'
import { startEmbers } from '../embers2d.js'

// The one moving thing on this page: embers rising over the hero photo.
const embers = document.querySelector('.about-hero canvas[data-embers]')
if (embers && !reducedMotion) startEmbers(embers, { density: 0.00007 })

// Madang chart: pointing at a place in the list lights up its marker on the map.
const chart = document.querySelector('[data-chart]')
if (chart) {
  const pinsFor = (keys) => keys.flatMap((k) => [...chart.querySelectorAll(`[data-pin="${k}"]`)])
  const clear = () => chart.querySelectorAll('.pin.is-active').forEach((p) => p.classList.remove('is-active'))
  for (const item of document.querySelectorAll('[data-place]')) {
    const keys = item.dataset.place.split(' ')
    item.addEventListener('pointerenter', () => {
      clear()
      pinsFor(keys).forEach((p) => p.classList.add('is-active'))
      item.classList.add('is-active')
    })
    item.addEventListener('pointerleave', () => {
      clear()
      item.classList.remove('is-active')
    })
  }
}
